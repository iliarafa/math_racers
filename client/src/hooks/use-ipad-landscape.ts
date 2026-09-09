import { useEffect, useState } from "react";

/**
 * True only on iPad in landscape. `client/index.html` stamps `data-ipad-scale` on <html>
 * for iPads (it viewport-scales the phone layout there); orientation comes from the
 * layout viewport, which tracks device rotation. Phones and the web app always get false,
 * so anything gated on this leaves their layouts untouched.
 */
export function isIpadLandscape(): boolean {
  if (typeof window === "undefined") return false;
  return (
    document.documentElement.hasAttribute("data-ipad-scale") &&
    window.matchMedia("(orientation: landscape)").matches
  );
}

export function useIpadLandscape(): boolean {
  const [value, setValue] = useState(isIpadLandscape);

  useEffect(() => {
    const mql = window.matchMedia("(orientation: landscape)");
    const update = () => setValue(isIpadLandscape());
    mql.addEventListener("change", update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    update();
    return () => {
      mql.removeEventListener("change", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return value;
}
