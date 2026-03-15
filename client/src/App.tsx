import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ErrorBoundary";
import { PurchaseProvider } from "@/contexts/PurchaseContext";
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

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <PurchaseProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </PurchaseProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
