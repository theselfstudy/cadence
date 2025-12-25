"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/stores/useSettings";
import { ModeSelectionModal } from "@/components/welcome/ModeSelectionModal";
import type { OnboardingMode } from "@/types";

// =============================================================================
// WELCOME PAGE COMPONENT
// =============================================================================

export default function WelcomePage() {
  const router = useRouter();
  const { setupComplete, tutorialComplete } = useSettings();
  
  const [showModeModal, setShowModeModal] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Handle hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Redirect existing users away from welcome page
  useEffect(() => {
    if (isClient && (setupComplete || tutorialComplete)) {
      router.replace("/dashboard");
    }
  }, [isClient, setupComplete, tutorialComplete, router]);

  // Handle mode selection
  const handleModeSelect = (mode: OnboardingMode) => {
    setShowModeModal(false);
    // Navigate to settings with the selected mode as a URL parameter
    router.push(`/settings?onboardingMode=${mode}`);
  };

  // Show loading state during hydration or redirect
  if (!isClient || setupComplete || tutorialComplete) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-16 h-16 rounded-full bg-app-green/20 mx-auto mb-4" />
          <div className="h-4 w-32 bg-app-border rounded mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mode Selection Modal */}
      {showModeModal && (
        <ModeSelectionModal
          onSelect={handleModeSelect}
          onCancel={() => setShowModeModal(false)}
        />
      )}

      {/* Welcome Content */}
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
        {/* Logo */}
        <div className="mb-8">
          <div className="w-24 h-24 rounded-full bg-app-green flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white text-5xl">✿</span>
          </div>
          <h1 className="text-3xl font-bold text-app-charcoal">
            Welcome to TrackWell
          </h1>
        </div>

        {/* Description */}
        <div className="max-w-md mx-auto mb-8">
          <p className="text-lg text-app-gray leading-relaxed">
            Your personal health tracking companion. Track symptoms, monitor patterns, 
            and gain insights into your wellbeing — all in one place.
          </p>
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-10">
          <FeatureCard icon="🏷️" label="Symptom Tracking" />
          <FeatureCard icon="🧻" label="Bowel Health" />
          <FeatureCard icon="🌸" label="Cycle Logging" />
          <FeatureCard icon="💊" label="Medicine Log" />
        </div>

        {/* CTA Button */}
        <button
          onClick={() => setShowModeModal(true)}
          className="px-8 py-4 bg-app-green text-white font-semibold rounded-xl hover:bg-app-green-dark transition-colors shadow-md hover:shadow-lg flex items-center gap-2"
        >
          Get Started
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </button>

        {/* Privacy Note */}
        <p className="text-xs text-app-gray mt-6 max-w-xs">
          Your data stays yours. Choose to keep it local or sync to your own Google Sheet.
        </p>
      </div>
    </>
  );
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

interface FeatureCardProps {
  icon: string;
  label: string;
}

function FeatureCard({ icon, label }: FeatureCardProps) {
  return (
    <div className="p-4 bg-app-white rounded-lg border border-app-border">
      <span className="text-2xl block mb-1">{icon}</span>
      <span className="text-sm text-app-charcoal font-medium">{label}</span>
    </div>
  );
}