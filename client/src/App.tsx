import { useState, useEffect, useRef } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ErrorBoundary";
import { PurchaseProvider } from "@/contexts/PurchaseContext";
import { useGameState } from "@/lib/gameLogic";
import laneRacerMusic from "@assets/laneracer3.mp3";
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
      <Route component={NotFound} />
    </Switch>
  );
}

const MENU_ROUTES = ['/', '/hub', '/game', '/strategy', '/reaction', '/regulations', '/racer-log', '/leaderboard', '/gp-leaderboard', '/lane-racer', '/multiplayer'];

function MenuMusic() {
  const [location] = useLocation();
  const { state } = useGameState();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [userInteracted, setUserInteracted] = useState(false);

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
    if (isMenu && state.soundEnabled && userInteracted) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [location, state.soundEnabled, userInteracted]);

  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <PurchaseProvider>
          <TooltipProvider>
            <Toaster />
            <MenuMusic />
            <Router />
          </TooltipProvider>
        </PurchaseProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
