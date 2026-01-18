import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState, generateQuestion, type Question, CIRCUITS, DRIVERS, type Circuit, type Driver, getRaceLength } from "@/lib/gameLogic";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, X, Timer, Delete, Home, Globe, ChevronLeft, ChevronRight } from "lucide-react";

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
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(DRIVERS[0]);
  const [selectedWeather, setSelectedWeather] = useState<Weather>('dry');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<"idle" | "correct" | "incorrect">("idle");
  const [progress, setProgress] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [opponentProgress, setOpponentProgress] = useState(0);
  const [opponentMistakes, setOpponentMistakes] = useState(0);
  const [countdownValue, setCountdownValue] = useState(5);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [inPurpleMode, setInPurpleMode] = useState(false);
  const [realismThreshold, setRealismThreshold] = useState<number | null>(null);
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
  
  const wsRef = useRef<WebSocket | null>(null);
  const playerIdRef = useRef<string>(Math.random().toString(36).substring(7));
  const raceStartTimeRef = useRef<number | null>(null);
  const questionStartTimeRef = useRef<number>(Date.now());
  const isHostRef = useRef<boolean>(false);
  const penaltyTimeRef = useRef<number>(0);
  
  const raceLength = selectedCircuit ? getRaceLength(selectedCircuit.id, state.simMode) : 20;
  
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
        setGameStatus("countdown");
        setCountdownValue(5);
        break;
      case "countdown":
        setCountdownValue(message.count);
        break;
      case "race_start":
        setGameStatus("racing");
        raceStartTimeRef.current = Date.now();
        questionStartTimeRef.current = Date.now();
        penaltyTimeRef.current = 0;
        // Reset lap results and purple mode for new race
        setLapResults([]);
        setInPurpleMode(false);
        setRealismThreshold(null);
        setProgress(0);
        setMistakes(0);
        setOpponentProgress(0);
        setOpponentMistakes(0);
        setCurrentQuestionIndex(0);
        break;
      case "opponent_progress":
        // Use ref to avoid stale closure issue
        if (isHostRef.current) {
          setOpponentProgress(message.guestProgress);
          setOpponentMistakes(message.guestMistakes);
        } else {
          setOpponentProgress(message.hostProgress);
          setOpponentMistakes(message.hostMistakes);
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
    
    // Default circuit and driver for now
    const circuit = CIRCUITS[0];
    const driver = DRIVERS[0];
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
    
    // Update room with selected circuit and questions, then start countdown
    try {
      await fetch(`/api/rooms/${roomCode}/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          circuitId: selectedCircuit.id,
          driverId: selectedDriver.id,
          weather: selectedWeather,
          questions: newQuestions.map(q => ({ display: q.display, answer: q.answer }))
        })
      });
      
      wsRef.current.send(JSON.stringify({
        type: "start_countdown",
        roomCode,
        circuitId: selectedCircuit.id,
        driverId: selectedDriver.id,
        weather: selectedWeather
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
  
  const handleSubmit = () => {
    if (feedback !== "idle" || gameStatus !== "racing") return;
    
    const val = parseInt(answer);
    if (isNaN(val)) return;
    
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;
    
    // Calculate response time
    const responseTime = Date.now() - questionStartTimeRef.current;
    const difficulty = selectedDriver?.difficulty || 'easy';
    let speed: 'fast' | 'normal' | 'slow';
    
    if (state.simMode) {
      // Realism mode: first 5 questions are calibration (all green)
      const currentQuestionNumber = progress + 1;
      
      if (currentQuestionNumber <= 5) {
        speed = 'fast';
        
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
        const threshold = realismThreshold || 3000;
        speed = responseTime <= threshold ? 'fast' : 'slow';
      }
    } else {
      const fastThreshold = difficulty === 'easy' ? 2000 : difficulty === 'medium' ? 3000 : 4000;
      const slowThreshold = difficulty === 'easy' ? 4000 : difficulty === 'medium' ? 5000 : 7000;
      speed = responseTime < fastThreshold ? 'fast' : responseTime > slowThreshold ? 'slow' : 'normal';
    }
    
    // Purple retention threshold: 3 seconds for all levels
    const purpleThreshold = 3000;
    const isPurpleFast = responseTime < purpleThreshold;
    
    if (val === currentQuestion.answer) {
      setFeedback("correct");
      
      // Determine sector color and purple mode state
      // In realism mode, purple is disabled during calibration (first 5 questions)
      let sectorColor: 'green' | 'purple' | 'yellow' | 'red' = 'green';
      let newPurpleMode = inPurpleMode;
      const currentQuestionNum = progress + 1;
      const isCalibrating = state.simMode && currentQuestionNum <= 5;
      
      if (isCalibrating) {
        // During calibration: all correct answers are green, no purple mode
        sectorColor = 'green';
        newPurpleMode = false;
      } else if (inPurpleMode) {
        // Already in purple mode - must be under purple threshold to maintain
        if (isPurpleFast) {
          sectorColor = 'purple';
        } else {
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
        
        // Include this answer
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
      
      setInPurpleMode(newPurpleMode);
      setLapResults(prev => [...prev, { result: 'correct', speed, sectorColor, responseTime }]);
      
      const newProgress = progress + 1;
      setProgress(newProgress);
      
      // Send progress update
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: "progress_update",
          roomCode,
          progress: newProgress,
          mistakes
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
        }, 400);
      }
    } else {
      setFeedback("incorrect");
      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);
      
      // Break purple mode on incorrect answer
      setInPurpleMode(false);
      
      if (state.simMode) {
        // Realism mode: must answer correctly before continuing
        // Don't advance progress or lapResults, just count the mistake
        // Still apply time penalties (use ref so timer picks it up)
        if (newMistakes <= 2) {
          penaltyTimeRef.current += 2000;
        } else if (newMistakes <= 5) {
          penaltyTimeRef.current += 5000;
        } else if (newMistakes <= 10) {
          penaltyTimeRef.current += 10000;
        }
        
        // Check for crash at 11 mistakes
        if (newMistakes >= 11) {
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
            mistakes: newMistakes
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
    setInPurpleMode(false);
    setRealismThreshold(null);
    setLocation("/");
  };
  
  // Lobby menu - Access Pass Card Design
  if (gameStatus === "lobby") {
    return (
      <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#1a1a1a' }}>
        {/* App Logo */}
        <div className="pt-8 pb-4 flex justify-center shrink-0">
          <Link href="/">
            <img 
              src={logoImage} 
              alt="F1 Math Racer" 
              className="h-8 object-contain cursor-pointer hover:opacity-70 transition-opacity"
            />
          </Link>
        </div>

        {/* Centered Card Container */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        
        {/* Access Pass Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[350px] bg-white rounded-[24px] p-6 sm:p-8"
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
            <p className="text-sm text-gray-500 mt-1">Connect to global server</p>
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
            className="w-full max-w-sm py-4 rounded-xl font-bold text-lg uppercase tracking-wider text-black"
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
  
  // Countdown
  if (gameStatus === "countdown") {
    return (
      <GameLayout coins={state.coins} trackName={selectedCircuit?.name || ""}>
        <div className="flex-1 flex flex-col items-center justify-center gap-8">
          <div className="flex gap-4">
            {[1, 2, 3, 4, 5].map((light) => (
              <motion.div
                key={light}
                initial={{ opacity: 0.3 }}
                animate={{ 
                  opacity: countdownValue <= (6 - light) ? 1 : 0.3,
                  scale: countdownValue <= (6 - light) ? 1 : 0.95
                }}
                className={cn(
                  "w-12 h-12 rounded-full border-4 transition-colors",
                  countdownValue <= (6 - light)
                    ? "bg-red-600 border-red-700 shadow-[0_0_20px_rgba(220,38,38,0.6)]" 
                    : "bg-neutral-200 border-neutral-300"
                )}
              />
            ))}
          </div>
          <p className="text-2xl font-bold">Get Ready!</p>
        </div>
      </GameLayout>
    );
  }
  
  // Racing
  if (gameStatus === "racing") {
    const currentQuestion = questions[currentQuestionIndex];
    
    return (
      <GameLayout coins={state.coins} trackName={selectedCircuit?.name || ""} lockViewport>
        <div className="flex-1 flex flex-col w-full overflow-hidden relative min-h-0">
          {/* Header */}
          <div className="flex justify-between items-center text-sm text-muted-foreground font-medium px-4 py-1">
            <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded">MULTIPLAYER</span>
          </div>

          {/* Main content */}
          <div className="flex flex-col items-center px-4 pt-0">
            <div className="flex items-center gap-2 text-lg sm:text-xl font-mono font-medium text-primary">
              <Timer className="w-4 h-4 sm:w-5 sm:h-5" />
              {formatTime(elapsedTime)}
            </div>
            
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
              {answer || "0"}
            </div>

            <div className="h-4 flex items-center justify-center">
              <AnimatePresence mode="wait">
                {feedback === "correct" && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-green-600 font-medium flex items-center gap-1 text-xs">
                    <Check className="w-3 h-3" /> Correct
                  </motion.div>
                )}
                {feedback === "incorrect" && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-red-600 font-medium flex items-center gap-1 text-xs">
                    <X className="w-3 h-3" /> Wrong
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Dual Progress Bars */}
          <div className="flex-1 flex flex-col justify-center px-4 gap-2">
            {/* Your progress - colored segments */}
            <div>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5 px-1">
                <span className={cn("font-medium", inPurpleMode ? "text-purple-500" : "text-primary")}>
                  You {inPurpleMode && "🔥"}
                </span>
                <span>Lap {progress}/{raceLength}</span>
              </div>
              <div className="relative h-4 bg-muted rounded-full overflow-hidden flex">
                {lapResults.map((lap, index) => {
                  const segmentWidth = 100 / raceLength;
                  const colorClass = 
                    lap.sectorColor === 'purple' ? 'bg-purple-500' :
                    lap.sectorColor === 'green' ? 'bg-green-500' :
                    lap.sectorColor === 'yellow' ? 'bg-yellow-500' :
                    'bg-red-500';
                  return (
                    <motion.div
                      key={index}
                      className={cn("h-full", colorClass)}
                      initial={{ width: 0 }}
                      animate={{ width: `${segmentWidth}%` }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  );
                })}
              </div>
            </div>
            
            {/* Opponent progress */}
            <div>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5 px-1">
                <span className="font-medium text-orange-500">Opponent</span>
                <span>Lap {opponentProgress}/{raceLength}</span>
              </div>
              <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-orange-500 rounded-full"
                  animate={{ width: `${(opponentProgress / raceLength) * 100}%` }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              </div>
            </div>
          </div>

          {/* Keypad */}
          <div className="flex-1 flex flex-col justify-start items-center px-4 min-h-0 pb-16 sm:pb-4">
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full max-w-md">
              {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => { if (feedback === "idle") { playKeypadClick(); setAnswer(prev => prev + num.toString()); } }}
                  className="h-[56px] sm:h-[72px] md:h-[84px] rounded-xl bg-secondary text-secondary-foreground text-2xl sm:text-3xl md:text-4xl font-bold hover:bg-secondary/80 transition-colors active:scale-95"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => { if (feedback === "idle") { playKeypadClick(); setAnswer(prev => prev.slice(0, -1)); } }}
                className="h-[56px] sm:h-[72px] md:h-[84px] rounded-xl bg-muted text-muted-foreground font-bold hover:bg-muted/80 transition-colors active:scale-95 flex items-center justify-center"
              >
                <Delete className="w-6 h-6 sm:w-8 sm:h-8" />
              </button>
              <button
                type="button"
                onClick={() => { if (feedback === "idle") { playKeypadClick(); setAnswer(prev => prev + "0"); } }}
                className="h-[56px] sm:h-[72px] md:h-[84px] rounded-xl bg-secondary text-secondary-foreground text-2xl sm:text-3xl md:text-4xl font-bold hover:bg-secondary/80 transition-colors active:scale-95"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={!answer || feedback !== "idle"}
                className={cn(
                  "h-[56px] sm:h-[72px] md:h-[84px] rounded-xl text-xl sm:text-2xl font-bold transition-colors active:scale-95 flex items-center justify-center",
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
          
          <div className="bg-secondary rounded-xl p-6 w-full max-w-sm">
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
