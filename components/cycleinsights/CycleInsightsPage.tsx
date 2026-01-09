"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import { useEntries } from "@/stores/useEntries";
import { useSettings } from "@/stores/useSettings";
import type { StoredEntry } from "@/types";
import type { 
  DetectedCycle, 
  CycleComparison, 
  CyclePhaseSymptomData 
} from "@/lib/monthlyUtils";
import { 
  detectCycleBoundaries, 
  compareCycles, 
  buildCyclePhaseSymptomHeatMap 
} from "@/lib/monthlyUtils";

import { TrustBanner } from "./sections/TrustBanner";
import { ThisCycleSection } from "./sections/ThisCycleSection";
import { ConsistentPatternsSection } from "./sections/ConsistentPatternsSection";
import { DetailedViewsSection } from "./sections/DetailedViewsSection";
import { CollapsibleSection, DismissibleSection } from "./shared/CollapsibleSection";
import { CycleProgressRing } from "./shared/RingIndicator";
import { calculateConsistentPatterns } from "@/lib/insightUtils";
// ============================================
// TYPES
// ============================================

interface SectionPreferences {
  collapsedSections: string[];
  reflectSectionHidden: boolean;
}

// ============================================
// CYCLE INSIGHTS PAGE
// Main container for all cycle insight sections
// Single scrollable page with collapsible sections
// ============================================

export function CycleInsightsPage() {
  // ============================================
  // DATA FROM STORES
  // ============================================
  
  const entries = useEntries((state) => state.entries);
  const isGoogleSheetConnected = useSettings((state) => state.isGoogleSheetConnected);
  const periodTracking = useSettings((state) => state.periodTracking);
  
  // ============================================
  // SECTION PREFERENCES (LOCAL STATE FOR NOW)
  // Will be moved to settings store in Phase 4
  // ============================================
  
  const [sectionPreferences, setSectionPreferences] = useState<SectionPreferences>({
    collapsedSections: [],
    reflectSectionHidden: false,
  });

  // Load preferences from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("cadence-cycle-insights-prefs");
    if (saved) {
      try {
        setSectionPreferences(JSON.parse(saved));
      } catch (e) {
        console.warn("Failed to parse cycle insights preferences", e);
      }
    }
  }, []);

  // Save preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem("cadence-cycle-insights-prefs", JSON.stringify(sectionPreferences));
  }, [sectionPreferences]);

  // ============================================
  // SECTION TOGGLE HANDLERS
  // ============================================
  
  const isSectionCollapsed = useCallback((sectionId: string): boolean => {
    return sectionPreferences.collapsedSections.includes(sectionId);
  }, [sectionPreferences.collapsedSections]);

  const handleSectionToggle = useCallback((sectionId: string, isExpanded: boolean) => {
    setSectionPreferences((prev: SectionPreferences) => {
      const collapsed = prev.collapsedSections.filter((id: string) => id !== sectionId);
      if (!isExpanded) {
        collapsed.push(sectionId);
      }
      return { ...prev, collapsedSections: collapsed };
    });
  }, []);

  const handleReflectDismiss = useCallback(() => {
    setSectionPreferences((prev: SectionPreferences) => ({
      ...prev,
      reflectSectionHidden: true,
    }));
  }, []);

  const handleReflectRestore = useCallback(() => {
    setSectionPreferences((prev: SectionPreferences) => ({
      ...prev,
      reflectSectionHidden: false,
    }));
  }, []);

  // ============================================
  // CYCLE DETECTION & CALCULATIONS
  // ============================================

  const detectedCycles = useMemo(() => {
    return detectCycleBoundaries(entries);
  }, [entries]);

  const cycleComparison = useMemo(() => {
    return compareCycles(entries, detectedCycles);
  }, [detectedCycles, entries]);

  const cyclePhaseHeatMapData = useMemo(() => {
    return buildCyclePhaseSymptomHeatMap(entries);
  }, [entries]);

  // ============================================
  // DERIVED DATA
  // ============================================
  
  const completeCycles = useMemo(() => {
    return detectedCycles.filter((c: DetectedCycle) => !c.isOngoing);
  }, [detectedCycles]);

  const currentCycle = useMemo(() => {
    return detectedCycles.find((c: DetectedCycle) => c.isOngoing) || null;
  }, [detectedCycles]);

  const hasEnoughDataForDeepInsights = completeCycles.length >= 2;

  // Calculate consistent patterns for badge count
  const consistentPatterns = useMemo(() => {
    return calculateConsistentPatterns(entries, detectedCycles);
  }, [entries, detectedCycles]);

  // ============================================
  // RENDER: NO PERIOD TRACKING
  // ============================================
  
  if (!periodTracking?.enabled) {
    return (
      <div className="p-4">
        <div className="bg-app-white rounded-xl border border-app-border p-8 text-center">
          <span className="text-4xl block mb-4">🌸</span>
          <h2 className="text-lg font-semibold text-app-charcoal mb-2">
            Period Tracking Not Enabled
          </h2>
          <p className="text-sm text-app-gray max-w-md mx-auto">
            Enable period tracking in Settings to see cycle insights and patterns.
          </p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: NO DATA YET
  // ============================================
  
  if (entries.length === 0) {
    return (
      <div className="p-4">
        <div className="bg-app-white rounded-xl border border-app-border p-8 text-center">
          <span className="text-4xl block mb-4">📝</span>
          <h2 className="text-lg font-semibold text-app-charcoal mb-2">
            No Entries Yet
          </h2>
          <p className="text-sm text-app-gray max-w-md mx-auto">
            Start logging entries to see your cycle insights and patterns emerge over time.
          </p>
        </div>
      </div>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-app-charcoal">Cycle Insights</h1>
        <p className="text-sm text-app-gray mt-1">
          Patterns and observations from your logged data
        </p>
      </div>

      {/* Section 0: Trust Banner - Always visible */}
      <TrustBanner
        cycles={detectedCycles}
        entries={entries}
        isGoogleSheetConnected={isGoogleSheetConnected}
      />

      {/* Section 1: This Cycle */}
      <CollapsibleSection
        title="This Cycle"
        icon={<CalendarCycleIcon className="w-5 h-5" />}
        helpText="Shows where you are in your current cycle based on your logged data."
        defaultExpanded={!isSectionCollapsed("this-cycle")}
        onToggle={(expanded) => handleSectionToggle("this-cycle", expanded)}
      >
        <ThisCycleSection
          currentCycle={currentCycle}
          allCycles={detectedCycles}
          entries={entries}
        />
      </CollapsibleSection>

      {/* Section 2: Your Consistent Patterns - OLD PILL/BADGE FOR NUMBER OF PATTERNS # OF PATTERNS*/}
      <CollapsibleSection
        title="Your Consistent Patterns"
        icon={<PatternIcon className="w-5 h-5" />}
        // badge={hasEnoughDataForDeepInsights && consistentPatterns.length > 0 
        //   ? `${consistentPatterns.length} pattern${consistentPatterns.length !== 1 ? "s" : ""}` 
        //   : undefined}
        helpText="Patterns that appear in at least 60% of your tracked cycles."
        defaultExpanded={!isSectionCollapsed("consistent-patterns")}
        onToggle={(expanded) => handleSectionToggle("consistent-patterns", expanded)}
      >
        <ConsistentPatternsSection
          entries={entries}
          cycles={detectedCycles}
          cyclePhaseHeatMapData={cyclePhaseHeatMapData}
        />
      </CollapsibleSection>

      {/* Section 3: Occasional & Emerging */}
      <CollapsibleSection
        title="Occasional & Emerging"
        icon={<SparkleIcon className="w-5 h-5" />}
        helpText="Patterns that appear less frequently, have recently started, or are changing over time."
        defaultExpanded={!isSectionCollapsed("emerging-patterns")}
        onToggle={(expanded) => handleSectionToggle("emerging-patterns", expanded)}
      >
        <PlaceholderContent
          title="Occasional & Emerging Patterns"
          description="Less frequent patterns and new trends will appear here as you log more data."
          minCycles={2}
          currentCycles={completeCycles.length}
          icon="🌱"
        />
      </CollapsibleSection>

      {/* Section 4: What Happens Together */}
      <CollapsibleSection
        title="What Happens Together"
        icon={<LinkIcon className="w-5 h-5" />}
        helpText="Events that frequently appear on the same day in your logs."
        defaultExpanded={!isSectionCollapsed("co-occurrence")}
        onToggle={(expanded) => handleSectionToggle("co-occurrence", expanded)}
      >
        <PlaceholderContent
          title="Co-occurring Events"
          description="Symptoms and events that tend to happen together will show here."
          minCycles={2}
          currentCycles={completeCycles.length}
          icon="🔗"
        />
      </CollapsibleSection>

      {/* Section 5: Notable Cycles */}
      <CollapsibleSection
        title="Notable Cycles"
        icon={<FlagIcon className="w-5 h-5" />}
        badge={hasEnoughDataForDeepInsights ? "0 noted" : undefined}
        helpText="Observations about cycles that differed from your usual pattern. Cycles naturally vary."
        defaultExpanded={!isSectionCollapsed("notable-cycles")}
        onToggle={(expanded) => handleSectionToggle("notable-cycles", expanded)}
      >
        <PlaceholderContent
          title="Notable Cycles"
          description="Cycles that differ from your usual pattern will be noted here."
          minCycles={2}
          currentCycles={completeCycles.length}
          icon="📌"
        />
      </CollapsibleSection>

      {/* Section 6: Reflect */}
      <DismissibleSection
        title="Reflect"
        icon={<ThoughtBubbleIcon className="w-5 h-5" />}
        helpText="Questions to help you notice patterns. Your answers aren't stored, they're just for you."
        defaultExpanded={!isSectionCollapsed("reflect")}
        onToggle={(expanded) => handleSectionToggle("reflect", expanded)}
        isDismissed={sectionPreferences.reflectSectionHidden}
        onDismiss={handleReflectDismiss}
        onRestore={handleReflectRestore}
      >
        <PlaceholderContent
          title="Reflection Prompts"
          description="Gentle questions to help you notice patterns in your data will appear here."
          minCycles={2}
          currentCycles={completeCycles.length}
          icon="💭"
        />
      </DismissibleSection>

      {/* Section 7: Detailed Views */}
      <CollapsibleSection
        title="Detailed Views"
        icon={<ChartDetailIcon className="w-5 h-5" />}
        badge="Full details"
        helpText="Detailed breakdowns of your cycle data including heat maps and cycle-by-cycle comparisons."
        defaultExpanded={false}
        onToggle={(expanded) => handleSectionToggle("detailed-views", expanded)}
      >
        <DetailedViewsSection
          cycles={detectedCycles}
          entries={entries}
          cycleComparison={cycleComparison}
          cyclePhaseHeatMapData={cyclePhaseHeatMapData}
        />
      </CollapsibleSection>
    </div>
  );
}

// ============================================
// PLACEHOLDER COMPONENTS
// These will be replaced with real components in later phases
// ============================================

interface PlaceholderContentProps {
  title: string;
  description: string;
  minCycles: number;
  currentCycles: number;
  icon: string;
}

function PlaceholderContent({
  title,
  description,
  minCycles,
  currentCycles,
  icon,
}: PlaceholderContentProps) {
  const hasEnoughData = currentCycles >= minCycles;

  if (!hasEnoughData) {
    return (
      <div className="bg-app-cream/30 rounded-lg p-6 text-center">
        <span className="text-2xl block mb-2">{icon}</span>
        <p className="text-sm text-app-charcoal font-medium mb-1">
          More data needed
        </p>
        <p className="text-xs text-app-gray">
          Log {minCycles - currentCycles} more complete cycle{minCycles - currentCycles !== 1 ? "s" : ""} to see {title.toLowerCase()}
        </p>
        
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1 mt-3">
          {Array.from({ length: minCycles }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i < currentCycles ? "bg-app-teal" : "bg-app-border"
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-app-cream/30 rounded-lg p-6 text-center">
      <span className="text-2xl block mb-2">{icon}</span>
      <p className="text-sm text-app-charcoal font-medium mb-1">
        {title}
      </p>
      <p className="text-xs text-app-gray">
        {description}
      </p>
      <p className="text-xs text-app-teal mt-2 font-medium">
        Coming in Phase 2-4
      </p>
    </div>
  );
}

// ============================================
// SECTION ICONS
// Custom SVG icons for each collapsible section
// ============================================

function CalendarCycleIcon({ className }: { className?: string }) {
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
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
      />
      <circle cx="12" cy="14" r="2" strokeWidth={2} />
    </svg>
  );
}

function PatternIcon({ className }: { className?: string }) {
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
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
      />
    </svg>
  );
}

function SparkleIcon({ className }: { className?: string }) {
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
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" 
      />
    </svg>
  );
}

function LinkIcon({ className }: { className?: string }) {
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
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" 
      />
    </svg>
  );
}

function FlagIcon({ className }: { className?: string }) {
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
        d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" 
      />
    </svg>
  );
}

function ThoughtBubbleIcon({ className }: { className?: string }) {
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
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
      />
    </svg>
  );
}

function ChartDetailIcon({ className }: { className?: string }) {
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
        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
      />
    </svg>
  );
}