/**
 * Shared Web Audio singleton plus the setup-screen click.
 *
 * The AudioContext lives here rather than in a page so that components outside
 * `Game.tsx` (the shared setup card) can make sound without opening a second context.
 * Game-specific race sounds still live in `Game.tsx` and import `getAudioContext`.
 */

let audioContext: AudioContext | null = null;

export const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
};

/** Short blip for stepping through a setup drum or toggle. */
export const playCarouselClick = () => {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.value = 600;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.08);
  } catch (e) {}
};
