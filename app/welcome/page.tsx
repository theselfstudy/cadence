"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/stores/useSettings";
import { ModeSelectionModal } from "@/components/welcome/ModeSelectionModal";
import type { OnboardingMode } from "@/types";

// =============================================================================
// FEATURE DATA
// =============================================================================

interface FeatureInfo {
  icon: string;
  label: string;
  description: string;
  bullets: string[];
  color: string;
}

const FEATURES: FeatureInfo[] = [
  {
    icon: "🏷️",
    label: "Log Symptoms",
    description: "Log and monitor symptoms with optional intensity logging.",
    bullets: [
      "Choose from common symptoms or add custom ones",
      "Track intensity using Simple or Mankoski pain scales",
      "See patterns over time in your history",
    ],
    color: "app-teal",
  },
  {
    icon: "🧻",
    label: "Track Bowel Health",
    description: "Track bowel movements using the Bristol Stool Scale.",
    bullets: [
      "Log stool type (1-7 on Bristol Scale)",
      "Record how you feel after",
      "Identify digestive patterns",
    ],
    color: "app-green",
  },
  {
    icon: "🌸",
    label: "See Your Cycles",
    description: "Comprehensive menstrual cycle and period tracking.",
    bullets: [
      "Track cycle phases (menstrual, follicular, ovulation, luteal)",
      "Log flow levels and period products",
      "Add period-specific symptoms",
    ],
    color: "app-red",
  },
  {
    icon: "💊",
    label: "Log Medicine",
    description: "Keep track of medications and supplements.",
    bullets: [
      "Add custom medicine and dosages",
      "Tag each medicine by purpose (symptom, bowel, period, other)",
      "Optional time tracking for time-sensitive meds",
    ],
    color: "app-teal",
  },
  {
    icon: "",
    label: "Insights & Trends",
    description: "See your health data visualized over time.",
    bullets: [
      "Weekly, monthly, and quarterly summaries",
      "Charts showing symptom frequency",
      "Add and save custom filters"
    ],
    color: "app-green",
  },
    {
    icon: "",
    label: "Export & Save",
    description: "Export your data at any time.",
    bullets: [
      "Download all entries as a CSV to your device for safekeeping",
      "Export data based on filters",
    ],
    color: "app-teal",
  },
];

interface PrivacyInfo {
  icon: string;
  label: string;
  description: string;
}

const PRIVACY_POINTS: PrivacyInfo[] = [
  {
    icon: "🚫",
    label: "No Data Storage",
    description: "We don't store your data on our servers. Ever.",
  },
  {
    icon: "🚫",
    label: "No Data Selling",
    description: "Your health information is never sold or shared.",
  },
  {
    icon: "🚫",
    label: "No Account Required",
    description: "Use anonymously or connect your own Google Sheet.",
  },
  {
    icon: "🚫",
    label: "No Tracking",
    description: "No analytics, no ads, no third-party trackers.",
  },
];

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
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-8">
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
            Your highly-customizable personal health tracking companion. Track symptoms, monitor patterns, 
            and gain insights into your wellbeing all in one place.
          </p>
        </div>

        {/* What You Can Track Section */}
        <div className="w-full max-w-2xl mx-auto mb-8">
          <h2 className="text-sm font-semibold text-app-gray uppercase tracking-wide mb-4">
            What You Can Do
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {FEATURES.map((feature) => (
              <FeatureCard key={feature.label} feature={feature} />
            ))}
          </div>
        </div>

        {/* What TrackWell Doesn't Do Section */}
        <div className="w-full max-w-2xl mx-auto mb-10">
          <h2 className="text-sm font-semibold text-app-gray uppercase tracking-wide mb-4">
            Your Privacy Protected
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PRIVACY_POINTS.map((point) => (
              <PrivacyCard key={point.label} point={point} />
            ))}
          </div>
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
      </div>
    </>
  );
}

// =============================================================================
// FEATURE CARD COMPONENT
// =============================================================================

interface FeatureCardProps {
  feature: FeatureInfo;
}

function FeatureCard({ feature }: FeatureCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Determine if we should show expanded content
  const showContent = isExpanded || isHovered;

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full p-4 bg-app-white rounded-lg border-2 transition-all text-left ${
          showContent
            ? `border-${feature.color} shadow-md`
            : "border-app-border hover:border-app-green/50"
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl block mb-1">{feature.icon}</span>
            <span className="text-sm text-app-charcoal font-medium">{feature.label}</span>
          </div>
          <svg
            className={`w-4 h-4 text-app-gray transition-transform ${
              showContent ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Expanded Content */}
        <div
          className={`overflow-hidden transition-all duration-200 ${
            showContent ? "max-h-48 mt-3 pt-3 border-t border-app-border" : "max-h-0"
          }`}
        >
          <p className="text-xs text-app-gray mb-2">{feature.description}</p>
          <ul className="space-y-1">
            {feature.bullets.map((bullet, idx) => (
              <li key={idx} className="text-xs text-app-charcoal flex items-start gap-1.5">
                <span className="text-app-green mt-0.5">•</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      </button>
    </div>
  );
}

// =============================================================================
// PRIVACY CARD COMPONENT
// =============================================================================

interface PrivacyCardProps {
  point: PrivacyInfo;
}

function PrivacyCard({ point }: PrivacyCardProps) {
  return (
    <div className="p-3 bg-app-cream rounded-lg border border-app-border text-center">
      <span className="text-xl block mb-1">{point.icon}</span>
      <span className="text-xs text-app-charcoal font-medium block">{point.label}</span>
      <p className="text-[10px] text-app-gray mt-1 leading-tight">{point.description}</p>
    </div>
  );
}