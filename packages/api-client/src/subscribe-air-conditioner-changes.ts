import {
  AIR_CONDITIONER_CHANGED_EVENT,
  isAirConditionerChangedEvent,
  type AirConditionerView,
} from '@smart-ac/shared';

export type AirConditionerChangeHandler = (airConditioner: AirConditionerView) => void;

export interface SubscribeAirConditionerChangesOptions {
  onError?: (error: Error) => void;
  onOpen?: () => void;
  /** Initial reconnect delay in ms. Doubles up to 30s on each failure. */
  reconnectDelayMs?: number;
}

/**
 * Opens a long-lived SSE connection to `/api/events` and invokes `onChange`
 * whenever another client (or Telegram / schedule) updates an air conditioner.
 * Returns an unsubscribe function that closes the stream and stops reconnects.
 *
 * Prefers XMLHttpRequest (reliable in React Native / Expo). Falls back to fetch
 * streaming in Node and modern browsers.
 */
export function createAirConditionerChangeSubscription(
  options: {
    baseUrl: string;
    apiSecret: string;
    fetchImpl?: typeof fetch;
    onChange: AirConditionerChangeHandler;
    onError?: (error: Error) => void;
    onOpen?: () => void;
    reconnectDelayMs?: number;
  },
): () => void {
  const fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
  const baseUrl = options.baseUrl.replace(/\/$/, '');
  const url = `${baseUrl}/api/events`;
  const initialDelay = options.reconnectDelayMs ?? 1000;
  const preferXhr = typeof XMLHttpRequest !== 'undefined';

  let closed = false;
  let attempt = 0;
  let abortController: AbortController | null = null;
  let xhr: XMLHttpRequest | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const clearReconnect = () => {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const scheduleReconnect = () => {
    if (closed) {
      return;
    }
    clearReconnect();
    const delay = Math.min(initialDelay * 2 ** attempt, 30_000);
    attempt += 1;
    reconnectTimer = setTimeout(() => {
      void connect();
    }, delay);
  };

  const handleEvent = (eventName: string, data: string) => {
    if (eventName !== AIR_CONDITIONER_CHANGED_EVENT) {
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(data) as unknown;
    } catch {
      return;
    }
    if (isAirConditionerChangedEvent(parsed)) {
      options.onChange(parsed.airConditioner);
    }
  };

  const connectWithXhr = () => {
    xhr?.abort();
    xhr = new XMLHttpRequest();
    let lastIndex = 0;
    let buffer = '';
    let opened = false;

    xhr.open('GET', url);
    xhr.setRequestHeader('Authorization', `Bearer ${options.apiSecret}`);
    xhr.setRequestHeader('Accept', 'text/event-stream');

    xhr.onprogress = () => {
      if (!opened) {
        opened = true;
        attempt = 0;
        options.onOpen?.();
      }
      const chunk = xhr!.responseText.slice(lastIndex);
      lastIndex = xhr!.responseText.length;
      buffer = consumeSseBuffer(buffer + chunk, handleEvent);
    };

    xhr.onloadend = () => {
      const status = xhr?.status ?? 0;
      xhr = null;
      if (closed) {
        return;
      }
      if (!opened) {
        options.onError?.(new Error(`SSE /api/events failed with status ${status}`));
      }
      scheduleReconnect();
    };

    xhr.onerror = () => {
      options.onError?.(new Error('SSE /api/events network error'));
    };

    xhr.send();
  };

  const connectWithFetch = async () => {
    abortController?.abort();
    abortController = new AbortController();

    try {
      const response = await fetchImpl(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${options.apiSecret}`,
          Accept: 'text/event-stream',
        },
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`SSE /api/events failed with status ${response.status}`);
      }

      if (!response.body) {
        throw new Error('SSE /api/events response has no body (streaming unsupported)');
      }

      attempt = 0;
      options.onOpen?.();
      await readSseStream(response.body, handleEvent);

      if (!closed) {
        scheduleReconnect();
      }
    } catch (error) {
      if (closed || (error instanceof Error && error.name === 'AbortError')) {
        return;
      }
      const nextError = error instanceof Error ? error : new Error(String(error));
      options.onError?.(nextError);
      scheduleReconnect();
    }
  };

  const connect = () => {
    if (closed) {
      return;
    }
    if (preferXhr) {
      connectWithXhr();
      return;
    }
    void connectWithFetch();
  };

  void connect();

  return () => {
    closed = true;
    clearReconnect();
    abortController?.abort();
    abortController = null;
    xhr?.abort();
    xhr = null;
  };
}

function consumeSseBuffer(
  buffer: string,
  onEvent: (eventName: string, data: string) => void,
): string {
  const lines = buffer.split(/\r?\n/);
  const rest = lines.pop() ?? '';
  let eventName = 'message';
  let dataLines: string[] = [];

  const flush = () => {
    if (dataLines.length > 0) {
      onEvent(eventName, dataLines.join('\n'));
    }
    eventName = 'message';
    dataLines = [];
  };

  for (const line of lines) {
    if (line === '') {
      flush();
      continue;
    }
    if (line.startsWith(':')) {
      continue;
    }
    if (line.startsWith('event:')) {
      eventName = line.slice('event:'.length).trim();
      continue;
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).trimStart());
    }
  }

  return rest;
}

async function readSseStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (eventName: string, data: string) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      consumeSseBuffer(`${buffer}\n\n`, onEvent);
      return;
    }

    buffer = consumeSseBuffer(buffer + decoder.decode(value, { stream: true }), onEvent);
  }
}
