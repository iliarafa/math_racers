import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { playCarouselClick } from "@/lib/uiSound";
import { getLicenceStatus } from "@/lib/drivingSchoolLicence";

export const DRIVING_SCHOOL_WHATS_NEW_KEY = "drivingSchoolWhatsNew.v1";

function shouldForceShow(): boolean {
  try {
    return new URLSearchParams(window.location.search).get("whatsnew") === "1";
  } catch {
    return false;
  }
}

function hasSeenNotice(): boolean {
  try {
    return localStorage.getItem(DRIVING_SCHOOL_WHATS_NEW_KEY) === "1";
  } catch {
    return false;
  }
}

function markSeen(): void {
  try {
    localStorage.setItem(DRIVING_SCHOOL_WHATS_NEW_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function DrivingSchoolWhatsNew({
  soundEnabled,
  onOpenSchool,
}: {
  soundEnabled: boolean;
  onOpenSchool: () => void;
}) {
  const [open, setOpen] = useState(() =>
    shouldForceShow() || (!hasSeenNotice() && !getLicenceStatus().complete),
  );

  useEffect(() => {
    if (shouldForceShow()) setOpen(true);
  }, []);

  if (!open) return null;

  const dismiss = () => {
    if (soundEnabled) playCarouselClick();
    markSeen();
    setOpen(false);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/80 px-5 py-6"
      style={{ paddingTop: "max(1.5rem, env(safe-area-inset-top))", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      data-testid="driving-school-whats-new"
    >
      <div className="my-auto w-full max-w-sm rounded-2xl bg-[#111] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.55)]">
        <div
          className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#e10600]"
          style={{ fontFamily: "Oxanium, sans-serif" }}
        >
          Stewards’ notice
        </div>
        <h2
          className="mt-2 text-2xl font-bold uppercase tracking-wider text-white"
          style={{ fontFamily: "Oxanium, sans-serif" }}
        >
          Superlicence
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-white/75">
          Graduate Driving School before you race a Grand Prix.
        </p>

        <div className="mt-5 space-y-3">
          <div className="rounded-xl bg-white/5 px-4 py-3">
            <div
              className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45"
              style={{ fontFamily: "Oxanium, sans-serif" }}
            >
              Flashcards
            </div>
            <p className="mt-1 text-sm text-white">Clear all 10 stages.</p>
          </div>
          <div className="rounded-xl bg-white/5 px-4 py-3">
            <div
              className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45"
              style={{ fontFamily: "Oxanium, sans-serif" }}
            >
              Reaction Test
            </div>
            <p className="mt-1 text-sm text-white">Beat 0.33s on the lights.</p>
          </div>
          <div className="rounded-xl bg-white/5 px-4 py-3">
            <div
              className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45"
              style={{ fontFamily: "Oxanium, sans-serif" }}
            >
              Lane Racer
            </div>
            <p className="mt-1 text-sm text-white">Beat the instructor.</p>
          </div>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-white/55">
          Finish all three to unlock Grand Prix. Race Now and Free Practice stay open.
        </p>

        <div className="mt-6 grid gap-3">
          <button
            type="button"
            onClick={() => {
              dismiss();
              onOpenSchool();
            }}
            className="h-12 w-full rounded-lg bg-white font-bold uppercase tracking-wider text-black hover:bg-white/90"
            style={{ fontFamily: "Oxanium, sans-serif" }}
            data-testid="button-whats-new-school"
          >
            Open Driving School
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="h-11 w-full rounded-lg bg-white/5 text-sm font-medium uppercase tracking-wider text-white/70 hover:bg-white/10 hover:text-white"
            style={{ fontFamily: "Oxanium, sans-serif" }}
            data-testid="button-whats-new-dismiss"
          >
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
