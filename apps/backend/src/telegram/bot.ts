import type { FastifyBaseLogger } from 'fastify';
import { Bot, type Context } from 'grammy';
import type { Config } from '../config.ts';
import type { AirConditionerService } from '../domain/air-conditioner-service.ts';
import { isAuthorizedTelegramUser } from './auth.ts';
import { formatControlText, formatHomeText } from './copy.ts';
import { editSafe } from './edit-message.ts';
import { controlKeyboard, homeKeyboard } from './keyboards.ts';
import { TelegramLiveViews } from './live-views.ts';

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
      await editSafe(ctx, formatControlText(result), controlKeyboard(result));
      await ctx.answerCallbackQuery({
        text: result.commandSent ? 'Orden enviada' : 'Error al enviar',
      });
    } catch (error) {
      logger.error(error);
      await ctx.answerCallbackQuery({ text: 'Error' });
    }
  });

  void bot
    .start({
      drop_pending_updates: true,
      onStart: (info) => {
        logger.info(`Telegram long polling as @${info.username}`);
      },
    })
    .catch((error) => {
      // Another process already long-polls this token (409) must not kill the API.
      logger.error(error, 'Telegram bot stopped; REST/SSE keep running');
      stopListening();
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

type TelegramAction =
  | { type: 'show'; id: string }
  | { type: 'refresh'; id: string }
  | { type: 'power'; id: string; power: boolean };

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
      return service.setPower(action.id, action.power);
  }
}
