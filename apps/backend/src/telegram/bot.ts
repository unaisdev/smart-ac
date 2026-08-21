import type { FastifyBaseLogger } from 'fastify';
import { Bot, InlineKeyboard, type Context } from 'grammy';
import {
  MAX_TEMPERATURE,
  MIN_TEMPERATURE,
  type AirMode,
  type FanSpeed,
} from '@smart-ac/shared';
import type { Config } from '../config.ts';
import type { AirConditionerService } from '../domain/air-conditioner-service.ts';
import { isAuthorizedTelegramUser } from './auth.ts';
import { formatControlText, formatHomeText } from './copy.ts';
import { controlKeyboard, homeKeyboard } from './keyboards.ts';
import { TelegramLiveViews } from './live-views.ts';

const MODES: readonly AirMode[] = ['auto', 'cool', 'dry', 'heat', 'fan'];
const FANS: readonly FanSpeed[] = ['auto', 'low', 'medium', 'high'];

export interface TelegramRuntime {
  stop(): Promise<void>;
}

export async function startTelegramBot(
  config: Config,
  service: AirConditionerService,
  logger: FastifyBaseLogger,
): Promise<TelegramRuntime | undefined> {
  const token = config.telegramBotToken;
  if (!token) {
    logger.info('Telegram bot disabled (TELEGRAM_BOT_TOKEN empty)');
    return undefined;
  }

  if (config.telegramAllowedUserIds.length === 0) {
    logger.warn('Telegram bot disabled (TELEGRAM_ALLOWED_USER_IDS empty)');
    return undefined;
  }

  const allowed = config.telegramAllowedUserIds;
  const bot = new Bot(token);
  const live = new TelegramLiveViews();
  const stopListening = service.onChanged(async () => {
    await live.push(bot, service, logger);
  });

  bot.use(async (ctx, next) => {
    const userId = ctx.from?.id;
    if (userId === undefined || !isAuthorizedTelegramUser(userId, allowed)) {
      await ctx.reply('⛔ No tienes permiso para controlar estos dispositivos.');
      if (ctx.callbackQuery) {
        await ctx.answerCallbackQuery();
      }
      return;
    }
    await next();
  });

  bot.command('start', async (ctx) => {
    await replyHome(ctx, service, live);
  });
  bot.command('help', async (ctx) => {
    await ctx.reply(
      'Controla los aires con los botones.\n/start o /airs — lista\n/status — última orden del aire elegido.',
    );
  });
  bot.command('airs', async (ctx) => {
    await replyHome(ctx, service, live);
  });
  bot.command('status', async (ctx) => {
    await replyHome(ctx, service, live);
  });

  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;
    try {
      if (data === 'l') {
        await editHome(ctx, service, live);
        return;
      }

      const action = parseCallback(data);
      if (!action) {
        await ctx.answerCallbackQuery({ text: 'Acción no válida' });
        return;
      }

      if (action.type === 'show' || action.type === 'refresh') {
        const air = service.get(action.id);
        await editSafe(ctx, formatControlText(air), controlKeyboard(air));
        trackControl(ctx, live, action.id);
        await ctx.answerCallbackQuery();
        return;
      }

      const result = await applyAction(service, action);
      trackControl(ctx, live, action.id);
      await ctx.answerCallbackQuery({
        text: result.commandSent ? 'Orden enviada' : 'Error al enviar',
      });
    } catch (error) {
      logger.error(error);
      await ctx.answerCallbackQuery({ text: 'Error' });
    }
  });

  void bot.start({
    drop_pending_updates: true,
    onStart: (info) => {
      logger.info(`Telegram long polling as @${info.username}`);
    },
  });

  return {
    async stop() {
      stopListening();
      await bot.stop();
    },
  };
}

async function replyHome(
  ctx: Context,
  service: AirConditionerService,
  live: TelegramLiveViews,
): Promise<void> {
  const airs = service.list();
  const message = await ctx.reply(formatHomeText(airs), { reply_markup: homeKeyboard(airs) });
  if (ctx.chat) {
    live.trackHome(ctx.chat.id, message.message_id);
  }
}

async function editHome(
  ctx: Context,
  service: AirConditionerService,
  live: TelegramLiveViews,
): Promise<void> {
  const airs = service.list();
  await editSafe(ctx, formatHomeText(airs), homeKeyboard(airs));
  trackHome(ctx, live);
  await ctx.answerCallbackQuery();
}

function trackHome(ctx: Context, live: TelegramLiveViews): void {
  const ids = chatMessageIds(ctx);
  if (ids) {
    live.trackHome(ids.chatId, ids.messageId);
  }
}

function trackControl(ctx: Context, live: TelegramLiveViews, airId: string): void {
  const ids = chatMessageIds(ctx);
  if (ids) {
    live.trackControl(ids.chatId, ids.messageId, airId);
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

async function editSafe(
  ctx: Context,
  text: string,
  reply_markup: InlineKeyboard,
): Promise<void> {
  try {
    await ctx.editMessageText(text, { reply_markup });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('message is not modified')) {
      throw error;
    }
  }
}

type TelegramAction =
  | { type: 'show'; id: string }
  | { type: 'refresh'; id: string }
  | { type: 'power'; id: string; power: boolean }
  | { type: 'mode'; id: string; mode: AirMode }
  | { type: 'temp'; id: string; delta: 1 | -1 }
  | { type: 'fan'; id: string; fan: FanSpeed }
  | { type: 'toggle'; id: string; field: 'swing' | 'turbo' | 'eco' | 'led' };

function parseCallback(data: string): TelegramAction | undefined {
  const parts = data.split(':');
  const kind = parts[0];
  const id = parts[1];
  if (!kind || !id) {
    return undefined;
  }

  switch (kind) {
    case 's':
      return { type: 'show', id };
    case 'r':
      return { type: 'refresh', id };
    case 'p': {
      const raw = parts[2];
      if (raw !== '0' && raw !== '1') {
        return undefined;
      }
      return { type: 'power', id, power: raw === '1' };
    }
    case 'm': {
      const mode = parts[2];
      if (!isMode(mode)) {
        return undefined;
      }
      return { type: 'mode', id, mode };
    }
    case 't': {
      const dir = parts[2];
      if (dir !== '+' && dir !== '-') {
        return undefined;
      }
      return { type: 'temp', id, delta: dir === '+' ? 1 : -1 };
    }
    case 'f': {
      const fan = parts[2];
      if (!isFan(fan)) {
        return undefined;
      }
      return { type: 'fan', id, fan };
    }
    case 'w':
      return { type: 'toggle', id, field: 'swing' };
    case 'u':
      return { type: 'toggle', id, field: 'turbo' };
    case 'e':
      return { type: 'toggle', id, field: 'eco' };
    case 'd':
      return { type: 'toggle', id, field: 'led' };
    default:
      return undefined;
  }
}

async function applyAction(service: AirConditionerService, action: TelegramAction) {
  switch (action.type) {
    case 'show':
    case 'refresh':
      return { ...service.get(action.id), commandSent: true, requestId: '' };
    case 'power':
      return service.patchState(action.id, { power: action.power });
    case 'mode':
      return service.patchState(action.id, { power: true, mode: action.mode });
    case 'temp': {
      const current = service.get(action.id);
      const temperature = clampTemp(current.desiredState.temperature + action.delta);
      return service.patchState(action.id, { temperature });
    }
    case 'fan':
      return service.patchState(action.id, { fan: action.fan });
    case 'toggle': {
      const current = service.get(action.id);
      return service.patchState(action.id, {
        [action.field]: !current.desiredState[action.field],
      });
    }
  }
}

function isMode(value: string | undefined): value is AirMode {
  return value !== undefined && (MODES as readonly string[]).includes(value);
}

function isFan(value: string | undefined): value is FanSpeed {
  return value !== undefined && (FANS as readonly string[]).includes(value);
}

function clampTemp(value: number): number {
  return Math.min(MAX_TEMPERATURE, Math.max(MIN_TEMPERATURE, value));
}
