// Telegram Mini App integration. index.html loads Telegram's bridge script only when Telegram
// opened the page, so outside Telegram everything here is a no-op.
//
// Sign-in needs nothing from this file: the iDos login screen offers "Continue with Telegram" as
// soon as Telegram.WebApp.initData exists, and later launches replay that login automatically.
// The title must have its Telegram bot token set on the iDos side, or that login is refused.

interface TelegramWebApp {
  initData?: string;
  version?: string;
  ready?: () => void;
  expand?: () => void;
  disableVerticalSwipes?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  setBottomBarColor?: (color: string) => void;
  isVersionAtLeast?: (version: string) => boolean;
}

/** The game's background (index.html and the theme's default bgBottom). */
const BG = "#0d1033";

export function telegramWebApp(): TelegramWebApp | null {
  const tg = (globalThis as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram
    ?.WebApp;
  return tg?.initData ? tg : null;
}

export const IN_TELEGRAM = telegramWebApp() !== null;

/** Tell Telegram the app is ready, take the full height, and stop swipe-down from closing it. */
export function setupTelegram(): void {
  const tg = telegramWebApp();
  if (!tg) return;
  const call = (fn: () => void): void => {
    try {
      fn();
    } catch {
      // older Telegram clients lack some methods
    }
  };
  call(() => tg.expand?.());
  // Upgrades are tapped and held; a vertical swipe would otherwise minimise the Mini App.
  if (tg.isVersionAtLeast?.("7.7")) call(() => tg.disableVerticalSwipes?.());
  if (tg.isVersionAtLeast?.("6.1")) {
    call(() => tg.setHeaderColor?.(BG));
    call(() => tg.setBackgroundColor?.(BG));
  }
  if (tg.isVersionAtLeast?.("7.10")) call(() => tg.setBottomBarColor?.(BG));
  call(() => tg.ready?.());
}
