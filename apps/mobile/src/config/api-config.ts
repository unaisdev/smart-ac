const trimTrailingSlash = (value: string): string => value.replace(/\/$/, '');

export const apiConfig = {
  baseUrl: trimTrailingSlash(
    process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3000',
  ),
  apiSecret: process.env.EXPO_PUBLIC_API_SECRET ?? 'dev-secret-change-me',
};
