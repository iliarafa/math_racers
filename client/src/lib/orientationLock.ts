import { Capacitor } from "@capacitor/core";
import { ScreenOrientation } from "@capacitor/screen-orientation";

/** iPad detection shared with the viewport script in client/index.html. */
export function isIpad(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.hasAttribute("data-ipad-scale");
}

/** Whether the app is currently laid out portrait — while unlocked this tracks how the device is held. */
export function isPortrait(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(orientation: portrait)").matches;
}

/**
 * Race Weekend modes (Free Practice and the Grand Prix weekend) run landscape on iPad,
 * where the racing HUD splits into question/grid on the left and keypad on the right.
 * No-op on iPhone (portrait-only app) and on the web, where the plugin is unavailable.
 */
export async function lockLandscapeOnIpad(): Promise<void> {
  if (!Capacitor.isNativePlatform() || !isIpad()) return;
  try {
    await ScreenOrientation.lock({ orientation: "landscape" });
  } catch {
    /* plugin missing or lock unsupported — leave rotation free */
  }
}

export async function unlockOrientation(): Promise<void> {
  if (!Capacitor.isNativePlatform() || !isIpad()) return;
  try {
    await ScreenOrientation.unlock();
  } catch {
    /* nothing to undo */
  }
}
