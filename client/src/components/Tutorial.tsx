import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Play, Target, Zap, Trophy, Users } from "lucide-react";

interface TutorialProps {
  onComplete: () => void;
}

const TUTORIAL_STEPS = [
  {
    icon: Play,
    title: "Welcome to Math Racer!",
    description: "Race through math problems as fast as you can. Answer correctly to zoom ahead!",
    color: "text-red-500"
  },
  {
    icon: Target,
    title: "Choose Your Level",
    description: "Pick Rookie for easier problems, Pro for medium, or Champion for the toughest math challenges.",
    color: "text-green-500"
  },
  {
    icon: Zap,
    title: "Go Purple!",
    description: "Answer 5 questions correctly in under 2 seconds each to activate Purple Mode - the fastest streak!",
    color: "text-purple-500"
  },
  {
    icon: Trophy,
    title: "Earn Pit Coins",
    description: "Win races to earn Pit Coins. Spend them in the Garage to unlock cool car colors and tires!",
    color: "text-yellow-500"
  },
  {
    icon: Users,
    title: "Race Friends!",
    description: "Challenge a friend to a 1v1 race! Share your room code and race head-to-head in real-time.",
    color: "text-blue-500"
  }
];

export function Tutorial({ onComplete }: TutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const step = TUTORIAL_STEPS[currentStep];
  const Icon = step.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      data-testid="tutorial-overlay"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card border border-border rounded-2xl max-w-md w-full p-6 relative"
      >
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-2 hover:bg-secondary rounded-full transition-colors"
          data-testid="button-skip-tutorial"
        >
          <X className="w-5 h-5" />
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center text-center"
          >
            <div className={`w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-6 ${step.color}`}>
              <Icon className="w-10 h-10" />
            </div>
            
            <h2 className="text-2xl font-bold mb-3">{step.title}</h2>
            <p className="text-muted-foreground mb-8">{step.description}</p>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-center gap-2 mb-6">
          {TUTORIAL_STEPS.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentStep ? "bg-primary" : "bg-secondary"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="flex items-center gap-1 px-4 py-2 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            data-testid="button-prev-step"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          
          <button
            onClick={handleNext}
            className="flex items-center gap-1 px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-all"
            data-testid="button-next-step"
          >
            {currentStep === TUTORIAL_STEPS.length - 1 ? "Start Racing!" : "Next"}
            {currentStep < TUTORIAL_STEPS.length - 1 && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
