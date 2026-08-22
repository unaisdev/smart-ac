import type { AirState, ScheduleRepeat } from "@smart-ac/shared";

import {
  formatDesiredSummary,
  formatFanLabel,
  formatModeHero,
} from "./air-labels";

export const TIME_PRESETS: ReadonlyArray<{ hour: number; minute: number }> = [
  { hour: 6, minute: 0 },
  { hour: 7, minute: 0 },
  { hour: 7, minute: 30 },
  { hour: 8, minute: 0 },
  { hour: 8, minute: 30 },
  { hour: 9, minute: 0 },
  { hour: 18, minute: 0 },
  { hour: 22, minute: 0 },
];

export const LEAD_PRESETS = [0, 15, 30, 45, 60, 90, 120] as const;

export type WizardStep =
  | "air"
  | "time"
  | "hour"
  | "minute"
  | "lead"
  | "repeat"
  | "state"
  | "confirm";

export type WizardPhase =
  | "air"
  | "time"
  | "lead"
  | "repeat"
  | "state"
  | "confirm";

export const WIZARD_PHASES: ReadonlyArray<{
  id: WizardPhase;
  emoji: string;
  label: string;
}> = [
  { id: "air", emoji: "🏠", label: "Aire" },
  { id: "time", emoji: "🕗", label: "Hora" },
  { id: "lead", emoji: "⏱", label: "Antes" },
  { id: "repeat", emoji: "🔁", label: "Repetir" },
  { id: "state", emoji: "❄️", label: "Estado" },
  { id: "confirm", emoji: "✅", label: "Listo" },
];

export function applyLeadMinutes(
  hour: number,
  minute: number,
  leadMinutes: number
): { hour: number; minute: number } {
  const dayMinutes = 24 * 60;
  const total =
    (((hour * 60 + minute - leadMinutes) % dayMinutes) + dayMinutes) %
    dayMinutes;
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

export function formatClock(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function formatLeadLabel(minutes: number): string {
  if (minutes === 0) {
    return "A esa hora";
  }
  if (minutes < 60) {
    return `${minutes} min antes`;
  }
  const hours = minutes / 60;
  if (Number.isInteger(hours)) {
    return hours === 1 ? "1 h antes" : `${hours} h antes`;
  }
  const whole = Math.floor(hours);
  const rest = minutes % 60;
  return `${whole} h ${rest} min antes`;
}

export function formatRepeatLabel(repeat: ScheduleRepeat): string {
  return repeat === "once" ? "1️⃣ Una vez" : "🔁 Todos los días";
}

/** Compact repeat label for list cards (plain text, no emoji). */
export function formatRepeatLabelShort(repeat: ScheduleRepeat): string {
  return repeat === 'once' ? 'Una vez' : 'Diario';
}

/** Right-column time lines for schedule list cards (ambiente / orden / lead). */
export function formatScheduleCardWhen(
  targetHour: number,
  targetMinute: number,
  leadMinutes: number,
): { ambient?: string; order: string; lead?: string } {
  const target = formatClock(targetHour, targetMinute);
  const execute = applyLeadMinutes(targetHour, targetMinute, leadMinutes);
  const executeClock = formatClock(execute.hour, execute.minute);

  if (leadMinutes === 0) {
    return { order: `Orden ${executeClock}` };
  }

  return {
    ambient: `Ambiente ${target}`,
    order: `Orden ${executeClock}`,
    lead: formatLeadLabel(leadMinutes),
  };
}

export function formatScheduleWhen(
  targetHour: number,
  targetMinute: number,
  leadMinutes: number,
  repeat: ScheduleRepeat
): string {
  const target = formatClock(targetHour, targetMinute);
  const execute = applyLeadMinutes(targetHour, targetMinute, leadMinutes);
  const executeClock = formatClock(execute.hour, execute.minute);
  const repeatLabel = repeat === "once" ? "Una vez" : "Diario";

  if (leadMinutes === 0) {
    return `${repeatLabel} · orden a las ${executeClock}`;
  }

  return `${repeatLabel} · ambiente ${target} · orden ${executeClock}`;
}

export function formatTimelineExplanation(
  targetHour: number,
  targetMinute: number,
  leadMinutes: number
): { targetLabel: string; executeLabel: string; detail: string } {
  const target = formatClock(targetHour, targetMinute);
  const execute = applyLeadMinutes(targetHour, targetMinute, leadMinutes);
  const executeClock = formatClock(execute.hour, execute.minute);

  if (leadMinutes === 0) {
    return {
      targetLabel: target,
      executeLabel: executeClock,
      detail: "La orden se envía a la misma hora a la que quieres el ambiente.",
    };
  }

  return {
    targetLabel: target,
    executeLabel: executeClock,
    detail: `El backend envía la orden ${formatLeadLabel(
      leadMinutes
    ).toLowerCase()} (${executeClock}) para que a las ${target} el ambiente ya esté listo.`,
  };
}

export function formatStateSummary(state: AirState): string {
  return formatDesiredSummary(state.power, state.mode, state.temperature);
}

export function formatStateDetails(state: AirState): string[] {
  if (!state.power) {
    return ["⏻ OFF"];
  }

  return [
    formatModeHero(state.mode),
    `🌡 ${state.temperature}°C`,
    formatFanLabel(state.fan),
    `↕️ Swing ${state.swing ? "ON" : "OFF"}`,
    `⚡ Turbo ${state.turbo ? "ON" : "OFF"}`,
    `🌱 Eco ${state.eco ? "ON" : "OFF"}`,
    `💡 LED ${state.led ? "ON" : "OFF"}`,
  ];
}

export function formatNextExecuteAt(isoUtc: string): string {
  const date = new Date(isoUtc);
  if (Number.isNaN(date.getTime())) {
    return isoUtc;
  }
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function wizardPhaseIndex(step: WizardStep): number {
  switch (step) {
    case "air":
      return 0;
    case "time":
    case "hour":
    case "minute":
      return 1;
    case "lead":
      return 2;
    case "repeat":
      return 3;
    case "state":
      return 4;
    case "confirm":
      return 5;
  }
}

/** Maps a phase icon to the wizard step to resume (prefers the high-level step). */
export function wizardStepForPhase(phase: WizardPhase): WizardStep {
  switch (phase) {
    case "air":
      return "air";
    case "time":
      return "time";
    case "lead":
      return "lead";
    case "repeat":
      return "repeat";
    case "state":
      return "state";
    case "confirm":
      return "confirm";
  }
}

export function wizardStepTitle(step: WizardStep): string {
  switch (step) {
    case "air":
      return "¿Qué aire?";
    case "time":
      return "Hora objetivo";
    case "hour":
      return "Elige hora";
    case "minute":
      return "Elige minutos";
    case "lead":
      return "Antelación";
    case "repeat":
      return "Repetición";
    case "state":
      return "Estado deseado";
    case "confirm":
      return "Confirmar";
  }
}

export function wizardStepHint(step: WizardStep): string {
  switch (step) {
    case "air":
      return "¿Qué aire quieres programar?";
    case "time":
      return "¿A qué hora quieres el ambiente?";
    case "hour":
      return "Elige la hora";
    case "minute":
      return "Elige los minutos";
    case "lead":
      return "¿Con cuánta antelación enviamos la orden?";
    case "repeat":
      return "¿Una sola vez o todos los días?";
    case "state":
      return "Configura cómo debe quedar el aire (orden programada, no confirmación del aparato).";
    case "confirm":
      return "Revisa el plan: hora objetivo, cuándo se envía la orden y el estado deseado.";
  }
}
