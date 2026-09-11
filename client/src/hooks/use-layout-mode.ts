import { useEffect, useState } from "react";
import {
  detectLayoutMode,
  FINE_POINTER_MEDIA_QUERY,
  markDesktopDocument,
  type LayoutMode,
} from "@/lib/layoutMode";

/**
 * Live layout mode for the racing screens. Desktop and laptop browsers get `desktop`;
 * everything else keeps the phone or iPad layouts. Re-evaluated on resize (a laptop
 * window dragged across the 1024px line switches trees mid-race) and when the pointer
 * media query changes. Keeps `data-desktop` on <html> in step for CSS scoping.
 */
export function useLayoutMode(): LayoutMode {
  const [mode, setMode] = useState<LayoutMode>(detectLayoutMode);

  useEffect(() => {
    // Debounced with a timer, not requestAnimationFrame: rAF stops in hidden tabs, and a
    // window resized while in the background must still land on the right layout.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const next = detectLayoutMode();
        markDesktopDocument(document.documentElement, next);
        setMode(next);
      }, 50);
    };
    const mql = window.matchMedia(FINE_POINTER_MEDIA_QUERY);
    mql.addEventListener("change", update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    update();
    return () => {
      if (timer) clearTimeout(timer);
      mql.removeEventListener("change", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return mode;
}
