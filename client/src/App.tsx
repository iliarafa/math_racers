import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Welcome from "@/pages/Welcome";
import Game from "@/pages/Game";
import Garage from "@/pages/Garage";
import ReactionTest from "@/pages/ReactionTest";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Welcome} />
      <Route path="/game" component={Game} />
      <Route path="/garage" component={Garage} />
      <Route path="/reaction" component={ReactionTest} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
