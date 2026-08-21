import type { Bot } from 'grammy';
import type { FastifyBaseLogger } from 'fastify';
import type { AirConditionerService } from '../domain/air-conditioner-service.ts';
import { formatControlText, formatHomeText } from './copy.ts';
import { controlKeyboard, homeKeyboard } from './keyboards.ts';

type TrackedView =
  | { kind: 'home'; chatId: number; messageId: number }
  | { kind: 'control'; chatId: number; messageId: number; airId: string }
  | { kind: 'wizard'; chatId: number; messageId: number };

export class TelegramLiveViews {
  private readonly views = new Map<number, TrackedView>();

  trackHome(chatId: number, messageId: number): void {
    this.views.set(chatId, { kind: 'home', chatId, messageId });
  }

  trackControl(chatId: number, messageId: number, airId: string): void {
    this.views.set(chatId, { kind: 'control', chatId, messageId, airId });
  }

  trackWizard(chatId: number, messageId: number): void {
    this.views.set(chatId, { kind: 'wizard', chatId, messageId });
  }

  async push(bot: Bot, service: AirConditionerService, logger: FastifyBaseLogger): Promise<void> {
    const airs = service.list();
    await Promise.all(
      [...this.views.values()].map(async (view) => {
        try {
          if (view.kind === 'wizard') {
            return;
          }

          if (view.kind === 'home') {
            await bot.api.editMessageText(view.chatId, view.messageId, formatHomeText(airs), {
              reply_markup: homeKeyboard(airs),
            });
            return;
          }

          const air = service.get(view.airId);
          await bot.api.editMessageText(view.chatId, view.messageId, formatControlText(air), {
            reply_markup: controlKeyboard(air),
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (message.includes('message is not modified')) {
            return;
          }
          if (message.includes('message to edit not found') || message.includes('MESSAGE_ID_INVALID')) {
            this.views.delete(view.chatId);
            return;
          }
          logger.warn({ err: error, chatId: view.chatId }, 'Failed to push Telegram live view');
        }
      }),
    );
  }
}
