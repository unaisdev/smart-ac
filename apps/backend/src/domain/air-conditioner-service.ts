import { randomUUID } from 'node:crypto';
import {
  DEFAULT_AIR_STATE,
  isAirState,
  mergeAirState,
  type AirConditionerView,
  type AirState,
} from '@smart-ac/shared';
import type { SqliteDatabase } from '../db/client.ts';
import { NotFoundError } from '../http/errors.ts';
import type { AirConditionerTransport } from '../transport/air-conditioner-transport.ts';

interface AirConditionerRow {
  id: string;
  name: string;
  location: string;
  desired_state_json: string;
  reported_state_json: string | null;
  online: number;
}

export interface CommandResult extends AirConditionerView {
  commandSent: boolean;
  requestId: string;
}

export class AirConditionerService {
  constructor(
    private readonly db: SqliteDatabase,
    private readonly transport: AirConditionerTransport,
  ) {}

  list(): AirConditionerView[] {
    return this.loadAll().map((row) => toView(row));
  }

  get(id: string): AirConditionerView {
    return toView(this.loadOne(id));
  }

  async setState(id: string, state: AirState): Promise<CommandResult> {
    this.loadOne(id);
    return this.send(id, state);
  }

  async patchState(id: string, patch: Partial<AirState>): Promise<CommandResult> {
    const current = toView(this.loadOne(id));
    return this.send(id, mergeAirState(current.desiredState, patch));
  }

  markOnline(isOnline: boolean): void {
    this.db
      .prepare(`UPDATE device_status SET online = @online, updated_at = @updatedAt`)
      .run({ online: isOnline ? 1 : 0, updatedAt: new Date().toISOString() });
  }

  private async send(id: string, state: AirState): Promise<CommandResult> {
    const requestId = randomUUID();
    let success = false;

    try {
      await this.transport.setState(id, state);
      success = true;
      this.persistDesired(id, state);
    } finally {
      this.insertCommand(id, requestId, state, success);
    }

    if (success) {
      await this.notifyChanged(id);
    }

    return { ...this.get(id), commandSent: success, requestId };
  }

  onChanged(listener: (id: string) => Promise<void> | void): () => void {
    this.changedListeners.add(listener);
    return () => {
      this.changedListeners.delete(listener);
    };
  }

  private readonly changedListeners = new Set<(id: string) => Promise<void> | void>();

  private async notifyChanged(id: string): Promise<void> {
    await Promise.all([...this.changedListeners].map((listener) => listener(id)));
  }

  private persistDesired(id: string, state: AirState): void {
    this.db
      .prepare(
        `UPDATE device_status
         SET desired_state_json = @desired, updated_at = @updatedAt
         WHERE air_conditioner_id = @id`,
      )
      .run({
        id,
        desired: JSON.stringify(state),
        updatedAt: new Date().toISOString(),
      });
  }

  private insertCommand(id: string, requestId: string, state: AirState, success: boolean): void {
    this.db
      .prepare(
        `INSERT INTO commands (id, air_conditioner_id, request_id, payload_json, created_at, success)
         VALUES (@id, @airConditionerId, @requestId, @payload, @createdAt, @success)`,
      )
      .run({
        id: randomUUID(),
        airConditionerId: id,
        requestId,
        payload: JSON.stringify(state),
        createdAt: new Date().toISOString(),
        success: success ? 1 : 0,
      });
  }

  private loadAll(): AirConditionerRow[] {
    return this.db
      .prepare(
        `SELECT a.id, a.name, a.location,
                s.desired_state_json, s.reported_state_json, s.online
         FROM air_conditioners a
         JOIN device_status s ON s.air_conditioner_id = a.id
         ORDER BY a.id`,
      )
      .all() as AirConditionerRow[];
  }

  private loadOne(id: string): AirConditionerRow {
    const row = this.db
      .prepare(
        `SELECT a.id, a.name, a.location,
                s.desired_state_json, s.reported_state_json, s.online
         FROM air_conditioners a
         JOIN device_status s ON s.air_conditioner_id = a.id
         WHERE a.id = ?`,
      )
      .get(id) as AirConditionerRow | undefined;

    if (!row) {
      throw new NotFoundError(`Air conditioner not found: ${id}`);
    }
    return row;
  }
}

function parseStoredState(json: string): AirState {
  try {
    const parsed: unknown = JSON.parse(json);
    if (isAirState(parsed)) {
      return parsed;
    }
  } catch {
    // fall through
  }
  return DEFAULT_AIR_STATE;
}

function toView(row: AirConditionerRow): AirConditionerView {
  let reportedState: AirState | null = null;
  if (row.reported_state_json) {
    try {
      const parsed: unknown = JSON.parse(row.reported_state_json);
      if (isAirState(parsed)) {
        reportedState = parsed;
      }
    } catch {
      reportedState = null;
    }
  }

  return {
    id: row.id,
    name: row.name,
    location: row.location,
    desiredState: parseStoredState(row.desired_state_json),
    reportedState,
    online: row.online === 1,
  };
}
