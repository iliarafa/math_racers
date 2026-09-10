import { Link } from "wouter";
import logoWhiteImage from "@assets/logo-white.svg";

/**
 * Only reachable from a typed or stale URL in the browser: the app never
 * navigates to an unknown route. Styled like the Paddock (black, Oxanium).
 */
export default function NotFound() {
  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center bg-black px-6 text-center text-white"
      style={{ fontFamily: 'Oxanium, sans-serif' }}
      data-testid="page-not-found"
    >
      <Link href="/hub">
        <img src={logoWhiteImage} alt="Math Racer" className="h-9 w-auto mb-10 cursor-pointer hover:opacity-70 transition-opacity" />
      </Link>
      <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#e10600]">Off track</div>
      <h1 className="mt-3 text-3xl md:text-4xl font-bold uppercase tracking-widest">Page not found</h1>
      <p className="mt-4 max-w-xs text-sm text-white/65">
        This link isn't on the calendar. Head back to the Paddock and pick a race.
      </p>
      <Link
        href="/hub"
        className="mt-8 flex h-12 w-full max-w-xs items-center justify-center rounded-lg bg-white font-bold uppercase tracking-wider text-black hover:bg-white/90 transition-colors"
        data-testid="button-back-to-paddock"
      >
        Back to the Paddock
      </Link>
    </div>
  );
}
