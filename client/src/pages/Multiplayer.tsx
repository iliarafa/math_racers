import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState, generateQuestion, type Question, CIRCUITS, DRIVERS, type Circuit, type Driver, getRaceLength, calculateEnergyHarvest, getAeroZones, getCurrentAeroZone, getHarderDifficulty, type Difficulty } from "@/lib/gameLogic";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, Timer, Delete, Home, Globe, ChevronLeft, ChevronRight, Zap } from "lucide-react";

// Import assets for track selection
import weatherSun from "@/assets/weather_sun.png";
import weatherRain from "@/assets/weather_rain.png";
import weatherRandom from "@/assets/weather_random.png";
import circuit_monza_black from "@/assets/circuit_monza_black.png";
import circuit_suzuka_black from "@/assets/circuit_suzuka_black.png";
import circuit_monaco_black from "@/assets/circuit_monaco_black.png";
import circuit_silverstone_black from "@/assets/circuit_silverstone_black.png";
import circuit_spa_black from "@/assets/circuit_spa_black.png";
import flag_italy from "@/assets/flag_italy.png";
import flag_japan from "@/assets/flag_japan.png";
import flag_monaco from "@/assets/flag_monaco.png";
import flag_uk from "@/assets/flag_uk.png";
import flag_belgium from "@/assets/flag_belgium.png";
import logoImage from "@assets/1Asset_3@2x_1767902844976.png";
import trackLimitsFlag from "@/assets/track-limits-flag.png";

const CIRCUIT_MAP_IMAGES: Record<string, { black: string }> = {
  monza: { black: circuit_monza_black },
  suzuka: { black: circuit_suzuka_black },
  monaco: { black: circuit_monaco_black },
  silverstone: { black: circuit_silverstone_black },
  spa: { black: circuit_spa_black },
};

const FLAG_IMAGES: Record<string, string> = {
  monza: flag_italy,
  suzuka: flag_japan,
  monaco: flag_monaco,
  silverstone: flag_uk,
  spa: flag_belgium,
};
import confetti from "canvas-confetti";

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

let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
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
    // Silent fail
  }
};

type GameStatus = "lobby" | "waiting" | "track_select" | "countdown" | "racing" | "finished";
type Weather = 'dry' | 'wet' | 'random';


export default function Multiplayer() {
  const { state, addCoins } = useGameState();
  const [, setLocation] = useLocation();
  
  // Lobby state
  const [mode, setMode] = useState<"menu" | "create" | "join">("menu");
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  
  // Room state
  const [isHost, setIsHost] = useState(false);
  const [opponentName, setOpponentName] = useState("");
  const [roomReady, setRoomReady] = useState(false);
  
  // Game state
  const [gameStatus, setGameStatus] = useState<GameStatus>("lobby");
  const [selectedCircuit, setSelectedCircuit] = useState<Circuit | null>(CIRCUITS[0]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(() => {
    const savedId = localStorage.getItem('lastSelectedDriverId');
    return (savedId && DRIVERS.find(d => d.id === savedId)) || DRIVERS[0];
  });
  const [selectedWeather, setSelectedWeather] = useState<Weather>('dry');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<"idle" | "correct" | "incorrect">("idle");
  const [progress, setProgress] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [opponentProgress, setOpponentProgress] = useState(0);
  const [opponentMistakes, setOpponentMistakes] = useState(0);
  const [opponentSectorColors, setOpponentSectorColors] = useState<string[]>([]);
  const [countdownValue, setCountdownValue] = useState(5);
  const [elapsedTime, setElapsedTime] = useState(0);
  const sectorBestTimesRef = useRef<Array<{ bestTime: number; holder: 'host' | 'guest' } | null>>([]);
  const [questionAttempts, setQuestionAttempts] = useState(0);
  const [lapResults, setLapResults] = useState<Array<{
    result: 'correct' | 'incorrect';
    speed: 'fast' | 'normal' | 'slow';
    sectorColor: 'green' | 'purple' | 'yellow' | 'red';
    responseTime: number;
  }>>([]);
  const [raceResult, setRaceResult] = useState<{
    winnerId: string;
    hostFinishTime: number;
    guestFinishTime: number;
    hostMistakes: number;
    guestMistakes: number;
  } | null>(null);

  // Power-ups state
  const [powerUpsEnabled, setPowerUpsEnabled] = useState(true);
  const [overtakeEnergy, setOvertakeEnergy] = useState(0);
  const [overtakeActive, setOvertakeActive] = useState(false);
  const [overtakeEndTime, setOvertakeEndTime] = useState<number | null>(null);
  const [overtakeStartEnergy, setOvertakeStartEnergy] = useState(0);
  const [aeroZones, setAeroZones] = useState<number[]>([]);
  const [aeroUsedZones, setAeroUsedZones] = useState<Set<number>>(new Set());
  const [aeroActive, setAeroActive] = useState(false);
  const [opponentEnergy, setOpponentEnergy] = useState(0);
  const [overtakeQuestion, setOvertakeQuestion] = useState<Question | null>(null);

  // UI feedback states (matching single-player)
  const [showPenalty, setShowPenalty] = useState(false);
  const [showBlackWhiteFlag, setShowBlackWhiteFlag] = useState(false);
  const [showFiveSecPenalty, setShowFiveSecPenalty] = useState(false);
  const [showBoostMessage, setShowBoostMessage] = useState<string | null>(null);
  const [showAeroMessage, setShowAeroMessage] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const playerIdRef = useRef<string>(Math.random().toString(36).substring(7));
  const raceStartTimeRef = useRef<number | null>(null);
  const questionStartTimeRef = useRef<number>(Date.now());
  const isHostRef = useRef<boolean>(false);
  const penaltyTimeRef = useRef<number>(0);
  const soundEnabledRef = useRef(state.soundEnabled);
  const prevCountdownRef = useRef<number | null>(null);
  
  const raceLength = selectedCircuit ? getRaceLength(selectedCircuit.id, state.simMode) : 20;

  // Keep soundEnabledRef in sync
  useEffect(() => {
    soundEnabledRef.current = state.soundEnabled;
  }, [state.soundEnabled]);

  // Play beeps as countdown lights illuminate
  useEffect(() => {
    if (gameStatus === "countdown") {
      // countdownValue counts down 5→1, each decrease means a new light turns on
      if (prevCountdownRef.current !== null && countdownValue < prevCountdownRef.current) {
        if (soundEnabledRef.current) {
          playBeep(800, 150);
        }
      }
      prevCountdownRef.current = countdownValue;
    } else {
      prevCountdownRef.current = null;
    }
  }, [countdownValue, gameStatus]);

  // WebSocket connection
  const connectWebSocket = useCallback((code: string, host: boolean) => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: "join_room",
        roomCode: code,
        playerId: playerIdRef.current,
        isHost: host
      }));
    };
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleWebSocketMessage(message);
    };
    
    ws.onclose = () => {
      // WebSocket disconnected
    };
    
    wsRef.current = ws;
  }, []);
  
  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case "joined":
        // Successfully joined room
        break;
      case "room_ready":
        setRoomReady(true);
        if (message.powerUpsEnabled !== undefined) {
          setPowerUpsEnabled(message.powerUpsEnabled);
        }
        break;
      case "player_disconnected":
        setError("Opponent disconnected");
        setRoomReady(false);
        break;
      case "countdown_start":
        // Update circuit/driver for guest based on host selection
        if (message.circuitId) {
          setSelectedCircuit(CIRCUITS.find(c => c.id === message.circuitId) || CIRCUITS[0]);
        }
        if (message.driverId) {
          setSelectedDriver(DRIVERS.find(d => d.id === message.driverId) || DRIVERS[0]);
        }
        if (message.weather) {
          setSelectedWeather(message.weather);
        }
        // Sync power-ups settings
        if (message.powerUpsEnabled !== undefined) {
          setPowerUpsEnabled(message.powerUpsEnabled);
        }
        if (message.aeroZones) {
          setAeroZones(message.aeroZones);
        }
        // Sync questions so both players answer the same set
        if (message.questions) {
          setQuestions(message.questions.map((q: any) => ({ display: q.display, answer: q.answer })));
        }
        setGameStatus("countdown");
        setCountdownValue(5);
        break;
      case "countdown":
        setCountdownValue(message.count);
        break;
      case "race_start":
        if (soundEnabledRef.current) {
          playBeep(1200, 200);
        }
        setGameStatus("racing");
        raceStartTimeRef.current = Date.now();
        questionStartTimeRef.current = Date.now();
        penaltyTimeRef.current = 0;
        // Reset lap results and sector tracking for new race
        setLapResults([]);
        sectorBestTimesRef.current = [];
        setQuestionAttempts(0);
        setProgress(0);
        setMistakes(0);
        setOpponentProgress(0);
        setOpponentMistakes(0);
        setOpponentSectorColors([]);
        setCurrentQuestionIndex(0);
        // Reset power-ups state
        setOvertakeEnergy(0);
        setOvertakeActive(false);
        setOvertakeEndTime(null);
        setOvertakeStartEnergy(0);
        setOvertakeQuestion(null);
        setAeroUsedZones(new Set());
        setAeroActive(false);
        setOpponentEnergy(0);
        break;
      case "opponent_progress":
        // Use ref to avoid stale closure issue
        if (isHostRef.current) {
          setOpponentProgress(message.guestProgress);
          setOpponentMistakes(message.guestMistakes);
          if (message.guestSectorColors) setOpponentSectorColors(message.guestSectorColors);
        } else {
          setOpponentProgress(message.hostProgress);
          setOpponentMistakes(message.hostMistakes);
          if (message.hostSectorColors) setOpponentSectorColors(message.hostSectorColors);
        }
        // Update sector best times and demote purple sectors if opponent now holds them
        if (message.sectorBestTimes) {
          const newBestTimes = message.sectorBestTimes;
          sectorBestTimesRef.current = newBestTimes;

          const myRole = isHostRef.current ? 'host' : 'guest';
          setLapResults(prev => {
            let changed = false;
            const updated = prev.map((entry, i) => {
              if (entry.sectorColor === 'purple' && newBestTimes[i]?.holder && newBestTimes[i].holder !== myRole) {
                changed = true;
                return { ...entry, sectorColor: 'green' as const };
              }
              return entry;
            });
            return changed ? updated : prev;
          });
        }
        break;
      case "player_finished":
        // Opponent finished
        break;
      case "race_complete":
        setRaceResult(message);
        setGameStatus("finished");
        if (message.winnerId === playerIdRef.current) {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          addCoins(100);
        }
        break;
      // Power-ups events
      case "power_ups_toggled":
        setPowerUpsEnabled(message.enabled);
        break;
      case "energy_sync":
        if (isHostRef.current) {
          setOvertakeEnergy(message.hostEnergy);
          setOpponentEnergy(message.guestEnergy);
        } else {
          setOvertakeEnergy(message.guestEnergy);
          setOpponentEnergy(message.hostEnergy);
        }
        break;
      case "overtake_activated":
        setOvertakeActive(true);
        setOvertakeStartEnergy(message.energy);
        setOvertakeEndTime(Date.now() + message.duration);
        setShowBoostMessage("2X BOOST ACTIVE");
        setTimeout(() => setShowBoostMessage(null), 2000);
        break;
      case "opponent_overtake_activated":
        // Opponent activated overtake - no effect on us, just informational
        break;
      case "overtake_ended":
        // Only handle if it's for this player
        if (message.player === (isHostRef.current ? "host" : "guest")) {
          setOvertakeActive(false);
          setOvertakeEndTime(null);
          setOvertakeStartEnergy(0);
          setOvertakeQuestion(null);
          setOvertakeEnergy(message.remainingEnergy || 0);
          setShowBoostMessage(null);
        }
        break;
      case "aero_activated":
        setAeroActive(true);
        setAeroUsedZones(prev => {
          const newSet = new Set(Array.from(prev));
          newSet.add(message.zone);
          return newSet;
        });
        setShowAeroMessage("AERO ACTIVE");
        setTimeout(() => setShowAeroMessage(null), 2000);
        break;
    }
  };
  
  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameStatus === "racing") {
      interval = setInterval(() => {
        if (raceStartTimeRef.current) {
          setElapsedTime(Date.now() - raceStartTimeRef.current + penaltyTimeRef.current);
        }
      }, 10);
    }
    return () => clearInterval(interval);
  }, [gameStatus]);

  // OVERTAKE energy drain effect - drains energy over time while active
  useEffect(() => {
    if (!overtakeActive || !overtakeEndTime || overtakeStartEnergy <= 0) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, overtakeEndTime - now);
      const totalDuration = Math.round((overtakeStartEnergy / 100) * 5000);
      const remainingEnergy = Math.round((remaining / totalDuration) * overtakeStartEnergy);

      setOvertakeEnergy(remainingEnergy);

      // Auto-deactivate when energy depletes
      if (remaining <= 0) {
        clearInterval(interval);
        setOvertakeActive(false);
        setOvertakeEndTime(null);
        setOvertakeStartEnergy(0);
        setOvertakeEnergy(0);
        setOvertakeQuestion(null);
        // Notify server of timeout deactivation
        if (wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: "deactivate_overtake",
            roomCode,
            reason: "timeout",
            remainingEnergy: 0
          }));
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [overtakeActive, overtakeEndTime, overtakeStartEnergy, roomCode]);

  // Generate harder question when OVERTAKE becomes active
  useEffect(() => {
    if (overtakeActive && selectedCircuit && selectedDriver) {
      // Generate a harder question for the current position
      const harderDifficulty = getHarderDifficulty(selectedDriver.difficulty);
      const harderQ = generateQuestion(selectedCircuit.id, harderDifficulty);
      setOvertakeQuestion(harderQ);
    } else {
      setOvertakeQuestion(null);
    }
  }, [overtakeActive, selectedCircuit, selectedDriver]);
  
  // Generate questions when circuit is selected
  useEffect(() => {
    if (selectedCircuit && selectedDriver && isHost) {
      const newQuestions: Question[] = [];
      for (let i = 0; i < raceLength; i++) {
        newQuestions.push(generateQuestion(selectedCircuit.id, selectedDriver.difficulty));
      }
      setQuestions(newQuestions);
    }
  }, [selectedCircuit, selectedDriver, isHost, raceLength]);
  
  const createRoom = async () => {
    if (!playerName.trim()) {
      setError("Please enter your name");
      return;
    }
    
    const circuit = selectedCircuit || CIRCUITS[0];
    const driver = selectedDriver || DRIVERS[0];
    setSelectedCircuit(circuit);
    setSelectedDriver(driver);

    try {
      const tempQuestions: Question[] = [];
      for (let i = 0; i < getRaceLength(circuit.id, state.simMode); i++) {
        tempQuestions.push(generateQuestion(circuit.id, driver.difficulty));
      }
      
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostId: playerIdRef.current,
          hostName: playerName,
          circuitId: circuit.id,
          driverId: driver.id,
          questions: tempQuestions.map(q => ({ display: q.display, answer: q.answer }))
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        setError(data.details || data.error || "Failed to create room");
        return;
      }
      
      const data = await response.json();
      setRoomCode(data.roomCode);
      setQuestions(tempQuestions);
      setIsHost(true);
      isHostRef.current = true;
      setGameStatus("waiting");
      connectWebSocket(data.roomCode, true);
    } catch (err) {
      setError("Failed to create room");
    }
  };
  
  const joinRoom = async () => {
    if (!playerName.trim()) {
      setError("Please enter your name");
      return;
    }
    if (joinCode.length !== 4) {
      setError("Please enter a valid 4-character room code");
      return;
    }
    
    try {
      const response = await fetch(`/api/rooms/${joinCode.toUpperCase()}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestId: playerIdRef.current,
          guestName: playerName
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to join room");
        return;
      }
      
      const data = await response.json();
      setRoomCode(joinCode.toUpperCase());
      setOpponentName(data.room.hostName);
      setSelectedCircuit(CIRCUITS.find(c => c.id === data.room.circuitId) || CIRCUITS[0]);
      setSelectedDriver(DRIVERS.find(d => d.id === data.room.driverId) || DRIVERS[0]);
      if (data.room.questions) {
        setQuestions(data.room.questions.map((q: any) => ({ display: q.display, answer: q.answer })));
      }
      setIsHost(false);
      isHostRef.current = false;
      setGameStatus("waiting");
      connectWebSocket(joinCode.toUpperCase(), false);
    } catch (err) {
      setError("Failed to join room");
    }
  };
  
  const startRace = async () => {
    if (!wsRef.current || !selectedCircuit || !selectedDriver) return;

    // Generate questions based on selected circuit
    const newQuestions: Question[] = [];
    for (let i = 0; i < raceLength; i++) {
      newQuestions.push(generateQuestion(selectedCircuit.id, selectedDriver.difficulty));
    }
    setQuestions(newQuestions);

    // Generate AERO zones if power-ups enabled
    const zones = powerUpsEnabled ? getAeroZones(raceLength, false) : [];
    setAeroZones(zones);

    // Update room with selected circuit and questions, then start countdown
    try {
      await fetch(`/api/rooms/${roomCode}/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          circuitId: selectedCircuit.id,
          driverId: selectedDriver.id,
          weather: selectedWeather,
          questions: newQuestions.map(q => ({ display: q.display, answer: q.answer })),
          powerUpsEnabled
        })
      });

      wsRef.current.send(JSON.stringify({
        type: "start_countdown",
        roomCode,
        circuitId: selectedCircuit.id,
        driverId: selectedDriver.id,
        weather: selectedWeather,
        powerUpsEnabled,
        questions: newQuestions.map(q => ({ display: q.display, answer: q.answer })),
        raceLength
      }));
    } catch (err) {
      console.error("Failed to update room:", err);
    }
  };
  
  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const togglePowerUps = () => {
    if (!wsRef.current || !isHost) return;
    const newValue = !powerUpsEnabled;
    setPowerUpsEnabled(newValue);
    wsRef.current.send(JSON.stringify({
      type: "toggle_power_ups",
      roomCode,
      enabled: newValue
    }));
  };

  const activateOvertake = () => {
    if (!wsRef.current || !powerUpsEnabled) return;

    // If already active, deactivate manually (preserves remaining energy)
    if (overtakeActive) {
      wsRef.current.send(JSON.stringify({
        type: "deactivate_overtake",
        roomCode,
        reason: "manual",
        remainingEnergy: overtakeEnergy
      }));
      setOvertakeActive(false);
      setOvertakeEndTime(null);
      setOvertakeStartEnergy(0);
      setOvertakeQuestion(null);
      // Energy is preserved - don't reset it
      return;
    }

    // Activate - need energy and within range
    if (overtakeEnergy <= 0) return;

    // Check if within range of opponent (behind and within 2 sectors)
    const behindOrEqual = progress <= opponentProgress;
    const withinRange = Math.abs(opponentProgress - progress) <= 2;
    if (!behindOrEqual || !withinRange) return;

    wsRef.current.send(JSON.stringify({
      type: "activate_overtake",
      roomCode
    }));
  };

  const activateAero = () => {
    if (!wsRef.current || !powerUpsEnabled || aeroActive) return;

    const currentZone = getCurrentAeroZone(progress, aeroZones);
    if (currentZone === undefined || aeroUsedZones.has(currentZone)) return;

    wsRef.current.send(JSON.stringify({
      type: "activate_aero",
      roomCode,
      zone: currentZone
    }));
  };

  // Check if AERO is available at current position
  const isAeroAvailable = powerUpsEnabled &&
    !aeroActive &&
    getCurrentAeroZone(progress, aeroZones) !== undefined &&
    !aeroUsedZones.has(getCurrentAeroZone(progress, aeroZones) || -1);

  // Check if OVERTAKE can be activated
  const canActivateOvertake = powerUpsEnabled &&
    overtakeEnergy > 0 &&
    !overtakeActive &&
    progress <= opponentProgress &&
    Math.abs(opponentProgress - progress) <= 2;
  
  const handleSubmit = () => {
    if (feedback !== "idle" || gameStatus !== "racing") return;

    const val = parseInt(answer);
    if (isNaN(val)) return;

    // Use harder overtake question when active, otherwise use regular question
    const currentQuestion = overtakeActive && overtakeQuestion
      ? overtakeQuestion
      : questions[currentQuestionIndex];
    if (!currentQuestion) return;

    // Calculate response time
    const responseTime = Date.now() - questionStartTimeRef.current;

    if (val === currentQuestion.answer) {
      setFeedback("correct");

      // F1-style competitive sector timing
      const sectorIndex = progress;
      const currentBest = sectorBestTimesRef.current[sectorIndex];

      let sectorColor: 'green' | 'purple' | 'yellow' | 'red';
      let speed: 'fast' | 'normal' | 'slow';

      if (!currentBest || responseTime < currentBest.bestTime) {
        sectorColor = 'purple';
        speed = 'fast';
      } else {
        const threshold = currentBest.bestTime * 1.5;
        if (responseTime <= threshold) {
          sectorColor = 'green';
          speed = 'fast';
        } else {
          sectorColor = 'yellow';
          speed = 'slow';
        }
      }

      // Red override: if player had retries on this question (realism mode)
      if (questionAttempts > 0 && state.simMode) {
        sectorColor = 'red';
      }

      // Update local sector best times optimistically
      if (!currentBest || responseTime < currentBest.bestTime) {
        const myRole = isHostRef.current ? 'host' : 'guest';
        const newBestTimes = [...sectorBestTimesRef.current];
        newBestTimes[sectorIndex] = { bestTime: responseTime, holder: myRole as 'host' | 'guest' };
        sectorBestTimesRef.current = newBestTimes;
      }

      // Calculate progress increment (2x if AERO active OR OVERTAKE active)
      const hasBonus = aeroActive || overtakeActive;
      const progressIncrement = hasBonus ? 2 : 1;
      const newProgress = Math.min(progress + progressIncrement, raceLength);
      const actualGain = newProgress - progress;

      // Push two lap result entries when bonus gives a 2-sector jump
      const lapEntry = { result: 'correct' as const, speed, sectorColor, responseTime };
      if (hasBonus && actualGain === 2) {
        setLapResults(prev => [...prev, lapEntry, { ...lapEntry }]);
      } else {
        setLapResults(prev => [...prev, lapEntry]);
      }

      // Harvest energy if power-ups enabled and NOT using overtake
      if (powerUpsEnabled && !overtakeActive) {
        const circuit = selectedCircuit || CIRCUITS[0];
        const driverDifficulty = selectedDriver?.difficulty || 'easy';
        const energyGain = calculateEnergyHarvest(responseTime, driverDifficulty as Difficulty, circuit.type);
        const newEnergy = Math.min(100, overtakeEnergy + energyGain);
        setOvertakeEnergy(newEnergy);

        // Send energy update to server
        if (wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: "energy_update",
            roomCode,
            energy: newEnergy
          }));
        }
      }

      setProgress(newProgress);

      // Reset AERO active state after using
      if (aeroActive) {
        setAeroActive(false);
      }

      // Send progress update with responseTime for sector best time tracking
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: "progress_update",
          roomCode,
          progress: newProgress,
          mistakes,
          aeroBonus: aeroActive,
          overtakeBonus: overtakeActive,
          sectorColor,
          responseTime
        }));
      }

      if (newProgress >= raceLength) {
        // Race finished
        const finishTime = Date.now() - (raceStartTimeRef.current || 0);
        if (wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: "race_finished",
            roomCode,
            finishTime,
            mistakes,
            finalProgress: newProgress
          }));
        }
      } else {
        setTimeout(() => {
          setFeedback("idle");
          setAnswer("");
          setCurrentQuestionIndex(prev => prev + 1);
          questionStartTimeRef.current = Date.now();
          setQuestionAttempts(0);
          // Generate new harder question if overtake still active
          if (overtakeActive && selectedCircuit && selectedDriver) {
            const harderDifficulty = getHarderDifficulty(selectedDriver.difficulty);
            const harderQ = generateQuestion(selectedCircuit.id, harderDifficulty);
            setOvertakeQuestion(harderQ);
          }
        }, 400);
      }
    } else {
      setFeedback("incorrect");
      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);

      // Track retries for red sector override in realism mode
      setQuestionAttempts(prev => prev + 1);

      // Show track limits warning
      setShowPenalty(true);
      if (newMistakes >= 3) {
        setShowBlackWhiteFlag(true);
      }
      setTimeout(() => { setShowPenalty(false); }, 1500);

      // Reset AERO active state on wrong answer
      if (aeroActive) {
        setAeroActive(false);
      }

      // Deactivate overtake on wrong answer - depletes ALL energy
      if (overtakeActive && wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: "deactivate_overtake",
          roomCode,
          reason: "wrong_answer",
          remainingEnergy: 0
        }));
        setOvertakeActive(false);
        setOvertakeEndTime(null);
        setOvertakeStartEnergy(0);
        setOvertakeEnergy(0);
        setOvertakeQuestion(null);
      }

      if (state.simMode) {
        // Realism mode: must answer correctly before continuing
        // Don't advance progress or lapResults, just count the mistake
        // Penalties: 1-2 warnings, 3 black & white flag, then cycling +5/+10 penalties
        // DNF threshold: mistakes > 50% of total laps
        const dnfThreshold = Math.floor(raceLength * 0.5);

        if (newMistakes <= 3) {
          // Warnings only - no time penalty for first 3 mistakes
        } else if (newMistakes <= dnfThreshold) {
          // Cycling +5/+10 penalties (4=+5, 5=+10, 6=+5, 7=+10, etc.)
          const cyclePosition = (newMistakes - 4) % 2; // 0 for +5, 1 for +10
          const penalty = cyclePosition === 0 ? 5000 : 10000;
          penaltyTimeRef.current += penalty;
          // Show +5s penalty flash
          setShowFiveSecPenalty(true);
          setTimeout(() => setShowFiveSecPenalty(false), 1000);
        }

        // Check for crash when mistakes exceed 50% of laps
        if (newMistakes > dnfThreshold) {
          // Notify server/opponent of crash
          if (wsRef.current) {
            wsRef.current.send(JSON.stringify({
              type: "race_finished",
              roomCode,
              finishTime: 999999, // Very high time to indicate crash
              mistakes: newMistakes,
              finalProgress: progress,
              crashed: true
            }));
          }
          // Immediately transition to finished state locally
          setGameStatus("finished");
          setFeedback("idle");
          // Result will be updated when opponent finishes or via race_complete message
          return;
        }
        
        // Send mistake update only (progress unchanged) - use dedicated message type
        if (wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: "mistake_update",
            roomCode,
            mistakes: newMistakes
          }));
        }
        
        // Clear answer but keep same question - don't reset questionStartTimeRef
        setTimeout(() => {
          setFeedback("idle");
          setAnswer("");
        }, 600);
      } else {
        // Standard mode: advance progress on incorrect
        setLapResults(prev => [...prev, { result: 'incorrect', speed: 'normal', sectorColor: 'red', responseTime }]);
        
        const newProgress = progress + 1;
        setProgress(newProgress);
        
        // Send progress update
        if (wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: "progress_update",
            roomCode,
            progress: newProgress,
            mistakes: newMistakes,
            sectorColor: 'red'
          }));
        }
        
        if (newProgress >= raceLength) {
          const finishTime = Date.now() - (raceStartTimeRef.current || 0);
          if (wsRef.current) {
            wsRef.current.send(JSON.stringify({
              type: "race_finished",
              roomCode,
              finishTime,
              mistakes: newMistakes,
              finalProgress: newProgress
            }));
          }
        } else {
          setTimeout(() => {
            setFeedback("idle");
            setAnswer("");
            setCurrentQuestionIndex(prev => prev + 1);
            questionStartTimeRef.current = Date.now();
            setQuestionAttempts(0);
          }, 600);
        }
      }
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;
  };
  
  const goBack = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    // Reset all state when leaving
    isHostRef.current = false;
    setIsHost(false);
    setLapResults([]);
    sectorBestTimesRef.current = [];
    setQuestionAttempts(0);
    // Reset power-ups state
    setPowerUpsEnabled(false);
    setOvertakeEnergy(0);
    setOvertakeActive(false);
    setOvertakeEndTime(null);
    setOvertakeStartEnergy(0);
    setOvertakeQuestion(null);
    setAeroZones([]);
    setAeroUsedZones(new Set());
    setAeroActive(false);
    setOpponentEnergy(0);
    setLocation("/");
  };
  
  // Lobby menu - Access Pass Card Design
  if (gameStatus === "lobby") {
    return (
      <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#1a1a1a' }}>
        {/* App Logo */}
        <div className="pt-4 pb-2 flex justify-center shrink-0 bg-[#525252]">
          <Link href="/" data-testid="link-home-logo">
            <img 
              src={logoImage} 
              alt="F1 Math Racer" 
              className="h-8 md:h-12 object-contain cursor-pointer hover:opacity-70 transition-opacity"
              data-testid="img-app-logo"
            />
          </Link>
        </div>
        {/* Centered Card Container */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        
        {/* Access Pass Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[350px] md:max-w-[450px] bg-white rounded-[24px] p-6 sm:p-8"
          style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }}
        >
          {/* Header Section */}
          <div className="flex flex-col items-center text-center pb-6 mb-6 border-b border-gray-200">
            <Globe className="w-12 h-12 text-black mb-3" />
            <h1 
              className="text-2xl font-bold text-black uppercase tracking-wide"
              style={{ fontFamily: 'Formula1' }}
            >
              Multiplayer Lobby
            </h1>
            <p className="text-sm text-red-500 mt-1">*LAN Only</p>
          </div>
          
          {mode === "menu" && (
            <div className="flex flex-col gap-4">
              {/* Driver Name Input */}
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter Driver ID..."
                className="h-14 px-4 rounded-xl text-center text-lg font-medium text-black placeholder:text-gray-400 transition-all border-2 border-transparent focus:border-[#ff2800] focus:bg-white outline-none"
                style={{ backgroundColor: '#f5f5f5' }}
                maxLength={20}
                data-testid="input-driver-name"
              />
              
              {/* Host Session Button */}
              <button
                onClick={() => setMode("create")}
                className="h-[50px] rounded-xl font-bold text-lg uppercase tracking-wider text-white transition-all hover:opacity-90"
                style={{ backgroundColor: '#ff2800', fontFamily: 'Formula1' }}
                data-testid="button-host-session"
              >
                Host Session
              </button>
              
              {/* Join Existing Button */}
              <button
                onClick={() => setMode("join")}
                className="h-[50px] rounded-xl font-bold text-lg uppercase tracking-wider text-black border-2 border-black bg-white transition-all hover:bg-gray-100"
                style={{ fontFamily: 'Formula1' }}
                data-testid="button-join-existing"
              >
                Join Existing
              </button>

              {/* Back to Home */}
              <Link href="/">
                <button
                  className="text-gray-500 hover:text-black transition-colors text-sm uppercase tracking-wider w-full mt-2"
                  style={{ fontFamily: 'Formula1' }}
                  data-testid="button-back-home"
                >
                  Back
                </button>
              </Link>
            </div>
          )}
          
          {mode === "create" && (
            <div className="flex flex-col gap-4">
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter Driver ID..."
                className="h-14 px-4 rounded-xl text-center text-lg font-medium text-black placeholder:text-gray-400 transition-all border-2 border-transparent focus:border-[#ff2800] focus:bg-white outline-none"
                style={{ backgroundColor: '#f5f5f5' }}
                maxLength={20}
                data-testid="input-driver-name-create"
              />
              {error && <p className="text-[#ff2800] text-center text-sm font-medium" data-testid="text-error">{error}</p>}
              <button
                onClick={createRoom}
                className="h-[50px] rounded-xl font-bold text-lg uppercase tracking-wider text-white transition-all hover:opacity-90"
                style={{ backgroundColor: '#ff2800', fontFamily: 'Formula1' }}
                data-testid="button-create-room"
              >
                Create Room
              </button>
              <button
                onClick={() => { setMode("menu"); setError(""); }}
                className="text-gray-500 hover:text-black transition-colors text-sm uppercase tracking-wider"
                style={{ fontFamily: 'Formula1' }}
                data-testid="button-back-create"
              >
                Back
              </button>
            </div>
          )}
          
          {mode === "join" && (
            <div className="flex flex-col gap-4">
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter Driver ID..."
                className="h-14 px-4 rounded-xl text-center text-lg font-medium text-black placeholder:text-gray-400 transition-all border-2 border-transparent focus:border-[#ff2800] focus:bg-white outline-none"
                style={{ backgroundColor: '#f5f5f5' }}
                maxLength={20}
                data-testid="input-driver-name-join"
              />
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Room Code"
                className="h-14 px-4 rounded-xl text-center text-2xl font-bold tracking-widest text-black placeholder:text-gray-400 transition-all border-2 border-transparent focus:border-[#ff2800] focus:bg-white outline-none"
                style={{ backgroundColor: '#f5f5f5' }}
                maxLength={4}
                data-testid="input-room-code"
              />
              {error && <p className="text-[#ff2800] text-center text-sm font-medium" data-testid="text-error-join">{error}</p>}
              <button
                onClick={joinRoom}
                className="h-[50px] rounded-xl font-bold text-lg uppercase tracking-wider text-white transition-all hover:opacity-90"
                style={{ backgroundColor: '#ff2800', fontFamily: 'Formula1' }}
                data-testid="button-join-room"
              >
                Join Room
              </button>
              <button
                onClick={() => { setMode("menu"); setError(""); }}
                className="text-gray-500 hover:text-black transition-colors text-sm uppercase tracking-wider"
                style={{ fontFamily: 'Formula1' }}
                data-testid="button-back-join"
              >
                Back
              </button>
            </div>
          )}
          
          {/* Server Status Footer */}
          <div className="mt-8 pt-4 border-t border-gray-200 flex items-center justify-center gap-2" data-testid="status-server">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs text-gray-400 uppercase tracking-wider" data-testid="text-server-region">Online Region: Global</span>
          </div>
        </motion.div>
        </div>
      </div>
    );
  }
  
  // Waiting room
  if (gameStatus === "waiting") {
    return (
      <GameLayout coins={state.coins} hideHeader>
        <div className="flex-1 flex flex-col items-center justify-center p-4 gap-6">
          <h1 className="text-2xl font-bold">Waiting for Opponent</h1>
          
          <div className="bg-secondary rounded-xl p-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">Room Code</p>
            <div className="flex items-center gap-2">
              <span className="text-4xl font-bold tracking-widest">{roomCode}</span>
              <button
                onClick={copyRoomCode}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>
          
          <p className="text-muted-foreground">Share this code with your opponent</p>

          {/* Power-ups Toggle - always visible for host to configure */}
          <div className="bg-secondary rounded-xl p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Zap className={cn("w-5 h-5", powerUpsEnabled ? "text-yellow-500" : "text-muted-foreground")} />
                <span className="font-medium">Power-Ups</span>
              </div>
              {isHost ? (
                <button
                  onClick={togglePowerUps}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    powerUpsEnabled ? "bg-yellow-500" : "bg-muted"
                  )}
                  data-testid="toggle-power-ups"
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      powerUpsEnabled ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              ) : (
                <span className={cn(
                  "text-sm font-medium px-2 py-1 rounded",
                  powerUpsEnabled ? "bg-yellow-500/20 text-yellow-500" : "bg-muted text-muted-foreground"
                )}>
                  {powerUpsEnabled ? "ON" : "OFF"}
                </span>
              )}
            </div>
            {powerUpsEnabled && (
              <p className="text-xs text-muted-foreground mt-2">
                OVERTAKE for 2x boost with harder Qs, AERO for 2x boost
              </p>
            )}
          </div>

          {roomReady && (
            <div className="text-center space-y-4">
              <p className="text-green-500 font-medium">Opponent connected!</p>

              {isHost && (
                <button
                  onClick={() => setGameStatus("track_select")}
                  className="h-14 px-8 bg-black text-white rounded-lg font-bold text-lg hover:bg-gray-800 transition-all"
                  style={{ fontFamily: 'Formula1' }}
                  data-testid="button-choose-track"
                >
                  Choose Track
                </button>
              )}
              {!isHost && (
                <p className="text-muted-foreground">Waiting for host to choose track...</p>
              )}
            </div>
          )}
          
          <button
            onClick={goBack}
            className="text-muted-foreground hover:text-foreground transition-colors mt-4"
          >
            Leave Room
          </button>
        </div>
      </GameLayout>
    );
  }
  
  // Track Selection (Host only)
  if (gameStatus === "track_select") {
    const currentCircuitIndex = selectedCircuit ? CIRCUITS.findIndex(c => c.id === selectedCircuit.id) : 0;
    const displayCircuit = selectedCircuit || CIRCUITS[0];
    
    const goToPrevCircuit = () => {
      const newIndex = currentCircuitIndex === 0 ? CIRCUITS.length - 1 : currentCircuitIndex - 1;
      setSelectedCircuit(CIRCUITS[newIndex]);
    };
    
    const goToNextCircuit = () => {
      const newIndex = currentCircuitIndex === CIRCUITS.length - 1 ? 0 : currentCircuitIndex + 1;
      setSelectedCircuit(CIRCUITS[newIndex]);
    };

    return (
      <div className="h-screen flex flex-col overflow-hidden transition-colors duration-300" style={{ backgroundColor: '#1a1a1a' }}>
        {/* Header */}
        <div className="pt-4 pb-2 flex justify-center shrink-0">
          <div className="bg-black text-white px-4 py-2 rounded-full">
            <span className="font-bold text-xs uppercase tracking-wider" style={{ fontFamily: 'Formula1' }}>
              Multiplayer - Choose Track
            </span>
          </div>
        </div>

        {/* Main Content - Hero Card with Side Chevrons */}
        <div className="flex-1 flex items-center justify-center px-4 pb-28 overflow-hidden">
          {/* Left Chevron */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={goToPrevCircuit}
            className="p-3 transition-colors text-gray-400 hover:text-white"
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
            className="w-[350px] md:w-[450px] rounded-[20px] p-6 flex flex-col transition-colors duration-300"
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
                  className="h-40 md:h-52 object-contain"
                  style={{ maxWidth: '280px' }}
                />
              ) : (
                <div className="h-40 w-full bg-gray-200 rounded flex items-center justify-center text-gray-500">
                  Track Map
                </div>
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
                onClick={() => setSelectedWeather('dry')}
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
                onClick={() => setSelectedWeather('wet')}
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
                onClick={() => setSelectedWeather('random')}
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
            className="p-3 transition-colors text-gray-400 hover:text-white"
            data-testid="circuit-next"
          >
            <ChevronRight className="w-12 h-12" />
          </motion.button>
        </div>

        {/* Track Dots Indicator */}
        <div className="absolute bottom-28 left-0 right-0 flex justify-center gap-2">
          {CIRCUITS.map((circuit, index) => (
            <button
              key={circuit.id}
              onClick={() => setSelectedCircuit(circuit)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                currentCircuitIndex === index 
                  ? "bg-white" 
                  : "bg-gray-500"
              )}
              data-testid={`circuit-dot-${circuit.id}`}
            />
          ))}
        </div>

        {/* Start Race Button - Fixed Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col items-center gap-2 transition-colors duration-300" style={{ backgroundColor: '#1a1a1a' }}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={startRace}
            className="w-full max-w-sm md:max-w-md py-4 rounded-xl font-bold text-lg uppercase tracking-wider text-black"
            style={{ 
              fontFamily: 'Formula1',
              backgroundColor: '#ffffff',
              animation: 'pulse-white 2s infinite'
            }}
            data-testid="button-start-race"
          >
            Start Race
          </motion.button>
          <button
            onClick={() => setGameStatus("waiting")}
            className="transition-colors text-sm uppercase tracking-wider text-gray-400 hover:text-white"
            data-testid="button-back-waiting"
          >
            &lt;&lt; Back
          </button>
        </div>

        <style>{`
          @keyframes pulse-white {
            0%, 100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7); }
            50% { box-shadow: 0 0 20px 10px rgba(255, 255, 255, 0.3); }
          }
        `}</style>
      </div>
    );
  }
  
  // Countdown with F1 starting lights
  if (gameStatus === "countdown") {
    // countdownValue goes 5→1, so lights on = 6 - countdownValue
    const lightsOn = 6 - countdownValue;
    return (
      <GameLayout coins={state.coins} trackName={selectedCircuit?.name || ""}>
        <div className="flex-1 flex flex-col items-center justify-center gap-12 overflow-hidden pb-16">
          <div className="bg-black rounded-xl p-4 md:p-6 shadow-2xl border-4 border-zinc-800">
            <div className="flex gap-2 md:gap-3 justify-center">
              {[1, 2, 3, 4, 5].map((light) => (
                <motion.div
                  key={light}
                  initial={{ opacity: 0.3 }}
                  animate={{
                    opacity: lightsOn >= light ? 1 : 0.3,
                    scale: lightsOn >= light ? 1 : 0.95
                  }}
                  className={cn(
                    "w-10 h-10 md:w-16 md:h-16 rounded-full transition-all duration-100 border-2 md:border-4",
                    lightsOn >= light
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
  
  // Racing
  if (gameStatus === "racing") {
    // Use harder overtake question when active, otherwise use regular question
    const currentQuestion = overtakeActive && overtakeQuestion
      ? overtakeQuestion
      : questions[currentQuestionIndex];
    
    return (
      <GameLayout coins={state.coins} trackName={selectedCircuit?.name || ""} lockViewport>
        <div className="flex-1 flex flex-col w-full overflow-hidden relative min-h-0">
          {/* Header */}
          <div className="flex justify-between items-center text-sm text-muted-foreground font-medium px-4 py-1">
            <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded">MULTIPLAYER</span>
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
                      className="text-white px-3 py-0.5 rounded-lg font-bold text-xs bg-red-600"
                    >
                      TRACK LIMITS
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Timer */}
            <div className="flex items-center gap-2 text-lg sm:text-xl font-mono font-medium text-primary">
              <Timer className="w-4 h-4 sm:w-5 sm:h-5" />
              {formatTime(elapsedTime)}
            </div>

            {/* Expression and Answer with Penalty Overlay */}
            <div className="relative">
              <div className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mt-2">
                {currentQuestion?.display}
              </div>

              <div
                className={cn(
                  "text-4xl sm:text-5xl md:text-6xl font-bold min-w-[80px] text-center mt-2",
                  feedback === "idle" && "text-muted-foreground/50",
                  feedback === "correct" && "text-green-600",
                  feedback === "incorrect" && "text-red-600"
                )}
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
                      style={{ fontFamily: 'Formula1' }}
                    >
                      +5s
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Minimal Feedback - only "Correct" like single player */}
            <div className="h-4 flex items-center justify-center">
              <AnimatePresence mode="wait">
                {feedback === "correct" && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-green-600 font-medium flex items-center gap-1 text-xs">
                    <Check className="w-3 h-3" /> Correct
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Progress Bars */}
          <div className="flex flex-col justify-center px-4 gap-1">
            {/* Opponent Progress Bar */}
            <div className="relative h-5 bg-muted/50 rounded-full overflow-hidden">
              <div className="absolute inset-0 flex">
                {Array.from({ length: raceLength }).map((_, i) => {
                  const isCompleted = i < opponentProgress;
                  const oppColor = opponentSectorColors[i];
                  let segmentColor = "bg-transparent";
                  if (isCompleted) {
                    segmentColor = oppColor === 'purple' ? "bg-purple-500/70" :
                                   oppColor === 'green' ? "bg-green-500/70" :
                                   oppColor === 'yellow' ? "bg-yellow-500/70" :
                                   oppColor === 'red' ? "bg-red-500/70" :
                                   "bg-orange-500/70";
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
              {/* Opponent car indicator */}
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 z-10"
                animate={{ left: `${(opponentProgress / raceLength) * 100}%` }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                style={{ marginLeft: "-10px" }}
              >
                <div className="w-5 h-3 bg-red-600 rounded-sm flex items-center justify-center">
                  <div className="w-3 h-1.5 bg-red-400 rounded-sm" />
                </div>
              </motion.div>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 leading-none text-[9px] text-red-400 font-bold">
                {opponentName ? opponentName.slice(0, 3).toUpperCase() : "OPP"}
              </span>
            </div>

            {/* Player Progress Bar */}
            <div className="relative h-7 bg-muted rounded-full overflow-hidden">
              <div className="absolute inset-0 flex">
                {Array.from({ length: raceLength }).map((_, i) => {
                  const isCompleted = i < progress;
                  const lapData = lapResults[i];

                  let segmentColor = "bg-transparent";
                  if (isCompleted && lapData) {
                    segmentColor = lapData.sectorColor === 'purple' ? "bg-purple-500" :
                                   lapData.sectorColor === 'green' ? "bg-green-500" :
                                   lapData.sectorColor === 'yellow' ? "bg-yellow-500" :
                                   lapData.sectorColor === 'red' ? "bg-red-500" : "bg-transparent";
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
              {/* Player car indicator */}
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 z-10"
                animate={{ left: `${(progress / raceLength) * 100}%` }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                style={{ marginLeft: "-12px" }}
              >
                <div className="w-6 h-4 bg-foreground rounded-sm flex items-center justify-center">
                  <div className="w-4 h-2 bg-primary rounded-sm" />
                </div>
              </motion.div>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground font-bold">{playerName ? playerName.slice(0, 3).toUpperCase() : "YOU"}</span>
            </div>

            {/* Progress text */}
            <div className="flex justify-between text-[11px] text-muted-foreground mt-0.5 px-1">
              <span>Lap {progress + 1}/{raceLength}</span>
              <span className={cn(mistakes > 0 && "text-red-500")}>Limits: {mistakes}</span>
            </div>
          </div>

          {/* Keypad with integrated Power-ups row */}
          <div className="flex-1 flex flex-col justify-end items-center px-4 min-h-0 pb-11">
            {/* Status Messages - floating above keypad */}
            {powerUpsEnabled && (showBoostMessage || showAeroMessage) && (
              <div className="flex justify-center mb-2 h-6 w-full max-w-md md:max-w-lg">
                <div className="flex gap-2 items-center">
                  <AnimatePresence>
                    {showBoostMessage && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="text-sm font-bold px-3 py-1 rounded-full bg-yellow-500 text-black"
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

            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full max-w-md md:max-w-lg">
              {/* Power-ups row - integrated as top keypad row */}
              {/* Power-ups always visible; disabled when toggled off */}
                  {/* AERO Button */}
                  <button
                    onPointerDown={(e) => {
                      e.preventDefault();
                      if (isAeroAvailable && !aeroActive) {
                        activateAero();
                      }
                    }}
                    disabled={!powerUpsEnabled || !isAeroAvailable || aeroActive}
                    className={cn(
                      "h-[56px] sm:h-[72px] md:h-[84px] rounded-xl font-bold text-lg sm:text-xl transition-all active:scale-95 touch-manipulation select-none",
                      aeroActive
                        ? "bg-green-600 text-white shadow-[0_0_20px_rgba(34,197,94,0.7)] animate-pulse"
                        : isAeroAvailable
                          ? "bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] ring-2 ring-yellow-400 animate-pulse"
                          : "bg-secondary text-secondary-foreground cursor-not-allowed"
                    )}
                    style={{ fontFamily: 'Formula1' }}
                  >
                    {aeroActive ? 'ON' : 'AERO'}
                  </button>

                  {/* Energy Bar */}
                  <div className="h-[56px] sm:h-[72px] md:h-[84px] rounded-xl bg-secondary overflow-hidden relative">
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
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] sm:text-xs font-bold text-black z-10">
                      {overtakeEnergy}%
                    </span>
                  </div>

                  {/* OT Button */}
                  <button
                    onPointerDown={(e) => {
                      e.preventDefault();
                      if (overtakeActive || canActivateOvertake) {
                        activateOvertake();
                      }
                    }}
                    disabled={!powerUpsEnabled || (!overtakeActive && !canActivateOvertake)}
                    className={cn(
                      "h-[56px] sm:h-[72px] md:h-[84px] rounded-xl font-bold text-lg sm:text-xl transition-all active:scale-95 touch-manipulation select-none",
                      overtakeActive
                        ? "bg-green-600 text-white shadow-[0_0_20px_rgba(34,197,94,0.7)] animate-pulse"
                        : canActivateOvertake
                          ? "bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.5)]"
                          : "bg-secondary text-secondary-foreground cursor-not-allowed"
                    )}
                    style={{ fontFamily: 'Formula1' }}
                  >
                    {overtakeActive ? 'ON' : 'OT'}
                  </button>

              {/* Regular keypad buttons */}
              {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((num) => (
                <button
                  key={num}
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    if (feedback === "idle") {
                      playKeypadClick();
                      setAnswer(prev => prev + num.toString());
                    }
                  }}
                  className="h-[56px] sm:h-[72px] md:h-[84px] rounded-xl text-2xl sm:text-3xl md:text-4xl font-bold transition-colors active:scale-95 bg-secondary text-secondary-foreground hover:bg-secondary/80 touch-manipulation select-none"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  if (feedback === "idle") {
                    playKeypadClick();
                    setAnswer(prev => prev.slice(0, -1));
                  }
                }}
                className="h-[56px] sm:h-[72px] md:h-[84px] rounded-xl bg-muted text-muted-foreground font-bold hover:bg-muted/80 transition-colors active:scale-95 flex items-center justify-center touch-manipulation select-none"
              >
                <Delete className="w-6 h-6 sm:w-8 sm:h-8" />
              </button>
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  if (feedback === "idle") {
                    playKeypadClick();
                    setAnswer(prev => prev + "0");
                  }
                }}
                className="h-[56px] sm:h-[72px] md:h-[84px] rounded-xl text-2xl sm:text-3xl md:text-4xl font-bold transition-colors active:scale-95 bg-secondary text-secondary-foreground hover:bg-secondary/80 touch-manipulation select-none"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={!answer || feedback !== "idle"}
                className={cn(
                  "h-[56px] sm:h-[72px] md:h-[84px] rounded-xl text-xl sm:text-2xl font-bold transition-colors active:scale-95 flex items-center justify-center touch-manipulation select-none",
                  answer && feedback === "idle"
                    ? "bg-green-600 text-white hover:bg-green-500"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Check className="w-6 h-6 sm:w-8 sm:h-8" />
              </button>
            </div>
          </div>
        </div>
      </GameLayout>
    );
  }

  // Waiting for race result (e.g., crashed and waiting for opponent to finish)
  if (gameStatus === "finished" && !raceResult) {
    return (
      <GameLayout coins={state.coins} trackName={selectedCircuit?.name || ""}>
        <div className="flex-1 flex flex-col items-center justify-center p-4 gap-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-4xl font-bold text-red-500"
          >
            DNF
          </motion.div>
          <p className="text-muted-foreground">Waiting for opponent to finish...</p>
          <button
            onClick={goBack}
            className="h-14 px-8 bg-primary text-primary-foreground rounded-lg font-bold text-lg hover:opacity-90 transition-all flex items-center gap-2"
          >
            <Home className="w-5 h-5" />
            Back to Menu
          </button>
        </div>
      </GameLayout>
    );
  }

  // Finished
  if (gameStatus === "finished" && raceResult) {
    const isWinner = raceResult.winnerId === playerIdRef.current;
    const yourTime = isHost ? raceResult.hostFinishTime : raceResult.guestFinishTime;
    const opponentTime = isHost ? raceResult.guestFinishTime : raceResult.hostFinishTime;
    const yourMistakes = isHost ? raceResult.hostMistakes : raceResult.guestMistakes;
    const opponentMistakesResult = isHost ? raceResult.guestMistakes : raceResult.hostMistakes;
    
    return (
      <GameLayout coins={state.coins} trackName={selectedCircuit?.name || ""}>
        <div className="flex-1 flex flex-col items-center justify-center p-4 gap-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={cn(
              "text-6xl font-bold",
              isWinner ? "text-green-500" : "text-red-500"
            )}
          >
            {isWinner ? "YOU WIN!" : "YOU LOSE"}
          </motion.div>
          
          <div className="bg-secondary rounded-xl p-6 w-full max-w-sm md:max-w-md">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div></div>
              <div className="text-sm font-medium text-muted-foreground">You</div>
              <div className="text-sm font-medium text-muted-foreground">Opponent</div>
              
              <div className="text-sm text-muted-foreground text-left">Time</div>
              <div className="font-mono font-bold">{formatTime(yourTime)}</div>
              <div className="font-mono font-bold">{formatTime(opponentTime)}</div>
              
              <div className="text-sm text-muted-foreground text-left">Mistakes</div>
              <div className={cn("font-bold", yourMistakes > 0 && "text-red-500")}>{yourMistakes}</div>
              <div className={cn("font-bold", opponentMistakesResult > 0 && "text-red-500")}>{opponentMistakesResult}</div>
            </div>
          </div>
          
          {isWinner && (
            <p className="text-green-500 font-medium">+100 Pit Coins!</p>
          )}
          
          <button
            onClick={goBack}
            className="h-14 px-8 bg-primary text-primary-foreground rounded-lg font-bold text-lg hover:opacity-90 transition-all flex items-center gap-2"
          >
            <Home className="w-5 h-5" />
            Back to Menu
          </button>
        </div>
      </GameLayout>
    );
  }
  
  return null;
}
