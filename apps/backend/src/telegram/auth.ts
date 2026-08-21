export function isAuthorizedTelegramUser(userId: number, allowedUserIds: readonly number[]): boolean {
  return allowedUserIds.includes(userId);
}
