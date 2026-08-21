import type { Context } from 'grammy';
import type { AirConditionerService } from '../domain/air-conditioner-service.ts';
import type { ScheduleService } from '../domain/schedule-service.ts';
import { editSafe } from './edit-message.ts';
import { formatHomeText } from './copy.ts';
import { homeKeyboard } from './keyboards.ts';
import type { TelegramLiveViews } from './live-views.ts';
import { parseScheduleCallback } from './schedule-callback.ts';
import {
  formatScheduleListText,
  formatScheduleSaved,
  formatWizardText,
} from './schedule-copy.ts';
import {
  isCompleteDraft,
  reduceScheduleDraft,
  type ScheduleDraft,
  type WizardSessions,
} from './schedule-draft.ts';
import { scheduleListKeyboard, wizardKeyboard } from './schedule-keyboards.ts';

export async function replyScheduleWizard(
  ctx: Context,
  service: AirConditionerService,
  sessions: WizardSessions,
  live: TelegramLiveViews,
): Promise<void> {
  if (!ctx.chat) {
    return;
  }
  const draft = sessions.start(ctx.chat.id);
  const airs = service.list();
  const message = await ctx.reply(formatWizardText(draft, airs), {
    reply_markup: wizardKeyboard(draft, airs),
  });
  live.trackWizard(ctx.chat.id, message.message_id);
}

export async function handleScheduleCallback(input: {
  ctx: Context;
  data: string;
  service: AirConditionerService;
  schedules: ScheduleService;
  live: TelegramLiveViews;
  sessions: WizardSessions;
  timeZone: string;
}): Promise<boolean> {
  const action = parseScheduleCallback(input.data);
  if (!action) {
    await input.ctx.answerCallbackQuery({ text: 'Acción no válida' });
    return true;
  }

  const { ctx, service, schedules, live, sessions, timeZone } = input;
  const chatId = ctx.chat?.id;
  if (chatId === undefined) {
    await ctx.answerCallbackQuery();
    return true;
  }

  switch (action.type) {
    case 'new': {
      const draft = sessions.start(chatId);
      await showWizard(ctx, service, live, draft);
      await ctx.answerCallbackQuery();
      return true;
    }
    case 'list':
      sessions.clear(chatId);
      await showList(ctx, service, schedules, live, timeZone);
      await ctx.answerCallbackQuery();
      return true;
    case 'home':
      sessions.clear(chatId);
      await showHome(ctx, service, live);
      await ctx.answerCallbackQuery();
      return true;
    case 'cancel':
      sessions.clear(chatId);
      await showHome(ctx, service, live);
      await ctx.answerCallbackQuery({ text: 'Cancelado' });
      return true;
    case 'remove': {
      schedules.remove(action.id);
      await showList(ctx, service, schedules, live, timeZone);
      await ctx.answerCallbackQuery({ text: 'Programa eliminado' });
      return true;
    }
    default:
      break;
  }

  const current = sessions.get(chatId);
  if (!current) {
    await ctx.answerCallbackQuery({ text: 'Sesión caducada. Usa /schedule' });
    return true;
  }

  if (action.type === 'stay') {
    await showWizard(ctx, service, live, current);
    await ctx.answerCallbackQuery();
    return true;
  }

  if (action.type === 'save') {
    if (!isCompleteDraft(current)) {
      await ctx.answerCallbackQuery({ text: 'Faltan datos' });
      return true;
    }
    const saved = schedules.create({
      airConditionerId: current.airConditionerId,
      repeat: current.repeat,
      targetHour: current.targetHour,
      targetMinute: current.targetMinute,
      leadMinutes: current.leadMinutes,
      state: current.state,
    });
    sessions.clear(chatId);
    const air = service.get(saved.airConditionerId);
    await editSafe(ctx, formatScheduleSaved(air.name, current), scheduleListKeyboard(schedules.list(), service.list()));
    trackWizard(ctx, live);
    await ctx.answerCallbackQuery({ text: 'Programa guardado' });
    return true;
  }

  const next = applyWizardAction(current, action);
  if (!next) {
    await ctx.answerCallbackQuery({ text: 'Acción no válida' });
    return true;
  }

  sessions.set(chatId, next);
  await showWizard(ctx, service, live, next);
  await ctx.answerCallbackQuery();
  return true;
}

function applyWizardAction(draft: ScheduleDraft, action: ReturnType<typeof parseScheduleCallback>): ScheduleDraft | undefined {
  if (!action) {
    return undefined;
  }

  switch (action.type) {
    case 'back':
      return reduceScheduleDraft(draft, { type: 'back' });
    case 'next':
      return reduceScheduleDraft(draft, { type: 'to-confirm' });
    case 'custom-time':
      return reduceScheduleDraft(draft, { type: 'custom-time' });
    case 'pick-air':
      return reduceScheduleDraft(draft, { type: 'pick-air', id: action.id });
    case 'pick-time':
      return reduceScheduleDraft(draft, { type: 'pick-time', hour: action.hour, minute: action.minute });
    case 'pick-hour':
      return reduceScheduleDraft(draft, { type: 'pick-hour', hour: action.hour });
    case 'pick-minute':
      return reduceScheduleDraft(draft, { type: 'pick-minute', minute: action.minute });
    case 'pick-lead':
      return reduceScheduleDraft(draft, { type: 'pick-lead', minutes: action.minutes });
    case 'pick-repeat':
      return reduceScheduleDraft(draft, { type: 'pick-repeat', repeat: action.repeat });
    case 'power':
      return reduceScheduleDraft(draft, { type: 'patch-state', patch: { power: action.power } });
    case 'mode':
      return reduceScheduleDraft(draft, { type: 'patch-state', patch: { power: true, mode: action.mode } });
    case 'temp':
      return reduceScheduleDraft(draft, { type: 'temp-delta', delta: action.delta });
    case 'fan':
      return reduceScheduleDraft(draft, { type: 'patch-state', patch: { fan: action.fan } });
    case 'toggle':
      return reduceScheduleDraft(draft, {
        type: 'patch-state',
        patch: { [action.field]: !draft.state[action.field] },
      });
    default:
      return undefined;
  }
}

async function showWizard(
  ctx: Context,
  service: AirConditionerService,
  live: TelegramLiveViews,
  draft: ScheduleDraft,
): Promise<void> {
  const airs = service.list();
  await editSafe(ctx, formatWizardText(draft, airs), wizardKeyboard(draft, airs));
  trackWizard(ctx, live);
}

async function showList(
  ctx: Context,
  service: AirConditionerService,
  schedules: ScheduleService,
  live: TelegramLiveViews,
  timeZone: string,
): Promise<void> {
  const airs = service.list();
  await editSafe(
    ctx,
    formatScheduleListText(schedules.list(), airs, new Date(), timeZone),
    scheduleListKeyboard(schedules.list(), airs),
  );
  trackWizard(ctx, live);
}

async function showHome(ctx: Context, service: AirConditionerService, live: TelegramLiveViews): Promise<void> {
  const airs = service.list();
  await editSafe(ctx, formatHomeText(airs), homeKeyboard(airs));
  const ids = chatMessageIds(ctx);
  if (ids) {
    live.trackHome(ids.chatId, ids.messageId);
  }
}

function trackWizard(ctx: Context, live: TelegramLiveViews): void {
  const ids = chatMessageIds(ctx);
  if (ids) {
    live.trackWizard(ids.chatId, ids.messageId);
  }
}

function chatMessageIds(ctx: Context): { chatId: number; messageId: number } | undefined {
  const chatId = ctx.chat?.id;
  const messageId = ctx.msg?.message_id;
  if (chatId === undefined || messageId === undefined) {
    return undefined;
  }
  return { chatId, messageId };
}
