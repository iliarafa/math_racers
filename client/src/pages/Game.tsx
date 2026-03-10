import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Link, useLocation } from "wouter";
import useEmblaCarousel from "embla-carousel-react";
import { GameLayout } from "@/components/layout/GameLayout";
import { TrackProgress } from "@/components/TrackProgress";
import { useGameState, generateQuestion, Question, CIRCUITS, RACE_LENGTH, GRAND_PRIX_PRACTICE_LENGTH, getRaceLength, DRIVERS_2025, POSITION_POINTS, Circuit, DRIVERS, Driver, getAeroZones, getCurrentAeroZone, calculateEnergyHarvest, Difficulty, isSeriesAvailable, isCircuitUnlockedForSeries, getPreviousSeriesLabel, getNextRequiredSeriesLabel, DynamicDifficultyState, initDynamicDifficulty, updateDynamicDifficulty, getEasierDifficulty, calculatePSTScore } from "@/lib/gameLogic";
import { submitLeaderboardEntry } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Check, X, RotateCcw, Home, Timer, Delete, Pause, Play, BarChart3, ChevronLeft, ChevronRight, Download, Share2 } from "lucide-react";
import { usePurchase } from "@/hooks/use-purchase";
import { Paywall } from "@/components/Paywall";

// Import assets
import tireHard from "@assets/IMG_0385_1768772937370.png";
import tireMedium from "@assets/IMG_0384_1768772937370.png";
import tireSoft from "@assets/IMG_0383_1768772937370.png";
import weatherSun from "@/assets/weather_sun.png";
import weatherRain from "@/assets/weather_rain.png";
import weatherRandom from "@/assets/weather_random.png";
import flagItaly from "@/assets/flag_italy.png";
import flagBelgium from "@/assets/flag_belgium.png";
import flagMonaco from "@/assets/flag_monaco.png";
import flagJapan from "@/assets/flag_japan.png";
import flagUK from "@/assets/flag_uk.png";
import flagAustralia from "@/assets/flag_australia.png";
import flagChina from "@/assets/flag_china.png";
import flagBahrain from "@/assets/flag_bahrain.jpeg";
import trackLimitsFlag from "@/assets/track-limits-flag.png";
import trackMonza from "@/assets/track_monza.png";
import trackSpa from "@/assets/track_spa.png";
import trackMonaco from "@/assets/track_monaco.png";
import trackSuzuka from "@/assets/track_suzuka.png";
import trackSilverstone from "@/assets/track_silverstone.png";
import trackMelbourne from "@/assets/track_melbourne.png";
import trackChina from "@/assets/track_china.png";
import circuitMonzaRed from "@/assets/circuit_monza_red.png";
import circuitMonzaBlack from "@/assets/circuit_monza_black.png";
import circuitSuzukaRed from "@/assets/circuit_suzuka_red.png";
import circuitSuzukaBlack from "@/assets/circuit_suzuka_black.png";
import circuitMonacoRed from "@/assets/circuit_monaco_red.png";
import circuitMonacoBlack from "@/assets/circuit_monaco_black.png";
import circuitSilverstoneRed from "@/assets/circuit_silverstone_red.png";
import circuitSilverstoneBlack from "@/assets/circuit_silverstone_black.png";
import circuitSpaRed from "@/assets/circuit_spa_red.png";
import circuitSpaBlack from "@/assets/circuit_spa_black.png";
import trackBahrain from "@/assets/track_bahrain.png";
import simplyLovelyAudio from "@/assets/simply_lovely.m4a";
import logoImage from "@assets/1Asset_3@2x_1767902844976.png";
import garageCar from "@/assets/garage_car.jpeg";
import trackIllustration from "@/assets/track_illustration.jpeg";

// ── Grand Prix Circuit Config ──────────────────────────────────────
// Change these fields each week to follow the F1 calendar.
// Also add the new track/flag assets as imports above and update
// SIM_LAP_COUNTS in gameLogic.ts if the circuit is new.
const CURRENT_GRAND_PRIX = {
  circuitId: 'china',
  name: 'SHANGHAI',
  country: 'China',
  trackImage: trackChina,
  flagImage: flagChina,
  rainProbability: 0.20,
  simLapCount: 56,
  gradient: 'linear-gradient(90deg, #CC0000 0%, #DD0000 50%, #FFD700 100%)',
};
// ───────────────────────────────────────────────────────────────────

const FLAG_IMAGES: { [circuitId: string]: string } = {
  "monza": flagItaly,
  "spa": flagBelgium,
  "monaco": flagMonaco,
  "suzuka": flagJapan,
  "silverstone": flagUK,
  [CURRENT_GRAND_PRIX.circuitId]: CURRENT_GRAND_PRIX.flagImage,
  "bahrain": flagBahrain,
};

const TRACK_IMAGES: { [circuitId: string]: string } = {
  "monza": trackMonza,
  "spa": trackSpa,
  "monaco": trackMonaco,
  "suzuka": trackSuzuka,
  "silverstone": trackSilverstone,
  [CURRENT_GRAND_PRIX.circuitId]: CURRENT_GRAND_PRIX.trackImage,
};

const CIRCUIT_MAP_IMAGES: { [circuitId: string]: { red: string; black: string } } = {
  "monza": { red: circuitMonzaRed, black: circuitMonzaBlack },
  "suzuka": { red: circuitSuzukaRed, black: circuitSuzukaBlack },
  "monaco": { red: circuitMonacoRed, black: circuitMonacoBlack },
  "silverstone": { red: circuitSilverstoneRed, black: circuitSilverstoneBlack },
  "spa": { red: circuitSpaRed, black: circuitSpaBlack },
};

// Custom checkered flag icon component
const CheckeredFlag = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M4 21V4" />
    <rect x="4" y="4" width="16" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <rect x="4" y="4" width="4" height="2.5" fill="currentColor" stroke="none" />
    <rect x="12" y="4" width="4" height="2.5" fill="currentColor" stroke="none" />
    <rect x="8" y="6.5" width="4" height="2.5" fill="currentColor" stroke="none" />
    <rect x="16" y="6.5" width="4" height="2.5" fill="currentColor" stroke="none" />
    <rect x="4" y="9" width="4" height="2.5" fill="currentColor" stroke="none" />
    <rect x="12" y="9" width="4" height="2.5" fill="currentColor" stroke="none" />
    <rect x="8" y="11.5" width="4" height="2.5" fill="currentColor" stroke="none" />
    <rect x="16" y="11.5" width="4" height="2.5" fill="currentColor" stroke="none" />
  </svg>
);

// Weather icon components
const SunIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);

const RainCloudIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path d="M19 14.5A3.5 3.5 0 0019 7.5h-1.26A6 6 0 006 9.5a6 6 0 00.5 2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M8 16v3M12 15v4M16 16v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const RandomDiceIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8" cy="8" r="1.5" fill="currentColor" />
    <circle cx="16" cy="8" r="1.5" fill="currentColor" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    <circle cx="8" cy="16" r="1.5" fill="currentColor" />
    <circle cx="16" cy="16" r="1.5" fill="currentColor" />
  </svg>
);

const createGrandPrixCircuit = (op: string): Circuit => ({
  id: CURRENT_GRAND_PRIX.circuitId,
  name: CURRENT_GRAND_PRIX.name,
  type: op,
  description: 'Grand Prix',
  mapUrl: '',
  paths: { s1: '', s2: '', s3: '' }
});

const createBahrainCircuit = (op: string): Circuit => ({
  id: 'bahrain',
  name: CURRENT_GRAND_PRIX.name,
  type: op,
  description: 'Pre-Season Testing',
  mapUrl: '',
  paths: { s1: '', s2: '', s3: '' }
});

const OPERATION_OPTIONS = [
  { label: '+', type: 'Addition' },
  { label: '−', type: 'Subtraction' },
  { label: '×', type: 'Multiplication' },
  { label: '÷', type: 'Division' },
  { label: 'x=?', type: 'Variables' },
];

export type Weather = 'dry' | 'wet' | 'random';

const WEATHER_OPTIONS: { id: Weather; name: string; icon: string; description: string }[] = [
  { id: 'dry', name: 'DRY', icon: 'sun', description: 'Standard racing conditions' },
  { id: 'wet', name: 'WET', icon: 'rain', description: 'Harder numbers, tighter times' },
  { id: 'random', name: 'RANDOM', icon: 'random', description: 'Based on real circuit weather' },
];

// Historical rain probability for each circuit (based on real F1 data)
const CIRCUIT_RAIN_PROBABILITY: { [circuitId: string]: number } = {
  "spa": 0.60,        // Spa-Francorchamps: 50-70% -> 60%
  "silverstone": 0.50, // Silverstone: 40-60% -> 50%
  "suzuka": 0.42,     // Suzuka: 35-50% -> 42%
  "monaco": 0.25,     // Monaco: 20-30% -> 25%
  "monza": 0.20,      // Monza: 15-25% -> 20%
  "bahrain": 0.05,    // Bahrain: Very rare rain -> 5%
  [CURRENT_GRAND_PRIX.circuitId]: CURRENT_GRAND_PRIX.rainProbability,
};

// Weather Carousel Component
const WeatherCarousel = ({ 
  onSelect, 
  selectedWeather,
  soundEnabled
}: { 
  onSelect: (weather: Weather) => void;
  selectedWeather: Weather;
  soundEnabled: boolean;
}) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true,
    align: 'center',
    skipSnaps: false,
    startIndex: WEATHER_OPTIONS.findIndex(w => w.id === selectedWeather)
  });
  const [selectedIndex, setSelectedIndex] = useState(WEATHER_OPTIONS.findIndex(w => w.id === selectedWeather));
  const isFirstRender = useRef(true);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const onSelectChange = useCallback(() => {
    if (!emblaApi) return;
    const index = emblaApi.selectedScrollSnap();
    setSelectedIndex(index);
    onSelect(WEATHER_OPTIONS[index].id);
    if (!isFirstRender.current && soundEnabled) {
      playCarouselClick();
    }
    isFirstRender.current = false;
  }, [emblaApi, onSelect, soundEnabled]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelectChange();
    emblaApi.on('select', onSelectChange);
    emblaApi.on('reInit', onSelectChange);
  }, [emblaApi, onSelectChange]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') scrollPrev();
      if (e.key === 'ArrowRight') scrollNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scrollPrev, scrollNext]);

  const getWeatherIcon = (iconType: string) => {
    switch (iconType) {
      case 'sun': return weatherSun;
      case 'rain': return weatherRain;
      case 'random': return weatherRandom;
      default: return weatherSun;
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {WEATHER_OPTIONS.map((weather) => (
            <div
              key={weather.id}
              className="flex-[0_0_100%] min-w-0 flex flex-col items-center gap-2 py-2"
            >
              <img src={getWeatherIcon(weather.icon)} alt={weather.name} className="w-12 h-12 object-contain select-none" draggable={false} />
              <div className="text-lg font-bold" style={{ fontFamily: 'Oxanium, sans-serif' }}>{weather.name}</div>
              <div className="text-xs text-muted-foreground text-center px-2" data-testid={`text-weather-description-${weather.id}`}>{weather.description}</div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={scrollPrev}
        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full p-2 rounded-full hover:bg-secondary transition-colors"
        data-testid="weather-carousel-prev"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button
        onClick={scrollNext}
        className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-full p-2 rounded-full hover:bg-secondary transition-colors"
        data-testid="weather-carousel-next"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      <div className="flex justify-center gap-2 mt-3">
        {WEATHER_OPTIONS.map((_, index) => (
          <button
            key={index}
            onClick={() => emblaApi?.scrollTo(index)}
            className={cn(
              "w-2 h-2 rounded-full transition-colors",
              selectedIndex === index ? "bg-primary" : "bg-border"
            )}
            data-testid={`weather-dot-${index}`}
          />
        ))}
      </div>
    </div>
  );
};

// Circuit Carousel Component
const CircuitCarousel = ({ onSelect, soundEnabled }: { onSelect: (circuit: Circuit) => void; soundEnabled: boolean }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true,
    align: 'center',
    skipSnaps: false
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const isFirstRender = useRef(true);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const onSelectChange = useCallback(() => {
    if (!emblaApi) return;
    const newIndex = emblaApi.selectedScrollSnap();
    setSelectedIndex(newIndex);
    onSelect(CIRCUITS[newIndex]);
    if (!isFirstRender.current && soundEnabled) {
      playCarouselClick();
    }
    isFirstRender.current = false;
  }, [emblaApi, onSelect, soundEnabled]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelectChange();
    emblaApi.on('select', onSelectChange);
    emblaApi.on('reInit', onSelectChange);
  }, [emblaApi, onSelectChange]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') scrollPrev();
      if (e.key === 'ArrowRight') scrollNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scrollPrev, scrollNext]);

  return (
    <div className="w-full max-w-lg mx-auto relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {CIRCUITS.map((circuit, index) => (
            <div
              key={circuit.id}
              className="flex-[0_0_100%] min-w-0 flex justify-center"
            >
              <img 
                src={TRACK_IMAGES[circuit.id]} 
                alt={`${circuit.name} - ${circuit.type}`} 
                className="h-44 object-contain select-none"
                draggable={false}
                data-testid={`track-image-${circuit.id}`}
              />
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={scrollPrev}
        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full p-2 rounded-full hover:bg-secondary transition-colors"
        data-testid="carousel-prev"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        onClick={scrollNext}
        className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-full p-2 rounded-full hover:bg-secondary transition-colors"
        data-testid="carousel-next"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      <div className="flex justify-center gap-2 mt-4">
        {CIRCUITS.map((_, index) => (
          <button
            key={index}
            onClick={() => emblaApi?.scrollTo(index)}
            className={cn(
              "w-2 h-2 rounded-full transition-colors",
              selectedIndex === index ? "bg-primary" : "bg-border"
            )}
            data-testid={`carousel-dot-${index}`}
          />
        ))}
      </div>
    </div>
  );
};

let audioContext: AudioContext | null = null;
let audioInitialized = false;

const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
};

const playCarouselClick = () => {
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

const initAudio = () => {
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

const playSimplyLovely = () => {
  try {
    const audio = new Audio(simplyLovelyAudio);
    audio.volume = 0.7;
    audio.play();
  } catch (e) {
    // Silent fail
  }
};

const playBeep = (frequency: number = 800, duration: number = 150) => {
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

const playCorrectSound = () => {
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

const playKeypadClick = () => {
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

const playIncorrectSound = () => {
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

const playBoostChargedSound = () => {
  try {
    const ctx = getAudioContext();
    // Play two quick ascending tones for "power up" effect
    [0, 0.1].forEach((delay, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.value = i === 0 ? 880 : 1320; // A5, E6
      gainNode.gain.setValueAtTime(0.25, ctx.currentTime + delay);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.15);
      oscillator.start(ctx.currentTime + delay);
      oscillator.stop(ctx.currentTime + delay + 0.15);
    });
  } catch (e) {
    // Silent fail
  }
};

const playOvertakeActivatedSound = () => {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(440, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2);
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  } catch (e) {
    // Silent fail
  }
};

const playAeroChargedSound = () => {
  try {
    const ctx = getAudioContext();
    // Whoosh-like ascending sweep
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(300, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.2);
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.25);
  } catch (e) {
    // Silent fail
  }
};

const playAeroActivatedSound = () => {
  try {
    const ctx = getAudioContext();
    // Wind/whoosh effect using noise-like oscillator
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(200, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
    oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.3);
    gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // Silent fail
  }
};

export default function Game() {
  const { state, addCoins, incrementStreak, resetStreak, incrementLaps, addCareerPoints, incrementRacesWon, championCircuit, updatePersonalBest, recordLapTime, setPlayerName } = useGameState();
  const { isPremium } = usePurchase();
  const [, setLocation] = useLocation();
  const [raceMode, setRaceMode] = useState<'solo' | 'bot' | 'multiplayer'>('bot'); // Default to bot for race mode
  const [botProgress, setBotProgress] = useState(0);
  const [botLapResults, setBotLapResults] = useState<Array<{
    sectorColor: 'purple' | 'green' | 'yellow';
    botTime: number;
  }>>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const currentDifficultyRef = useRef<Difficulty>('easy');
  const [selectedCircuit, setSelectedCircuit] = useState<Circuit | null>(null);
  const [selectedWeather, setSelectedWeather] = useState<Weather>('dry');
  const [actualWeather, setActualWeather] = useState<'dry' | 'wet'>('dry');
  // Alternating weather state for Realism mode with random weather
  const [weatherChangePoints, setWeatherChangePoints] = useState<number[]>([]);
  const [initialWeather, setInitialWeather] = useState<'dry' | 'wet'>('dry');

  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [isGrandPrix, setIsGrandPrix] = useState(false);
  const [isPreSeasonTesting, setIsPreSeasonTesting] = useState(false);
  const [pstSessionLog, setPstSessionLog] = useState(false);
  const pstStintsRef = useRef<Array<{ startIndex: number; endIndex: number; time: number }>>([]); // tracks each stint's lap range and elapsed time
  const [selectedOperation, setSelectedOperation] = useState<string>('Addition');
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [pendingScoreSubmission, setPendingScoreSubmission] = useState<{
    playerId: string;
    operation: string;
    score: number;
    totalTime: number;
    mistakes: number;
    accuracy: number;
    difficultyAchieved: string;
  } | null>(null);
  const [pstCycleCount, setPstCycleCount] = useState(0);
  const [nameInput, setNameInput] = useState('');
  // Grand Prix session state
  const [grandPrixPhase, setGrandPrixPhase] = useState<'rw_practice' | 'rw_qualifying' | 'rw_race'>('rw_practice');
  const dynamicDifficultyRef = useRef<DynamicDifficultyState | null>(null);
  const [grandPrixLockedDifficulty, setGrandPrixLockedDifficulty] = useState<Difficulty | null>(null);
  const [grandPrixPolePosition, setGrandPrixPolePosition] = useState(false);
  const polePositionUsedRef = useRef(false);
  const [grandPrixPracticeCompleted, setGrandPrixPracticeCompleted] = useState(false);
  const [grandPrixQualifyingCompleted, setGrandPrixQualifyingCompleted] = useState(false);
  const [dynamicDifficultyDisplay, setDynamicDifficultyDisplay] = useState<Difficulty>('beginner');

  // Force sim mode on for Grand Prix and Pre-Season Testing
  const effectiveSimMode = (isGrandPrix || isPreSeasonTesting) ? true : state.simMode;

  const raceLength = (() => {
    if (isPracticeMode && !isGrandPrix) return 100;
    if (!selectedCircuit) return RACE_LENGTH;
    if (isGrandPrix && grandPrixPhase === 'rw_practice') return GRAND_PRIX_PRACTICE_LENGTH;
    if (isGrandPrix && grandPrixPhase === 'rw_qualifying') return RACE_LENGTH;
    return getRaceLength(selectedCircuit.id, !isPracticeMode && effectiveSimMode);
  })();
  const botFinished = botProgress >= raceLength;
  const [selectedTab, setSelectedTab] = useState<'race' | 'practice' | 'rw_practice' | 'rw_qualifying' | 'rw_race' | 'testing'>('race');
  const [isPaused, setIsPaused] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [progress, setProgress] = useState(0);

  // Check if we're in realism mode with random weather (alternating weather feature)
  const isRealismRandom = !isPracticeMode && effectiveSimMode && selectedWeather === 'random';

  // Generate random weather change points for a race
  const generateWeatherSchedule = (length: number): number[] => {
    const numChanges = 3 + Math.floor(Math.random() * 3); // 3-5 changes
    const changePoints: number[] = [];
    const minLap = Math.floor(length * 0.1);
    const maxLap = Math.floor(length * 0.9);

    for (let i = 0; i < numChanges; i++) {
      const lap = minLap + Math.floor(Math.random() * (maxLap - minLap));
      if (!changePoints.includes(lap)) {
        changePoints.push(lap);
      }
    }

    return changePoints.sort((a, b) => a - b);
  };

  // Get current weather based on progress and change points
  const getCurrentWeather = (
    currentProgress: number,
    changePoints: number[],
    startWeather: 'dry' | 'wet'
  ): 'dry' | 'wet' => {
    const changesPassed = changePoints.filter(p => currentProgress >= p).length;
    return changesPassed % 2 === 0 ? startWeather : (startWeather === 'dry' ? 'wet' : 'dry');
  };

  // Compute current weather dynamically for realism random mode
  const currentWeather = isRealismRandom
    ? getCurrentWeather(progress, weatherChangePoints, initialWeather)
    : actualWeather;

  const [lapResults, setLapResults] = useState<Array<{
    result: 'correct' | 'incorrect';
    speed: 'fast' | 'normal' | 'slow';
    question: string;
    playerAnswer: number;
    correctAnswer: number;
    sectorColor: 'green' | 'purple' | 'yellow' | 'red';
    responseTime: number;
    wrongAttempts?: number[];
  }>>([]);
  const [mistakes, setMistakes] = useState(0);
  const [inPurpleMode, setInPurpleMode] = useState(false);
  const questionStartTimeRef = useRef<number>(Date.now());
  // Track the best time for each sector and who holds it (F1-style competitive timing)
  const [revealedAttempts, setRevealedAttempts] = useState<Set<string>>(new Set());
  const [gameStatus, setGameStatus] = useState<'mode_select' | 'driver_select' | 'operation_select' | 'selecting' | 'countdown' | 'go' | 'racing' | 'finished' | 'crashed' | 'paywall'>('mode_select');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [countdownLight, setCountdownLight] = useState(0);
  const [finalMistakes, setFinalMistakes] = useState(0);
  const [showCrashDebrief, setShowCrashDebrief] = useState(false);
  const [showPenalty, setShowPenalty] = useState(false);
  const [showBlackWhiteFlag, setShowBlackWhiteFlag] = useState(false);
  const [showFiveSecPenalty, setShowFiveSecPenalty] = useState(false);
  const [penaltyMessage, setPenaltyMessage] = useState<{ text: string; color: string }>({ text: '', color: 'red' });
  const [mistakeLog, setMistakeLog] = useState<Array<{ question: string; yourAnswer: number; correctAnswer: number }>>([]);
  const [questionAttempts, setQuestionAttempts] = useState(0);
  const [currentSectorRed, setCurrentSectorRed] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  // OVERTAKE system state (energy bar based)
  const [overtakeEnergy, setOvertakeEnergy] = useState(0);           // 0-100% energy meter
  const [overtakeActive, setOvertakeActive] = useState(false);       // Currently draining?
  const [overtakeStartTime, setOvertakeStartTime] = useState<number | null>(null);
  const [overtakeStartEnergy, setOvertakeStartEnergy] = useState(0);
  const [botFrozen, setBotFrozen] = useState(false);        // Bot freeze state
  const [showBoostMessage, setShowBoostMessage] = useState<string | null>(null);
  const [overtakeAvailable, setOvertakeAvailable] = useState(false);       // Latched availability
  const overtakeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const overtakeRemainingRef = useRef<number>(0);  // Remaining ms when paused
  const wrongAttemptsRef = useRef<number[]>([]);
  // AERO system state (DRS-style zone-based)
  const [aeroZones, setAeroZones] = useState<number[]>([]);           // Zone start positions
  const [aeroAvailable, setAeroAvailable] = useState(false);          // Currently in an unused zone?
  const [aeroActive, setAeroActive] = useState(false);                // Activated in this zone?
  const [aeroUsedZones, setAeroUsedZones] = useState<Set<number>>(new Set()); // Track used zones
  const [showAeroMessage, setShowAeroMessage] = useState<string | null>(null);
  const penaltyTimeRef = useRef(0);
  const raceStartTimeRef = useRef<number | null>(null);
  const soundEnabledRef = useRef(state.soundEnabled);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const sectorBestTimesRef = useRef<Array<{bestTime: number; holder: 'player' | 'bot'}>>([]);

  useEffect(() => {
    soundEnabledRef.current = state.soundEnabled;
  }, [state.soundEnabled]);

  // Latch OVERTAKE availability: once within range, stays available until explicitly cleared
  useEffect(() => {
    // Latch ON: once player is behind bot and within 2 sectors, mark available
    // In practice mode, available whenever there's energy
    if (
      !overtakeAvailable &&
      !overtakeActive &&
      overtakeEnergy > 0 &&
      (isPracticeMode || (botProgress > progress && (botProgress - progress) <= 2 && !botFinished)) &&
      gameStatus === 'racing'
    ) {
      setOvertakeAvailable(true);
    }
    // Latch OFF: clear if energy gone, bot finished (not in practice), or race not active
    if (
      overtakeAvailable &&
      !overtakeActive &&
      (overtakeEnergy <= 0 || (!isPracticeMode && botFinished) || gameStatus !== 'racing')
    ) {
      setOvertakeAvailable(false);
    }
  }, [botProgress, progress, overtakeEnergy, overtakeActive, botFinished, gameStatus, overtakeAvailable]);


  // Keep difficulty ref in sync with selected driver
  useEffect(() => {
    if (selectedDriver?.difficulty) {
      currentDifficultyRef.current = selectedDriver.difficulty;
    }
  }, [selectedDriver]);

  // Cleanup OVERTAKE timer on unmount or game end
  useEffect(() => {
    if (gameStatus === 'finished' || gameStatus === 'crashed') {
      if (overtakeTimerRef.current) {
        clearTimeout(overtakeTimerRef.current);
        overtakeTimerRef.current = null;
      }
      setOvertakeActive(false);
      setBotFrozen(false);
    }
  }, [gameStatus]);

  // Sync raceMode with selectedTab - race mode always uses bot, practice uses solo
  useEffect(() => {
    if (selectedTab === 'race' && !isPracticeMode) {
      setRaceMode('bot');
    } else if (selectedTab === 'practice' || isPracticeMode) {
      setRaceMode('solo');
    }
  }, [selectedTab, isPracticeMode]);

  // Handle mode query parameter from navigation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    if (mode === 'practice') {
      setSelectedTab('practice');
      setIsPracticeMode(true);
      // raceMode will be synced by the useEffect above
      setGameStatus('selecting');
      // Auto-select first driver for practice
      if (!selectedDriver) {
        setSelectedDriver(DRIVERS[0]);
      }
    } else if (mode === 'race') {
      setSelectedTab('race');
      setIsPracticeMode(false);
      // raceMode will be synced by the useEffect above
      setGameStatus('selecting');
      // Auto-select first driver for race
      if (!selectedDriver) {
        setSelectedDriver(DRIVERS[0]);
      }
    }
    // Clear the query param to avoid re-triggering
    if (mode) {
      window.history.replaceState({}, '', '/game');
    }
  }, []);

  // Countdown sequence: 5 lights, then immediately start racing
  useEffect(() => {
    if (gameStatus === 'countdown' && selectedCircuit && selectedDriver) {
      // Resolve random weather at countdown start using circuit-specific rain probability
      let resolvedWeather: 'dry' | 'wet';
      const currentRaceLength = raceLength;

      if (selectedWeather === 'random') {
        const rainProbability = CIRCUIT_RAIN_PROBABILITY[selectedCircuit.id] || 0.5;
        resolvedWeather = Math.random() < rainProbability ? 'wet' : 'dry';

        // In realism mode with random weather, set up alternating weather
        if (!isPracticeMode && effectiveSimMode) {
          const schedule = generateWeatherSchedule(currentRaceLength);
          setWeatherChangePoints(schedule);
          setInitialWeather(resolvedWeather);
        }
      } else {
        resolvedWeather = selectedWeather;
        // Clear alternating weather state for non-random weather
        setWeatherChangePoints([]);
      }
      setActualWeather(resolvedWeather);
      const isWet = resolvedWeather === 'wet';

      // Initialize AERO zones based on race length and sim mode
      let zones: number[];
      if (isPracticeMode) {
        // Practice modes: 1 AERO zone per 10 laps, evenly spaced
        const count = Math.floor(currentRaceLength / 10);
        const spacing = currentRaceLength / (count + 1);
        zones = Array.from({ length: count }, (_, i) => Math.floor(spacing * (i + 1)));
      } else {
        zones = getAeroZones(currentRaceLength, effectiveSimMode);
      }
      setAeroZones(zones);
      setAeroUsedZones(new Set());
      setAeroAvailable(false);
      setAeroActive(false);

      // Set difficulty for Grand Prix phases
      const raceDifficulty = (isGrandPrix && grandPrixLockedDifficulty && grandPrixPhase !== 'rw_practice')
        ? grandPrixLockedDifficulty
        : selectedDriver.difficulty;
      currentDifficultyRef.current = raceDifficulty;

      // Initialize dynamic difficulty for Grand Prix practice and Pre-Season Testing
      if ((isGrandPrix && grandPrixPhase === 'rw_practice') || isPreSeasonTesting) {
        dynamicDifficultyRef.current = initDynamicDifficulty(selectedDriver.difficulty);
        setDynamicDifficultyDisplay(selectedDriver.difficulty);
      }

      // Reset pole position used flag for Grand Prix race
      polePositionUsedRef.current = false;

      let lightCount = 0;
      const interval = setInterval(() => {
        if (lightCount >= 5) {
          clearInterval(interval);
          if (soundEnabledRef.current) {
            playBeep(1200, 200);
          }
          setQuestion(generateQuestion(selectedCircuit.id, raceDifficulty, isWet, 0, undefined, (isGrandPrix || isPreSeasonTesting) ? selectedOperation : undefined));
          questionStartTimeRef.current = Date.now();
          setGameStatus('racing');
          return;
        }
        if (soundEnabledRef.current) {
          playBeep(800, 150);
        }
        lightCount++;
        setCountdownLight(lightCount);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [gameStatus, selectedCircuit, selectedDriver, selectedWeather, effectiveSimMode]);


  // Timer Logic - only runs during racing and not paused
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameStatus === 'racing' && !isPaused && !showNamePrompt) {
      if (raceStartTimeRef.current === null) {
        raceStartTimeRef.current = Date.now();
      }
      interval = setInterval(() => {
        const baseTime = Date.now() - raceStartTimeRef.current!;
        setElapsedTime(baseTime + penaltyTimeRef.current);
      }, 10);
    } else if ((isPaused || showNamePrompt) && raceStartTimeRef.current !== null) {
      // When pausing or showing name prompt, adjust the start time to account for paused duration
      const pausedDuration = Date.now() - raceStartTimeRef.current - (elapsedTime - penaltyTimeRef.current);
      if (pausedDuration > 0) {
        raceStartTimeRef.current = raceStartTimeRef.current + pausedDuration;
      }
    }
    return () => clearInterval(interval);
  }, [gameStatus, isPaused, showNamePrompt]);

  // Guard: redirect to proper selection if missing driver/circuit
  useEffect(() => {
    if (!selectedDriver && gameStatus !== 'mode_select' && gameStatus !== 'driver_select' && gameStatus !== 'operation_select' && gameStatus !== 'paywall') {
      setGameStatus('mode_select');
    } else if (!selectedCircuit && (gameStatus === 'countdown' || gameStatus === 'go' || gameStatus === 'racing' || gameStatus === 'finished' || gameStatus === 'crashed')) {
      setGameStatus('selecting');
    }
  }, [selectedDriver, selectedCircuit, gameStatus]);

  // Auto-select first circuit when entering selecting state
  useEffect(() => {
    if (gameStatus === 'selecting' && !selectedCircuit) {
      if (isGrandPrix) {
        setSelectedCircuit(createGrandPrixCircuit(selectedOperation));
      } else if (isPreSeasonTesting) {
        setSelectedCircuit(createBahrainCircuit(selectedOperation));
      } else {
        setSelectedCircuit(CIRCUITS[0]);
      }
    }
  }, [gameStatus, selectedCircuit]);

  // Keyboard input for desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStatus !== 'racing' && gameStatus !== 'go') return;
      if (feedback !== 'idle') return;
      if (isPaused) return;

      if (e.key >= '0' && e.key <= '9') {
        setAnswer(prev => prev + e.key);
      } else if (e.key === 'Backspace') {
        setAnswer(prev => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'Clear' || e.key === '-') {
        e.preventDefault();
        handleAero();
      } else if (e.key === '\\' || e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleOvertake();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStatus, feedback, question, answer, selectedCircuit, progress, mistakes, isPaused, aeroAvailable, aeroActive, overtakeEnergy, overtakeActive, overtakeAvailable, botFinished]);

  const handleDriverSelect = (driver: Driver) => {
    initAudio();
    setSelectedDriver(driver);
    localStorage.setItem('lastSelectedDriverId', driver.id);
    if (isGrandPrix) {
      setSelectedCircuit(createGrandPrixCircuit(selectedOperation));
    } else if (isPreSeasonTesting) {
      setSelectedCircuit(createBahrainCircuit(selectedOperation));
    }
    setGameStatus('selecting');
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  };

  const exportTelemetryCSV = () => {
    const lines: string[] = [];
    
    // Header info
    lines.push('F1 MATH RACER - TELEMETRY EXPORT');
    lines.push(`Circuit,${selectedCircuit?.name || 'Unknown'}`);
    lines.push(`Difficulty,${selectedDriver?.name || 'Unknown'}`);
    lines.push(`Total Time,${formatTime(elapsedTime)}`);
    lines.push(`Total Mistakes,${finalMistakes}`);
    lines.push(`Accuracy,${Math.max(0, Math.round(((raceLength - finalMistakes) / raceLength) * 100))}%`);
    lines.push('');
    
    // Lap-by-lap analytics
    lines.push('LAP ANALYTICS');
    lines.push('Lap,Question,Your Answer,Correct Answer,Result,Speed,Response Time (ms),Sector Color');
    lapResults.forEach((lap, index) => {
      lines.push(`${index + 1},${lap.question},${lap.playerAnswer},${lap.correctAnswer},${lap.result},${lap.speed},${lap.responseTime},${lap.sectorColor}`);
    });
    lines.push('');
    
    // Mistake review
    if (mistakeLog.length > 0) {
      lines.push('MISTAKE REVIEW');
      lines.push('Question,Your Answer,Correct Answer');
      mistakeLog.forEach((mistake) => {
        lines.push(`${mistake.question},${mistake.yourAnswer},${mistake.correctAnswer}`);
      });
    }
    
    // Create shareable content
    const csvContent = lines.join('\n');

    // Use Web Share API if available (works on iOS)
    if (navigator.share) {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const file = new File([blob], `telemetry_${selectedCircuit?.id || 'race'}_${Date.now()}.csv`, { type: 'text/csv' });

      navigator.share({
        title: 'F1 Math Racer - Race Telemetry',
        text: `Race Results: ${selectedCircuit?.name || 'Race'} - ${formatTime(elapsedTime)} - ${Math.max(0, Math.round(((raceLength - finalMistakes) / raceLength) * 100))}% accuracy`,
        files: [file]
      }).catch(() => {
        // If file sharing fails, try without file
        navigator.share({
          title: 'F1 Math Racer - Race Telemetry',
          text: `Race Results: ${selectedCircuit?.name || 'Race'}\nTime: ${formatTime(elapsedTime)}\nAccuracy: ${Math.max(0, Math.round(((raceLength - finalMistakes) / raceLength) * 100))}%\nMistakes: ${finalMistakes}`
        }).catch(() => {});
      });
    } else {
      // Fallback: download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `telemetry_${selectedCircuit?.id || 'race'}_${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleCircuitSelect = (circuit: Circuit) => {
    initAudio();
    setSelectedCircuit(circuit);
  };

  const handleStartRace = () => {
    if (!selectedCircuit) return;
    setBotProgress(0);
    setBotLapResults([]);
    sectorBestTimesRef.current = []; // Reset sector best times for new race
    // Ensure race mode has bot opponent (practice mode uses solo)
    if (!isPracticeMode) {
      setRaceMode('bot');
    } else {
      setRaceMode('solo');
    }
    setGameStatus('countdown');
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!question || feedback !== 'idle' || gameStatus !== 'racing' || !selectedCircuit) return;

    const val = parseInt(answer);
    if (isNaN(val)) return;

    // Calculate response time for all answers
    const responseTime = Date.now() - questionStartTimeRef.current;

    if (val === question.answer) {
      // Override sector color to red if player needed retries on this question
      const hadRetries = questionAttempts > 0;
      setQuestionAttempts(0);
      setCurrentSectorRed(false);
      setFeedback('correct');
      if (soundEnabledRef.current) {
        playCorrectSound();
      }
      
      // Sector timing and coloring
      let speed: 'fast' | 'normal' | 'slow';
      let sectorColor: 'green' | 'purple' | 'yellow' | 'red' = 'green';

      if (isPracticeMode) {
        // Practice mode: bot-time threshold sector coloring
        const botTime = question.botTime;
        if (responseTime < botTime * 0.5) {
          sectorColor = 'purple';
          speed = 'fast';
        } else if (responseTime < botTime) {
          sectorColor = 'green';
          speed = 'fast';
        } else if (responseTime < botTime * 1.5) {
          sectorColor = 'yellow';
          speed = 'normal';
        } else {
          sectorColor = 'yellow';
          speed = 'slow';
        }
        setInPurpleMode(sectorColor === 'purple');
      } else {
        // Race mode: F1-style competitive sector timing
        // - PURPLE = fastest time for this sector (only one driver)
        // - GREEN = correct answer, within 1.5x of best time
        // - YELLOW = correct answer, slower than 1.5x best time

        const sectorIndex = progress; // Current sector index (0-based)
        const currentBest = sectorBestTimesRef.current[sectorIndex];

        // Check if player has the overall fastest time for this sector
        if (!currentBest || responseTime < currentBest.bestTime) {
          // Player has new best time for this sector - gets purple
          sectorColor = 'purple';
          speed = 'fast';

          // If bot previously had purple on this sector, demote to green
          if (currentBest?.holder === 'bot') {
            setBotLapResults(prev => {
              const updated = [...prev];
              if (updated[sectorIndex]?.sectorColor === 'purple') {
                updated[sectorIndex] = { ...updated[sectorIndex], sectorColor: 'green' };
              }
              return updated;
            });
          }

          // Update the sector best times - sync ref immediately to avoid race condition
          const newBestTime = { bestTime: responseTime, holder: 'player' as const };
          sectorBestTimesRef.current = [...sectorBestTimesRef.current];
          sectorBestTimesRef.current[sectorIndex] = newBestTime;
        } else {
          // Player didn't beat the best - check if within threshold
          const threshold = currentBest.bestTime * 1.5;
          if (responseTime <= threshold) {
            // GREEN - within 1.5x of best time
            sectorColor = 'green';
            speed = 'fast';
          } else {
            // YELLOW - slower than 1.5x best time
            sectorColor = 'yellow';
            speed = 'slow';
          }
        }

        // Force red sector if player needed retries (race mode only)
        if (hadRetries && !isPracticeMode) {
          sectorColor = 'red';
        }

        // Purple mode state tracks if currently in a purple streak (for UI effects)
        const newPurpleMode = sectorColor === 'purple';
        setInPurpleMode(newPurpleMode);
      }

      // Standard coins (no more DRS zones)
      addCoins(10);
      incrementStreak();
      incrementLaps();
      // OVERTAKE energy harvesting: speed-based, faster answers harvest more energy
      // Only when OVERTAKE is not active and power-ups enabled
      if ((raceMode === 'bot' || isPracticeMode) && !overtakeActive && state.powerUpsEnabled && !(isGrandPrix && grandPrixPhase !== 'rw_race')) {
        const energyGain = calculateEnergyHarvest(
          responseTime,
          currentDifficultyRef.current,
          question.operation || 'Addition'
        );
        setOvertakeEnergy(prev => Math.min(prev + energyGain, 100));
      }

      // Update dynamic difficulty for Grand Prix practice and Pre-Season Testing
      if (((isGrandPrix && grandPrixPhase === 'rw_practice') || isPreSeasonTesting) && dynamicDifficultyRef.current) {
        const slowerThanBot = responseTime > question.botTime;
        const updated = updateDynamicDifficulty(dynamicDifficultyRef.current, true, responseTime, question.operation || 'Addition', slowerThanBot);
        dynamicDifficultyRef.current = updated;
        currentDifficultyRef.current = updated.currentDifficulty;
        setDynamicDifficultyDisplay(updated.currentDifficulty);
      }

      // Calculate progress - double if aero or overtake was active
      const hasBonus = aeroActive || overtakeActive;
      let progressGain = hasBonus ? 2 : 1;
      // Grand Prix pole position advantage: first correct answer = 2 sectors
      if (isGrandPrix && grandPrixPhase === 'rw_race' && grandPrixPolePosition && !polePositionUsedRef.current) {
        progressGain = 2;
        polePositionUsedRef.current = true;
      }
      const newProgress = Math.min(progress + progressGain, raceLength); // Cap at race length

      // Deactivate aero after use (success)
      if (aeroActive) {
        setAeroActive(false);
      }

      setProgress(newProgress);

      // Create the main sector entry
      const mainEntry = {
        result: 'correct' as const,
        speed,
        question: question.display,
        playerAnswer: val,
        correctAnswer: question.answer,
        sectorColor,
        responseTime,
        ...(wrongAttemptsRef.current.length > 0 && { wrongAttempts: [...wrongAttemptsRef.current] }),
      };
      wrongAttemptsRef.current = [];

      // When aero/overtake was active and we gained 2 sectors, add a bonus entry
      const actualGain = newProgress - progress; // Handles capping at raceLength
      if (hasBonus && actualGain === 2) {
        // Bonus sector wasn't individually timed, so compute its color properly
        const bonusSectorIndex = progress + 1;
        const bonusBest = sectorBestTimesRef.current[bonusSectorIndex];
        let bonusSectorColor: 'purple' | 'green' | 'yellow' = 'green';

        if (!bonusBest || responseTime < bonusBest.bestTime) {
          bonusSectorColor = 'purple';
          // Demote bot's purple on this bonus sector if needed
          if (bonusBest?.holder === 'bot') {
            setBotLapResults(prev => {
              const updated = [...prev];
              if (updated[bonusSectorIndex]?.sectorColor === 'purple') {
                updated[bonusSectorIndex] = { ...updated[bonusSectorIndex], sectorColor: 'green' };
              }
              return updated;
            });
          }
          sectorBestTimesRef.current = [...sectorBestTimesRef.current];
          sectorBestTimesRef.current[bonusSectorIndex] = { bestTime: responseTime, holder: 'player' as const };
        } else {
          const threshold = bonusBest.bestTime * 1.5;
          bonusSectorColor = responseTime <= threshold ? 'green' : 'yellow';
        }

        // Force red if player had retries
        if (hadRetries && !isPracticeMode) {
          bonusSectorColor = 'red' as any;
        }

        setLapResults(prev => [...prev, mainEntry, {
          ...mainEntry,
          sectorColor: bonusSectorColor,
        }]);
      } else {
        setLapResults(prev => [...prev, mainEntry]);
      }

      if (newProgress >= raceLength) {
        if (isPreSeasonTesting) {
          // PST: 100 questions done — submit score to leaderboard and finish
          const achievedDiff = dynamicDifficultyRef.current?.currentDifficulty || 'beginner';
          const accuracy = Math.max(0, Math.round(((raceLength - mistakes) / raceLength) * 100));
          const score = calculatePSTScore(elapsedTime, mistakes, achievedDiff, raceLength);

          const submission = {
            playerId: state.playerId,
            operation: selectedOperation,
            score,
            totalTime: elapsedTime,
            mistakes,
            accuracy,
            difficultyAchieved: achievedDiff,
          };

          if (!state.playerName) {
            setPendingScoreSubmission(submission);
            setShowNamePrompt(true);
            setNameInput('');
          } else {
            submitLeaderboardEntry({
              ...submission,
              playerName: state.playerName,
            }).then(() => {
              console.log('[PST] Leaderboard entry submitted successfully');
            }).catch((err) => {
              console.error('[PST] Leaderboard submission failed:', err);
            });
          }

          finishRace(mistakes);
        } else if (isGrandPrix && grandPrixPhase === 'rw_practice') {
          // Grand Prix practice: lock difficulty and finish (no auto-loop)
          const achievedDifficulty = dynamicDifficultyRef.current?.currentDifficulty || selectedDriver!.difficulty;
          setGrandPrixLockedDifficulty(achievedDifficulty);
          setGrandPrixPracticeCompleted(true);
          finishRace(mistakes);
        } else {
          finishRace(mistakes);
        }
      } else {
        // Capture overtakeActive state before setTimeout to use correct difficulty
        const wasOvertakeActive = overtakeActive;
        setTimeout(() => {
          setFeedback('idle');
          setAnswer("");
          // Generate 1.5x harder questions while OVERTAKE is active (boostFactor 0.5)
          const boostFactor = wasOvertakeActive ? 0.5 : 0;
          setQuestion(generateQuestion(selectedCircuit.id, currentDifficultyRef.current, currentWeather === 'wet', boostFactor, question?.display, (isGrandPrix || isPreSeasonTesting) ? selectedOperation : undefined));
          questionStartTimeRef.current = Date.now();
        }, 600);
      }
    } else {
      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);
      setFeedback('incorrect');
      if (soundEnabledRef.current) {
        playIncorrectSound();
      }
      resetStreak();

      // Update dynamic difficulty for Grand Prix practice and Pre-Season Testing on wrong answer
      if (((isGrandPrix && grandPrixPhase === 'rw_practice') || isPreSeasonTesting) && dynamicDifficultyRef.current) {
        const updated = updateDynamicDifficulty(dynamicDifficultyRef.current, false, responseTime, question.operation || 'Addition');
        dynamicDifficultyRef.current = updated;
        currentDifficultyRef.current = updated.currentDifficulty;
        setDynamicDifficultyDisplay(updated.currentDifficulty);
      }

      // Check if OVERTAKE was active - deactivate on wrong answer
      if (overtakeActive) {
        setOvertakeActive(false);
        setBotFrozen(false);
        setOvertakeEnergy(0);
        setOvertakeStartTime(null);
        setOvertakeStartEnergy(0);
        if (overtakeTimerRef.current) {
          clearTimeout(overtakeTimerRef.current);
          overtakeTimerRef.current = null;
        }
      }

      // Check if aero was active - deactivate on wrong answer (NO TIME PENALTY, but still counts as mistake)
      const wasAeroActive = aeroActive;
      if (wasAeroActive) {
        setAeroActive(false);
      }

      // Break purple mode on incorrect answer
      setInPurpleMode(false);

      // Log the mistake for review
      setMistakeLog(prev => [...prev, {
        question: question.display,
        yourAnswer: val,
        correctAnswer: question.answer
      }]);
      wrongAttemptsRef.current.push(val);

      // If AERO was active, just show "AERO OFF" and skip time penalty
      if (wasAeroActive) {
        setPenaltyMessage({ text: 'AERO OFF', color: 'yellow' });
        setFeedback('incorrect');
        setShowPenalty(true);

        if (!isPracticeMode) {
          // Race mode (standard + realism): per-question retry with AERO OFF
          const newAttempts = questionAttempts + 1;
          setQuestionAttempts(newAttempts);
          setCurrentSectorRed(true);

          if (newAttempts >= 4) {
            setPenaltyMessage({ text: 'YOU CRASHED!', color: 'red' });
            setFinalMistakes(newMistakes);
            setGameStatus('crashed');
            return;
          } else if (newAttempts === 1) {
            setPenaltyMessage({ text: 'AERO OFF - 2 ATTEMPTS LEFT', color: 'yellow' });
          } else if (newAttempts === 2) {
            setPenaltyMessage({ text: 'AERO OFF - 1 ATTEMPT LEFT', color: 'yellow' });
          } else if (newAttempts === 3) {
            setPenaltyMessage({ text: 'AERO OFF - LAST CHANCE!', color: 'red' });
          }

          setTimeout(() => { setShowPenalty(false); }, 1500);
          setTimeout(() => {
            setFeedback('idle');
            setAnswer('');
          }, 600);
        } else {
          // Practice mode with AERO: just clear and retry
          setTimeout(() => { setShowPenalty(false); }, 1500);
          setTimeout(() => {
            setFeedback('idle');
            setAnswer('');
          }, 600);
        }
        return; // Skip time penalty logic
      }

      if (isPracticeMode) {
        // Practice mode: show mistake but no penalties or crash
        setPenaltyMessage({ text: 'TRY AGAIN', color: 'yellow' });
        setShowPenalty(true);
        setTimeout(() => setShowPenalty(false), 1500);
        // Clear answer but keep same question
        setTimeout(() => {
          setFeedback('idle');
          setAnswer("");
        }, 600);
      } else {
        // Race mode (standard + realism): per-question retry
        const newAttempts = questionAttempts + 1;
        setQuestionAttempts(newAttempts);
        setCurrentSectorRed(true);
        setShowPenalty(true);

        if (newAttempts >= 4) {
          // DNF
          setPenaltyMessage({ text: 'YOU CRASHED!', color: 'red' });
          setFinalMistakes(newMistakes);
          setGameStatus('crashed');
          return;
        } else if (newAttempts === 1) {
          setPenaltyMessage({ text: 'WRONG - 2 ATTEMPTS LEFT', color: 'yellow' });
        } else if (newAttempts === 2) {
          setPenaltyMessage({ text: 'WRONG - 1 ATTEMPT LEFT', color: 'yellow' });
        } else if (newAttempts === 3) {
          setPenaltyMessage({ text: 'WRONG - LAST CHANCE!', color: 'red' });
        }

        setTimeout(() => { setShowPenalty(false); }, 1500);
        // Keep same question, clear answer only
        setTimeout(() => {
          setFeedback('idle');
          setAnswer("");
        }, 600);
      }
    }
  };

  const finishRace = (mistakeCount: number) => {
    setFinalMistakes(mistakeCount);
    setFeedback('idle');
    setGameStatus('finished');
    const beatBot = raceMode === 'bot' && !botFinished;
    if (beatBot) {
       confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
       incrementRacesWon();
       // Record championship for this circuit at this series
       if (selectedCircuit && selectedDriver) {
         championCircuit(selectedCircuit.id, selectedDriver.id);
       }
       if (selectedDriver?.difficulty === 'hard' && state.soundEnabled) {
         playSimplyLovely();
       }
    }
    // Award position-based career points (only in bot race mode, not practice)
    if (raceMode === 'bot' && !isPracticeMode) {
      let position: number;
      if (beatBot) {
        position = 1;
      } else if (mistakeCount <= 1) {
        position = 2;
      } else {
        position = 1 + mistakeCount;
      }
      if (position > DRIVERS_2025.length) position = DRIVERS_2025.length;
      addCareerPoints(POSITION_POINTS[position] ?? 0);
    }
    // Update personal best time and record session lap time (only in race mode, not practice)
    if (!isPracticeMode && selectedCircuit) {
      updatePersonalBest(selectedCircuit.id, elapsedTime, selectedDriver?.difficulty);
      recordLapTime(elapsedTime, selectedCircuit.name, selectedDriver?.id);
    }
    // Grand Prix qualifying: determine pole position
    if (isGrandPrix && grandPrixPhase === 'rw_qualifying') {
      setGrandPrixPolePosition(beatBot);
      setGrandPrixQualifyingCompleted(true);
    }
  };

  const getRaceResult = () => {
    let position: number;
    if (raceMode === 'bot' && !botFinished) {
      // Player finished before bot — P1
      position = 1;
    } else {
      // Finished behind bot: P2 baseline, +1 per mistake beyond 1
      if (finalMistakes <= 1) {
        position = 2;
      } else {
        position = 1 + finalMistakes; // 2 mistakes = P3, 3 = P4, etc.
      }
    }
    if (position > DRIVERS_2025.length) position = DRIVERS_2025.length;
    return { position, driverName: DRIVERS_2025[position - 1] };
  };

  const restartRace = () => {
    setProgress(0);
    setBotProgress(0);
    setLapResults([]);
    setBotLapResults([]);
    setRevealedAttempts(new Set());
    sectorBestTimesRef.current = []; // Reset sector best times
    setMistakes(0);
    setFinalMistakes(0);
    setShowPenalty(false);
    setElapsedTime(0);
    setCountdownLight(0);
    setGameStatus('mode_select');
    setSelectedDriver(null);
    setSelectedCircuit(null);
    setIsPracticeMode(false);
    setIsPaused(false);
    setFeedback('idle');
    setAnswer("");
    setQuestion(null);
    setMistakeLog([]);
    setQuestionAttempts(0);
    wrongAttemptsRef.current = [];
    setCurrentSectorRed(false);
    setRaceMode('bot'); // Race mode always uses bot opponent
    setSelectedWeather('dry');
    setActualWeather('dry');
    // Reset alternating weather state
    setWeatherChangePoints([]);
    setInitialWeather('dry');
    resetStreak();
    penaltyTimeRef.current = 0;
    raceStartTimeRef.current = null;
    setPenaltyMessage({ text: '', color: 'red' });
    setInPurpleMode(false);
    // Reset OVERTAKE state
    setOvertakeEnergy(0);
    setOvertakeActive(false);
    setOvertakeAvailable(false);
    setOvertakeStartTime(null);
    setOvertakeStartEnergy(0);
    setBotFrozen(false);
    setShowBoostMessage(null);
    if (overtakeTimerRef.current) {
      clearTimeout(overtakeTimerRef.current);
      overtakeTimerRef.current = null;
    }
    // Reset AERO state
    setAeroZones([]);
    setAeroAvailable(false);
    setAeroActive(false);
    setAeroUsedZones(new Set());
    setShowAeroMessage(null);
    // Reset Grand Prix state
    setGrandPrixPhase('rw_practice');
    setGrandPrixLockedDifficulty(null);
    setGrandPrixPolePosition(false);
    polePositionUsedRef.current = false;
    setGrandPrixPracticeCompleted(false);
    setGrandPrixQualifyingCompleted(false);
    dynamicDifficultyRef.current = null;
    setDynamicDifficultyDisplay('beginner');
    setIsGrandPrix(false);
    setIsPreSeasonTesting(false);
    setPstSessionLog(false);
    pstStintsRef.current = [];
    setPstCycleCount(0);
    setShowNamePrompt(false);
    setPendingScoreSubmission(null);
    setNameInput('');
  };

  // Helper to reset race state and go back to selecting screen (for Grand Prix phase transitions)
  const restartToSelectingScreen = () => {
    setProgress(0);
    setBotProgress(0);
    setLapResults([]);
    setBotLapResults([]);
    setRevealedAttempts(new Set());
    sectorBestTimesRef.current = [];
    setMistakes(0);
    setFinalMistakes(0);
    setShowPenalty(false);
    setElapsedTime(0);
    setCountdownLight(0);
    setIsPaused(false);
    setFeedback('idle');
    setAnswer("");
    setQuestion(null);
    setMistakeLog([]);
    setQuestionAttempts(0);
    wrongAttemptsRef.current = [];
    setCurrentSectorRed(false);
    setSelectedWeather('dry');
    setActualWeather('dry');
    setWeatherChangePoints([]);
    setInitialWeather('dry');
    resetStreak();
    penaltyTimeRef.current = 0;
    raceStartTimeRef.current = null;
    setPenaltyMessage({ text: '', color: 'red' });
    setInPurpleMode(false);
    setOvertakeEnergy(0);
    setOvertakeActive(false);
    setOvertakeAvailable(false);
    setOvertakeStartTime(null);
    setOvertakeStartEnergy(0);
    setBotFrozen(false);
    setShowBoostMessage(null);
    if (overtakeTimerRef.current) {
      clearTimeout(overtakeTimerRef.current);
      overtakeTimerRef.current = null;
    }
    setAeroZones([]);
    setAeroAvailable(false);
    setAeroActive(false);
    setAeroUsedZones(new Set());
    setShowAeroMessage(null);
    setShowAnalytics(false);
    setGameStatus('selecting');
  };

  // Handle OVERTAKE button activation (energy bar based)
  const handleOvertake = () => {
    // If already active, allow deactivation (interrupt)
    if (overtakeActive) {
      if (overtakeTimerRef.current) {
        clearTimeout(overtakeTimerRef.current);
        overtakeTimerRef.current = null;
      }
      setOvertakeActive(false);
      setBotFrozen(false);
      setOvertakeStartTime(null);
      setOvertakeStartEnergy(0);
      return;
    }

    // Can only activate if: has energy, available (latched), not paused
    if (overtakeEnergy <= 0 || !overtakeAvailable || gameStatus !== 'racing' || isPaused) {
      return;
    }

    // Activate OVERTAKE mode — clear availability latch
    setOvertakeAvailable(false);
    setOvertakeActive(true);
    setBotFrozen(true);
    setOvertakeStartTime(Date.now());
    setOvertakeStartEnergy(overtakeEnergy);
    if (soundEnabledRef.current) {
      playOvertakeActivatedSound();
    }

    // Calculate duration based on current energy (5 seconds at 100%)
    const durationMs = (overtakeEnergy / 100) * 5000;
    overtakeRemainingRef.current = durationMs;

    // Set timer to end OVERTAKE when energy depletes
    overtakeTimerRef.current = setTimeout(() => {
      setOvertakeActive(false);
      setBotFrozen(false);
      setOvertakeEnergy(0);
      setOvertakeStartTime(null);
      setOvertakeStartEnergy(0);
      overtakeTimerRef.current = null;
      overtakeRemainingRef.current = 0;
    }, durationMs);
  };

  // Handle AERO button activation (DRS-style zone-based)
  const handleAero = () => {
    // Can only activate if: in a zone, not already active, racing
    if (!aeroAvailable || aeroActive || gameStatus !== 'racing' || isPaused) {
      return;
    }

    // Mark this zone as used
    const currentZone = getCurrentAeroZone(progress, aeroZones);
    if (currentZone !== undefined) {
      setAeroUsedZones(prev => new Set(Array.from(prev).concat(currentZone)));
    }

    setAeroActive(true);
    if (soundEnabledRef.current) {
      playAeroActivatedSound();
    }

    // Keep the current question - no harder question, just the 2x progress reward
    setAnswer(""); // Clear any partial answer
  };

  // Update AERO availability based on progress and zones
  useEffect(() => {
    if (gameStatus !== 'racing') return;

    // Find current zone (if any) - must be unused
    const currentZone = getCurrentAeroZone(progress, aeroZones);
    const inUnusedZone = currentZone !== undefined && !aeroUsedZones.has(currentZone);

    setAeroAvailable(inUnusedZone);

    // Auto-deactivate AERO when leaving a zone
    if (aeroActive && currentZone === undefined) {
      setAeroActive(false);
    }
  }, [progress, aeroZones, aeroUsedZones, gameStatus, aeroActive]);

  // Cleanup AERO state on game end
  useEffect(() => {
    if (gameStatus === 'finished' || gameStatus === 'crashed') {
      setAeroActive(false);
      setAeroAvailable(false);
    }
  }, [gameStatus]);

  // Real-time OVERTAKE energy drain animation
  useEffect(() => {
    if (!overtakeActive || overtakeStartTime === null || isPaused) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - overtakeStartTime;
      const totalDuration = (overtakeStartEnergy / 100) * 5000;
      const drainPerMs = overtakeStartEnergy / totalDuration;
      const drained = elapsed * drainPerMs;
      const remaining = Math.max(0, overtakeStartEnergy - drained);
      setOvertakeEnergy(Math.round(remaining));
    }, 50);

    return () => clearInterval(interval);
  }, [overtakeActive, overtakeStartTime, overtakeStartEnergy, isPaused]);

  // Pause/resume OVERTAKE depletion timeout
  useEffect(() => {
    if (!overtakeActive) return;

    if (isPaused) {
      // Pause: clear timeout and calculate remaining time
      if (overtakeTimerRef.current) {
        clearTimeout(overtakeTimerRef.current);
        overtakeTimerRef.current = null;
        const elapsed = Date.now() - (overtakeStartTime ?? Date.now());
        const totalDuration = (overtakeStartEnergy / 100) * 5000;
        overtakeRemainingRef.current = Math.max(0, totalDuration - elapsed);
      }
    } else {
      // Resume: restart timeout with remaining time
      if (overtakeRemainingRef.current > 0 && !overtakeTimerRef.current) {
        overtakeTimerRef.current = setTimeout(() => {
          setOvertakeActive(false);
          setBotFrozen(false);
          setOvertakeEnergy(0);
          setOvertakeStartTime(null);
          setOvertakeStartEnergy(0);
          overtakeTimerRef.current = null;
          overtakeRemainingRef.current = 0;
        }, overtakeRemainingRef.current);
        // Adjust start time so drain animation stays in sync
        setOvertakeStartTime(Date.now() - ((overtakeStartEnergy / 100) * 5000 - overtakeRemainingRef.current));
      }
    }
  }, [isPaused, overtakeActive]);

  // Bot simulation during racing - uses setTimeout for per-lap timing
  useEffect(() => {
    if (gameStatus !== 'racing' || raceMode !== 'bot' || isPaused || botFrozen) return;
    if (botProgress >= raceLength) return;

    // Bot speed varies by difficulty - base time per question in ms
    // Higher = slower bot = more time for player
    // Karting (beginner) = slowest bot to give young kids more time
    // Grand Prix: bot uses locked difficulty from practice
    const botDifficulty = (isGrandPrix && grandPrixLockedDifficulty) ? grandPrixLockedDifficulty : selectedDriver?.difficulty;
    const baseSpeed = botDifficulty === 'beginner' ? 4000 :
                      botDifficulty === 'easy' ? 3000 :
                      botDifficulty === 'medium' ? 2500 : 2000; // hard (F1)

    // Add randomness (±30%) - this represents problem complexity variation
    const randomFactor = 0.7 + Math.random() * 0.6; // 0.7 to 1.3
    const lapTime = baseSpeed * randomFactor;

    const timeout = setTimeout(() => {
      const sectorIndex = botProgress; // Current sector index (0-based)

      // Get the current best time for this sector (use ref to avoid stale closure)
      const currentBest = sectorBestTimesRef.current[sectorIndex];

      let sectorColor: 'purple' | 'green' | 'yellow';

      if (!currentBest || lapTime < currentBest.bestTime) {
        // Bot has new best time for this sector - gets purple
        sectorColor = 'purple';

        // If player previously had purple on this sector, demote to green
        if (currentBest?.holder === 'player') {
          setLapResults(prev => {
            const updated = [...prev];
            if (updated[sectorIndex]?.sectorColor === 'purple') {
              updated[sectorIndex] = { ...updated[sectorIndex], sectorColor: 'green' };
            }
            return updated;
          });
        }

        // Update the sector best times - sync ref immediately to avoid race condition
        const newBestTime = { bestTime: lapTime, holder: 'bot' as const };
        sectorBestTimesRef.current = [...sectorBestTimesRef.current];
        sectorBestTimesRef.current[sectorIndex] = newBestTime;
      } else {
        // Bot didn't beat the best - assign green/yellow based on factor
        sectorColor = randomFactor <= 1.15 ? 'green' : 'yellow';
      }

      setBotProgress(prev => prev + 1);
      setBotLapResults(prev => [...prev, { sectorColor, botTime: lapTime }]);
    }, lapTime);

    return () => clearTimeout(timeout);
  }, [gameStatus, raceMode, isPaused, botFrozen, selectedDriver, raceLength, botProgress]);

  // Deactivate OVERTAKE when bot finishes the race
  useEffect(() => {
    if (botFinished && overtakeActive) {
      if (overtakeTimerRef.current) {
        clearTimeout(overtakeTimerRef.current);
        overtakeTimerRef.current = null;
      }
      setOvertakeActive(false);
      setOvertakeAvailable(false);
      setBotFrozen(false);
      setOvertakeStartTime(null);
      setOvertakeStartEnergy(0);
    }
  }, [botFinished, overtakeActive]);

  // Paywall Screen
  if (gameStatus === 'paywall') {
    return <Paywall onBack={() => setGameStatus('mode_select')} />;
  }

  // Mode Selection Screen — Career vs Grand Prix
  if (gameStatus === 'mode_select') {
    return (
      <div className="h-screen flex flex-col" style={{ backgroundColor: '#ffffff' }}>
        {/* App Logo */}
        <div className="pb-4 md:pb-8 flex justify-center" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 18px)' }}>
          <Link href="/">
            <img
              src={logoImage}
              alt="F1 Math Racer"
              className="h-8 md:h-12 object-contain cursor-pointer hover:opacity-70 transition-opacity"
            />
          </Link>
        </div>
        <div className="mt-8 md:mt-24 mb-10 md:mb-24 flex justify-center">
          <h2
            className="text-4xl md:text-5xl font-bold uppercase tracking-wider text-black"
            style={{ fontFamily: 'Oxanium, sans-serif' }}
          >
            Select Mode
          </h2>
        </div>
        {/* Mode Buttons */}
        <div className="flex flex-col items-center px-8">
          <div className="flex flex-col items-center gap-3 md:gap-5">
            {/* Career Button */}
            <motion.button
              onClick={() => {
                if (state.soundEnabled) playCarouselClick();
                if (!isPremium) { setGameStatus('paywall'); return; }
                setGameStatus('driver_select');
              }}
              whileTap={{ scale: 0.98 }}
              className="w-full max-w-xs md:max-w-md py-3 text-center"
            >
              <span
                className="block"
                style={{
                  fontFamily: 'Oxanium, sans-serif',
                  fontSize: window.innerWidth >= 768 ? '2.6rem' : '1.9rem',
                  fontWeight: 'bold',
                  color: '#0928B5',
                  opacity: isPremium ? 0.7 : 0.35,
                  transition: 'all 0.2s ease',
                }}
              >
                CAREER
              </span>
              <span
                className="block mt-1 uppercase tracking-widest"
                style={{
                  fontSize: '0.65rem',
                  color: '#0928B5',
                  opacity: isPremium ? 0.4 : 0.2,
                  transition: 'all 0.2s ease',
                }}
              >
                Championship
              </span>
              {!isPremium && (
                <span
                  className="block mt-1 uppercase tracking-widest"
                  style={{ fontSize: '0.55rem', color: '#999', transition: 'all 0.2s ease' }}
                >
                  Full version
                </span>
              )}
            </motion.button>
            {/* Grand Prix Button */}
            <motion.button
              onClick={() => {
                if (state.soundEnabled) playCarouselClick();
                if (!isPremium) { setGameStatus('paywall'); return; }
                setIsGrandPrix(true);
                setGameStatus('operation_select');
              }}
              whileTap={{ scale: 0.98 }}
              className="w-full max-w-xs md:max-w-md py-3 text-center"
            >
              <span
                className="block"
                style={{
                  fontFamily: 'Oxanium, sans-serif',
                  fontSize: window.innerWidth >= 768 ? '2.6rem' : '1.9rem',
                  fontWeight: 'bold',
                  background: CURRENT_GRAND_PRIX.gradient,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  opacity: isPremium ? 1 : 0.4,
                  transition: 'all 0.2s ease',
                }}
              >
                GRAND PRIX
              </span>
              <span
                className="block mt-1 uppercase tracking-widest"
                style={{
                  fontSize: '0.65rem',
                  background: CURRENT_GRAND_PRIX.gradient,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  opacity: isPremium ? 0.6 : 0.25,
                  transition: 'all 0.2s ease',
                }}
              >
                {CURRENT_GRAND_PRIX.name}
              </span>
              {!isPremium && (
                <span
                  className="block mt-1 uppercase tracking-widest"
                  style={{ fontSize: '0.55rem', color: '#999', transition: 'all 0.2s ease' }}
                >
                  Full version
                </span>
              )}
            </motion.button>
            {/* Multiplayer Button */}
            <motion.button
              className="w-full max-w-xs md:max-w-md py-3 text-center"
            >
              <span
                className="block"
                style={{
                  fontFamily: 'Oxanium, sans-serif',
                  fontSize: window.innerWidth >= 768 ? '2.6rem' : '1.9rem',
                  fontWeight: 'bold',
                  color: '#E31010',
                  opacity: isPremium ? 1 : 0.35,
                  transition: 'all 0.2s ease',
                }}
              >
                MULTIPLAYER
              </span>
              <span
                className="block mt-1 uppercase tracking-widest"
                style={{
                  fontSize: '0.65rem',
                  color: '#E31010',
                  opacity: 0.6,
                  transition: 'all 0.2s ease',
                }}
              >
                COMING SOON
              </span>
            </motion.button>
            {/* PST — shown inline on iPad */}
            <motion.button
              onClick={() => {
                if (state.soundEnabled) playCarouselClick();
                setIsPreSeasonTesting(true);
                setGameStatus('operation_select');
              }}
              whileTap={{ scale: 0.98 }}
              className="hidden md:block w-full max-w-xs md:max-w-md py-3 text-center"
            >
              <span
                className="inline-block px-8 py-3 rounded-xl font-bold text-lg uppercase tracking-wider text-white"
                style={{ fontFamily: 'Oxanium, sans-serif', backgroundColor: '#16a34a' }}
              >
                Free Practice
              </span>
            </motion.button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center pb-40">
          <img src={garageCar} alt="" className="w-40 opacity-25 select-none pointer-events-none" draggable={false} />
        </div>

        {/* Pre-Season Testing + Back — pinned to bottom */}
        <div className="fixed bottom-4 left-0 right-0 px-8 py-4 flex flex-col items-center gap-3" style={{ backgroundColor: '#ffffff' }}>
          <motion.button
            onClick={() => {
              if (state.soundEnabled) playCarouselClick();
              setIsPreSeasonTesting(true);
              setGameStatus('operation_select');
            }}
            whileTap={{ scale: 0.98 }}
            className="md:hidden w-full text-center"
          >
            <span
              className="block py-3 rounded-xl font-bold text-lg uppercase tracking-wider text-white"
              style={{ fontFamily: 'Oxanium, sans-serif', backgroundColor: '#16a34a' }}
            >
              Free Practice
            </span>
          </motion.button>
          <Link href="/">
            <button
              onClick={() => { if (state.soundEnabled) playCarouselClick(); }}
              className="transition-colors text-sm uppercase tracking-wider text-gray-400 hover:text-black"
              style={{ fontFamily: 'Oxanium, sans-serif' }}
            >
              Back
            </button>
          </Link>
        </div>
      </div>
    );
  }

  // Operation Selection Screen for Grand Prix / Pre-Season Testing
  if (gameStatus === 'operation_select') {
    const operationItems = [
      { label: 'Addition', symbol: '+', type: 'Addition' },
      { label: 'Subtraction', symbol: '−', type: 'Subtraction' },
      { label: 'Multiplication', symbol: '×', type: 'Multiplication' },
      { label: 'Division', symbol: '÷', type: 'Division' },
      { label: 'Variables', symbol: 'f(x)', type: 'Variables' },
    ];

    return (
      <div className="h-screen flex flex-col" style={{ backgroundColor: '#ffffff' }}>
        {/* App Logo */}
        <div className="pb-4 md:pb-8 flex justify-center" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 18px)' }}>
          <Link href="/">
            <img
              src={logoImage}
              alt="F1 Math Racer"
              className="h-8 md:h-12 object-contain cursor-pointer hover:opacity-70 transition-opacity"
            />
          </Link>
        </div>
        <div className="flex-1 flex flex-col md:justify-center md:pb-16">
        {/* Welcome Section */}
        <div className="mt-6 md:mt-0 mb-6 md:mb-6 flex flex-col items-center px-8">
          {isPreSeasonTesting ? (
            <h2 className="text-4xl md:text-5xl font-bold uppercase tracking-wider text-black text-center" style={{ fontFamily: 'Oxanium, sans-serif' }}>Free Practice</h2>
          ) : (
          <h2
            className="text-2xl md:text-4xl font-bold uppercase tracking-wider text-black text-center"
            style={{ fontFamily: 'Oxanium, sans-serif' }}
          >
            {'Welcome to Grand Prix!'}
          </h2>
          )}
          <p
            className="mt-3 text-center text-gray-500"
            style={{ fontFamily: 'Oxanium, sans-serif', fontSize: '0.8rem', maxWidth: '28rem' }}
          >
            {isPreSeasonTesting
              ? '100 questions with adaptive difficulty and no penalties. Box at any time to end your current stint — go back on track to start a new one. Finish all 100 to post your score on the Leaderboard, or end your session anytime.'
              : `Practice (30 questions) adjusts difficulty as you go. Your difficulty locks at the end of Practice for the rest of the weekend. Beat the bot in Qualifying for Pole Position — a 2-sector head start on Race Day. This week we take you to ${CURRENT_GRAND_PRIX.name}, ${CURRENT_GRAND_PRIX.country}.`}
          </p>
          <h3
            className="mt-8 text-xl md:text-2xl font-bold uppercase tracking-wider text-black"
            style={{ fontFamily: 'Oxanium, sans-serif' }}
          >
            Select Operation
          </h3>
        </div>
        {/* Operation Grid */}
        <div className="flex flex-col items-center px-8">
          <div className="grid grid-cols-2 gap-3 w-full max-w-xs md:max-w-md">
            {operationItems.map((op, index) => (
              <motion.button
                key={op.type}
                onClick={() => {
                  setSelectedOperation(op.type);
                  const kartingDriver = DRIVERS.find(d => d.id === 'karting')!;
                  setSelectedDriver(kartingDriver);
                  localStorage.setItem('lastSelectedDriverId', kartingDriver.id);
                  if (isPreSeasonTesting) {
                    setSelectedCircuit(createBahrainCircuit(op.type));
                    setIsPracticeMode(true);
                    setRaceMode('solo');
                    setSelectedTab('testing');
                    dynamicDifficultyRef.current = null;
                  } else {
                    setSelectedCircuit(createGrandPrixCircuit(op.type));
                    setGrandPrixPhase('rw_practice');
                    setGrandPrixLockedDifficulty(null);
                    setGrandPrixPolePosition(false);
                    setGrandPrixPracticeCompleted(false);
                    setGrandPrixQualifyingCompleted(false);
                    dynamicDifficultyRef.current = null;
                    setIsPracticeMode(true);
                    setRaceMode('solo');
                    setSelectedTab('rw_practice');
                  }
                  if (state.soundEnabled) playCarouselClick();
                  initAudio();
                  setGameStatus('selecting');
                }}
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.02 }}
                className={`h-20 md:h-24 rounded-xl bg-gray-100 flex flex-col items-center justify-center${index === operationItems.length - 1 ? ' col-span-2' : ''}`}
              >
                <span
                  className="block"
                  style={{
                    fontFamily: 'Oxanium, sans-serif',
                    fontSize: window.innerWidth >= 768 ? '2rem' : '1.4rem',
                    fontWeight: 'bold',
                    color: '#000000',
                    opacity: 0.7,
                  }}
                >
                  {op.symbol}
                </span>
                <span
                  className="block mt-1 uppercase tracking-widest"
                  style={{
                    fontFamily: 'Oxanium, sans-serif',
                    fontSize: '0.6rem',
                    color: '#000000',
                    opacity: 0.4,
                  }}
                >
                  {op.label}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
        </div>
        {/* Track illustration */}
        <div className="flex-1 flex items-center justify-center px-8 overflow-hidden">
          <img
            src={trackIllustration}
            alt=""
            className="max-w-xs md:max-w-md w-full object-contain"
            style={{ opacity: 0.5 }}
          />
        </div>
        {/* Back button */}
        <div className="px-8 py-4 flex flex-col items-center gap-3" style={{ backgroundColor: '#ffffff' }}>
          <button
            onClick={() => {
              if (state.soundEnabled) playCarouselClick();
              setIsGrandPrix(false);
              setIsPreSeasonTesting(false);
              setGameStatus('mode_select');
            }}
            className="transition-colors text-sm uppercase tracking-wider text-gray-400 hover:text-black"
            style={{ fontFamily: 'Oxanium, sans-serif', paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // Driver Selection Screen - Racing Series Menu
  if (gameStatus === 'driver_select') {
    const seriesOptions = [
      { id: 'f1', name: 'FORMULA 1', description: 'Champion', driver: DRIVERS.find(d => d.id === 'f1'), color: '#e10600' },
      { id: 'f2', name: 'FORMULA 2', description: 'Pro', driver: DRIVERS.find(d => d.id === 'f2'), color: '#00a0dc' },
      { id: 'f3', name: 'FORMULA 3', description: 'Rookie', driver: DRIVERS.find(d => d.id === 'f3'), color: '#000000' },
      { id: 'karting', name: 'KARTING', description: 'Amateur', driver: DRIVERS.find(d => d.id === 'karting'), color: '#006B3F' },
    ];

    return (
      <div className="h-screen flex flex-col" style={{ backgroundColor: '#ffffff' }}>
        {/* App Logo */}
        <div className="pb-4 md:pb-8 flex justify-center" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 18px)' }}>
          <Link href="/">
            <img
              src={logoImage}
              alt="F1 Math Racer"
              className="h-8 md:h-12 object-contain cursor-pointer hover:opacity-70 transition-opacity"
            />
          </Link>
        </div>
        {/* Section Title — same position as pill toggle on track selection */}
        <div className="mt-8 md:mt-24 mb-10 md:mb-24 flex justify-center">
          <h2
            className="text-3xl md:text-4xl font-bold uppercase tracking-wider text-black"
            style={{ fontFamily: 'Oxanium, sans-serif' }}
          >
            Select Series
          </h2>
        </div>
        {/* Series Selection */}
        <div className="flex flex-col items-center px-8">
          <div className="flex flex-col items-center gap-3 md:gap-5">
          {seriesOptions.map((series) => {
            const isSelected = selectedDriver?.id === series.id;
            const isUnlocked = isPracticeMode || isSeriesAvailable(series.id, state.championedCircuits);

            return (
              <motion.button
                key={series.id}
                onClick={() => {
                  if (!isUnlocked) return;
                  setSelectedDriver(series.driver || null);
                  if (state.soundEnabled) playCarouselClick();
                }}
                whileTap={isUnlocked ? { scale: 0.98 } : undefined}
                className={cn(
                  "w-full max-w-xs md:max-w-md py-3 text-center",
                  !isUnlocked && "cursor-not-allowed"
                )}
                data-testid={`level-${series.id}`}
              >
                <span
                  className="block"
                  style={{
                    fontFamily: 'Oxanium, sans-serif',
                    fontSize: window.innerWidth >= 768 ? '2.2rem' : '1.5rem',
                    fontWeight: 'bold',
                    color: isUnlocked ? series.color : '#cccccc',
                    opacity: isSelected ? 1 : (isUnlocked ? 0.4 : 0.3),
                    transition: 'all 0.2s ease',
                  }}
                >
                  {series.name}
                </span>
                <span
                  className="block mt-1 uppercase tracking-widest"
                  style={{
                    fontSize: '0.65rem',
                    color: isUnlocked ? series.color : '#cccccc',
                    opacity: isSelected ? 0.6 : (isUnlocked ? 0.3 : 0.2),
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isUnlocked ? series.description : 'Win to unlock'}
                </span>
              </motion.button>
            );
          })}
          </div>
        </div>
        {/* Confirm Strategy Button - Fixed Bottom */}
        <div className="fixed bottom-4 left-0 right-0 px-8 py-4 flex flex-col items-center gap-3" style={{ backgroundColor: '#ffffff' }}>
          {selectedDriver && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (state.soundEnabled) playCarouselClick();
                handleDriverSelect(selectedDriver!);
              }}
              className="w-full max-w-sm md:max-w-md py-4 rounded-xl font-bold text-lg uppercase tracking-wider text-white"
              style={{
                fontFamily: 'Oxanium, sans-serif',
                backgroundColor: '#22c55e',
                animation: 'pulse-green 2s infinite'
              }}
              data-testid="button-confirm-strategy"
            >
              Select Track
            </motion.button>
          )}
          <button
            onClick={() => {
              if (state.soundEnabled) playCarouselClick();
              setGameStatus('mode_select');
            }}
            className="transition-colors text-sm uppercase tracking-wider text-gray-400 hover:text-black"
            style={{ fontFamily: 'Oxanium, sans-serif' }}
            data-testid="button-back-menu"
          >
            Back
          </button>
        </div>
        <style>{`
          @keyframes pulse-green {
            0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
            50% { box-shadow: 0 0 20px 10px rgba(34, 197, 94, 0.3); }
          }
        `}</style>
      </div>
    );
  }

  // Circuit Selection Screen - Dark Race Setup
  if (gameStatus === 'selecting') {
    const currentCircuitIndex = selectedCircuit ? CIRCUITS.findIndex(c => c.id === selectedCircuit.id) : 0;
    const displayCircuit = selectedCircuit || CIRCUITS[0];
    const isCircuitLocked = (isPracticeMode || isGrandPrix) ? false : (selectedDriver ? !isCircuitUnlockedForSeries(displayCircuit.id, selectedDriver.id, state.championedCircuits) : false);

    const goToPrevCircuit = () => {
      const newIndex = currentCircuitIndex === 0 ? CIRCUITS.length - 1 : currentCircuitIndex - 1;
      handleCircuitSelect(CIRCUITS[newIndex]);
      if (state.soundEnabled) playCarouselClick();
    };
    
    const goToNextCircuit = () => {
      const newIndex = currentCircuitIndex === CIRCUITS.length - 1 ? 0 : currentCircuitIndex + 1;
      handleCircuitSelect(CIRCUITS[newIndex]);
      if (state.soundEnabled) playCarouselClick();
    };

    const handleTouchStart = (e: React.TouchEvent) => {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    };
    const handleTouchMove = (e: React.TouchEvent) => {
      if (touchStartXRef.current === null || touchStartYRef.current === null) return;
      const diffX = Math.abs(e.touches[0].clientX - touchStartXRef.current);
      const diffY = Math.abs(e.touches[0].clientY - touchStartYRef.current);
      if (diffX > diffY && diffX > 10) {
        e.preventDefault();
      }
    };
    const handleTouchEnd = (e: React.TouchEvent) => {
      if (touchStartXRef.current === null) return;
      const touchEndX = e.changedTouches[0].clientX;
      const diff = touchStartXRef.current - touchEndX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          goToNextCircuit();
        } else {
          goToPrevCircuit();
        }
      }
      touchStartXRef.current = null;
      touchStartYRef.current = null;
    };

    return (
      <div className="min-h-screen flex flex-col transition-colors duration-300" style={{ backgroundColor: '#ffffff' }}>
        {/* App Logo — same position as driver select */}
        <div className="pb-4 flex justify-center" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 18px)' }}>
          <Link href="/">
            <img
              src={logoImage}
              alt="F1 Math Racer"
              className="h-8 md:h-12 object-contain cursor-pointer hover:opacity-70 transition-opacity"
            />
          </Link>
        </div>
        {/* Tab Toggle — Grand Prix phases, Pre-Season Testing, or normal Race/Practice */}
        <div className="mt-8 md:mt-24 landscape:md:mt-8 mb-6 md:mb-24 landscape:md:mb-6 flex justify-center">
          {isPreSeasonTesting ? (
            <div className="rounded-full p-1 flex gap-1 bg-gray-200">
              <button
                className="px-4 py-2 rounded-full font-bold text-xs md:text-sm uppercase tracking-wider transition-all bg-green-600 text-white"
                style={{ fontFamily: 'Oxanium, sans-serif' }}
              >
                Free Practice
              </button>
            </div>
          ) : isGrandPrix ? (
            <div className="rounded-full p-1 flex gap-1 bg-gray-200">
              <button
                onClick={() => {
                  setSelectedTab('rw_practice');
                  setGrandPrixPhase('rw_practice');
                  setIsPracticeMode(true);
                  setRaceMode('solo');
                  if (state.soundEnabled) playCarouselClick();
                }}
                className={cn(
                  "px-4 py-2 rounded-full font-bold text-xs md:text-sm uppercase tracking-wider transition-all",
                  selectedTab === 'rw_practice'
                    ? "bg-green-600 text-white"
                    : "bg-transparent text-gray-600 hover:text-gray-900"
                )}
                style={{ fontFamily: 'Oxanium, sans-serif' }}
              >
                Practice
              </button>
              <button
                onClick={() => {
                  if (!grandPrixPracticeCompleted) return;
                  setSelectedTab('rw_qualifying');
                  setGrandPrixPhase('rw_qualifying');
                  setIsPracticeMode(false);
                  setRaceMode('bot');
                  if (state.soundEnabled) playCarouselClick();
                }}
                className={cn(
                  "px-4 py-2 rounded-full font-bold text-xs md:text-sm uppercase tracking-wider transition-all",
                  selectedTab === 'rw_qualifying'
                    ? "bg-amber-500 text-white"
                    : !grandPrixPracticeCompleted
                      ? "bg-transparent text-gray-300 cursor-not-allowed"
                      : "bg-transparent text-gray-600 hover:text-gray-900"
                )}
                style={{ fontFamily: 'Oxanium, sans-serif' }}
              >
                Qualifying
              </button>
              <button
                onClick={() => {
                  if (!grandPrixQualifyingCompleted) return;
                  setSelectedTab('rw_race');
                  setGrandPrixPhase('rw_race');
                  setIsPracticeMode(false);
                  setRaceMode('bot');
                  if (state.soundEnabled) playCarouselClick();
                }}
                className={cn(
                  "px-4 py-2 rounded-full font-bold text-xs md:text-sm uppercase tracking-wider transition-all",
                  selectedTab === 'rw_race'
                    ? "bg-red-600 text-white"
                    : !grandPrixQualifyingCompleted
                      ? "bg-transparent text-gray-300 cursor-not-allowed"
                      : "bg-transparent text-gray-600 hover:text-gray-900"
                )}
                style={{ fontFamily: 'Oxanium, sans-serif' }}
              >
                Race
              </button>
            </div>
          ) : (
            <div className="rounded-full p-1 flex gap-1 bg-gray-200">
              <button
                onClick={() => { setSelectedTab('race'); setIsPracticeMode(false); setRaceMode('bot'); if (state.soundEnabled) playCarouselClick(); }}
                className={cn(
                  "px-4 py-2 rounded-full font-bold text-xs md:text-sm uppercase tracking-wider transition-all",
                  selectedTab === 'race'
                    ? "bg-red-600 text-white"
                    : "bg-transparent text-gray-600 hover:text-gray-900"
                )}
                style={{ fontFamily: 'Oxanium, sans-serif' }}
                data-testid="button-race-mode"
              >
                Race
              </button>
              <button
                onClick={() => { setSelectedTab('practice'); setIsPracticeMode(true); setRaceMode('solo'); if (state.soundEnabled) playCarouselClick(); }}
                className={cn(
                  "px-4 py-2 rounded-full font-bold text-xs md:text-sm uppercase tracking-wider transition-all",
                  selectedTab === 'practice'
                    ? "bg-green-600 text-white"
                    : "bg-transparent text-gray-600 hover:text-gray-900"
                )}
                style={{ fontFamily: 'Oxanium, sans-serif' }}
                data-testid="button-practice-mode"
              >
                Practice
              </button>
            </div>
          )}
        </div>
        {/* Main Content - Hero Card with Side Chevrons */}
        {/* Card area — same position as series buttons list */}
        <div className="flex items-center justify-center px-8 pb-24 md:pb-32 landscape:md:pb-24">
          {isPreSeasonTesting ? (
            /* Pre-Season Testing Card */
            (<div className="flex flex-col items-center">
              <motion.div
                key={`pst-${CURRENT_GRAND_PRIX.circuitId}-card`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="w-[350px] md:w-[500px] rounded-[20px] p-6 flex flex-col transition-colors duration-300 select-none"
                style={{
                  backgroundColor: '#f0f0f0',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
                }}
                data-testid={`hero-card-pst-${CURRENT_GRAND_PRIX.circuitId}`}
              >
                {/* Header - Circuit & Flag */}
                <div className="flex items-center justify-center gap-3 mb-4">
                  <h2
                    className="text-2xl font-bold uppercase tracking-wider text-gray-900"
                    style={{ fontFamily: 'Oxanium, sans-serif' }}
                  >
                    {CURRENT_GRAND_PRIX.name}
                  </h2>
                  <img
                    src={CURRENT_GRAND_PRIX.flagImage}
                    alt={`${CURRENT_GRAND_PRIX.country} flag`}
                    className="h-5 w-7 object-cover rounded-sm relative -top-0.5"
                  />
                </div>

                {/* Track Map */}
                <div className="flex-1 flex items-center justify-center py-3 md:py-6">
                  <img
                    src={CURRENT_GRAND_PRIX.trackImage}
                    alt={`${CURRENT_GRAND_PRIX.name} circuit`}
                    className="h-32 md:h-52 object-contain"
                    style={{ maxWidth: '280px' }}
                  />
                </div>

                {/* Operation — static display */}
                <div className="text-center mb-2 md:mb-4">
                  <div className="text-sm uppercase tracking-wider mb-1 text-gray-500">Math Type</div>
                  <div
                    className="text-lg font-bold uppercase text-gray-900"
                    style={{ fontFamily: 'Oxanium, sans-serif' }}
                  >
                    {selectedOperation}
                  </div>
                </div>

                {/* Weather Toggle */}
                <div className="flex justify-center gap-4 pt-2 border-t border-gray-300">
                  <button
                    onClick={() => { setSelectedWeather('dry'); if (state.soundEnabled) playCarouselClick(); }}
                    className={cn(
                      "p-3 rounded-lg transition-all flex flex-col items-center gap-1",
                      selectedWeather === 'dry'
                        ? "bg-yellow-500/20 ring-2 ring-yellow-500"
                        : "bg-transparent hover:bg-white/5"
                    )}
                  >
                    <img src={weatherSun} alt="Dry" className="w-8 h-8" />
                    <span className="text-[9px] text-gray-500 uppercase tracking-wide">Dry</span>
                  </button>
                  <button
                    onClick={() => { setSelectedWeather('wet'); if (state.soundEnabled) playCarouselClick(); }}
                    className={cn(
                      "p-3 rounded-lg transition-all flex flex-col items-center gap-1",
                      selectedWeather === 'wet'
                        ? "bg-blue-500/20 ring-2 ring-blue-500"
                        : "bg-transparent hover:bg-white/5"
                    )}
                  >
                    <img src={weatherRain} alt="Wet" className="w-8 h-8" />
                    <span className="text-[9px] text-gray-500 uppercase tracking-wide">Wet</span>
                  </button>
                  <button
                    onClick={() => { setSelectedWeather('random'); if (state.soundEnabled) playCarouselClick(); }}
                    className={cn(
                      "p-3 rounded-lg transition-all flex flex-col items-center gap-1",
                      selectedWeather === 'random'
                        ? "bg-purple-500/20 ring-2 ring-purple-500"
                        : "bg-transparent hover:bg-white/5"
                    )}
                  >
                    <img src={weatherRandom} alt="Random" className="w-8 h-8" />
                    <span className="text-[9px] text-gray-500 uppercase tracking-wide">Random</span>
                  </button>
                </div>
              </motion.div>
            </div>)
          ) : isGrandPrix ? (
            /* Grand Prix Card */
            (<div className="flex flex-col items-center">
              <motion.div
                key={`${CURRENT_GRAND_PRIX.circuitId}-card`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="w-[350px] md:w-[500px] rounded-[20px] p-6 flex flex-col transition-colors duration-300 select-none"
                style={{
                  backgroundColor: '#f0f0f0',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
                }}
                data-testid={`hero-card-${CURRENT_GRAND_PRIX.circuitId}`}
              >
                {/* Header - Circuit & Flag */}
                <div className="flex items-center justify-center gap-3 mb-4">
                  <h2
                    className="text-2xl font-bold uppercase tracking-wider text-gray-900"
                    style={{ fontFamily: 'Oxanium, sans-serif' }}
                  >
                    {CURRENT_GRAND_PRIX.name}
                  </h2>
                  <img
                    src={CURRENT_GRAND_PRIX.flagImage}
                    alt={`${CURRENT_GRAND_PRIX.country} flag`}
                    className="h-5 w-7 object-cover rounded-sm relative -top-0.5"
                  />
                </div>

                {/* Track Map */}
                <div className="flex-1 flex items-center justify-center py-3 md:py-6">
                  <img
                    src={CURRENT_GRAND_PRIX.trackImage}
                    alt={`${CURRENT_GRAND_PRIX.name} circuit`}
                    className="h-32 md:h-52 object-contain"
                    style={{ maxWidth: '280px' }}
                  />
                </div>

                {/* Operation — static display (chosen on operation_select screen) */}
                <div className="text-center mb-2 md:mb-4">
                  <div className="text-sm uppercase tracking-wider mb-1 text-gray-500">Math Type</div>
                  <div
                    className="text-lg font-bold uppercase text-gray-900"
                    style={{ fontFamily: 'Oxanium, sans-serif' }}
                  >
                    {selectedOperation}
                  </div>
                </div>

                {/* Weather Toggle */}
                <div className="flex justify-center gap-4 pt-2 border-t border-gray-300">
                  <button
                    onClick={() => { setSelectedWeather('dry'); if (state.soundEnabled) playCarouselClick(); }}
                    className={cn(
                      "p-3 rounded-lg transition-all flex flex-col items-center gap-1",
                      selectedWeather === 'dry'
                        ? "bg-yellow-500/20 ring-2 ring-yellow-500"
                        : "bg-transparent hover:bg-white/5"
                    )}
                  >
                    <img src={weatherSun} alt="Dry" className="w-8 h-8" />
                    <span className="text-[9px] text-gray-500 uppercase tracking-wide">Dry</span>
                  </button>
                  <button
                    onClick={() => { setSelectedWeather('wet'); if (state.soundEnabled) playCarouselClick(); }}
                    className={cn(
                      "p-3 rounded-lg transition-all flex flex-col items-center gap-1",
                      selectedWeather === 'wet'
                        ? "bg-blue-500/20 ring-2 ring-blue-500"
                        : "bg-transparent hover:bg-white/5"
                    )}
                  >
                    <img src={weatherRain} alt="Wet" className="w-8 h-8" />
                    <span className="text-[9px] text-gray-500 uppercase tracking-wide">Wet</span>
                  </button>
                  <button
                    onClick={() => { setSelectedWeather('random'); if (state.soundEnabled) playCarouselClick(); }}
                    className={cn(
                      "p-3 rounded-lg transition-all flex flex-col items-center gap-1",
                      selectedWeather === 'random'
                        ? "bg-purple-500/20 ring-2 ring-purple-500"
                        : "bg-transparent hover:bg-white/5"
                    )}
                  >
                    <img src={weatherRandom} alt="Random" className="w-8 h-8" />
                    <span className="text-[9px] text-gray-500 uppercase tracking-wide">Random</span>
                  </button>
                </div>
              </motion.div>
            </div>)
          ) : (
            /* Track Selection Card */
            (<>
              {/* Left Chevron - hidden on mobile */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={goToPrevCircuit}
                className="hidden md:flex p-3 transition-colors text-gray-400 hover:text-gray-900"
                data-testid="circuit-prev"
              >
                <ChevronLeft className="w-12 h-12" />
              </motion.button>
              {/* Card wrapper with swipe hint */}
              <div className="flex flex-col items-center">
                {/* Swipe hint - mobile only */}
                <div className="md:hidden text-center text-[10px] text-gray-400 uppercase tracking-widest pb-3">
                  Swipe to choose track
                </div>

                {/* Hero Card - swipeable on mobile */}
                <motion.div
                  key={displayCircuit.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className="w-[350px] md:w-[500px] rounded-[20px] p-4 md:p-6 flex flex-col transition-colors duration-300 select-none relative"
                  style={{ 
                    backgroundColor: '#f0f0f0',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                    touchAction: 'none'
                  }}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  data-testid={`hero-card-${displayCircuit.id}`}
                >
                  {/* Locked overlay */}
                  {isCircuitLocked && selectedDriver && (
                    <div className="absolute inset-0 rounded-[20px] bg-white/70 z-10 flex items-center justify-center p-6">
                      <p className="text-center text-red-600 text-sm font-bold uppercase tracking-wider" style={{ fontFamily: 'Oxanium, sans-serif' }}>
                        Champion {getNextRequiredSeriesLabel(displayCircuit.id, selectedDriver.id, state.championedCircuits)} to unlock {displayCircuit.type}
                      </p>
                    </div>
                  )}
                  {/* Header - Circuit Name & Flag */}
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <h2 
                      className="text-2xl font-bold uppercase tracking-wider text-gray-900"
                      style={{ fontFamily: 'Oxanium, sans-serif' }}
                    >
                      {displayCircuit.name}
                    </h2>
                    <img 
                      src={FLAG_IMAGES[displayCircuit.id]} 
                      alt={`${displayCircuit.name} flag`} 
                      className="h-5 w-7 object-cover rounded-sm"
                    />
                  </div>

                  {/* Track Map */}
                  <div className="flex-1 flex items-center justify-center py-3 md:py-6">
                    {CIRCUIT_MAP_IMAGES[displayCircuit.id] ? (
                      <img 
                        src={CIRCUIT_MAP_IMAGES[displayCircuit.id].black} 
                        alt={`${displayCircuit.name} circuit`}
                        className="h-32 md:h-52 object-contain"
                        style={{ maxWidth: '280px' }}
                      />
                    ) : (
                      <svg 
                        viewBox="0 0 300 160" 
                        className="w-full h-32 md:h-52"
                        style={{ maxWidth: '280px' }}
                      >
                        <path
                          d={displayCircuit.paths.s1}
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d={displayCircuit.paths.s2}
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d={displayCircuit.paths.s3}
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Info - Math Type */}
                  <div className="text-center mb-2 md:mb-4">
                    <div className="text-sm uppercase tracking-wider mb-1 text-gray-500">Math Type</div>
                    <div 
                      className="text-lg font-bold uppercase text-gray-900"
                      style={{ fontFamily: 'Oxanium, sans-serif' }}
                    >
                      {displayCircuit.type}
                    </div>
                  </div>

                  {/* Weather Toggle */}
                  <div className="flex justify-center gap-4 pt-2 border-t border-gray-300">
                    <button
                      onClick={() => { setSelectedWeather('dry'); if (state.soundEnabled) playCarouselClick(); }}
                      className={cn(
                        "p-3 rounded-lg transition-all flex flex-col items-center gap-1",
                        selectedWeather === 'dry' 
                          ? "bg-yellow-500/20 ring-2 ring-yellow-500" 
                          : "bg-transparent hover:bg-white/5"
                      )}
                      data-testid="weather-dry"
                    >
                      <img src={weatherSun} alt="Dry" className="w-8 h-8" />
                      <span className="text-[9px] text-gray-500 uppercase tracking-wide">Dry</span>
                    </button>
                    <button
                      onClick={() => { setSelectedWeather('wet'); if (state.soundEnabled) playCarouselClick(); }}
                      className={cn(
                        "p-3 rounded-lg transition-all flex flex-col items-center gap-1",
                        selectedWeather === 'wet' 
                          ? "bg-blue-500/20 ring-2 ring-blue-500" 
                          : "bg-transparent hover:bg-white/5"
                      )}
                      data-testid="weather-wet"
                    >
                      <img src={weatherRain} alt="Wet" className="w-8 h-8" />
                      <span className="text-[9px] text-gray-500 uppercase tracking-wide">Wet</span>
                    </button>
                    <button
                      onClick={() => { setSelectedWeather('random'); if (state.soundEnabled) playCarouselClick(); }}
                      className={cn(
                        "p-3 rounded-lg transition-all flex flex-col items-center gap-1",
                        selectedWeather === 'random' 
                          ? "bg-purple-500/20 ring-2 ring-purple-500" 
                          : "bg-transparent hover:bg-white/5"
                      )}
                      data-testid="weather-random"
                    >
                      <img src={weatherRandom} alt="Random" className="w-8 h-8" />
                      <span className="text-[9px] text-gray-500 uppercase tracking-wide">Random</span>
                    </button>
                  </div>
                </motion.div>
              </div>
              {/* Right Chevron - hidden on mobile */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={goToNextCircuit}
                className="hidden md:flex p-3 transition-colors text-gray-400 hover:text-gray-900"
                data-testid="circuit-next"
              >
                <ChevronRight className="w-12 h-12" />
              </motion.button>
            </>)
          )}
        </div>
        {/* Track Dots Indicator - only show for track selection */}
        {!isGrandPrix && !isPreSeasonTesting && (
          <div className="fixed bottom-44 landscape:md:bottom-36 left-0 right-0 flex justify-center gap-2">
            {CIRCUITS.map((circuit, index) => {
              const dotLocked = isPracticeMode ? false : (selectedDriver ? !isCircuitUnlockedForSeries(circuit.id, selectedDriver.id, state.championedCircuits) : false);
              return (
                <button
                  key={circuit.id}
                  onClick={() => { handleCircuitSelect(circuit); if (state.soundEnabled) playCarouselClick(); }}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    currentCircuitIndex === index
                      ? (dotLocked ? "bg-gray-400" : "bg-gray-900")
                      : (dotLocked ? "bg-gray-200" : "bg-gray-400")
                  )}
                  data-testid={`circuit-dot-${circuit.id}`}
                />
              );
            })}
          </div>
        )}
        {/* Start Engine Button - Fixed Bottom */}
        <div className="fixed bottom-4 left-0 right-0 px-8 py-4 flex flex-col items-center gap-3 transition-colors duration-300" style={{ backgroundColor: '#ffffff' }}>
          <motion.button
            whileHover={!isCircuitLocked ? { scale: 1.02 } : undefined}
            whileTap={!isCircuitLocked ? { scale: 0.98 } : undefined}
            onClick={() => { if (isCircuitLocked) return; if (state.soundEnabled) playCarouselClick(); handleStartRace(); }}
            className={cn(
              "w-full max-w-sm md:max-w-md py-4 rounded-xl font-bold text-lg uppercase tracking-wider text-white",
              isCircuitLocked && "opacity-40 cursor-not-allowed"
            )}
            style={{
              fontFamily: 'Oxanium, sans-serif',
              backgroundColor: isCircuitLocked ? '#999999'
                : selectedTab === 'testing' ? '#16a34a'
                : selectedTab === 'rw_practice' ? '#16a34a'
                : selectedTab === 'rw_qualifying' ? '#f59e0b'
                : selectedTab === 'rw_race' ? '#dc2626'
                : '#16a34a',
              animation: isCircuitLocked ? 'none'
                : selectedTab === 'rw_qualifying' ? 'pulse-amber 2s infinite'
                : selectedTab === 'rw_race' ? 'pulse-red 2s infinite'
                : 'pulse-green 2s infinite'
            }}
            data-testid="button-start-race"
          >
            {selectedTab === 'testing' ? 'Go to Track'
              : selectedTab === 'rw_practice' ? 'Start Practice'
              : selectedTab === 'rw_qualifying' ? 'Start Qualifying'
              : selectedTab === 'rw_race' ? 'Start Race'
              : isPracticeMode ? 'Start Practice' : 'Go to Grid'}
          </motion.button>
          <button
            onClick={() => {
              if (state.soundEnabled) playCarouselClick();
              if (isGrandPrix) {
                setIsGrandPrix(false);
                setGrandPrixPhase('rw_practice');
                setGrandPrixLockedDifficulty(null);
                setGrandPrixPolePosition(false);
                setGrandPrixPracticeCompleted(false);
                setGrandPrixQualifyingCompleted(false);
                dynamicDifficultyRef.current = null;
                setSelectedTab('race');
                setGameStatus("mode_select");
              } else if (isPreSeasonTesting) {
                setIsPreSeasonTesting(false);
                dynamicDifficultyRef.current = null;
                setSelectedTab('race');
                setGameStatus("mode_select");
              } else {
                setGameStatus("driver_select");
              }
            }}
            className="transition-colors text-sm uppercase tracking-wider text-gray-500 hover:text-gray-900"
            style={{ fontFamily: 'Oxanium, sans-serif' }}
            data-testid="button-back-menu"
          >
            Back
          </button>
        </div>
        <style>{`
          @keyframes pulse-red {
            0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7); }
            50% { box-shadow: 0 0 20px 10px rgba(220, 38, 38, 0.3); }
          }
          @keyframes pulse-green {
            0%, 100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7); }
            50% { box-shadow: 0 0 20px 10px rgba(22, 163, 74, 0.3); }
          }
          @keyframes pulse-purple {
            0%, 100% { box-shadow: 0 0 0 0 rgba(147, 51, 234, 0.7); }
            50% { box-shadow: 0 0 20px 10px rgba(147, 51, 234, 0.3); }
          }
          @keyframes pulse-blue {
            0%, 100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.7); }
            50% { box-shadow: 0 0 20px 10px rgba(37, 99, 235, 0.3); }
          }
          @keyframes pulse-amber {
            0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); }
            50% { box-shadow: 0 0 20px 10px rgba(245, 158, 11, 0.3); }
          }
        `}</style>
      </div>
    );
  }

  // Countdown screen with F1 starting lights
  if (gameStatus === 'countdown') {
    return (
      <GameLayout trackName={selectedCircuit?.name || ""} lockViewport>
        <div className="flex-1 flex flex-col items-center justify-center gap-12 overflow-hidden pb-16">
          
          {/* F1 Starting Lights */}
          <div className="bg-black rounded-xl p-4 md:p-6 shadow-2xl border-4 border-zinc-800">
            <div className="flex gap-2 md:gap-3 justify-center">
              {[1, 2, 3, 4, 5].map((light) => (
                <motion.div
                  key={light}
                  initial={{ opacity: 0.3 }}
                  animate={{
                    opacity: countdownLight >= light ? 1 : 0.3,
                    scale: countdownLight >= light ? 1 : 0.95
                  }}
                  className={cn(
                    "w-10 h-10 md:w-16 md:h-16 rounded-full transition-all duration-100 border-2 md:border-4",
                    countdownLight >= light
                      ? "bg-red-600 border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.8)] md:shadow-[0_0_30px_rgba(220,38,38,0.8)]"
                      : "bg-zinc-800 border-zinc-700"
                  )}
                />
              ))}
            </div>
          </div>

        </div>
      </GameLayout>
    );
  }

  // GO state - lights out, green indicator
  if (gameStatus === 'go') {
    return (
      <GameLayout trackName={selectedCircuit?.name || ""} lockViewport>
        <div className="flex-1 flex flex-col items-center justify-center gap-8 overflow-hidden pb-16">
          
          {/* Green GO indicator */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-black rounded-xl p-4 md:p-6 shadow-2xl border-4 border-zinc-800"
          >
            <div className="flex gap-2 md:gap-3 justify-center">
              {[1, 2, 3, 4, 5].map((light) => (
                <div
                  key={light}
                  className="w-10 h-10 md:w-16 md:h-16 rounded-full border-2 md:border-4 bg-green-500 border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.8)] md:shadow-[0_0_30px_rgba(34,197,94,0.8)]"
                />
              ))}
            </div>
          </motion.div>

          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-6xl font-bold text-green-600"
          >
            GO!
          </motion.div>

          {/* Stopwatch preview in green */}
          <div className="flex items-center gap-2 text-2xl font-mono font-medium text-green-600 bg-green-100 px-6 py-2 rounded-full">
            <Timer className="w-5 h-5" />
            {formatTime(0)}
          </div>

        </div>
      </GameLayout>
    );
  }

  if (gameStatus === 'crashed') {
    if (showCrashDebrief) {
      return (
        <GameLayout trackName={selectedCircuit?.name || ""} lockViewport>
          <div className="absolute inset-0 bg-black z-50 flex items-center justify-center p-4">
            <div className="bg-black p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold uppercase tracking-wider text-yellow-400" style={{ fontFamily: 'Oxanium, sans-serif' }}>Debrief</h2>
                <button
                  onClick={() => setShowCrashDebrief(false)}
                  className="p-2 hover:bg-secondary rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-3">
                {mistakeLog.map((mistake, index) => (
                  <div key={index} className="rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-600 flex items-center justify-center font-bold text-white" style={{ fontFamily: 'Oxanium, sans-serif' }}>
                        {index + 1}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="text-lg font-bold text-white" style={{ fontFamily: 'Oxanium, sans-serif' }}>{mistake.question}</div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground uppercase tracking-wide">Input:</span>
                            <span className="ml-2 font-bold text-red-500" style={{ fontFamily: 'Oxanium, sans-serif' }}>{mistake.yourAnswer}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground uppercase tracking-wide">Solution:</span>
                            <span className="ml-2 font-bold text-green-500" style={{ fontFamily: 'Oxanium, sans-serif' }}>{mistake.correctAnswer}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowCrashDebrief(false)}
                className="w-full mt-6 bg-primary text-primary-foreground h-12 rounded-lg font-medium hover:opacity-90 transition-all uppercase tracking-wider"
                style={{ fontFamily: 'Oxanium, sans-serif' }}
              >
                Close Review
              </button>
            </div>
          </div>
        </GameLayout>
      );
    }

    return (
      <GameLayout trackName={selectedCircuit?.name || ""} lockViewport>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="text-[7rem] leading-none font-bold text-red-600" style={{ fontFamily: 'Oxanium, sans-serif' }}>DNF</div>
          <div className="mt-8 flex flex-col gap-3 w-full max-w-xs md:max-w-md">
            <Link href="/garage">
              <button className="w-full bg-green-600 text-white h-12 rounded-lg font-medium hover:bg-green-700 transition-all">
                Back to Garage
              </button>
            </Link>
            <button onClick={() => setShowCrashDebrief(true)} className="w-full bg-black text-yellow-400 h-12 rounded-lg font-medium hover:bg-black/90 transition-all">
              Debrief
            </button>
          </div>
        </div>
      </GameLayout>
    );
  }

  // Pre-Season Testing Finish Screen
  if (gameStatus === 'finished' && isPreSeasonTesting) {
    const achievedLabel = DRIVERS.find(d => d.difficulty === (dynamicDifficultyRef.current?.currentDifficulty || dynamicDifficultyDisplay))?.label || 'Karting';
    return (
      <GameLayout trackName={selectedCircuit?.name || ""} lockViewport>
        <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full p-4">
          <div className="rounded-xl p-6 w-full text-center space-y-6">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Pre-Season Testing</div>
              <div className="text-5xl font-bold tracking-tighter" style={{ fontFamily: 'Oxanium, sans-serif' }}>Testing Complete</div>
            </div>
            <div className="py-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Achieved Level</span>
                <span className="font-bold" style={{ fontFamily: 'Oxanium, sans-serif' }}>{achievedLabel}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Time</span>
                <span className="font-bold font-mono">{formatTime(elapsedTime)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Questions</span>
                <span className="font-bold" style={{ fontFamily: 'Oxanium, sans-serif' }}>{progress}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Mistakes</span>
                <span className={cn("font-bold", finalMistakes === 0 ? "text-green-600" : "text-red-600")}>{finalMistakes}</span>
              </div>
              {pstCycleCount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Cycles Completed</span>
                  <span className="font-bold text-yellow-400" style={{ fontFamily: 'Oxanium, sans-serif' }}>{pstCycleCount}</span>
                </div>
              )}
            </div>
            <div className="grid gap-3">
              <Link href="/leaderboard">
                <button className="w-full bg-yellow-400 text-black h-12 rounded-lg font-bold hover:bg-yellow-300 transition-all flex items-center justify-center gap-2 uppercase tracking-wider" style={{ fontFamily: 'Oxanium, sans-serif' }}>
                  View Leaderboard
                </button>
              </Link>
              <button onClick={restartRace} className="w-full bg-secondary text-secondary-foreground h-12 rounded-lg font-medium hover:bg-secondary/80 transition-all flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" /> Back to Menu
              </button>
            </div>
          </div>
        </div>
        {showNamePrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-[#111] border border-[#333] rounded-2xl p-6 w-full max-w-sm mx-4 space-y-4">
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Oxanium, sans-serif' }}>Enter Your Name</h2>
                <p className="text-sm text-white/50">This will appear on the global leaderboard</p>
              </div>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value.slice(0, 20))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && nameInput.trim()) {
                    const trimmed = nameInput.trim();
                    setPlayerName(trimmed);
                    if (pendingScoreSubmission) {
                      submitLeaderboardEntry({
                        ...pendingScoreSubmission,
                        playerName: trimmed,
                      }).catch(() => { /* silent */ });
                    }
                    setPendingScoreSubmission(null);
                    setShowNamePrompt(false);
                  }
                }}
                autoFocus
                maxLength={20}
                placeholder="Your name..."
                className="w-full px-4 py-3 bg-black border border-[#444] rounded-xl text-white text-center text-lg focus:outline-none focus:border-yellow-400 transition-colors"
                style={{ fontFamily: 'Oxanium, sans-serif' }}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setPendingScoreSubmission(null);
                    setShowNamePrompt(false);
                  }}
                  className="flex-1 py-3 rounded-xl text-sm font-medium text-white/50 border border-[#333] hover:bg-white/5 transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={() => {
                    if (nameInput.trim()) {
                      const trimmed = nameInput.trim();
                      setPlayerName(trimmed);
                      if (pendingScoreSubmission) {
                        submitLeaderboardEntry({
                          ...pendingScoreSubmission,
                          playerName: trimmed,
                        }).catch(() => { /* silent */ });
                      }
                      setPendingScoreSubmission(null);
                      setShowNamePrompt(false);
                    }
                  }}
                  disabled={!nameInput.trim()}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-black bg-yellow-400 hover:bg-yellow-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  style={{ fontFamily: 'Oxanium, sans-serif' }}
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </GameLayout>
    );
  }

  // Grand Prix Practice Finish Screen
  if (gameStatus === 'finished' && isGrandPrix && grandPrixPhase === 'rw_practice') {
    const difficultyLabel = DRIVERS.find(d => d.difficulty === (grandPrixLockedDifficulty || 'beginner'))?.label || 'Karting';
    return (
      <GameLayout trackName={selectedCircuit?.name || ""} lockViewport>
        <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full p-4">
          <div className="rounded-xl p-6 w-full text-center space-y-6">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Grand Prix</div>
              <div className="text-5xl font-bold tracking-tighter" style={{ fontFamily: 'Oxanium, sans-serif' }}>Practice Complete</div>
            </div>
            <div className="py-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Achieved Level</span>
                <span className="font-bold" style={{ fontFamily: 'Oxanium, sans-serif' }}>{difficultyLabel}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Time</span>
                <span className="font-bold font-mono">{formatTime(elapsedTime)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Mistakes</span>
                <span className={cn("font-bold", finalMistakes === 0 ? "text-green-600" : "text-red-600")}>{finalMistakes}</span>
              </div>
            </div>
            <div className="grid gap-3">
              <button
                onClick={() => {
                  restartToSelectingScreen();
                  setSelectedTab('rw_qualifying');
                  setGrandPrixPhase('rw_qualifying');
                  setIsPracticeMode(false);
                  setRaceMode('bot');
                }}
                className="w-full py-4 rounded-xl font-bold text-lg uppercase tracking-wider text-white"
                style={{
                  fontFamily: 'Oxanium, sans-serif',
                  backgroundColor: '#f59e0b',
                  animation: 'pulse-amber 2s infinite'
                }}
              >
                Continue to Qualifying
              </button>
              <button onClick={restartRace} className="w-full bg-secondary text-secondary-foreground h-12 rounded-lg font-medium hover:bg-secondary/80 transition-all flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" /> Start Over
              </button>
            </div>
          </div>
          <style>{`
            @keyframes pulse-amber {
              0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); }
              50% { box-shadow: 0 0 20px 10px rgba(245, 158, 11, 0.3); }
            }
          `}</style>
        </div>
      </GameLayout>
    );
  }

  // Grand Prix Qualifying Finish Screen
  if (gameStatus === 'finished' && isGrandPrix && grandPrixPhase === 'rw_qualifying') {
    const gotPole = grandPrixPolePosition;
    return (
      <GameLayout trackName={selectedCircuit?.name || ""} lockViewport>
        <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full p-4">
          <div className="rounded-xl p-6 w-full text-center space-y-6">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Qualifying Result</div>
              <div className="text-8xl font-bold tracking-tighter" style={{ fontFamily: 'Oxanium, sans-serif' }}>{gotPole ? 'P1' : 'P2'}</div>
              <div className="text-xl font-medium" style={{ fontFamily: 'Oxanium, sans-serif' }}>
                {gotPole ? 'POLE POSITION' : 'Front Row'}
              </div>
            </div>
            <div className="py-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Time</span>
                <span className="font-bold font-mono">{formatTime(elapsedTime)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Mistakes</span>
                <span className={cn("font-bold", finalMistakes === 0 ? "text-green-600" : "text-red-600")}>{finalMistakes}</span>
              </div>
            </div>
            <div className="grid gap-3">
              <button
                onClick={() => {
                  restartToSelectingScreen();
                  setSelectedTab('rw_race');
                  setGrandPrixPhase('rw_race');
                  setIsPracticeMode(false);
                  setRaceMode('bot');
                }}
                className="w-full py-4 rounded-xl font-bold text-lg uppercase tracking-wider text-white"
                style={{
                  fontFamily: 'Oxanium, sans-serif',
                  backgroundColor: '#dc2626',
                  animation: 'pulse-red 2s infinite'
                }}
              >
                Continue to Race
              </button>
              <button onClick={restartRace} className="w-full bg-secondary text-secondary-foreground h-12 rounded-lg font-medium hover:bg-secondary/80 transition-all flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" /> Start Over
              </button>
            </div>
          </div>
          <style>{`
            @keyframes pulse-red {
              0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7); }
              50% { box-shadow: 0 0 20px 10px rgba(220, 38, 38, 0.3); }
            }
          `}</style>
        </div>
      </GameLayout>
    );
  }

  if (gameStatus === 'finished') {
    const { position } = getRaceResult();
    const isWinner = position === 1;
    const pbKey = selectedCircuit ? (selectedDriver?.difficulty ? `${selectedCircuit.id}:${selectedDriver.difficulty}` : selectedCircuit.id) : null;
    const previousBest = pbKey ? state.personalBests[pbKey] : null;
    const isNewBest = previousBest ? elapsedTime < previousBest : true;

    return (
      <GameLayout trackName={selectedCircuit?.name || ""} lockViewport>
        <div className="flex-1 flex flex-col items-center justify-start max-w-xl mx-auto w-full overflow-y-auto p-4">
          <div className="rounded-xl p-6 w-full text-center space-y-6">

            <div className="space-y-2">
               <div className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Race Result</div>
               <div className="text-8xl font-bold tracking-tighter">P{position}</div>
               <div className="text-xl font-medium">{isWinner ? "World Champion" : "Finish Position"}</div>
               {isNewBest && !isPracticeMode && (
                 <div className="text-sm font-bold text-green-500 animate-pulse">
                   🏆 NEW PERSONAL BEST!
                 </div>
               )}
            </div>

            <div className="py-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Circuit</span>
                <span className="font-bold">{selectedCircuit?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Time</span>
                <span className="font-bold font-mono">{formatTime(elapsedTime)}</span>
              </div>
              {previousBest && !isNewBest && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Personal Best</span>
                  <span className="font-bold font-mono text-green-500">{formatTime(previousBest)}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Mistakes</span>
                <span className={cn("font-bold", finalMistakes === 0 ? "text-green-600" : "text-red-600")}>{finalMistakes}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Accuracy</span>
                <span className="font-bold">{Math.max(0, Math.round(((raceLength - finalMistakes) / raceLength) * 100))}%</span>
              </div>
            </div>

            <div className="grid gap-3">
              <button
                onClick={() => setShowAnalytics(true)}
                className="w-full bg-black hover:bg-black/80 text-yellow-400 h-12 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                data-testid="button-debrief"
              >
                <BarChart3 className="w-4 h-4" /> Debrief
              </button>
              <button onClick={restartRace} className="w-full bg-green-600 hover:bg-green-700 text-white h-12 rounded-lg font-medium transition-all flex items-center justify-center gap-2" data-testid="button-race-again">
                <RotateCcw className="w-4 h-4" /> Race Again
              </button>
              <Link href="/">
                <button className="w-full bg-secondary text-secondary-foreground h-12 rounded-lg font-medium hover:bg-secondary/80 transition-all flex items-center justify-center gap-2" data-testid="button-main-menu">
                  <Home className="w-4 h-4" /> Main Menu
                </button>
              </Link>
            </div>

          </div>

          {/* Debrief Modal */}
          {showAnalytics && (
            <div className="absolute inset-0 bg-black z-50 flex items-center justify-center p-4">
              <div className="bg-black p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold uppercase tracking-wider text-yellow-400" style={{ fontFamily: 'Oxanium, sans-serif' }}>Debrief</h2>
                  <button
                    onClick={() => setShowAnalytics(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    data-testid="button-close-debrief"
                  >
                    <X className="w-6 h-6 text-white" />
                  </button>
                </div>

                {/* Sector Summary */}
                <div className="grid grid-cols-4 gap-2 md:gap-3 mb-6">
                  <div className="bg-purple-600/20 border border-purple-600/30 rounded-lg p-2 md:p-4 text-center">
                    <div className="text-2xl font-bold text-purple-400" style={{ fontFamily: 'Oxanium, sans-serif' }}>
                      {lapResults.filter(l => l.sectorColor === 'purple').length}
                    </div>
                    <div className="text-[10px] md:text-xs text-gray-400 uppercase tracking-wide">Purple</div>
                  </div>
                  <div className="bg-green-600/20 border border-green-600/30 rounded-lg p-2 md:p-4 text-center">
                    <div className="text-2xl font-bold text-green-400" style={{ fontFamily: 'Oxanium, sans-serif' }}>
                      {lapResults.filter(l => l.sectorColor === 'green').length}
                    </div>
                    <div className="text-[10px] md:text-xs text-gray-400 uppercase tracking-wide">Green</div>
                  </div>
                  <div className="bg-yellow-600/20 border border-yellow-600/30 rounded-lg p-2 md:p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-400" style={{ fontFamily: 'Oxanium, sans-serif' }}>
                      {lapResults.filter(l => l.sectorColor === 'yellow').length}
                    </div>
                    <div className="text-[10px] md:text-xs text-gray-400 uppercase tracking-wide">Yellow</div>
                  </div>
                  <div className="bg-red-600/20 border border-red-600/30 rounded-lg p-2 md:p-4 text-center">
                    <div className="text-2xl font-bold text-red-400" style={{ fontFamily: 'Oxanium, sans-serif' }}>
                      {lapResults.filter(l => l.sectorColor === 'red').length}
                    </div>
                    <div className="text-[10px] md:text-xs text-gray-400 uppercase tracking-wide">Red</div>
                  </div>
                </div>

                {/* Lap-by-lap breakdown */}
                <div className="space-y-2">
                  {lapResults.map((lap, index) => {
                    const hasWrong = lap.wrongAttempts && lap.wrongAttempts.length > 0;
                    const revealed = hasWrong && revealedAttempts.has(String(index));
                    return (
                      <div
                        key={index}
                        className={cn(
                          "flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg p-3",
                          hasWrong && "cursor-pointer"
                        )}
                        onClick={hasWrong ? () => setRevealedAttempts(prev => {
                          const next = new Set(prev);
                          const k = String(index);
                          if (next.has(k)) next.delete(k); else next.add(k);
                          return next;
                        }) : undefined}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white",
                          lap.sectorColor === 'purple' && "bg-purple-600",
                          lap.sectorColor === 'green' && "bg-green-600",
                          lap.sectorColor === 'yellow' && "bg-yellow-600",
                          lap.sectorColor === 'red' && "bg-red-600"
                        )} style={{ fontFamily: 'Oxanium, sans-serif' }}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className={cn("text-lg font-bold", revealed ? "text-green-500" : "text-white")} style={{ fontFamily: 'Oxanium, sans-serif' }}>
                            {revealed ? `${lap.question} = ${lap.correctAnswer}` : lap.question}
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <span className="text-xs text-gray-400 font-mono">
                            {(lap.responseTime / 1000).toFixed(3)}s
                          </span>
                          {!revealed && (
                            hasWrong
                              ? lap.wrongAttempts!.map((a, i) => (
                                  <span key={i} className="text-red-500 font-bold" style={{ fontFamily: 'Oxanium, sans-serif' }}>{i > 0 ? ',' : ''}{a}</span>
                                ))
                              : <span className="text-green-500 font-bold" style={{ fontFamily: 'Oxanium, sans-serif' }}>{lap.playerAnswer}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={exportTelemetryCSV}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white h-12 rounded-lg font-medium transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
                    style={{ fontFamily: 'Oxanium, sans-serif' }}
                    data-testid="button-share-debrief"
                  >
                    <Share2 className="w-4 h-4" /> Share
                  </button>
                  <button
                    onClick={() => setShowAnalytics(false)}
                    className="flex-1 bg-primary text-primary-foreground h-12 rounded-lg font-medium hover:opacity-90 transition-all uppercase tracking-wider"
                    style={{ fontFamily: 'Oxanium, sans-serif' }}
                    data-testid="button-close-debrief-bottom"
                  >
                    Close Review
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </GameLayout>
    );
  }

  // Racing phase
  return (
    <GameLayout trackName={selectedCircuit?.name || ""} lockViewport headerRight={(isPracticeMode && !isGrandPrix) ? (
        <button
          onClick={() => {
            const lastEnd = pstStintsRef.current.length > 0
              ? pstStintsRef.current[pstStintsRef.current.length - 1].endIndex
              : 0;
            pstStintsRef.current.push({ startIndex: lastEnd, endIndex: lapResults.length, time: elapsedTime });
            setPstSessionLog(true);
          }}
          className="px-5 py-1.5 bg-black text-white text-sm font-bold rounded-lg border-2 border-white hover:bg-gray-800 transition-colors uppercase tracking-wider"
          style={{ fontFamily: 'Oxanium, sans-serif' }}
          data-testid="button-box-header"
        >
          BOX
        </button>
      ) : undefined}>
      <div className="racing-screen flex-1 flex flex-col w-full overflow-hidden relative min-h-0">

        {/* Pause Overlay */}
        {isPaused && (
          <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center">
            <div className="text-center space-y-6">
              <div className="text-4xl font-bold">PAUSED</div>
              <button
                onClick={() => setIsPaused(false)}
                className="bg-green-600 text-white px-8 py-4 rounded-lg font-bold text-xl hover:bg-green-500 transition-all flex items-center gap-2 mx-auto"
                data-testid="button-resume"
              >
                <Play className="w-6 h-6" />
                Resume
              </button>
              <button
                onClick={restartRace}
                className="bg-secondary text-secondary-foreground px-6 py-2 rounded-lg font-medium hover:bg-secondary/80 transition-all flex items-center gap-2 mx-auto"
                data-testid="button-quit-race"
              >
                <Home className="w-4 h-4" />
                Quit Race
              </button>
            </div>
          </div>
        )}

        {/* PST Session Log Overlay */}
        {pstSessionLog && (
          <div className="fixed inset-0 bg-black z-[100] flex flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="px-4 py-3 border-b border-white/10 flex-shrink-0">
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-widest" style={{ fontFamily: 'Oxanium, sans-serif' }}>Session Log</div>
              <div className="text-xs text-muted-foreground mt-0.5">{lapResults.length} questions answered</div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {/* Stint summaries */}
              {pstStintsRef.current.length > 0 && (
                <div className="space-y-2 pb-3 border-b border-white/10">
                  {pstStintsRef.current.map((stint, si) => {
                    const stintLaps = lapResults.slice(stint.startIndex, stint.endIndex);
                    const correct = stintLaps.filter(l => !l.wrongAttempts || l.wrongAttempts.length === 0).length;
                    const prevTime = si > 0 ? pstStintsRef.current[si - 1].time : 0;
                    const stintTime = stint.time - prevTime;
                    return (
                      <div key={si} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                        <div className="text-xs font-bold text-white uppercase tracking-wider" style={{ fontFamily: 'Oxanium, sans-serif' }}>
                          Stint {si + 1}
                        </div>
                        <div className="flex gap-4 mt-1 text-xs text-gray-400">
                          <span>{stintLaps.length} questions</span>
                          <span className="text-green-400">{correct} correct</span>
                          <span className="font-mono">{formatTime(stintTime)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Lap-by-lap list */}
              {lapResults.length === 0 ? (
                <div className="text-muted-foreground text-sm text-center py-8">No answers yet</div>
              ) : (
                <div className="space-y-1">
                  {lapResults.map((lap, index) => {
                    const hasWrong = lap.wrongAttempts && lap.wrongAttempts.length > 0;
                    return (
                      <div key={index} className="flex items-center gap-3 py-1.5 border-b border-white/5 text-sm">
                        <span className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0",
                          lap.sectorColor === 'purple' && "bg-purple-600",
                          lap.sectorColor === 'green' && "bg-green-600",
                          lap.sectorColor === 'yellow' && "bg-yellow-600",
                          lap.sectorColor === 'red' && "bg-red-600"
                        )}>
                          {index + 1}
                        </span>
                        <span className="font-bold text-white flex-1" style={{ fontFamily: 'Oxanium, sans-serif' }}>
                          {lap.question} = {lap.correctAnswer}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">
                          {(lap.responseTime / 1000).toFixed(1)}s
                        </span>
                        {hasWrong && (
                          <span className="text-xs text-red-400">
                            {lap.wrongAttempts!.map((a, i) => (i > 0 ? ',' : '') + a)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-white/10 flex-shrink-0 grid grid-cols-2 gap-3">
              <button
                onClick={() => setPstSessionLog(false)}
                className="h-12 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold uppercase tracking-wider transition-colors"
                style={{ fontFamily: 'Oxanium, sans-serif' }}
              >
                Back to Track
              </button>
              <Link href="/">
                <button
                  className="w-full h-12 bg-secondary text-secondary-foreground rounded-lg font-bold uppercase tracking-wider hover:bg-secondary/80 transition-colors"
                  style={{ fontFamily: 'Oxanium, sans-serif' }}
                >
                  End Session
                </button>
              </Link>
            </div>
          </div>
        )}

        <div className="landscape-left">
        {/* Mode badge and controls */}
        <div className="flex justify-between items-center text-sm text-muted-foreground font-medium px-4 py-1">
          <div className="flex items-center gap-2">
            {isPreSeasonTesting ? (
              <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">FREE PRACTICE</span>
            ) : isGrandPrix && grandPrixPhase === 'rw_practice' ? (
              <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">PRACTICE</span>
            ) : isGrandPrix && grandPrixPhase === 'rw_qualifying' ? (
              <span className="text-xs text-white px-2 py-0.5 rounded" style={{ backgroundColor: '#f59e0b' }}>QUALIFYING</span>
            ) : isGrandPrix && grandPrixPhase === 'rw_race' ? (
              <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded">RACE DAY</span>
            ) : isPracticeMode ? (
              <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">PRACTICE</span>
            ) : (
              <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded">RACE</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!isPracticeMode && (
              <button
                onClick={() => setIsPaused(true)}
                className="p-1 hover:bg-secondary rounded transition-colors"
                data-testid="button-pause"
              >
                <Pause className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Main content - compact header zone */}
        <div className={cn("flex flex-col items-center px-4 pt-0", isPreSeasonTesting && "-mt-4")}>
          {/* Track Limits Warning */}
          <div className="h-12 flex items-center justify-center">
            <AnimatePresence>
              {showPenalty && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  {showBlackWhiteFlag && (
                    <img 
                      src={trackLimitsFlag} 
                      alt="Black and White Flag" 
                      className="h-8 w-12 object-cover rounded"
                    />
                  )}
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 0.3, repeat: 3 }}
                    className="text-white px-3 py-0.5 rounded-lg font-bold text-xs bg-red-600"
                  >
                    TRACK LIMITS
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Timer on top with weather indicator for realism random */}
          <div className="flex items-center gap-2 text-lg sm:text-xl font-mono font-medium text-primary">
            <Timer className="w-4 h-4 sm:w-5 sm:h-5" />
            {formatTime(elapsedTime)}
            {isRealismRandom && (
              <div className={cn(
                "text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ml-2",
                currentWeather === 'wet' ? "bg-blue-500/20 text-blue-400" : "bg-yellow-500/20 text-yellow-400"
              )}>
                {currentWeather === 'wet' ? 'WET' : 'DRY'}
              </div>
            )}
          </div>
          
          {/* Dynamic difficulty indicator for Grand Prix practice (PST shows it above keypad instead) */}
          {(isGrandPrix && grandPrixPhase === 'rw_practice') && (
            <div className="text-xs uppercase tracking-wider font-bold" style={{ fontFamily: 'Oxanium, sans-serif', color: dynamicDifficultyDisplay === 'hard' ? '#ef4444' : dynamicDifficultyDisplay === 'medium' ? '#38bdf8' : dynamicDifficultyDisplay === 'easy' ? '#000000' : '#22c55e' }}>
              {DRIVERS.find(d => d.difficulty === dynamicDifficultyDisplay)?.label || 'Karting'}
            </div>
          )}

          {/* Expression and Answer with Penalty Overlay */}
          <div className="relative">
            {/* Expression below timer */}
            <div className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mt-2">
              {question?.display}
            </div>

            {/* Answer display below expression */}
            <div
              className={cn(
                "text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold min-w-[80px] text-center mt-2",
                feedback === 'idle' && "text-muted-foreground/50",
                feedback === 'correct' && "text-green-600",
                feedback === 'incorrect' && "text-red-600"
              )}
              data-testid="display-answer"
            >
              {answer || (selectedCircuit?.type === 'Variables' ? "X=" : "0")}
            </div>

            {/* +5s Penalty Flash Overlay */}
            <AnimatePresence>
              {showFiveSecPenalty && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: [1, 0.2, 1, 0.2, 1], scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8 }}
                  className="absolute inset-0 flex items-center justify-center z-10"
                >
                  <span
                    className="text-3xl sm:text-4xl md:text-5xl font-bold text-red-600"
                    style={{ fontFamily: 'Oxanium, sans-serif' }}
                  >
                    +5s
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Minimal Feedback */}
          <div className="h-4 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {feedback === 'correct' && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-green-600 font-medium flex items-center gap-1 text-xs">
                  <Check className="w-3 h-3" /> Correct
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Progress Bar - between result and keypad */}
        {(effectiveSimMode || (isPracticeMode && !isGrandPrix)) ? (
          /* Sector Grid for all sim/realism mode races */
          <div className="flex flex-col justify-center gap-1 my-3 w-full max-w-md md:max-w-xl lg:max-w-2xl mx-auto px-4">
            <div>
              <div className={`grid gap-[2px]`} style={{ gridTemplateColumns: `repeat(${raceLength >= 40 ? 20 : 10}, 1fr)` }}>
                {Array.from({ length: raceLength }).map((_, i) => {
                  const isCompleted = i < progress;
                  const isCurrent = i === progress;
                  const lapData = lapResults[i];

                  let cellColor = "bg-muted";
                  if (isCompleted && lapData) {
                    cellColor = lapData.sectorColor === 'purple' ? "bg-purple-500" :
                                lapData.sectorColor === 'green' ? "bg-green-500" :
                                lapData.sectorColor === 'yellow' ? "bg-yellow-500" :
                                lapData.sectorColor === 'red' ? "bg-red-500" : "bg-muted";
                  } else if (isCurrent) {
                    cellColor = currentSectorRed ? "bg-red-500 animate-pulse" : "bg-gray-400/50 animate-pulse";
                  }

                  return (
                    <div
                      key={i}
                      className={cn(
                        "aspect-square rounded-[2px] transition-colors",
                        cellColor
                      )}
                    />
                  );
                })}
              </div>
            </div>
            {/* Progress text */}
            <div className="flex justify-between text-muted-foreground mt-0.5 px-1 text-xs">
              <span>Lap {progress + 1}/{raceLength}</span>
              <span className={cn(mistakes > 0 && "text-red-500")}>Limits: {mistakes}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col justify-center gap-1 my-3 w-full max-w-md md:max-w-xl lg:max-w-2xl mx-auto px-4">
            <div className="flex flex-col gap-1.5">
              {/* Bot row (only in bot mode) */}
              {raceMode === 'bot' && (
                <div>
                  <span className="text-[9px] text-foreground font-medium uppercase leading-none">BOT</span>
                  <div className="grid gap-[2px] mt-0.5" style={{ gridTemplateColumns: `repeat(20, 1fr)` }}>
                    {Array.from({ length: raceLength }).map((_, i) => {
                      const isCompleted = i < botProgress;
                      const lapData = botLapResults[i];

                      let cellColor = "bg-muted";
                      if (isCompleted && lapData) {
                        cellColor = lapData.sectorColor === 'purple' ? "bg-purple-500/70" :
                                    lapData.sectorColor === 'green' ? "bg-green-500/70" :
                                    "bg-yellow-500/70";
                      }

                      return (
                        <div
                          key={`bot-${i}`}
                          className={cn(
                            "aspect-square rounded-[2px] transition-colors",
                            cellColor
                          )}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Player row */}
              <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(20, 1fr)` }}>
                {Array.from({ length: raceLength }).map((_, i) => {
                  const isCompleted = i < progress;
                  const isCurrent = i === progress;
                  const lapData = lapResults[i];

                  let cellColor = "bg-muted";
                  if (isCompleted && lapData) {
                    cellColor = lapData.sectorColor === 'purple' ? "bg-purple-500" :
                                lapData.sectorColor === 'green' ? "bg-green-500" :
                                lapData.sectorColor === 'yellow' ? "bg-yellow-500" :
                                lapData.sectorColor === 'red' ? "bg-red-500" : "bg-muted";
                  } else if (isCurrent) {
                    cellColor = currentSectorRed ? "bg-red-500 animate-pulse" : "bg-gray-400/50 animate-pulse";
                  }

                  return (
                    <div
                      key={`player-${i}`}
                      className={cn(
                        "aspect-square rounded-[2px] transition-colors",
                        cellColor
                      )}
                    />
                  );
                })}
              </div>
            </div>
            {/* Progress text */}
            <div className="flex justify-between text-foreground mt-0.5 px-1 text-[11px]">
              <span>Lap {progress + 1}/{raceLength}</span>
              <span className={cn(mistakes > 0 && "text-red-500")}>Warnings: {mistakes}</span>
            </div>
          </div>
        )}

        </div>
        {/* Large Keypad with integrated Power-ups row */}
        <div className="landscape-right flex-1 flex flex-col justify-end lg:justify-center items-center px-4 min-h-0 pb-11">
          {/* Status Messages - floating above keypad */}
          {((raceMode === 'bot' && state.powerUpsEnabled) || (isPracticeMode && state.powerUpsEnabled) || isGrandPrix || isPreSeasonTesting) && (showBoostMessage || showAeroMessage) && (
            <div className="flex justify-center mb-2 h-6 w-full max-w-md md:max-w-xl">
              <div className="flex gap-2 items-center">
                <AnimatePresence>
                  {showBoostMessage && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className={cn(
                        "text-sm font-bold px-3 py-1 rounded-full",
                        botFrozen ? "bg-green-500 text-white" : "bg-yellow-500 text-black"
                      )}
                    >
                      {showBoostMessage}
                    </motion.div>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {showAeroMessage && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className={cn(
                        "text-sm font-bold px-3 py-1 rounded-full",
                        showAeroMessage.includes('BOOST') ? "bg-blue-500 text-white" :
                        showAeroMessage.includes('FAIL') ? "bg-red-500 text-white" :
                        showAeroMessage.includes('ACTIVE') ? "bg-blue-400 text-white" :
                        "bg-cyan-500 text-black"
                      )}
                    >
                      {showAeroMessage}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* PST level indicator above keypad */}
          {isPreSeasonTesting && (
            <div className="text-xs uppercase tracking-wider text-center mb-1 font-bold" style={{ fontFamily: 'Oxanium, sans-serif', color: dynamicDifficultyDisplay === 'hard' ? '#ef4444' : dynamicDifficultyDisplay === 'medium' ? '#38bdf8' : dynamicDifficultyDisplay === 'easy' ? '#000000' : '#22c55e' }}>
              {DRIVERS.find(d => d.difficulty === dynamicDifficultyDisplay)?.label || 'Karting'}
            </div>
          )}

          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 lg:gap-3 w-full max-w-md md:max-w-xl lg:max-w-2xl">
            {/* Power-ups row - integrated as extended keypad row */}
            {((raceMode === 'bot' && state.powerUpsEnabled) || (isPracticeMode && state.powerUpsEnabled) || isGrandPrix || isPreSeasonTesting) && (
              <>
                {/* AERO Button - above 7 */}
                <button
                  onPointerDown={(e) => {
                    e.preventDefault();
                    if (!(!aeroAvailable || aeroActive || isPaused)) {
                      handleAero();
                    }
                  }}
                  disabled={!aeroAvailable || aeroActive || isPaused}
                  className={cn(
                    "h-[56px] sm:h-[72px] md:h-[84px] lg:h-[100px] rounded-xl font-bold text-lg sm:text-xl lg:text-2xl transition-all active:scale-95 touch-manipulation select-none",
                    aeroActive
                      ? "bg-green-600 text-white shadow-[0_0_20px_rgba(34,197,94,0.7)] animate-pulse"
                      : aeroAvailable && !isPaused
                        ? "bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] ring-2 ring-yellow-400 animate-pulse"
                        : "bg-secondary text-secondary-foreground cursor-not-allowed"
                  )}
                  style={{ fontFamily: 'Oxanium, sans-serif' }}
                  data-testid="button-aero"
                >
                  {aeroActive ? 'ON' : 'AERO'}
                </button>

                {/* Energy Bar - above 8 */}
                <div className="h-[56px] sm:h-[72px] md:h-[84px] lg:h-[100px] rounded-xl bg-secondary overflow-hidden relative">
                  <motion.div
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-xl transition-all",
                      overtakeActive ? "bg-green-400" : "bg-green-500"
                    )}
                    animate={{
                      width: `${overtakeEnergy}%`,
                      opacity: overtakeActive ? [1, 0.7, 1] : 1
                    }}
                    transition={{
                      width: { duration: 0.1 },
                      opacity: overtakeActive ? { repeat: Infinity, duration: 0.5 } : { duration: 0 }
                    }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] sm:text-xs lg:text-sm font-bold text-black z-10">
                    {overtakeEnergy}%
                  </span>
                </div>

                {/* OT Button - above 9 */}
                <button
                  onPointerDown={(e) => {
                    e.preventDefault();
                    if (!((overtakeEnergy <= 0 && !overtakeActive) || isPaused || (!isPracticeMode && botFinished) || (isGrandPrix && grandPrixPhase !== 'rw_race'))) {
                      handleOvertake();
                    }
                  }}
                  disabled={(overtakeEnergy <= 0 && !overtakeActive) || isPaused || (!isPracticeMode && botFinished) || (isGrandPrix && grandPrixPhase !== 'rw_race')}
                  className={cn(
                    "h-[56px] sm:h-[72px] md:h-[84px] lg:h-[100px] rounded-xl font-bold text-lg sm:text-xl lg:text-2xl transition-all active:scale-95 touch-manipulation select-none",
                    overtakeActive
                      ? "bg-green-600 text-white shadow-[0_0_20px_rgba(34,197,94,0.7)] animate-pulse"
                      : overtakeAvailable && !isPaused
                        ? "bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.5)]"
                        : "bg-secondary text-secondary-foreground cursor-not-allowed"
                  )}
                  style={{ fontFamily: 'Oxanium, sans-serif' }}
                  data-testid="button-overtake"
                >
                  {overtakeActive ? 'ON' : 'OT'}
                </button>
              </>
            )}

            {/* Regular keypad buttons */}
            {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((num) => (
              <button
                key={num}
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  if (!isPaused && feedback === 'idle') {
                    playKeypadClick();
                    setAnswer(prev => prev + num.toString());
                  }
                }}
                disabled={isPaused}
                className="h-[56px] sm:h-[72px] md:h-[84px] lg:h-[100px] rounded-xl bg-secondary text-secondary-foreground text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold hover:bg-secondary/80 transition-colors active:scale-95 disabled:opacity-50 touch-manipulation select-none"
                data-testid={`keypad-${num}`}
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                if (!isPaused && feedback === 'idle') {
                  playKeypadClick();
                  setAnswer(prev => prev.slice(0, -1));
                }
              }}
              disabled={isPaused}
              className="h-[56px] sm:h-[72px] md:h-[84px] lg:h-[100px] rounded-xl bg-muted text-muted-foreground font-bold hover:bg-muted/80 transition-colors active:scale-95 flex items-center justify-center disabled:opacity-50 touch-manipulation select-none"
              data-testid="keypad-delete"
            >
              <Delete className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                if (!isPaused && feedback === 'idle') {
                  playKeypadClick();
                  setAnswer(prev => prev + '0');
                }
              }}
              disabled={isPaused}
              className="h-[56px] sm:h-[72px] md:h-[84px] lg:h-[100px] rounded-xl bg-secondary text-secondary-foreground text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold hover:bg-secondary/80 transition-colors active:scale-95 disabled:opacity-50 touch-manipulation select-none"
              data-testid="keypad-0"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!answer || feedback !== 'idle' || isPaused}
              className={cn(
                "h-[56px] sm:h-[72px] md:h-[84px] lg:h-[100px] rounded-xl text-xl sm:text-2xl font-bold transition-colors active:scale-95 flex items-center justify-center touch-manipulation select-none",
                answer && feedback === 'idle' && !isPaused
                  ? "bg-green-600 text-white hover:bg-green-500"
                  : "bg-muted text-muted-foreground"
              )}
              data-testid="keypad-submit"
            >
              <Check className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
          </div>
        </div>

      </div>

      {/* PST Name Prompt Overlay */}
      {showNamePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111] border border-[#333] rounded-2xl p-6 w-full max-w-sm mx-4 space-y-4">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Oxanium, sans-serif' }}>Enter Your Name</h2>
              <p className="text-sm text-white/50">This will appear on the global leaderboard</p>
            </div>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value.slice(0, 20))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && nameInput.trim()) {
                  const trimmed = nameInput.trim();
                  setPlayerName(trimmed);
                  if (pendingScoreSubmission) {
                    submitLeaderboardEntry({
                      ...pendingScoreSubmission,
                      playerName: trimmed,
                    }).catch(() => { /* silent */ });
                  }
                  setPendingScoreSubmission(null);
                  setShowNamePrompt(false);
                }
              }}
              autoFocus
              maxLength={20}
              placeholder="Your name..."
              className="w-full px-4 py-3 bg-black border border-[#444] rounded-xl text-white text-center text-lg focus:outline-none focus:border-yellow-400 transition-colors"
              style={{ fontFamily: 'Oxanium, sans-serif' }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setPendingScoreSubmission(null);
                  setShowNamePrompt(false);
                }}
                className="flex-1 py-3 rounded-xl text-sm font-medium text-white/50 border border-[#333] hover:bg-white/5 transition-colors"
              >
                Skip
              </button>
              <button
                onClick={() => {
                  if (nameInput.trim()) {
                    const trimmed = nameInput.trim();
                    setPlayerName(trimmed);
                    if (pendingScoreSubmission) {
                      submitLeaderboardEntry({
                        ...pendingScoreSubmission,
                        playerName: trimmed,
                      }).catch(() => { /* silent */ });
                    }
                    setPendingScoreSubmission(null);
                    setShowNamePrompt(false);
                  }
                }}
                disabled={!nameInput.trim()}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-black bg-yellow-400 hover:bg-yellow-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                style={{ fontFamily: 'Oxanium, sans-serif' }}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

    </GameLayout>
  );
}
