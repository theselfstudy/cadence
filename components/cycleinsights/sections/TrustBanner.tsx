// /components/cycleinsights/sections/TrustBanner.tsx
"use client";

import { useMemo } from "react";
import type { StoredEntry } from "@/types";
import type { DetectedCycle } from "@/lib/monthlyUtils";

// ============================================
// TRUST BANNER
// Establishes transparency and privacy context
// Always visible at top of Cycle Insights page
// ============================================

interface TrustBannerProps {
  /** All detected cycles */
  cycles: DetectedCycle[];
  
  /** All stored entries */
  entries: StoredEntry[];
  
  /** Whether user has connected a Google Sheet */
  isGoogleSheetConnected: boolean; 
}

export function TrustBanner({
  cycles,
  entries,
  isGoogleSheetConnected,
}: TrustBannerProps) {
  // ============================================
  // CALCULATIONS
  // ============================================
  
  const bannerData = useMemo(() => {
    // Count complete vs ongoing cycles
    const completeCycles = cycles.filter(c => !c.isOngoing);
    const ongoingCycle = cycles.find(c => c.isOngoing);
    
    // Get date range from entries
    const sortedDates = entries
      .map(e => e.date)
      .sort((a, b) => a.localeCompare(b));
    
    const dateRange = sortedDates.length >= 1
      ? {
          start: sortedDates[0],
          end: sortedDates[sortedDates.length - 1],
        }
      : null;
    
    // Determine if there is enough data for deep insights
    const hasEnoughData = completeCycles.length >= 2;
    
    return {
      completeCycleCount: completeCycles.length,
      hasOngoingCycle: !!ongoingCycle,
      dateRange,
      entryCount: entries.length,
      hasEnoughData,
    };
  }, [cycles, entries]);

  // ============================================
  // DATE FORMATTING
  // ============================================
  
  const formatDate = (dateStr: string): string => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateRange = (): string => {
    if (!bannerData.dateRange) return "";
    
    const start = formatDate(bannerData.dateRange.start);
    const end = formatDate(bannerData.dateRange.end);
    
    // If same date, just show one
    if (bannerData.dateRange.start === bannerData.dateRange.end) {
      return start;
    }
    
    return `${start} – ${end}`;
  };

  // ============================================
  // CYCLE COUNT TEXT
  // ============================================
  
  const getCycleCountText = (): string => {
    const { completeCycleCount, hasOngoingCycle } = bannerData;
    
    if (completeCycleCount === 0 && hasOngoingCycle) {
      return "1 ongoing cycle";
    }
    
    if (completeCycleCount === 0 && !hasOngoingCycle) {
      return "No cycles detected yet";
    }
    
    const completeText = `${completeCycleCount} complete cycle${completeCycleCount !== 1 ? "s" : ""}`;
    
    if (hasOngoingCycle) {
      return `${completeText} + 1 ongoing`;
    }
    
    return completeText;
  };

  // ============================================
  // STORAGE LOCATION TEXT
  // ============================================
  
  const getStorageText = (): string => {
    if (isGoogleSheetConnected) {
      return "Everything stays on your Google Sheet.";
    }
    return "Everything stays on your device.";
  };

  // ============================================
  // RENDER: EARLY DATA VARIANT
  // Shown when < 2 complete cycles
  // ============================================
  
  if (!bannerData.hasEnoughData) {
    return (
      <div className="bg-gradient-to-br from-app-cream to-app-white rounded-xl border border-app-border p-5 shadow-sm">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-app-teal/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xl" role="img" aria-label="Growing">🌱</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-app-charcoal">
              Building your patterns
            </h2>
            <p className="text-sm text-app-gray mt-0.5">
              {getCycleCountText()}
              {bannerData.entryCount > 0 && (
                <> · {bannerData.entryCount} {bannerData.entryCount === 1 ? "entry" : "entries"}</>
              )}
            </p>
          </div>
        </div>

        {/* Progress message */}
        <div className="bg-app-white/70 rounded-lg p-4 mb-4">
          <p className="text-sm text-app-charcoal leading-relaxed">
            You'll see basic summaries once a period has been logged. After{" "}
            <span className="font-medium text-app-teal">2+ complete cycles</span>, 
            deeper patterns will emerge.
          </p>
          
          {/* Visual progress indicator */}
          <div className="flex items-center gap-2 mt-3">
            <div className="flex gap-1">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    i < bannerData.completeCycleCount
                      ? "bg-app-teal"
                      : "bg-app-border"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-app-gray">
              {bannerData.completeCycleCount} of 2 cycles for deeper insights
            </span>
          </div>
        </div>

        {/* Privacy footer */}
        <PrivacyFooter 
          storageText={getStorageText()} 
          variant="compact" 
        />
      </div>
    );
  }

  // ============================================
  // RENDER: STANDARD VARIANT
  // Shown when >= 2 complete cycles
  // ============================================
  
  return (
    <div className="bg-gradient-to-br from-app-cream to-app-white rounded-xl border border-app-border p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-app-teal/10 flex items-center justify-center flex-shrink-0">
          <span className="text-xl" role="img" aria-label="Lock">🔒</span>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-app-charcoal">
            Your data, your patterns
          </h2>

          {/* Helper function to join parts with separators dynamically */}
          {/* Desktop */}
          <p className="text-sm text-app-gray mt-0.5 hidden md:flex md:items-center md:gap-1.5 md:whitespace-nowrap">
            {[
              bannerData.dateRange ? formatDateRange() : null,
              bannerData.entryCount > 0
                ? `${bannerData.entryCount} ${bannerData.entryCount === 1 ? "entry" : "entries"}`
                : null,
              getCycleCountText(),
            ]
              .filter(Boolean)
              .map((part, idx) => (
                <span key={idx}>
                  {idx > 0 && <>· </>}
                  {part}
                </span>
              ))}
          </p>

          {/* Mobile */}
          <p className="text-sm text-app-gray mt-0.5 flex flex-col md:hidden">
            {[
              [
                bannerData.dateRange ? formatDateRange() : null,
                bannerData.entryCount > 0
                  ? `${bannerData.entryCount} ${bannerData.entryCount === 1 ? "entry" : "entries"}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · "),
              getCycleCountText(),
            ].map((line, idx) => (
              <span key={idx}>{line}</span>
            ))}
          </p>
        </div>
      </div>

      {/* Main message */}
      <div className="bg-app-white/70 rounded-lg p-4 mb-4">
        <p className="text-sm text-app-charcoal leading-relaxed">
          Insights only come from your logged entries.{" "}
        </p>
      </div>

      {/* Privacy footer */}
      <PrivacyFooter 
        storageText={getStorageText()} 
        variant="full" 
      />
    </div>
  );
}

// ============================================
// PRIVACY FOOTER SUB-COMPONENT
// Shows privacy assurances
// ============================================

interface PrivacyFooterProps {
  storageText: string;
  variant: "compact" | "full";
}

// In TrustBanner.tsx, find and replace the PrivacyFooter component:

function PrivacyFooter({ storageText, variant }: PrivacyFooterProps) {
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2 text-xs text-app-gray">
        <LockIcon className="w-3.5 h-3.5 text-app-teal" />
        <span>{storageText}</span>
      </div>
    );
  }

  // Full variant with all privacy points - UPDATED: centered and evenly spaced
  return (
    <div className="flex items-center justify-center gap-8 sm:gap-12">
      <PrivacyPoint
        icon={<ServerOffIcon className="w-4 h-4" />}
        text="No server storage"
      />
      <PrivacyPoint
        icon={<ShieldIcon className="w-4 h-4" />}
        text="No data sharing"
      />
      <PrivacyPoint
        icon={<EyeOffIcon className="w-4 h-4" />}
        text="No tracking"
      />
    </div>
  );
}

// ============================================
// PRIVACY POINT SUB-COMPONENT
// Individual privacy assurance item
// ============================================

interface PrivacyPointProps {
  icon: React.ReactNode;
  text: string;
}

function PrivacyPoint({ icon, text }: PrivacyPointProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-app-gray">
      <div className="text-app-teal">
        {icon}
      </div>
      <span>{text}</span>
    </div>
  );
}

// ============================================
// ICON COMPONENTS
// Simple inline SVG icons
// ============================================

function LockIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
      />
    </svg>
  );
}

function ServerOffIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" 
      />
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M3 3l18 18" 
      />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" 
      />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" 
      />
    </svg>
  );
}

// ============================================
// MINIMAL VARIANT (for compact spaces)
// Can be used as a one-liner if needed
// ============================================

interface TrustBannerMinimalProps {
  cycleCount: number;
  isGoogleSheetConnected: boolean;
}

export function TrustBannerMinimal({
  cycleCount,
  isGoogleSheetConnected,
}: TrustBannerMinimalProps) {
  const storageLocation = isGoogleSheetConnected ? "your Google Sheet" : "your device";
  
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-app-cream/50 rounded-lg text-xs text-app-gray">
      <div className="flex items-center gap-2">
        <LockIcon className="w-3.5 h-3.5 text-app-teal" />
        <span>
          Based on {cycleCount} cycle{cycleCount !== 1 ? "s" : ""} · 
          Stored on {storageLocation}
        </span>
      </div>
      <span className="text-app-teal font-medium">
        Your data only
      </span>
    </div>
  );
}