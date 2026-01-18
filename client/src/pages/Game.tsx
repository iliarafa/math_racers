import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Link, useLocation } from "wouter";
import useEmblaCarousel from "embla-carousel-react";
import { GameLayout } from "@/components/layout/GameLayout";
import { TrackProgress } from "@/components/TrackProgress";
import { useGameState, generateQuestion, Question, CIRCUITS, RACE_LENGTH, getRaceLength, DRIVERS_2025, Circuit, DRIVERS, Driver } from "@/lib/gameLogic";
import { cn } from "@/lib/utils";
import { Check, X, RotateCcw, Home, Timer, Delete, Pause, Play, BarChart3, ChevronLeft, ChevronRight, Download } from "lucide-react";

// Import assets
import tireHard from "@/assets/tire_hard2.png";
import tireMedium from "@/assets/tire_medium2.png";
import tireSoft from "@/assets/tire_soft2.png";
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

export default function Game() {
  const { state, addCoins, incrementStreak, resetStreak, incrementLaps, addCareerPoints, incrementRacesWon, updatePersonalBest, recordLapTime } = useGameState();
  const [, setLocation] = useLocation();
  const [raceMode, setRaceMode] = useState<'solo' | 'bot' | 'multiplayer' | null>(null);
  const [botProgress, setBotProgress] = useState(0);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [selectedCircuit, setSelectedCircuit] = useState<Circuit | null>(null);
  const [selectedWeather, setSelectedWeather] = useState<Weather>('dry');
  const [actualWeather, setActualWeather] = useState<'dry' | 'wet'>('dry');
  
  const raceLength = selectedCircuit ? getRaceLength(selectedCircuit.id, state.simMode) : RACE_LENGTH;
  const [isPracticeMode, setIsPracticeMode] = useState(false);
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
  const [realismThreshold, setRealismThreshold] = useState<number | null>(null);
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
  const penaltyTimeRef = useRef(0);
  const raceStartTimeRef = useRef<number | null>(null);
  const soundEnabledRef = useRef(state.soundEnabled);
  
  useEffect(() => {
    soundEnabledRef.current = state.soundEnabled;
  }, [state.soundEnabled]);

  // Handle mode query parameter from navigation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    if (mode === 'practice') {
      setIsPracticeMode(true);
      setRaceMode('solo');
      setGameStatus('selecting');
      // Auto-select first driver for practice
      if (!selectedDriver) {
        setSelectedDriver(DRIVERS[0]);
      }
    } else if (mode === 'race') {
      setIsPracticeMode(false);
      setRaceMode('bot');
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
  }, [gameStatus, selectedCircuit, selectedDriver, selectedWeather]);


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
    
    // Create and download CSV
    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `telemetry_${selectedCircuit?.id || 'race'}_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCircuitSelect = (circuit: Circuit) => {
    initAudio();
    setSelectedCircuit(circuit);
  };

  const handleStartRace = () => {
    if (!selectedCircuit) return;
    setBotProgress(0);
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
      
      // Calculate speed category based on difficulty or realism mode
      const difficulty = selectedDriver?.difficulty || 'easy';
      let speed: 'fast' | 'normal' | 'slow';
      
      if (state.simMode) {
        // Realism mode: first 5 questions are calibration (all green)
        // Then use fastest of first 5 as the threshold
        const currentQuestionNumber = progress + 1; // 1-indexed
        
        if (currentQuestionNumber <= 5) {
          // Calibration phase - all correct answers are "fast" (green)
          speed = 'fast';
          
          // After this answer is recorded, check if we need to set threshold
          // We'll set it after the 5th question using lapResults + this responseTime
          if (currentQuestionNumber === 5) {
            // Get all response times from first 4 correct answers plus this one
            const calibrationTimes = lapResults
              .filter(lap => lap.result === 'correct')
              .map(lap => lap.responseTime);
            calibrationTimes.push(responseTime);
            
            // Find the fastest time as the threshold
            if (calibrationTimes.length > 0) {
              const fastest = Math.min(...calibrationTimes);
              setRealismThreshold(fastest);
            }
          }
        } else {
          // Post-calibration: use personal threshold
          // <= threshold = green (fast), > threshold = yellow (slow)
          const threshold = realismThreshold || 3000; // fallback
          speed = responseTime <= threshold ? 'fast' : 'slow';
        }
      } else {
        // Standard mode thresholds
        // Easy (small numbers): Fast < 2s, Slow > 4s
        // Medium: Fast < 3s, Slow > 5s
        // Hard (big numbers): Fast < 4s, Slow > 7s
        // Wet weather: tighten thresholds by 500ms
        const wetPenalty = actualWeather === 'wet' ? 500 : 0;
        const fastThreshold = (difficulty === 'easy' ? 2000 : difficulty === 'medium' ? 3000 : 4000) - wetPenalty;
        const slowThreshold = (difficulty === 'easy' ? 4000 : difficulty === 'medium' ? 5000 : 7000) - wetPenalty;
        speed = responseTime < fastThreshold ? 'fast' : responseTime > slowThreshold ? 'slow' : 'normal';
      }
      
      // Purple retention threshold: 3 seconds for all levels
      const purpleThreshold = 3000;
      const isPurpleFast = responseTime < purpleThreshold;
      
      // Purple mode logic:
      // - 5th consecutive correct answer enters purple mode
      // - Once in purple, must answer under purpleThreshold to stay purple
      // - Any answer above threshold or incorrect breaks purple mode
      // - In realism mode, purple is disabled during calibration (first 5 questions)
      
      // Determine sector color and purple mode state BEFORE updating state
      let sectorColor: 'green' | 'purple' | 'yellow' | 'red' = 'green';
      let newPurpleMode = inPurpleMode;
      const currentQuestionNumber = progress + 1;
      const isCalibrating = state.simMode && currentQuestionNumber <= 5;
      
      if (isCalibrating) {
        // During calibration: all correct answers are green, no purple mode
        sectorColor = 'green';
        newPurpleMode = false;
      } else if (inPurpleMode) {
        // Already in purple mode - must be under purple threshold to maintain
        if (isPurpleFast) {
          sectorColor = 'purple';
          // Stay in purple mode
        } else {
          // Too slow breaks purple mode
          sectorColor = speed === 'slow' ? 'yellow' : 'green';
          newPurpleMode = false;
        }
      } else {
        // Not in purple mode - check if we should enter
        // Count consecutive correct answers AFTER losing purple
        // Skip both the last purple lap AND the breaking lap
        let consecutiveCorrect = 0;
        let lastPurpleIndex = -1;
        
        // Find the last purple lap
        for (let j = lapResults.length - 1; j >= 0; j--) {
          if (lapResults[j].sectorColor === 'purple') {
            lastPurpleIndex = j;
            break;
          }
        }
        
        // Count consecutive correct AFTER the breaking lap
        // If never had purple (lastPurpleIndex = -1), count from start
        // If had purple, skip the purple lap AND the lap that broke it
        const startIndex = lastPurpleIndex === -1 ? 0 : lastPurpleIndex + 2;
        for (let j = startIndex; j < lapResults.length; j++) {
          if (lapResults[j].result === 'correct') {
            consecutiveCorrect++;
          } else {
            consecutiveCorrect = 0;
          }
        }
        
        // Include this answer (it's correct since we're in this branch)
        consecutiveCorrect++;
        
        // Enter purple mode on 5th consecutive correct
        if (consecutiveCorrect >= 5) {
          newPurpleMode = true;
          sectorColor = 'purple';
        } else if (speed === 'slow') {
          sectorColor = 'yellow';
        } else {
          sectorColor = 'green';
        }
      }
      
      // Update purple mode state
      setInPurpleMode(newPurpleMode);
      
      const isOvertakeActive = selectedCircuit.drsZones.includes(progress);
      const baseCoins = isOvertakeActive ? 20 : 10;
      addCoins(baseCoins);
      incrementStreak();
      incrementLaps();
      const difficultyPoints = selectedDriver?.difficulty === 'hard' ? 3 : selectedDriver?.difficulty === 'medium' ? 2 : 1;
      const totalPoints = isOvertakeActive ? difficultyPoints * 2 : difficultyPoints;
      addCareerPoints(totalPoints);

      const newProgress = progress + 1;
      setProgress(newProgress);
      setLapResults(prev => [...prev, { 
        result: 'correct', 
        speed,
        question: question.display,
        playerAnswer: val,
        correctAnswer: question.answer,
        sectorColor,
        responseTime
      }]);

      if (newProgress >= raceLength) {
        if (isPracticeMode) {
          // In practice mode, reset and continue
          setProgress(0);
          setLapResults([]);
          setMistakes(0);
          setElapsedTime(0);
          penaltyTimeRef.current = 0;
          raceStartTimeRef.current = Date.now();
          setInPurpleMode(false);
          setRealismThreshold(null);
        } else {
          finishRace(mistakes);
        }
      } else {
        setTimeout(() => {
          setFeedback('idle');
          setAnswer("");
          setQuestion(generateQuestion(selectedCircuit.id, selectedDriver?.difficulty || 'easy', actualWeather === 'wet'));
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
      
      // Break purple mode on incorrect answer
      setInPurpleMode(false);

      // Log the mistake for review
      setMistakeLog(prev => [...prev, {
        question: question.display,
        yourAnswer: val,
        correctAnswer: question.answer
      }]);

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
        
        // Apply time penalties same as standard mode
        if (newMistakes === 1) {
          setPenaltyMessage({ text: 'TRACK LIMITS - TRY AGAIN', color: 'yellow' });
          penaltyTimeRef.current += 2000;
          setElapsedTime(prev => prev + 2000);
        } else if (newMistakes === 2) {
          setPenaltyMessage({ text: 'TRACK LIMITS WARNING - TRY AGAIN', color: 'yellow' });
          penaltyTimeRef.current += 2000;
          setElapsedTime(prev => prev + 2000);
        } else if (newMistakes === 3) {
          setPenaltyMessage({ text: 'BLACK & WHITE FLAG - TRY AGAIN', color: 'yellow' });
          setShowBlackWhiteFlag(true);
          penaltyTimeRef.current += 2000;
          setElapsedTime(prev => prev + 2000);
        } else if (newMistakes <= 6) {
          setPenaltyMessage({ text: '+5 SEC PENALTY - TRY AGAIN', color: 'red' });
          penaltyTimeRef.current += 5000;
          setElapsedTime(prev => prev + 5000);
        } else if (newMistakes <= 10) {
          setPenaltyMessage({ text: '+10 SEC PENALTY - TRY AGAIN', color: 'red' });
          penaltyTimeRef.current += 10000;
          setElapsedTime(prev => prev + 10000);
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
        // Standard race mode: apply penalties and advance
        setShowPenalty(true);

        if (newMistakes === 1) {
          setPenaltyMessage({ text: 'TRACK LIMITS', color: 'yellow' });
          penaltyTimeRef.current += 2000;
          setElapsedTime(prev => prev + 2000);
        } else if (newMistakes === 2) {
          setPenaltyMessage({ text: 'TRACK LIMITS WARNING', color: 'yellow' });
          penaltyTimeRef.current += 2000;
          setElapsedTime(prev => prev + 2000);
        } else if (newMistakes === 3) {
          setPenaltyMessage({ text: 'BLACK & WHITE FLAG', color: 'yellow' });
          setShowBlackWhiteFlag(true);
          penaltyTimeRef.current += 2000;
          setElapsedTime(prev => prev + 2000);
        } else if (newMistakes <= 6) {
          setPenaltyMessage({ text: '+5 SECOND PENALTY', color: 'red' });
          penaltyTimeRef.current += 5000;
          setElapsedTime(prev => prev + 5000);
        } else if (newMistakes <= 10) {
          setPenaltyMessage({ text: '+10 SECOND PENALTY', color: 'red' });
          penaltyTimeRef.current += 10000;
          setElapsedTime(prev => prev + 10000);
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
    }
    // Update personal best time and record session lap time (only in race mode, not practice)
    if (!isPracticeMode && selectedCircuit) {
      updatePersonalBest(selectedCircuit.id, elapsedTime);
      recordLapTime(elapsedTime, selectedCircuit.name);
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
    setRaceMode('solo');
    setSelectedWeather('dry');
    setActualWeather('dry');
    resetStreak();
    penaltyTimeRef.current = 0;
    raceStartTimeRef.current = null;
    setPenaltyMessage({ text: '', color: 'red' });
    setInPurpleMode(false);
    setRealismThreshold(null);
  };

  // Bot simulation during racing
  useEffect(() => {
    if (gameStatus !== 'racing' || raceMode !== 'bot' || isPaused) return;
    
    // Bot speed varies by difficulty - average time per question in ms
    const botSpeed = selectedDriver?.difficulty === 'hard' ? 3500 : 
                     selectedDriver?.difficulty === 'medium' ? 2800 : 2200;
    
    // Add some randomness (±30%)
    const randomizedSpeed = botSpeed * (0.7 + Math.random() * 0.6);
    
    const interval = setInterval(() => {
      setBotProgress(prev => {
        if (prev >= raceLength) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, randomizedSpeed);
    
    return () => clearInterval(interval);
  }, [gameStatus, raceMode, isPaused, selectedDriver, raceLength]);

  const handleMultiplayerSelect = () => {
    setSelectedDriver(null);
    setSelectedCircuit(null);
    setGameStatus('driver_select');
    setLocation('/multiplayer');
  };

  // Driver Selection Screen - Tyre Strategy Menu
  if (gameStatus === 'driver_select') {
    const compoundOptions = [
      { 
        id: 'rookie', 
        name: 'SOFT', 
        subtitle: 'ROOKIE',
        description: 'Maximum Grip / Forgiving',
        tire: tireSoft, 
        driver: DRIVERS.find(d => d.id === 'rookie'),
        color: '#ff3b30',
        bgGlow: 'rgba(255, 59, 48, 0.3)'
      },
      { 
        id: 'pro', 
        name: 'MEDIUM', 
        subtitle: 'PROFESSIONAL',
        description: 'Balanced Performance',
        tire: tireMedium, 
        driver: DRIVERS.find(d => d.id === 'pro'),
        color: '#ffcc00',
        bgGlow: 'rgba(255, 204, 0, 0.3)'
      },
      { 
        id: 'champion', 
        name: 'HARD', 
        subtitle: 'CHAMPION',
        description: 'Low Grip / Difficult',
        tire: tireHard, 
        driver: DRIVERS.find(d => d.id === 'champion'),
        color: '#ffffff',
        bgGlow: 'rgba(255, 255, 255, 0.2)'
      },
    ];

    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#ffffff' }}>
        {/* Section Title */}
        <div className="text-center pt-12 pb-6">
          <h2 
            className="text-xl font-bold uppercase tracking-wider text-black"
            style={{ fontFamily: 'Formula1' }}
          >
            Select Compound
          </h2>
        </div>

        {/* Compound Cards */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 pb-32">
          {compoundOptions.map((compound) => {
            const isSelected = selectedDriver?.id === compound.id;
            const displayColor = compound.id === 'champion' ? '#333333' : compound.color;
            
            return (
              <motion.button
                key={compound.id}
                onClick={() => setSelectedDriver(compound.driver || null)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full max-w-sm rounded-xl p-5 flex items-center gap-5 transition-all"
                style={{ 
                  backgroundColor: '#f5f5f5',
                  border: `2px solid ${isSelected ? displayColor : 'transparent'}`,
                  boxShadow: isSelected ? `0 0 20px ${compound.bgGlow}` : 'none'
                }}
                data-testid={`level-${compound.id}`}
              >
                <img 
                  src={compound.tire} 
                  alt={compound.name} 
                  className="w-32 h-32 object-contain" 
                />
                <div className="flex flex-col items-start">
                  <span 
                    className="font-bold text-lg uppercase tracking-wider transition-colors"
                    style={{ 
                      fontFamily: 'Formula1',
                      color: isSelected ? displayColor : '#666666'
                    }}
                  >
                    {compound.name}
                  </span>
                  <span className="text-xs uppercase tracking-wide text-gray-600">
                    {compound.subtitle}
                  </span>
                  <span className="text-xs mt-1 text-gray-500">
                    {compound.description}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Confirm Strategy Button - Fixed Bottom */}
        <div className="fixed bottom-0 left-0 right-0 p-4 flex flex-col items-center gap-3" style={{ backgroundColor: '#ffffff' }}>
          {selectedDriver && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleDriverSelect(selectedDriver)}
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

    return (
      <div className="min-h-screen flex flex-col transition-colors duration-300" style={{ backgroundColor: '#ffffff' }}>
        {/* Race/Practice/Multiplayer Pill Toggle - Top */}
        <div className="pt-6 pb-2 flex justify-center">
          <div className="rounded-full p-1 flex gap-1 bg-gray-200">
            <button
              onClick={() => { setIsPracticeMode(false); setRaceMode('bot'); }}
              className={cn(
                "px-4 py-2 rounded-full font-bold text-xs uppercase tracking-wider transition-all",
                !isPracticeMode
                  ? "bg-red-600 text-white" 
                  : "bg-transparent text-gray-600 hover:text-gray-900"
              )}
              style={{ fontFamily: 'Formula1' }}
              data-testid="button-race-mode"
            >
              Race
            </button>
            <button
              onClick={() => { setIsPracticeMode(true); setRaceMode('solo'); }}
              className={cn(
                "px-4 py-2 rounded-full font-bold text-xs uppercase tracking-wider transition-all",
                isPracticeMode 
                  ? "bg-green-600 text-white" 
                  : "bg-transparent text-gray-600 hover:text-gray-900"
              )}
              style={{ fontFamily: 'Formula1' }}
              data-testid="button-practice-mode"
            >
              Practice
            </button>
            <button
              onClick={() => setLocation('/multiplayer')}
              className="px-4 py-2 rounded-full font-bold text-xs uppercase tracking-wider transition-all bg-transparent text-gray-600 hover:text-gray-900"
              style={{ fontFamily: 'Formula1' }}
              data-testid="button-multiplayer-mode"
            >
              Multiplayer
            </button>
          </div>
        </div>

        {/* Main Content - Hero Card with Side Chevrons */}
        <div className="flex-1 flex items-center justify-center px-4 pb-24">
          {/* Left Chevron */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={goToPrevCircuit}
            className="p-3 transition-colors text-gray-400 hover:text-gray-900"
            data-testid="circuit-prev"
          >
            <ChevronLeft className="w-12 h-12" />
          </motion.button>

          {/* Hero Card */}
          <motion.div
            key={displayCircuit.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="w-[350px] rounded-[20px] p-6 flex flex-col transition-colors duration-300"
            style={{ 
              backgroundColor: '#f0f0f0',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
            }}
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

          {/* Right Chevron */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={goToNextCircuit}
            className="p-3 transition-colors text-gray-400 hover:text-gray-900"
            data-testid="circuit-next"
          >
            <ChevronRight className="w-12 h-12" />
          </motion.button>
        </div>

        {/* Track Dots Indicator */}
        <div className="fixed bottom-32 left-0 right-0 flex justify-center gap-2">
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

        {/* Start Engine Button - Fixed Bottom */}
        <div className="fixed bottom-0 left-0 right-0 p-4 flex flex-col items-center gap-3 transition-colors duration-300" style={{ backgroundColor: '#ffffff' }}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStartRace}
            className="w-full max-w-sm py-4 rounded-xl font-bold text-lg uppercase tracking-wider text-white"
            style={{ 
              fontFamily: 'Formula1',
              backgroundColor: isPracticeMode ? '#16a34a' : raceMode === 'bot' ? '#9333ea' : '#dc2626',
              animation: isPracticeMode ? 'pulse-green 2s infinite' : raceMode === 'bot' ? 'pulse-purple 2s infinite' : 'pulse-red 2s infinite'
            }}
            data-testid="button-start-race"
          >
            {isPracticeMode ? 'Start Practice' : 'Start Engine'}
          </motion.button>
          <Link href="/">
            <button 
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
        `}</style>
      </div>
    );
  }

  // Countdown screen with F1 starting lights
  if (gameStatus === 'countdown') {
    return (
      <GameLayout coins={state.coins} trackName={selectedCircuit?.name || ""} lockViewport>
        <div className="flex-1 flex flex-col items-center justify-center gap-12 overflow-hidden">
          
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
                  "w-16 h-16 md:w-20 md:h-20 rounded-full border-4 transition-colors duration-200",
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
        <div className="flex-1 flex flex-col items-center justify-center gap-8 overflow-hidden">
          
          {/* Green GO indicator */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex gap-4"
          >
            {[1, 2, 3, 4, 5].map((light) => (
              <div
                key={light}
                className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 bg-green-500 border-green-600 shadow-[0_0_30px_rgba(34,197,94,0.6)]"
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
              <button
                onClick={exportTelemetryCSV}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white h-12 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                data-testid="button-export-telemetry"
              >
                <Download className="w-4 h-4" /> Export Telemetry
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
                  <h2 className="text-2xl font-bold">Mistake Review</h2>
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
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-600 flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="text-lg font-bold">{mistake.question}</div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Your Answer:</span>
                              <span className="ml-2 font-bold text-red-500">{mistake.yourAnswer}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Correct Answer:</span>
                              <span className="ml-2 font-bold text-green-500">{mistake.correctAnswer}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setShowMistakeReview(false)}
                  className="w-full mt-6 bg-primary text-primary-foreground h-12 rounded-lg font-medium hover:opacity-90 transition-all"
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
                  <h2 className="text-2xl font-bold">Race Analytics</h2>
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
                    <div className="text-2xl font-bold text-purple-400">
                      {lapResults.filter(l => l.sectorColor === 'purple').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Purple</div>
                  </div>
                  <div className="bg-green-600/20 border border-green-600/30 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {lapResults.filter(l => l.sectorColor === 'green').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Green</div>
                  </div>
                  <div className="bg-yellow-600/20 border border-yellow-600/30 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-yellow-400">
                      {lapResults.filter(l => l.sectorColor === 'yellow').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Yellow</div>
                  </div>
                  <div className="bg-red-600/20 border border-red-600/30 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-red-400">
                      {lapResults.filter(l => l.sectorColor === 'red').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Red</div>
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
                        "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                        lap.sectorColor === 'purple' && "bg-purple-600",
                        lap.sectorColor === 'green' && "bg-green-600",
                        lap.sectorColor === 'yellow' && "bg-yellow-600",
                        lap.sectorColor === 'red' && "bg-red-600"
                      )}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-mono font-bold">{lap.question}</div>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <span className="text-xs text-muted-foreground font-mono">
                          {(lap.responseTime / 1000).toFixed(3)}s
                        </span>
                        {lap.result === 'correct' ? (
                          <span className="text-green-500 font-bold">{lap.playerAnswer}</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-red-500 line-through">{lap.playerAnswer}</span>
                            <span className="text-green-500 font-bold">{lap.correctAnswer}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setShowAnalytics(false)}
                  className="w-full mt-6 bg-primary text-primary-foreground h-12 rounded-lg font-medium hover:opacity-90 transition-all"
                  data-testid="button-close-analytics-bottom"
                >
                  Close Analytics
                </button>
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
        <div className="flex-1 flex flex-col justify-center px-4 gap-1">
          {/* Bot Progress Bar (only in bot mode) */}
          {raceMode === 'bot' && (
            <div className="relative h-3 bg-muted/50 rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-red-500/70"
                animate={{ width: `${(botProgress / raceLength) * 100}%` }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
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

        {/* Large Keypad */}
        <div className="flex-1 flex flex-col justify-start items-center px-4 min-h-0 pb-16 sm:pb-4">
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
