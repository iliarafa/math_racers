import { useEffect, useState } from "react";
import {
  KEY_ECHO_MS,
  keyForEvent,
  laneKeyForEvent,
  powerKeyForEvent,
  type KeyEcho,
} from "@/lib/keyStrip";

const IDLE: KeyEcho = { key: null, seq: 0 };

/**
 * Which strip / shortcut key was physically pressed in the last ~260ms, for flashing the
 * matching on-screen key. `seq` increments on every press so the same key pressed twice
 * flashes twice. Display only: it never prevents default and never touches the answer or
 * submits, so it cannot double-fire with the page's own keydown handler.
 * Returns the idle value while `active` is false.
 */
export function useKeyEcho(active: boolean): KeyEcho {
  const [echo, setEcho] = useState<KeyEcho>(IDLE);

  useEffect(() => {
    if (!active) {
      setEcho(IDLE);
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      const key = keyForEvent(e.key) ?? powerKeyForEvent(e.key) ?? laneKeyForEvent(e.key);
      if (!key) return;
      setEcho((prev) => ({ key, seq: prev.seq + 1 }));
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setEcho((prev) => ({ key: null, seq: prev.seq })), KEY_ECHO_MS);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (timer) clearTimeout(timer);
    };
  }, [active]);

  return echo;
}
