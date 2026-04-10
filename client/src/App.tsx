import { useState, useEffect, useRef } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ErrorBoundary";
import { PurchaseProvider } from "@/contexts/PurchaseContext";
import { useGameState } from "@/lib/gameLogic";
import { Volume2, VolumeX } from "lucide-react";
import laneRacerMusic from "@assets/laneracer3.mp3";
import backgroundVideo from "@assets/background.mp4";
import NotFound from "@/pages/not-found";
import Welcome from "@/pages/Welcome";
import Game from "@/pages/Game";
import Garage from "@/pages/Garage";
import StrategyGuide from "@/pages/StrategyGuide";
import ReactionTest from "@/pages/ReactionTest";
import Multiplayer from "@/pages/Multiplayer";
import Regulations from "@/pages/Regulations";
import RacerLog from "@/pages/RacerLog";
import Leaderboard from "@/pages/Leaderboard";
import GPLeaderboard from "@/pages/GPLeaderboard";
import LaneRacer from "@/pages/LaneRacer";
// import DeployHarvest from "@/pages/DeployHarvest"; // archived — re-enable later
import Hub from "@/pages/Hub";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Welcome} />
      <Route path="/hub" component={Hub} />
      <Route path="/game" component={Game} />
      <Route path="/garage" component={Garage} />
      <Route path="/strategy" component={StrategyGuide} />
      <Route path="/reaction" component={ReactionTest} />
      <Route path="/multiplayer" component={Multiplayer} />
      <Route path="/regulations" component={Regulations} />
      <Route path="/racer-log" component={RacerLog} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/gp-leaderboard" component={GPLeaderboard} />
      <Route path="/lane-racer" component={LaneRacer} />
      {/* <Route path="/deploy-harvest" component={DeployHarvest} /> archived — re-enable later */}
      <Route component={NotFound} />
    </Switch>
  );
}

const MENU_ROUTES = ['/', '/hub', '/game', '/strategy', '/regulations', '/racer-log', '/leaderboard', '/gp-leaderboard', '/lane-racer', '/multiplayer'];
const VIDEO_ROUTES = ['/hub', '/game', '/lane-racer'];

function PersistentVideo() {
  const [location] = useLocation();
  const [isRacing, setIsRacing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handler = (e: Event) => setIsRacing((e as CustomEvent).detail.racing);
    window.addEventListener('racingStateChange', handler);
    return () => window.removeEventListener('racingStateChange', handler);
  }, []);

  const visible = VIDEO_ROUTES.includes(location) && !isRacing;

  useEffect(() => {
    if (visible && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [visible]);

  return (
    <div className={`fixed inset-0 z-0 bg-black ${visible ? '' : 'hidden'}`}>
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-cover opacity-40"
      >
        <source src={backgroundVideo} type="video/mp4" />
      </video>
    </div>
  );
}

function MenuMusic() {
  const [location] = useLocation();
  const { state, toggleSound } = useGameState();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [userInteracted, setUserInteracted] = useState(false);
  const [isRacing, setIsRacing] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => setIsRacing((e as CustomEvent).detail.racing);
    window.addEventListener('racingStateChange', handler);
    return () => window.removeEventListener('racingStateChange', handler);
  }, []);

  useEffect(() => {
    const audio = new Audio(laneRacerMusic);
    audio.loop = true;
    audioRef.current = audio;
    return () => { audio.pause(); audio.currentTime = 0; audioRef.current = null; };
  }, []);

  useEffect(() => {
    const handler = () => setUserInteracted(true);
    window.addEventListener('touchstart', handler, { once: true });
    window.addEventListener('click', handler, { once: true });
    return () => { window.removeEventListener('touchstart', handler); window.removeEventListener('click', handler); };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const isMenu = MENU_ROUTES.includes(location);
    if (isMenu && state.soundEnabled && userInteracted && !isRacing) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [location, state.soundEnabled, userInteracted, isRacing]);

  return (
    <button
      onClick={toggleSound}
      className="fixed z-50 p-2 opacity-30 hover:opacity-60 transition-opacity"
      style={{ top: 'calc(env(safe-area-inset-top) + 14px)', right: '16px' }}
    >
      {state.soundEnabled ? (
        <Volume2 className="w-5 h-5 text-white" />
      ) : (
        <VolumeX className="w-5 h-5 text-white" />
      )}
    </button>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <PurchaseProvider>
          <TooltipProvider>
            <Toaster />
            <MenuMusic />
            <PersistentVideo />
            <Router />
          </TooltipProvider>
        </PurchaseProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
