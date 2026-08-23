import type { InlineKeyboard } from 'grammy';
import type { Context } from 'grammy';

function isStaleCallbackError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('query is too old') || message.includes('query ID is invalid')) {
    return true;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'description' in error &&
    typeof error.description === 'string'
  ) {
    return (
      error.description.includes('query is too old') ||
      error.description.includes('query ID is invalid')
    );
  }

  return false;
}

/** Ignores expired inline-button callbacks so the bot keeps polling. */
export async function answerCallbackSafe(
  ctx: Context,
  options?: { text?: string; show_alert?: boolean },
): Promise<void> {
  try {
    await ctx.answerCallbackQuery(options);
  } catch (error) {
    if (isStaleCallbackError(error)) {
      return;
    }
    throw error;
  }
}

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
