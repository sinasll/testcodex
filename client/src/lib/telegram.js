export function detectTelegramUser() {
  const webApp = window?.Telegram?.WebApp;
  const initDataUnsafe = webApp?.initDataUnsafe;
  if (initDataUnsafe?.user) {
    return {
      id: String(initDataUnsafe.user.id),
      name: [initDataUnsafe.user.first_name, initDataUnsafe.user.last_name].filter(Boolean).join(' '),
      username: initDataUnsafe.user.username,
      telegram: true,
    };
  }
  return null;
}
