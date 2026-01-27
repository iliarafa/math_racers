import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Link, useLocation } from "wouter";
import useEmblaCarousel from "embla-carousel-react";
import { GameLayout } from "@/components/layout/GameLayout";
import { TrackProgress } from "@/components/TrackProgress";
import { useGameState, generateQuestion, Question, CIRCUITS, RACE_LENGTH, getRaceLength, DRIVERS_2025, Circuit, DRIVERS, Driver, getAeroZones, getCurrentAeroZone, getHarderDifficulty, calculateEnergyHarvest } from "@/lib/gameLogic";
import { cn } from "@/lib/utils";
import { Check, X, RotateCcw, Home, Timer, Delete, Pause, Play, BarChart3, ChevronLeft, ChevronRight, Download, Globe, Share2 } from "lucide-react";

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
import trackLimitsFlag from "@/assets/track-limits-flag.png";
import trackMonza from "@/assets/track_monza.png";
import trackSpa from "@/assets/track_spa.png";
import trackMonaco from "@/assets/track_monaco.png";
import trackSuzuka from "@/assets/track_suzuka.png";
import trackSilverstone from "@/assets/track_silverstone.png";
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
import simplyLovelyAudio from "@/assets/simply_lovely.m4a";
import logoImage from "@assets/1Asset_3@2x_1767902844976.png";

const FLAG_IMAGES: { [circuitId: string]: string } = {
  "monza": flagItaly,
  "spa": flagBelgium,
  "monaco": flagMonaco,
  "suzuka": flagJapan,
  "silverstone": flagUK,
};

const TRACK_IMAGES: { [circuitId: string]: string } = {
  "monza": trackMonza,
  "spa": trackSpa,
  "monaco": trackMonaco,
  "suzuka": trackSuzuka,
  "silverstone": trackSilverstone,
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
              <div className="text-lg font-bold" style={{ fontFamily: 'Formula1' }}>{weather.name}</div>
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
  const { state, addCoins, incrementStreak, resetStreak, incrementLaps, addCareerPoints, incrementRacesWon, updatePersonalBest, recordLapTime } = useGameState();
  const [, setLocation] = useLocation();
  const [raceMode, setRaceMode] = useState<'solo' | 'bot' | 'multiplayer'>('bot'); // Default to bot for race mode
  const [botProgress, setBotProgress] = useState(0);
  const [botLapResults, setBotLapResults] = useState<Array<{
    sectorColor: 'purple' | 'green' | 'yellow';
    botTime: number;
  }>>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [selectedCircuit, setSelectedCircuit] = useState<Circuit | null>(null);
  const [selectedWeather, setSelectedWeather] = useState<Weather>('dry');
  const [actualWeather, setActualWeather] = useState<'dry' | 'wet'>('dry');
  
  const raceLength = selectedCircuit ? getRaceLength(selectedCircuit.id, state.simMode) : RACE_LENGTH;
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'race' | 'practice' | 'multiplayer'>('race');
  const [isPaused, setIsPaused] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [progress, setProgress] = useState(0);
  const [lapResults, setLapResults] = useState<Array<{ 
    result: 'correct' | 'incorrect'; 
    speed: 'fast' | 'normal' | 'slow';
    question: string;
    playerAnswer: number;
    correctAnswer: number;
    sectorColor: 'green' | 'purple' | 'yellow' | 'red';
    responseTime: number;
  }>>([]);
  const [mistakes, setMistakes] = useState(0);
  const [inPurpleMode, setInPurpleMode] = useState(false);
  const questionStartTimeRef = useRef<number>(Date.now());
  // Track the best time for each sector and who holds it (F1-style competitive timing)
  const [sectorBestTimes, setSectorBestTimes] = useState<Array<{
    bestTime: number;
    holder: 'player' | 'bot';
  }>>([]);
  const [gameStatus, setGameStatus] = useState<'driver_select' | 'selecting' | 'countdown' | 'go' | 'racing' | 'finished' | 'crashed'>('driver_select');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [countdownLight, setCountdownLight] = useState(0);
  const [finalMistakes, setFinalMistakes] = useState(0);
  const [showPenalty, setShowPenalty] = useState(false);
  const [showBlackWhiteFlag, setShowBlackWhiteFlag] = useState(false);
  const [penaltyMessage, setPenaltyMessage] = useState<{ text: string; color: string }>({ text: '', color: 'red' });
  const [mistakeLog, setMistakeLog] = useState<Array<{ question: string; yourAnswer: number; correctAnswer: number }>>([]);
  const [showMistakeReview, setShowMistakeReview] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  // OVERTAKE system state (energy bar based)
  const [overtakeEnergy, setOvertakeEnergy] = useState(0);           // 0-100% energy meter
  const [overtakeActive, setOvertakeActive] = useState(false);       // Currently draining?
  const [overtakeStartTime, setOvertakeStartTime] = useState<number | null>(null);
  const [overtakeStartEnergy, setOvertakeStartEnergy] = useState(0);
  const [botFrozen, setBotFrozen] = useState(false);        // Bot freeze state
  const [showBoostMessage, setShowBoostMessage] = useState<string | null>(null);
  const overtakeTimerRef = useRef<NodeJS.Timeout | null>(null);
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
  const sectorBestTimesRef = useRef(sectorBestTimes);

  useEffect(() => {
    soundEnabledRef.current = state.soundEnabled;
  }, [state.soundEnabled]);

  // Keep ref in sync with state
  useEffect(() => {
    sectorBestTimesRef.current = sectorBestTimes;
  }, [sectorBestTimes]);

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
      if (selectedWeather === 'random') {
        const rainProbability = CIRCUIT_RAIN_PROBABILITY[selectedCircuit.id] || 0.5;
        resolvedWeather = Math.random() < rainProbability ? 'wet' : 'dry';
      } else {
        resolvedWeather = selectedWeather;
      }
      setActualWeather(resolvedWeather);
      const isWet = resolvedWeather === 'wet';

      // Initialize AERO zones based on race length and sim mode
      const currentRaceLength = getRaceLength(selectedCircuit.id, state.simMode);
      const zones = getAeroZones(currentRaceLength, state.simMode);
      setAeroZones(zones);
      setAeroUsedZones(new Set());
      setAeroAvailable(false);
      setAeroActive(false);

      let lightCount = 0;
      const interval = setInterval(() => {
        if (lightCount >= 5) {
          clearInterval(interval);
          if (soundEnabledRef.current) {
            playBeep(1200, 200);
          }
          setQuestion(generateQuestion(selectedCircuit.id, selectedDriver.difficulty, isWet));
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
  }, [gameStatus, selectedCircuit, selectedDriver, selectedWeather, state.simMode]);


  // Timer Logic - only runs during racing and not paused
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameStatus === 'racing' && !isPaused) {
      if (raceStartTimeRef.current === null) {
        raceStartTimeRef.current = Date.now();
      }
      interval = setInterval(() => {
        const baseTime = Date.now() - raceStartTimeRef.current!;
        setElapsedTime(baseTime + penaltyTimeRef.current);
      }, 10);
    } else if (isPaused && raceStartTimeRef.current !== null) {
      // When pausing, adjust the start time to account for paused duration
      const pausedDuration = Date.now() - raceStartTimeRef.current - (elapsedTime - penaltyTimeRef.current);
      if (pausedDuration > 0) {
        raceStartTimeRef.current = raceStartTimeRef.current + pausedDuration;
      }
    }
    return () => clearInterval(interval);
  }, [gameStatus, isPaused]);

  // Guard: redirect to proper selection if missing driver/circuit
  useEffect(() => {
    if (!selectedDriver && gameStatus !== 'driver_select') {
      setGameStatus('driver_select');
    } else if (!selectedCircuit && (gameStatus === 'countdown' || gameStatus === 'go' || gameStatus === 'racing' || gameStatus === 'finished' || gameStatus === 'crashed')) {
      setGameStatus('selecting');
    }
  }, [selectedDriver, selectedCircuit, gameStatus]);

  // Auto-select first circuit when entering selecting state
  useEffect(() => {
    if (gameStatus === 'selecting' && !selectedCircuit) {
      setSelectedCircuit(CIRCUITS[0]);
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStatus, feedback, question, answer, selectedCircuit, progress, mistakes, isPaused]);

  const handleDriverSelect = (driver: Driver) => {
    initAudio();
    setSelectedDriver(driver);
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
    lines.push(`Accuracy,${Math.round(((raceLength - finalMistakes) / raceLength) * 100)}%`);
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
        text: `Race Results: ${selectedCircuit?.name || 'Race'} - ${formatTime(elapsedTime)} - ${Math.round(((raceLength - finalMistakes) / raceLength) * 100)}% accuracy`,
        files: [file]
      }).catch(() => {
        // If file sharing fails, try without file
        navigator.share({
          title: 'F1 Math Racer - Race Telemetry',
          text: `Race Results: ${selectedCircuit?.name || 'Race'}\nTime: ${formatTime(elapsedTime)}\nAccuracy: ${Math.round(((raceLength - finalMistakes) / raceLength) * 100)}%\nMistakes: ${finalMistakes}`
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
    setSectorBestTimes([]); // Reset sector best times for new race
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
      setFeedback('correct');
      if (soundEnabledRef.current) {
        playCorrectSound();
      }
      
      // F1-style competitive sector timing from lap 1:
      // - PURPLE = fastest time for this sector (only one driver)
      // - GREEN = correct answer, within 1.5x of best time
      // - YELLOW = correct answer, slower than 1.5x best time

      let speed: 'fast' | 'normal' | 'slow';
      let sectorColor: 'green' | 'purple' | 'yellow' | 'red' = 'green';

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
        setSectorBestTimes(times => {
          const newTimes = [...times];
          newTimes[sectorIndex] = newBestTime;
          return newTimes;
        });
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

      // Purple mode state tracks if currently in a purple streak (for UI effects)
      const newPurpleMode = sectorColor === 'purple';
      setInPurpleMode(newPurpleMode);

      // Standard coins (no more DRS zones)
      addCoins(10);
      incrementStreak();
      incrementLaps();
      const difficultyPoints = selectedDriver?.difficulty === 'hard' ? 3 : selectedDriver?.difficulty === 'medium' ? 2 : 1;
      addCareerPoints(difficultyPoints);

      // OVERTAKE energy harvesting: speed-based, faster answers harvest more energy
      // Only in bot race mode, not practice, and only when OVERTAKE is not active
      if (raceMode === 'bot' && !isPracticeMode && !overtakeActive) {
        const energyGain = calculateEnergyHarvest(
          responseTime,
          selectedDriver?.difficulty || 'easy',
          question.operation || 'Addition'
        );
        setOvertakeEnergy(prev => Math.min(prev + energyGain, 100));
      }

      // Calculate progress - double if aero was active
      const progressGain = aeroActive ? 2 : 1;
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
        responseTime
      };

      // When aero was active and we gained 2 sectors, add a bonus entry with same color
      const actualGain = newProgress - progress; // Handles capping at raceLength
      if (aeroActive && actualGain === 2) {
        setLapResults(prev => [...prev, mainEntry, {
          ...mainEntry,
          question: question.display + ' (AERO bonus)',
        }]);
      } else {
        setLapResults(prev => [...prev, mainEntry]);
      }

      if (newProgress >= raceLength) {
        if (isPracticeMode) {
          // In practice mode, reset and continue
          setProgress(0);
          setBotProgress(0);
          setLapResults([]);
          setBotLapResults([]);
          setSectorBestTimes([]); // Reset sector best times
          setMistakes(0);
          setElapsedTime(0);
          penaltyTimeRef.current = 0;
          raceStartTimeRef.current = Date.now();
          setInPurpleMode(false);
        } else {
          finishRace(mistakes);
        }
      } else {
        setTimeout(() => {
          setFeedback('idle');
          setAnswer("");
          // Use harder difficulty when AERO is active
          const nextDifficulty = aeroActive
            ? getHarderDifficulty(selectedDriver?.difficulty || 'easy')
            : selectedDriver?.difficulty || 'easy';
          setQuestion(generateQuestion(selectedCircuit.id, nextDifficulty, actualWeather === 'wet'));
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

      // Check if aero was active - deactivate on wrong answer
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

      // Penalty multiplier: 2x if aero was active
      const penaltyMultiplier = wasAeroActive ? 2 : 1;

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
      } else if (state.simMode) {
        // Realism mode: must answer correctly before continuing
        // Apply penalty but don't advance question
        setShowPenalty(true);
        
        // Apply time penalties same as standard mode (doubled if aero was active)
        if (newMistakes === 1) {
          const penalty = 2000 * penaltyMultiplier;
          setPenaltyMessage({ text: wasAeroActive ? 'TRACK LIMITS - AERO FAIL!' : 'TRACK LIMITS - TRY AGAIN', color: 'yellow' });
          penaltyTimeRef.current += penalty;
          setElapsedTime(prev => prev + penalty);
        } else if (newMistakes === 2) {
          const penalty = 2000 * penaltyMultiplier;
          setPenaltyMessage({ text: wasAeroActive ? 'WARNING - AERO FAIL!' : 'TRACK LIMITS WARNING - TRY AGAIN', color: 'yellow' });
          penaltyTimeRef.current += penalty;
          setElapsedTime(prev => prev + penalty);
        } else if (newMistakes === 3) {
          const penalty = 2000 * penaltyMultiplier;
          setPenaltyMessage({ text: wasAeroActive ? 'B&W FLAG - AERO FAIL!' : 'BLACK & WHITE FLAG - TRY AGAIN', color: 'yellow' });
          setShowBlackWhiteFlag(true);
          penaltyTimeRef.current += penalty;
          setElapsedTime(prev => prev + penalty);
        } else if (newMistakes <= 6) {
          const penalty = 5000 * penaltyMultiplier;
          setPenaltyMessage({ text: wasAeroActive ? `+${penalty/1000} SEC - AERO FAIL!` : '+5 SEC PENALTY - TRY AGAIN', color: 'red' });
          penaltyTimeRef.current += penalty;
          setElapsedTime(prev => prev + penalty);
        } else if (newMistakes <= 10) {
          const penalty = 10000 * penaltyMultiplier;
          setPenaltyMessage({ text: wasAeroActive ? `+${penalty/1000} SEC - AERO FAIL!` : '+10 SEC PENALTY - TRY AGAIN', color: 'red' });
          penaltyTimeRef.current += penalty;
          setElapsedTime(prev => prev + penalty);
        } else if (newMistakes >= 11) {
          setPenaltyMessage({ text: 'YOU CRASHED!', color: 'red' });
          setFinalMistakes(newMistakes);
          setGameStatus('crashed');
          return;
        }

        setTimeout(() => { setShowPenalty(false); setShowBlackWhiteFlag(false); }, 1500);
        
        // Clear answer but keep same question - don't reset questionStartTimeRef
        setTimeout(() => {
          setFeedback('idle');
          setAnswer("");
        }, 600);
      } else {
        // Standard race mode: apply penalties and advance (doubled if aero was active)
        setShowPenalty(true);

        if (newMistakes === 1) {
          const penalty = 2000 * penaltyMultiplier;
          setPenaltyMessage({ text: wasAeroActive ? 'TRACK LIMITS - AERO FAIL!' : 'TRACK LIMITS', color: 'yellow' });
          penaltyTimeRef.current += penalty;
          setElapsedTime(prev => prev + penalty);
        } else if (newMistakes === 2) {
          const penalty = 2000 * penaltyMultiplier;
          setPenaltyMessage({ text: wasAeroActive ? 'WARNING - AERO FAIL!' : 'TRACK LIMITS WARNING', color: 'yellow' });
          penaltyTimeRef.current += penalty;
          setElapsedTime(prev => prev + penalty);
        } else if (newMistakes === 3) {
          const penalty = 2000 * penaltyMultiplier;
          setPenaltyMessage({ text: wasAeroActive ? 'B&W FLAG - AERO FAIL!' : 'BLACK & WHITE FLAG', color: 'yellow' });
          setShowBlackWhiteFlag(true);
          penaltyTimeRef.current += penalty;
          setElapsedTime(prev => prev + penalty);
        } else if (newMistakes <= 6) {
          const penalty = 5000 * penaltyMultiplier;
          setPenaltyMessage({ text: wasAeroActive ? `+${penalty/1000} SEC - AERO FAIL!` : '+5 SECOND PENALTY', color: 'red' });
          penaltyTimeRef.current += penalty;
          setElapsedTime(prev => prev + penalty);
        } else if (newMistakes <= 10) {
          const penalty = 10000 * penaltyMultiplier;
          setPenaltyMessage({ text: wasAeroActive ? `+${penalty/1000} SEC - AERO FAIL!` : '+10 SECOND PENALTY', color: 'red' });
          penaltyTimeRef.current += penalty;
          setElapsedTime(prev => prev + penalty);
        } else if (newMistakes >= 11) {
          setPenaltyMessage({ text: 'YOU CRASHED!', color: 'red' });
          setFinalMistakes(newMistakes);
          setGameStatus('crashed');
          return;
        }

        setTimeout(() => { setShowPenalty(false); setShowBlackWhiteFlag(false); }, 1500);

        const newProgress = progress + 1;
        setProgress(newProgress);
        setLapResults(prev => [...prev, { 
          result: 'incorrect', 
          speed: 'normal',
          question: question.display,
          playerAnswer: val,
          correctAnswer: question.answer,
          sectorColor: 'red',
          responseTime
        }]);

        if (newProgress >= raceLength) {
          finishRace(newMistakes);
        } else {
          setTimeout(() => {
            setFeedback('idle');
            setAnswer("");
            setQuestion(generateQuestion(selectedCircuit.id, selectedDriver?.difficulty || 'easy', actualWeather === 'wet'));
            questionStartTimeRef.current = Date.now();
          }, 800);
        }
      }
    }
  };

  const finishRace = (mistakeCount: number) => {
    setFinalMistakes(mistakeCount);
    setFeedback('idle');
    setGameStatus('finished');
    if (mistakeCount === 0) {
       confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
       incrementRacesWon();
       if (selectedDriver?.difficulty === 'hard' && state.soundEnabled) {
         playSimplyLovely();
       }
    }
    // Update personal best time and record session lap time (only in race mode, not practice)
    if (!isPracticeMode && selectedCircuit) {
      updatePersonalBest(selectedCircuit.id, elapsedTime);
      recordLapTime(elapsedTime, selectedCircuit.name, selectedDriver?.id);
    }
  };

  const getRaceResult = () => {
    let position: number;
    if (finalMistakes === 0) {
      position = 1;
    } else if (finalMistakes <= 2) {
      position = 2;
    } else {
      position = finalMistakes;
    }
    if (position > DRIVERS_2025.length) position = DRIVERS_2025.length;
    return { position, driverName: DRIVERS_2025[position - 1] };
  };

  const restartRace = () => {
    setProgress(0);
    setBotProgress(0);
    setLapResults([]);
    setBotLapResults([]);
    setSectorBestTimes([]); // Reset sector best times
    setMistakes(0);
    setFinalMistakes(0);
    setShowPenalty(false);
    setElapsedTime(0);
    setCountdownLight(0);
    setGameStatus('driver_select');
    setSelectedDriver(null);
    setSelectedCircuit(null);
    setIsPracticeMode(false);
    setIsPaused(false);
    setFeedback('idle');
    setAnswer("");
    setQuestion(null);
    setMistakeLog([]);
    setShowMistakeReview(false);
    setRaceMode('bot'); // Race mode always uses bot opponent
    setSelectedWeather('dry');
    setActualWeather('dry');
    resetStreak();
    penaltyTimeRef.current = 0;
    raceStartTimeRef.current = null;
    setPenaltyMessage({ text: '', color: 'red' });
    setInPurpleMode(false);
    // Reset OVERTAKE state
    setOvertakeEnergy(0);
    setOvertakeActive(false);
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
  };

  // Handle OVERTAKE button activation (energy bar based)
  const handleOvertake = () => {
    const behindBot = botProgress > progress;
    const withinRange = behindBot && (botProgress - progress) <= 2;

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

    // Can only activate if: has energy, within range, not paused
    if (overtakeEnergy <= 0 || !withinRange || gameStatus !== 'racing' || isPaused) {
      return;
    }

    // Activate OVERTAKE mode
    setOvertakeActive(true);
    setBotFrozen(true);
    setOvertakeStartTime(Date.now());
    setOvertakeStartEnergy(overtakeEnergy);
    if (soundEnabledRef.current) {
      playOvertakeActivatedSound();
    }

    // Calculate duration based on current energy (5 seconds at 100%)
    const durationMs = (overtakeEnergy / 100) * 5000;

    // Set timer to end OVERTAKE when energy depletes
    overtakeTimerRef.current = setTimeout(() => {
      setOvertakeActive(false);
      setBotFrozen(false);
      setOvertakeEnergy(0);
      setOvertakeStartTime(null);
      setOvertakeStartEnergy(0);
      overtakeTimerRef.current = null;
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

  // Bot simulation during racing - uses setTimeout for per-lap timing
  useEffect(() => {
    if (gameStatus !== 'racing' || raceMode !== 'bot' || isPaused || botFrozen) return;
    if (botProgress >= raceLength) return;

    // Bot speed varies by difficulty - base time per question in ms
    // Higher = slower bot = more time for player
    // Karting (beginner) = slowest bot to give young kids more time
    const baseSpeed = selectedDriver?.difficulty === 'beginner' ? 4000 :
                      selectedDriver?.difficulty === 'easy' ? 3000 :
                      selectedDriver?.difficulty === 'medium' ? 2500 : 2000; // hard (F1)

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
        setSectorBestTimes(times => {
          const newTimes = [...times];
          newTimes[sectorIndex] = newBestTime;
          return newTimes;
        });
      } else {
        // Bot didn't beat the best - assign green/yellow based on factor
        sectorColor = randomFactor <= 1.15 ? 'green' : 'yellow';
      }

      setBotProgress(prev => prev + 1);
      setBotLapResults(prev => [...prev, { sectorColor, botTime: lapTime }]);
    }, lapTime);

    return () => clearTimeout(timeout);
  }, [gameStatus, raceMode, isPaused, botFrozen, selectedDriver, raceLength, botProgress]);

  const handleMultiplayerSelect = () => {
    setSelectedDriver(null);
    setSelectedCircuit(null);
    setGameStatus('driver_select');
    setLocation('/multiplayer');
  };

  // Driver Selection Screen - Racing Series Menu
  if (gameStatus === 'driver_select') {
    const seriesOptions = [
      { id: 'karting', name: 'KART', description: 'Amateur', driver: DRIVERS.find(d => d.id === 'karting') },
      { id: 'f3', name: 'F3', description: 'Rookie', driver: DRIVERS.find(d => d.id === 'f3') },
      { id: 'f2', name: 'F2', description: 'Pro', driver: DRIVERS.find(d => d.id === 'f2') },
      { id: 'f1', name: 'F1', description: 'Champion', driver: DRIVERS.find(d => d.id === 'f1') },
    ];

    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#ffffff' }}>
        {/* App Logo */}
        <div className="pb-4 flex justify-center" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}>
          <Link href="/">
            <img
              src={logoImage}
              alt="F1 Math Racer"
              className="h-8 object-contain cursor-pointer hover:opacity-70 transition-opacity"
            />
          </Link>
        </div>
        {/* Series Selection */}
        <div className="flex flex-col items-center px-8">
          {/* Section Title */}
          <h2
            className="text-3xl font-bold uppercase tracking-wider text-black mt-16 mb-16"
            style={{ fontFamily: 'Formula1' }}
          >
            Select Series
          </h2>
          <div className="flex flex-col items-center gap-3">
          {seriesOptions.map((series) => {
            const isSelected = selectedDriver?.id === series.id;

            return (
              <motion.button
                key={series.id}
                onClick={() => { setSelectedDriver(series.driver || null); if (state.soundEnabled) playCarouselClick(); }}
                whileTap={{ scale: 0.98 }}
                className="w-full max-w-xs py-3 text-center"
                data-testid={`level-${series.id}`}
              >
                <span
                  className="block"
                  style={{
                    fontFamily: 'Formula1',
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    color: '#000000',
                    opacity: isSelected ? 1 : 0.4,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {series.name}
                </span>
                <span
                  className="block mt-1 uppercase tracking-widest"
                  style={{
                    fontSize: '0.65rem',
                    color: '#000000',
                    opacity: isSelected ? 0.6 : 0.3,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {series.description}
                </span>
              </motion.button>
            );
          })}
          </div>
        </div>
        {/* Confirm Strategy Button - Fixed Bottom */}
        <div className="fixed bottom-0 left-0 right-0 px-8 py-4 flex flex-col items-center gap-3" style={{ backgroundColor: '#ffffff' }}>
          {selectedDriver && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { if (state.soundEnabled) playCarouselClick(); handleDriverSelect(selectedDriver); }}
              className="w-full max-w-sm py-4 rounded-xl font-bold text-lg uppercase tracking-wider text-white"
              style={{ 
                fontFamily: 'Formula1',
                backgroundColor: '#22c55e',
                animation: 'pulse-green 2s infinite'
              }}
              data-testid="button-confirm-strategy"
            >
              Select Track
            </motion.button>
          )}
          <Link href="/">
            <button
              onClick={() => { if (state.soundEnabled) playCarouselClick(); }}
              className="transition-colors text-sm uppercase tracking-wider text-gray-400 hover:text-black"
              data-testid="button-back-menu"
            >
              &lt;&lt; Menu
            </button>
          </Link>
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
        {/* App Logo */}
        <div className="pb-4 flex justify-center" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}>
          <Link href="/">
            <img
              src={logoImage}
              alt="F1 Math Racer"
              className="h-8 object-contain cursor-pointer hover:opacity-70 transition-opacity"
            />
          </Link>
        </div>
        {/* Race/Practice/Multiplayer Pill Toggle */}
        <div className="pb-4 flex justify-center">
          <div className="rounded-full p-1 flex gap-1 bg-gray-200">
            <button
              onClick={() => { setSelectedTab('race'); setIsPracticeMode(false); setRaceMode('bot'); if (state.soundEnabled) playCarouselClick(); }}
              className={cn(
                "px-4 py-2 rounded-full font-bold text-xs uppercase tracking-wider transition-all",
                selectedTab === 'race'
                  ? "bg-red-600 text-white" 
                  : "bg-transparent text-gray-600 hover:text-gray-900"
              )}
              style={{ fontFamily: 'Formula1' }}
              data-testid="button-race-mode"
            >
              Race
            </button>
            <button
              onClick={() => { setSelectedTab('practice'); setIsPracticeMode(true); setRaceMode('solo'); if (state.soundEnabled) playCarouselClick(); }}
              className={cn(
                "px-4 py-2 rounded-full font-bold text-xs uppercase tracking-wider transition-all",
                selectedTab === 'practice' 
                  ? "bg-green-600 text-white" 
                  : "bg-transparent text-gray-600 hover:text-gray-900"
              )}
              style={{ fontFamily: 'Formula1' }}
              data-testid="button-practice-mode"
            >
              Practice
            </button>
            <button
              onClick={() => { setSelectedTab('multiplayer'); if (state.soundEnabled) playCarouselClick(); }}
              className={cn(
                "px-4 py-2 rounded-full font-bold text-xs uppercase tracking-wider transition-all",
                selectedTab === 'multiplayer'
                  ? "bg-blue-600 text-white" 
                  : "bg-transparent text-gray-600 hover:text-gray-900"
              )}
              style={{ fontFamily: 'Formula1' }}
              data-testid="button-multiplayer-mode"
            >
              Multiplayer
            </button>
          </div>
        </div>
        {/* Main Content - Hero Card with Side Chevrons */}
        <div className="flex-1 flex items-start justify-center px-8 pb-24 pt-4">
          {selectedTab === 'multiplayer' ? (
            /* Multiplayer Card */
            (<div className="flex flex-col items-center">
              <motion.div
                key="multiplayer-card"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="w-[350px] rounded-[20px] p-6 flex flex-col transition-colors duration-300 select-none"
                style={{ 
                  backgroundColor: '#f0f0f0',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
                }}
                data-testid="hero-card-multiplayer"
              >
                {/* Header */}
                <div className="flex items-center justify-center gap-3 mb-4">
                  <h2 
                    className="text-2xl font-bold uppercase tracking-wider text-gray-900"
                    style={{ fontFamily: 'Formula1' }}
                  >
                    VS Mode
                  </h2>
                  <Globe className="w-6 h-6 text-blue-600" />
                </div>

                {/* VS Graphic */}
                <div className="flex-1 flex items-center justify-center py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center">
                      <span className="text-2xl font-bold text-white" style={{ fontFamily: 'Formula1' }}>P1</span>
                    </div>
                    <span className="text-3xl font-bold text-gray-400" style={{ fontFamily: 'Formula1' }}>VS</span>
                    <div className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center">
                      <span className="text-2xl font-bold text-white" style={{ fontFamily: 'Formula1' }}>P2</span>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="text-center mb-4">
                  <div className="text-sm uppercase tracking-wider mb-1 text-gray-500">Real-Time Racing</div>
                  <div 
                    className="text-lg font-bold uppercase text-gray-900"
                    style={{ fontFamily: 'Formula1' }}
                  >
                    Head to Head
                  </div>
                </div>

                {/* Description */}
                <div className="text-center pt-2 border-t border-gray-300">
                  <p className="text-xs text-gray-500 mt-3">
                    Create or join a room to race against a friend in real-time
                  </p>
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
                  className="w-[350px] rounded-[20px] p-6 flex flex-col transition-colors duration-300 select-none"
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
                  {/* Header - Circuit Name & Flag */}
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <h2 
                      className="text-2xl font-bold uppercase tracking-wider text-gray-900"
                      style={{ fontFamily: 'Formula1' }}
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
                  <div className="flex-1 flex items-center justify-center py-6">
                    {CIRCUIT_MAP_IMAGES[displayCircuit.id] ? (
                      <img 
                        src={CIRCUIT_MAP_IMAGES[displayCircuit.id].black} 
                        alt={`${displayCircuit.name} circuit`}
                        className="h-40 object-contain"
                        style={{ maxWidth: '280px' }}
                      />
                    ) : (
                      <svg 
                        viewBox="0 0 300 160" 
                        className="w-full h-40"
                        style={{ maxWidth: '280px' }}
                      >
                        <path
                          d={displayCircuit.paths.s1}
                          fill="none"
                          stroke={state.teamColor || '#ffffff'}
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d={displayCircuit.paths.s2}
                          fill="none"
                          stroke={state.teamColor || '#ffffff'}
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d={displayCircuit.paths.s3}
                          fill="none"
                          stroke={state.teamColor || '#ffffff'}
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Info - Math Type */}
                  <div className="text-center mb-4">
                    <div className="text-sm uppercase tracking-wider mb-1 text-gray-500">Math Type</div>
                    <div 
                      className="text-lg font-bold uppercase text-gray-900"
                      style={{ fontFamily: 'Formula1' }}
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
                      <span className="text-[9px] text-gray-500 uppercase tracking-wide">Standard</span>
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
                      <span className="text-[9px] text-gray-500 uppercase tracking-wide">Harder</span>
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
                      <span className="text-[9px] text-gray-500 uppercase tracking-wide">Surprise</span>
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
        {selectedTab !== 'multiplayer' && (
          <div className="fixed bottom-40 left-0 right-0 flex justify-center gap-2">
            {CIRCUITS.map((circuit, index) => (
              <button
                key={circuit.id}
                onClick={() => { handleCircuitSelect(circuit); if (state.soundEnabled) playCarouselClick(); }}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  currentCircuitIndex === index 
                    ? "bg-gray-900" 
                    : "bg-gray-400"
                )}
                data-testid={`circuit-dot-${circuit.id}`}
              />
            ))}
          </div>
        )}
        {/* Start Engine Button - Fixed Bottom */}
        <div className="fixed bottom-4 left-0 right-0 px-8 py-4 flex flex-col items-center gap-3 transition-colors duration-300" style={{ backgroundColor: '#ffffff' }}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { if (state.soundEnabled) playCarouselClick(); selectedTab === 'multiplayer' ? setLocation('/multiplayer') : handleStartRace(); }}
            className="w-full max-w-sm py-4 rounded-xl font-bold text-lg uppercase tracking-wider text-white"
            style={{ 
              fontFamily: 'Formula1',
              backgroundColor: selectedTab === 'multiplayer' ? '#2563eb' : isPracticeMode ? '#16a34a' : '#dc2626',
              animation: selectedTab === 'multiplayer' ? 'pulse-blue 2s infinite' : isPracticeMode ? 'pulse-green 2s infinite' : 'pulse-red 2s infinite'
            }}
            data-testid="button-start-race"
          >
            {selectedTab === 'multiplayer' ? 'Enter Lobby' : isPracticeMode ? 'Start Practice' : 'Start Engine'}
          </motion.button>
          <Link href="/">
            <button
              onClick={() => { if (state.soundEnabled) playCarouselClick(); }}
              className="transition-colors text-sm uppercase tracking-wider text-gray-500 hover:text-gray-900"
              data-testid="button-back-menu"
            >
              &lt;&lt; Menu
            </button>
          </Link>
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
        `}</style>
      </div>
    );
  }

  // Countdown screen with F1 starting lights
  if (gameStatus === 'countdown') {
    return (
      <GameLayout coins={state.coins} trackName={selectedCircuit?.name || ""} lockViewport>
        <div className="flex-1 flex flex-col items-center justify-center gap-12 overflow-hidden pb-16">
          
          {/* F1 Starting Lights */}
          <div className="flex gap-4">
            {[1, 2, 3, 4, 5].map((light) => (
              <motion.div
                key={light}
                initial={{ opacity: 0.3 }}
                animate={{ 
                  opacity: countdownLight >= light ? 1 : 0.3,
                  scale: countdownLight >= light ? 1 : 0.95
                }}
                className={cn(
                  "w-12 h-12 md:w-16 md:h-16 rounded-full border-4 transition-colors duration-200",
                  countdownLight >= light 
                    ? "bg-red-600 border-red-700 shadow-[0_0_30px_rgba(220,38,38,0.6)]" 
                    : "bg-neutral-200 border-neutral-300"
                )}
              />
            ))}
          </div>

        </div>
      </GameLayout>
    );
  }

  // GO state - lights out, green indicator
  if (gameStatus === 'go') {
    return (
      <GameLayout coins={state.coins} trackName={selectedCircuit?.name || ""} lockViewport>
        <div className="flex-1 flex flex-col items-center justify-center gap-8 overflow-hidden pb-16">
          
          {/* Green GO indicator */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex gap-4"
          >
            {[1, 2, 3, 4, 5].map((light) => (
              <div
                key={light}
                className="w-12 h-12 md:w-16 md:h-16 rounded-full border-4 bg-green-500 border-green-600 shadow-[0_0_30px_rgba(34,197,94,0.6)]"
              />
            ))}
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
    return (
      <GameLayout coins={state.coins} trackName={selectedCircuit?.name || ""} lockViewport>
        <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full overflow-y-auto p-4">
          <div className="bg-card border border-red-500 rounded-xl p-8 w-full text-center space-y-8 shadow-sm">
            
            <div className="space-y-2">
               <div className="text-sm font-medium text-red-600 uppercase tracking-widest">Race Over</div>
               <div className="text-6xl font-bold tracking-tighter text-red-600">DNF</div>
               <div className="text-xl font-medium text-red-600">Car Retired</div>
            </div>

            <div className="py-6 border-y border-border space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Circuit</span>
                <span className="font-bold">{selectedCircuit?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Laps Completed</span>
                <span className="font-bold">{progress}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Time Before Crash</span>
                <span className="font-bold font-mono">{formatTime(elapsedTime)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Mistakes</span>
                <span className="font-bold text-red-600">{finalMistakes}</span>
              </div>
            </div>

            <div className="grid gap-3">
              <button onClick={restartRace} className="w-full bg-primary text-primary-foreground h-12 rounded-lg font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2" data-testid="button-try-again">
                <RotateCcw className="w-4 h-4" /> Try Again
              </button>
              <Link href="/garage">
                <button className="w-full bg-secondary text-secondary-foreground h-12 rounded-lg font-medium hover:bg-secondary/80 transition-all flex items-center justify-center gap-2" data-testid="button-return-garage">
                  <Home className="w-4 h-4" /> Return to Garage
                </button>
              </Link>
            </div>

          </div>
        </div>
      </GameLayout>
    );
  }

  if (gameStatus === 'finished') {
    const { position } = getRaceResult();
    const isWinner = position === 1;
    const previousBest = selectedCircuit ? state.personalBests[selectedCircuit.id] : null;
    const isNewBest = previousBest ? elapsedTime < previousBest : true;

    return (
      <GameLayout coins={state.coins} trackName={selectedCircuit?.name || ""} lockViewport>
        <div className="flex-1 flex flex-col items-center justify-start max-w-xl mx-auto w-full overflow-y-auto p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full text-center space-y-6 shadow-sm">

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

            <div className="py-6 border-y border-border space-y-4">
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
                <span className="font-bold">{Math.round(((raceLength - finalMistakes) / raceLength) * 100)}%</span>
              </div>
            </div>

            <div className="grid gap-3">
              {mistakeLog.length > 0 && (
                <button
                  onClick={() => setShowMistakeReview(true)}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white h-12 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                  data-testid="button-review-mistakes"
                >
                  <X className="w-4 h-4" /> Review {mistakeLog.length} Mistake{mistakeLog.length > 1 ? 's' : ''}
                </button>
              )}
              <button
                onClick={() => setShowAnalytics(true)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white h-12 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                data-testid="button-analytics"
              >
                <BarChart3 className="w-4 h-4" /> Analytics
              </button>
              <button onClick={restartRace} className="w-full bg-primary text-primary-foreground h-12 rounded-lg font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2" data-testid="button-race-again">
                <RotateCcw className="w-4 h-4" /> Race Again
              </button>
              <Link href="/">
                <button className="w-full bg-secondary text-secondary-foreground h-12 rounded-lg font-medium hover:bg-secondary/80 transition-all flex items-center justify-center gap-2" data-testid="button-main-menu">
                  <Home className="w-4 h-4" /> Main Menu
                </button>
              </Link>
            </div>

          </div>

          {/* Mistake Review Modal */}
          {showMistakeReview && (
            <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
              <div className="bg-card border border-border rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold uppercase tracking-wider" style={{ fontFamily: 'Formula1' }}>Mistake Review</h2>
                  <button
                    onClick={() => setShowMistakeReview(false)}
                    className="p-2 hover:bg-secondary rounded-full transition-colors"
                    data-testid="button-close-review"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-3">
                  {mistakeLog.map((mistake, index) => (
                    <div key={index} className="bg-secondary/30 border border-border rounded-lg p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-600 flex items-center justify-center font-bold text-white" style={{ fontFamily: 'Formula1' }}>
                          {index + 1}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="text-lg font-bold" style={{ fontFamily: 'Formula1' }}>{mistake.question}</div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground uppercase tracking-wide">Your Answer:</span>
                              <span className="ml-2 font-bold text-red-500" style={{ fontFamily: 'Formula1' }}>{mistake.yourAnswer}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground uppercase tracking-wide">Correct Answer:</span>
                              <span className="ml-2 font-bold text-green-500" style={{ fontFamily: 'Formula1' }}>{mistake.correctAnswer}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setShowMistakeReview(false)}
                  className="w-full mt-6 bg-primary text-primary-foreground h-12 rounded-lg font-medium hover:opacity-90 transition-all uppercase tracking-wider"
                  style={{ fontFamily: 'Formula1' }}
                  data-testid="button-close-review-bottom"
                >
                  Close Review
                </button>
              </div>
            </div>
          )}

          {/* Analytics Modal */}
          {showAnalytics && (
            <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
              <div className="bg-card border border-border rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold uppercase tracking-wider" style={{ fontFamily: 'Formula1' }}>Race Analytics</h2>
                  <button
                    onClick={() => setShowAnalytics(false)}
                    className="p-2 hover:bg-secondary rounded-full transition-colors"
                    data-testid="button-close-analytics"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-3 mb-6">
                  <div className="bg-purple-600/20 border border-purple-600/30 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-purple-400" style={{ fontFamily: 'Formula1' }}>
                      {lapResults.filter(l => l.sectorColor === 'purple').length}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Purple</div>
                  </div>
                  <div className="bg-green-600/20 border border-green-600/30 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-400" style={{ fontFamily: 'Formula1' }}>
                      {lapResults.filter(l => l.sectorColor === 'green').length}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Green</div>
                  </div>
                  <div className="bg-yellow-600/20 border border-yellow-600/30 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-yellow-400" style={{ fontFamily: 'Formula1' }}>
                      {lapResults.filter(l => l.sectorColor === 'yellow').length}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Yellow</div>
                  </div>
                  <div className="bg-red-600/20 border border-red-600/30 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-red-400" style={{ fontFamily: 'Formula1' }}>
                      {lapResults.filter(l => l.sectorColor === 'red').length}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Red</div>
                  </div>
                </div>

                {/* Lap-by-lap breakdown */}
                <div className="space-y-2">
                  {lapResults.map((lap, index) => (
                    <div 
                      key={index} 
                      className="flex items-center gap-3 bg-secondary/30 border border-border rounded-lg p-3"
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white",
                        lap.sectorColor === 'purple' && "bg-purple-600",
                        lap.sectorColor === 'green' && "bg-green-600",
                        lap.sectorColor === 'yellow' && "bg-yellow-600",
                        lap.sectorColor === 'red' && "bg-red-600"
                      )} style={{ fontFamily: 'Formula1' }}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="text-lg font-bold" style={{ fontFamily: 'Formula1' }}>{lap.question}</div>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <span className="text-xs text-muted-foreground font-mono">
                          {(lap.responseTime / 1000).toFixed(3)}s
                        </span>
                        {lap.result === 'correct' ? (
                          <span className="text-green-500 font-bold" style={{ fontFamily: 'Formula1' }}>{lap.playerAnswer}</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-red-500 line-through" style={{ fontFamily: 'Formula1' }}>{lap.playerAnswer}</span>
                            <span className="text-green-500 font-bold" style={{ fontFamily: 'Formula1' }}>{lap.correctAnswer}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={exportTelemetryCSV}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white h-12 rounded-lg font-medium transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
                    style={{ fontFamily: 'Formula1' }}
                    data-testid="button-share-analytics"
                  >
                    <Share2 className="w-4 h-4" /> Share
                  </button>
                  <button
                    onClick={() => setShowAnalytics(false)}
                    className="flex-1 bg-primary text-primary-foreground h-12 rounded-lg font-medium hover:opacity-90 transition-all uppercase tracking-wider"
                    style={{ fontFamily: 'Formula1' }}
                    data-testid="button-close-analytics-bottom"
                  >
                    Close
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
    <GameLayout coins={state.coins} trackName={selectedCircuit?.name || ""} lockViewport>
      <div className="flex-1 flex flex-col w-full overflow-hidden relative min-h-0">

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

        {/* Mode badge and controls */}
        <div className="flex justify-between items-center text-sm text-muted-foreground font-medium px-4 py-1">
          <div className="flex items-center gap-2">
            {isPracticeMode ? (
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
        <div className="flex flex-col items-center px-4 pt-0">
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
                    className={cn(
                      "text-white px-3 py-0.5 rounded-lg font-bold text-xs",
                      penaltyMessage.color === 'red' ? "bg-red-600" : "bg-yellow-600"
                    )}
                  >
                    {penaltyMessage.text}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Timer on top */}
          <div className="flex items-center gap-2 text-lg sm:text-xl font-mono font-medium text-primary">
            <Timer className="w-4 h-4 sm:w-5 sm:h-5" />
            {formatTime(elapsedTime)}
          </div>
          
          {/* Expression below timer */}
          <div className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mt-2">
            {question?.display}
          </div>
          
          {/* Answer display below expression */}
          <div
            className={cn(
              "text-4xl sm:text-5xl md:text-6xl font-bold min-w-[80px] text-center mt-2",
              feedback === 'idle' && "text-muted-foreground/50",
              feedback === 'correct' && "text-green-600",
              feedback === 'incorrect' && "text-red-600"
            )}
            data-testid="display-answer"
          >
            {answer || "0"}
          </div>

          {/* Minimal Feedback */}
          <div className="h-4 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {feedback === 'correct' && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-green-600 font-medium flex items-center gap-1 text-xs">
                  <Check className="w-3 h-3" /> Correct
                </motion.div>
              )}
              {feedback === 'incorrect' && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0 }} 
                  className={cn(
                    "font-medium flex items-center gap-1 text-xs",
                    penaltyMessage.color === 'yellow' ? "text-yellow-600" : "text-red-600"
                  )}
                >
                  <X className="w-3 h-3" /> {penaltyMessage.text}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Progress Bar - between result and keypad */}
        <div className="flex flex-col justify-center px-4 gap-1">
          {/* Bot Progress Bar (only in bot mode) */}
          {raceMode === 'bot' && (
            <div className="relative h-3 bg-muted/50 rounded-full overflow-hidden">
              {/* Segmented progress bar showing bot's lap colors */}
              <div className="absolute inset-0 flex">
                {Array.from({ length: raceLength }).map((_, i) => {
                  const isCompleted = i < botProgress;
                  const lapData = botLapResults[i];

                  let segmentColor = "bg-transparent";
                  if (isCompleted && lapData) {
                    segmentColor = lapData.sectorColor === 'purple' ? "bg-purple-500/70" :
                                   lapData.sectorColor === 'green' ? "bg-green-500/70" :
                                   "bg-yellow-500/70";
                  }

                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex-1 border-r border-background/20 last:border-r-0 transition-colors",
                        segmentColor
                      )}
                    />
                  );
                })}
              </div>
              {/* Bot car indicator */}
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 z-10"
                animate={{ left: `${(botProgress / raceLength) * 100}%` }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                style={{ marginLeft: "-8px" }}
              >
                <div className="w-4 h-2.5 bg-red-600 rounded-sm flex items-center justify-center">
                  <div className="w-2 h-1 bg-red-400 rounded-sm" />
                </div>
              </motion.div>
              <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] text-red-400 font-bold">BOT</span>
            </div>
          )}
          
          {/* Player Progress Bar */}
          <div className="relative h-5 bg-muted rounded-full overflow-hidden">
            {/* Progress segments */}
            <div className="absolute inset-0 flex">
              {Array.from({ length: raceLength }).map((_, i) => {
                const isCompleted = i < progress;
                const isCurrent = i === progress;
                const lapData = lapResults[i];
                
                // Use stored sectorColor directly
                let segmentColor = "bg-transparent";
                if (isCompleted && lapData) {
                  segmentColor = lapData.sectorColor === 'purple' ? "bg-purple-500" :
                                 lapData.sectorColor === 'green' ? "bg-green-500" :
                                 lapData.sectorColor === 'yellow' ? "bg-yellow-500" :
                                 lapData.sectorColor === 'red' ? "bg-red-500" : "bg-transparent";
                } else if (isCurrent) {
                  segmentColor = "bg-gray-400/50";
                }
                
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex-1 border-r border-background/20 last:border-r-0 transition-colors",
                      segmentColor
                    )}
                  />
                );
              })}
            </div>
            
            {/* Car indicator */}
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 z-10"
              animate={{ left: `${(progress / raceLength) * 100}%` }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{ marginLeft: "-10px" }}
            >
              <div className="w-5 h-3 bg-foreground rounded-sm flex items-center justify-center">
                <div className="w-3 h-1.5 bg-primary rounded-sm" />
              </div>
            </motion.div>
            {raceMode === 'bot' && (
              <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] text-muted-foreground font-bold">YOU</span>
            )}
          </div>
          
          {/* Progress text */}
          <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5 px-1">
            <span>Lap {progress + 1}/{raceLength}</span>
            <span className={cn(mistakes > 0 && "text-red-500")}>Limits: {mistakes}</span>
          </div>
        </div>

        {/* Boost/Overtake & Aero UI - only in bot race mode */}
        {raceMode === 'bot' && !isPracticeMode && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 px-4">
            {/* Two rows of controls - grid for alignment */}
            <div className="grid grid-cols-[80px_140px_52px] gap-x-3 gap-y-3 items-center">
              {/* Row 1: Overtake */}
              {/* Energy bar - right aligned */}
              <div className="flex items-center justify-end">
                <div className="w-16 h-4 bg-gray-700 rounded-full overflow-hidden relative">
                  <motion.div
                    className={cn(
                      "h-full rounded-full transition-all",
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
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                    {overtakeEnergy}%
                  </span>
                </div>
              </div>

              {/* OVERTAKE Button - centered */}
              <button
                onClick={handleOvertake}
                disabled={overtakeEnergy <= 0 && !overtakeActive || isPaused}
                className={cn(
                  "px-4 py-2.5 rounded-xl font-bold text-sm uppercase tracking-wider transition-all w-full",
                  overtakeActive
                    ? "bg-green-600 text-white shadow-[0_0_20px_rgba(34,197,94,0.7)] animate-pulse"
                    : overtakeEnergy > 0 && botProgress > progress && (botProgress - progress) <= 2 && !isPaused
                      ? "bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.5)] hover:bg-green-400 active:scale-95"
                      : "bg-gray-600 text-gray-400 cursor-not-allowed"
                )}
                style={{ fontFamily: 'Formula1' }}
                data-testid="button-overtake"
              >
                {overtakeActive ? 'ACTIVE!' : 'OVERTAKE'}
              </button>

              {/* Active indicator - left aligned */}
              <div className="flex items-center justify-start">
                <div
                  className={cn(
                    "w-10 h-3 rounded-full transition-all duration-300",
                    overtakeActive
                      ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                      : "bg-gray-600"
                  )}
                />
              </div>

              {/* Row 2: Aero */}
              {/* Zone indicator - right aligned */}
              <div className="flex items-center justify-end">
                <span className={cn(
                  "text-xs font-bold",
                  aeroAvailable ? "text-yellow-400" : "text-gray-400"
                )}>
                  {aeroAvailable ? "ZONE!" : `${aeroZones.length - aeroUsedZones.size} left`}
                </span>
              </div>

              {/* AERO Button - centered */}
              <button
                onClick={handleAero}
                disabled={!aeroAvailable || aeroActive || isPaused}
                className={cn(
                  "px-4 py-2.5 rounded-xl font-bold text-sm uppercase tracking-wider transition-all w-full",
                  aeroActive
                    ? "bg-green-600 text-white shadow-[0_0_20px_rgba(34,197,94,0.7)] animate-pulse"
                    : aeroAvailable && !isPaused
                      ? "bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] ring-2 ring-yellow-400 animate-pulse hover:bg-blue-400 active:scale-95"
                      : "bg-gray-600 text-gray-400 cursor-not-allowed"
                )}
                style={{ fontFamily: 'Formula1' }}
                data-testid="button-aero"
              >
                {aeroActive ? 'AERO ON' : aeroAvailable ? 'AERO!' : 'AERO'}
              </button>

              {/* AERO active indicator */}
              <div className="flex items-center justify-start">
                <div
                  className={cn(
                    "w-10 h-3 rounded-full transition-all duration-300",
                    aeroActive
                      ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                      : "bg-gray-600"
                  )}
                />
              </div>
            </div>

            {/* Status Messages - below buttons (fixed height to prevent button shift) */}
            <div className="flex gap-2 h-8 items-center">
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

        {/* Large Keypad */}
        <div className="flex-1 flex flex-col justify-end items-center px-4 min-h-0 pb-11">
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full max-w-md">
            {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => { if (!isPaused && feedback === 'idle') { playKeypadClick(); setAnswer(prev => prev + num.toString()); } }}
                disabled={isPaused}
                className="h-[56px] sm:h-[72px] md:h-[84px] rounded-xl bg-secondary text-secondary-foreground text-2xl sm:text-3xl md:text-4xl font-bold hover:bg-secondary/80 transition-colors active:scale-95 disabled:opacity-50"
                data-testid={`keypad-${num}`}
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => { if (!isPaused && feedback === 'idle') { playKeypadClick(); setAnswer(prev => prev.slice(0, -1)); } }}
              disabled={isPaused}
              className="h-[56px] sm:h-[72px] md:h-[84px] rounded-xl bg-muted text-muted-foreground font-bold hover:bg-muted/80 transition-colors active:scale-95 flex items-center justify-center disabled:opacity-50"
              data-testid="keypad-delete"
            >
              <Delete className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
            <button
              type="button"
              onClick={() => { if (!isPaused && feedback === 'idle') { playKeypadClick(); setAnswer(prev => prev + '0'); } }}
              disabled={isPaused}
              className="h-[56px] sm:h-[72px] md:h-[84px] rounded-xl bg-secondary text-secondary-foreground text-2xl sm:text-3xl md:text-4xl font-bold hover:bg-secondary/80 transition-colors active:scale-95 disabled:opacity-50"
              data-testid="keypad-0"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!answer || feedback !== 'idle' || isPaused}
              className={cn(
                "h-[56px] sm:h-[72px] md:h-[84px] rounded-xl text-xl sm:text-2xl font-bold transition-colors active:scale-95 flex items-center justify-center",
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
    </GameLayout>
  );
}
