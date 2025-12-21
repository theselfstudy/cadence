"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/stores/useSettings";

/**
 * Tutorial steps configuration
 * Each step has an id, title, description, and optional illustration
 */
const TUTORIAL_STEPS = [
  {
    id: "welcome",
    title: "Welcome to TrackWell! ✿",
    description:
      "Let's take a quick tour of how to create your first health entry. This will only take a minute!",
    illustration: "welcome",
  },
  {
    id: "time",
    title: "⏱️ Recording Time",
    description:
      "Each entry starts and ends with a time. Use the hour and minute inputs to set when your bowel movement began. Tip: Tap the 'Now' button to quickly fill in the current time!",
    illustration: "time",
  },
  {
    id: "bristol",
    title: "💩 Bristol Stool Scale",
    description:
      "Select the type (1-7) that best matches your stool. Then mark down how you felt afterward. You have multiple options like complete relief, discomfort, etc. This helps track your digestive patterns over time.",
    illustration: "bristol",
    condition: "stoolTracking",
  },
  {
    id: "symptoms",
    title: "🏷️ Tracking Symptoms",
    description:
      "Select any symptoms you're experiencing by tapping on them. If you enabled intensity tracking, you can also rate how severe each symptom feels using a slider.",
    illustration: "symptoms",
  },
  {
    id: "period",
    title: "🌸 Period Tracking",
    description:
      "If you're tracking your menstrual cycle, select your current phase: Menstrual, Follicular, Ovulation, or Luteal. During menstruation, you can also log flow level and pain intensity.",
    illustration: "period",
    condition: "periodTracking",
  },
  {
    id: "notes",
    title: "📝 Notes & End Time",
    description:
      "Add any additional observations in the Notes section like what you ate, how you're feeling, etc. in case you want to bring something up to your doctor at a later date. Don't forget to set your End Time before submitting!",
    illustration: "notes",
  },
  {
    id: "submit",
    title: "✓ Saving Your Entry",
    description:
      "When you're done, tap 'Submit Entry' to save your data. You can view all your entries on the Dashboard and analyze patterns over time.",
    illustration: "submit",
  },
  {
    id: "done",
    title: "🎉 You're All Set!",
    description:
      "That's everything you need to know! You're ready to start tracking. Remember, you can always adjust your preferences in Settings.",
    illustration: "done",
  },
];

export default function TutorialPage() {
  const router = useRouter();
  const { periodTracking, stoolTracking, completeTutorial } = useSettings();
  const [currentStep, setCurrentStep] = useState(0);

  // Filter steps based on user settings
  const activeSteps = TUTORIAL_STEPS.filter((step) => {
    if (!step.condition) return true;
    if (step.condition === "periodTracking") return periodTracking?.enabled;
    if (step.condition === "stoolTracking") return stoolTracking?.enabled;
    return true;
  });

  const totalSteps = activeSteps.length;
  const step = activeSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  const handleNext = () => {
    if (isLastStep) {
      completeTutorial();
      router.push("/entry");
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    completeTutorial();
    router.push("/entry");
  };

  return (
    <div className="min-h-[80vh] flex flex-col">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-app-gray">
            Step {currentStep + 1} of {totalSteps}
          </span>
          <button
            onClick={handleSkip}
            className="text-sm text-app-gray hover:text-app-charcoal transition-colors"
          >
            Skip tutorial
          </button>
        </div>
        <div className="h-2 bg-app-border rounded-full overflow-hidden">
          <div
            className="h-full bg-app-green transition-all duration-300 ease-out"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Main content card */}
      <div className="flex-1 flex flex-col">
        <div className="card flex-1 flex flex-col">
          {/* Illustration */}
          <div className="flex-1 flex items-center justify-center py-8">
            <TutorialIllustration type={step.illustration} />
          </div>

          {/* Text content */}
          <div className="text-center pb-6">
            <h1 className="text-2xl font-bold text-app-charcoal mb-4">
              {step.title}
            </h1>
            <p className="text-app-gray max-w-md mx-auto leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 pb-6">
            {activeSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  index === currentStep
                    ? "bg-app-green"
                    : index < currentStep
                    ? "bg-app-green/50"
                    : "bg-app-border"
                }`}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={handleBack}
            disabled={isFirstStep}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              isFirstStep
                ? "text-app-border cursor-not-allowed"
                : "text-app-gray hover:text-app-charcoal hover:bg-app-cream"
            }`}
          >
            ← Back
          </button>

          <button
            onClick={handleNext}
            className="px-8 py-3 rounded-lg font-semibold bg-app-green text-white hover:bg-app-green-dark transition-colors"
          >
            {isLastStep ? "Start Tracking →" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Illustration Component
// ============================================

interface TutorialIllustrationProps {
  type: string;
}

function TutorialIllustration({ type }: TutorialIllustrationProps) {
  // Simple illustrations using emojis and styled divs
  // You can replace these with actual images/SVGs later

  const illustrations: Record<string, React.ReactNode> = {
    welcome: (
      <div className="text-center">
        <div className="text-8xl mb-4">✿</div>
        <div className="flex items-center justify-center gap-2">
          <span 
            className="w-3 h-3 rounded-full bg-app-green"
            style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
          />
          <span 
            className="w-3 h-3 rounded-full bg-app-teal"
            style={{ animation: 'pulse 1.5s ease-in-out 0.2s infinite' }}
          />
          <span 
            className="w-3 h-3 rounded-full bg-app-red"
            style={{ animation: 'pulse 1.5s ease-in-out 0.4s infinite' }}
          />
        </div>
      </div>
    ),

    time: (
      <div className="flex items-center gap-3 p-6 bg-app-cream rounded-xl">
        <div className="flex items-center gap-2">
          <div className="w-16 h-12 bg-app-white rounded-lg border-2 border-app-border flex items-center justify-center font-mono text-xl text-app-charcoal">
            09
          </div>
          <span className="text-2xl text-app-gray">:</span>
          <div className="w-16 h-12 bg-app-white rounded-lg border-2 border-app-border flex items-center justify-center font-mono text-xl text-app-charcoal">
            30
          </div>
          <div className="w-16 h-12 bg-app-white rounded-lg border-2 border-app-border flex items-center justify-center text-sm font-medium text-app-charcoal">
            AM
          </div>
        </div>
        <div className="px-4 py-2 bg-app-green text-white rounded-lg text-sm font-medium">
          Now
        </div>
      </div>
    ),

    bristol: (
      <div className="p-6 bg-app-cream rounded-xl space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl">💩</span>
          <div className="flex-1">
            <div className="h-10 bg-app-white rounded-lg border-2 border-app-border flex items-center px-4 text-app-gray">
              Select type (1-7)...
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <div
              key={n}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                n === 4
                  ? "bg-app-green text-white"
                  : "bg-app-white border border-app-border text-app-gray"
              }`}
            >
              {n}
            </div>
          ))}
        </div>
      </div>
    ),

    period: (
      <div className="p-6 bg-app-cream rounded-xl">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-3xl">🌸</span>
          <span className="font-medium text-app-charcoal">Cycle Phase</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {["Menstrual", "Follicular", "Ovulation", "Luteal"].map((phase, i) => (
            <div
              key={phase}
              className={`px-3 py-2 rounded-lg text-sm font-medium text-center ${
                i === 0
                  ? "bg-app-red text-white"
                  : "bg-app-white border border-app-border text-app-gray"
              }`}
            >
              {phase}
            </div>
          ))}
        </div>
      </div>
    ),

    symptoms: (
      <div className="p-6 bg-app-cream rounded-xl">
        <div className="flex flex-wrap gap-2 mb-4">
          {["Bloating", "Cramps", "Fatigue", "Nausea"].map((symptom, i) => (
            <div
              key={symptom}
              className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                i < 2
                  ? "bg-app-green text-white"
                  : "bg-app-white border border-app-border text-app-gray"
              }`}
            >
              {symptom}
            </div>
          ))}
        </div>
        <div className="bg-app-white rounded-lg p-3 border border-app-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-app-gray">Intensity</span>
            <span className="text-xs font-medium text-app-green">5 / 10</span>
          </div>
          <div className="h-2 bg-app-border rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-app-green rounded-full" />
          </div>
        </div>
      </div>
    ),

    notes: (
      <div className="p-6 bg-app-cream rounded-xl space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📝</span>
          <span className="font-medium text-app-charcoal">Notes</span>
        </div>
        <div className="bg-app-white rounded-lg p-4 border border-app-border min-h-[80px]">
          <p className="text-app-gray text-sm italic">
            Had coffee this morning. Feeling better than yesterday...
          </p>
        </div>
      </div>
    ),

    submit: (
      <div className="p-6 bg-app-cream rounded-xl text-center">
        <div className="w-20 h-20 bg-app-green rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-10 h-10 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <div className="px-8 py-3 bg-app-green text-white rounded-lg font-semibold inline-block">
          Submit Entry
        </div>
      </div>
    ),

    done: (
      <div className="text-center">
        <div className="text-8xl mb-4">🎉</div>
        <div className="flex items-center justify-center gap-3">
          <span className="text-4xl">📝</span>
          <span className="text-4xl">→</span>
          <span className="text-4xl">📊</span>
        </div>
      </div>
    ),
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      {illustrations[type] || illustrations.welcome}
    </div>
  );
}