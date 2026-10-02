/**
 * Race sounds shared by the racing screens: the start-light beeps, the answer tones, the team
 * radio chirp and the keypad click, all on the shared AudioContext from `uiSound.ts`. `initAudio` starts that
 * context once with a silent blip. The power-up sounds and `playSimplyLovely` stay in `Game.tsx`.
 */

import { getAudioContext } from "./uiSound";

let audioInitialized = false;

export const initAudio = () => {
  if (audioInitialized) return;
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.001);
    audioInitialized = true;
  } catch (e) {
    // Silent fail
  }
};

export const playBeep = (frequency: number = 800, duration: number = 150) => {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'square';
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration / 1000);
  } catch (e) {
    // Silent fail for audio issues
  }
};

export const playCorrectSound = () => {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
    oscillator.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  } catch (e) {
    // Silent fail
  }
};

export const playKeypadClick = () => {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = 600;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.04);
  } catch (e) {
    // Silent fail
  }
};

export const playIncorrectSound = () => {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(200, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);

    gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  } catch (e) {
    // Silent fail
  }
};

/** Team radio: a squelch click, then a high-low double beep as the engineer keys the mic. */
export const playRadioChirp = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.04), ctx.sampleRate);
    const samples = noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    const squelch = ctx.createBufferSource();
    squelch.buffer = noise;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 2200;
    const squelchGain = ctx.createGain();
    squelchGain.gain.setValueAtTime(0.12, now);
    squelchGain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
    squelch.connect(band);
    band.connect(squelchGain);
    squelchGain.connect(ctx.destination);
    squelch.start(now);

    for (const [frequency, start] of [[1400, 0.05], [1050, 0.13]]) {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gainNode.gain.setValueAtTime(0.0001, now + start);
      gainNode.gain.exponentialRampToValueAtTime(0.15, now + start + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + start + 0.07);
      oscillator.start(now + start);
      oscillator.stop(now + start + 0.07);
    }
  } catch (e) {
    // Silent fail
  }
};
