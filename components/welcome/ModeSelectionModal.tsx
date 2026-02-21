"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OnboardingMode } from "@/types";

// =============================================================================
// ICONS
// =============================================================================

const CloudIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
    />
  </svg>
);

const UserIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

// =============================================================================
// COMPONENT
// =============================================================================

type SelectedOption = "google-sheet" | "restore" | "anonymous";

interface ModeSelectionModalProps {
  onSelect: (mode: OnboardingMode) => void;
  onCancel: () => void;
}

export function ModeSelectionModal({ onSelect, onCancel }: ModeSelectionModalProps) {
  const [selectedOption, setSelectedOption] = useState<SelectedOption | null>(null);
  const router = useRouter();

  const handleContinue = () => {
    if (!selectedOption) return;

    if (selectedOption === "restore") {
      router.push("/recover");
    } else {
      onSelect(selectedOption);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-app-white p-6 rounded-xl shadow-xl max-w-lg w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-app-charcoal">
            How would you like to use Cadence?
          </h2>
          <p className="text-sm text-app-gray mt-2">
            Choose how you want to store your health data
          </p>
        </div>

        {/* Mode Options */}
        <div className="space-y-3">
          {/* New User - Google Sheet Option */}
          <label
            className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
              selectedOption === "google-sheet"
                ? "border-app-green bg-app-green/5"
                : "border-app-border hover:border-app-green/50"
            }`}
          >
            <div className="flex items-start gap-4">
              <input
                type="radio"
                name="onboarding-mode"
                value="google-sheet"
                checked={selectedOption === "google-sheet"}
                onChange={() => setSelectedOption("google-sheet")}
                className="mt-1 w-4 h-4 text-app-green focus:ring-app-green"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-app-green">
                    <CloudIcon />
                  </span>
                  <span className="font-semibold text-app-charcoal">
                    New User - Signed In & Synced Mode
                  </span>
                </div>
                <p className="text-sm text-app-gray mt-1">
                  Connect a Google Sheet to backup and sync your data across devices.
                  Your settings and entries are saved securely to your own spreadsheet.
                </p>
              </div>
            </div>
          </label>

          {/* Existing User - Restore Option */}
          <label
            className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
              selectedOption === "restore"
                ? "border-app-teal bg-app-teal/5"
                : "border-app-border hover:border-app-teal/50"
            }`}
          >
            <div className="flex items-start gap-4">
              <input
                type="radio"
                name="onboarding-mode"
                value="restore"
                checked={selectedOption === "restore"}
                onChange={() => setSelectedOption("restore")}
                className="mt-1 w-4 h-4 text-app-teal focus:ring-app-teal"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-app-teal">
                    <RefreshIcon />
                  </span>
                  <span className="font-semibold text-app-charcoal">
                    Existing User - Restore Data & Settings
                  </span>
                </div>
                <p className="text-sm text-app-gray mt-1">
                  Already set up? If you&apos;re connecting a sheet with existing
                  Cadence data, restore your settings and entries here.
                </p>
              </div>
            </div>
          </label>

          {/* Anonymous Option */}
          <label
            className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
              selectedOption === "anonymous"
                ? "border-app-gray bg-app-gray/5"
                : "border-app-border hover:border-app-gray/50"
            }`}
          >
            <div className="flex items-start gap-4">
              <input
                type="radio"
                name="onboarding-mode"
                value="anonymous"
                checked={selectedOption === "anonymous"}
                onChange={() => setSelectedOption("anonymous")}
                className="mt-1 w-4 h-4 text-app-gray focus:ring-app-gray"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-app-gray">
                    <UserIcon />
                  </span>
                  <span className="font-semibold text-app-charcoal">
                    Anonymous Mode
                  </span>
                </div>
                <p className="text-sm text-app-gray mt-1">
                  Keep your data stored locally on this device only.
                  No sign-in required. Get started quickly and privately.
                </p>
                <p className="text-xs text-app-gray/70 mt-2 italic">
                  You can connect a Google Sheet later anytime.
                </p>
              </div>
            </div>
          </label>
        </div>

        {/* Info Note */}
        <div className="p-3 bg-app-cream rounded-lg border border-app-border">
          <p className="text-xs text-app-gray">
            💡 You can change this later in Settings. Both modes let you track the same health data.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleContinue}
            disabled={!selectedOption}
            className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
              selectedOption
                ? "bg-app-green text-white hover:bg-app-green-dark"
                : "bg-app-gray/30 text-app-gray cursor-not-allowed"
            }`}
          >
            Continue
          </button>
          <button
            onClick={onCancel}
            className="w-full py-2 px-4 text-sm text-app-gray hover:text-app-charcoal transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModeSelectionModal;
