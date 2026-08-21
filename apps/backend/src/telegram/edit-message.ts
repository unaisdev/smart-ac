import type { InlineKeyboard } from 'grammy';
import type { Context } from 'grammy';

export async function editSafe(
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
