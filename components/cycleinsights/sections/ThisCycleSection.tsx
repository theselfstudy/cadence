// /components/cycleinsights/sections/ThisCycleSection.tsx
"use client";

import { useMemo } from "react";
import type { StoredEntry } from "@/types";
import type { DetectedCycle } from "@/lib/monthlyUtils";
import { calculateThisCycleData, formatPhase } from "@/lib/insightUtils";
import { CycleProgressRing } from "../shared/RingIndicator";
import { PhasePill } from "../shared/PhasePill";

// ============================================
// THIS CYCLE SECTION
// Shows current cycle day, phase, time-to-event context
// ============================================

interface ThisCycleSectionProps {
  /** Current ongoing cycle (if any) */
  currentCycle: DetectedCycle | null;
  
  /** All detected cycles (for calculating estimates) */
  allCycles: DetectedCycle[];
  
  /** All entries (for symptom collection) */
  entries: StoredEntry[];
}

export function ThisCycleSection({
  currentCycle,
  allCycles,
  entries,
}: ThisCycleSectionProps) {
  // Calculate all "This Cycle" data
  const cycleData = useMemo(() => {
    return calculateThisCycleData(currentCycle, allCycles, entries);
  }, [currentCycle, allCycles, entries]);

  const completeCycles = useMemo(() => {
    return allCycles.filter((c) => !c.isOngoing && c.length !== null);
  }, [allCycles]);

  // No current cycle
  if (!cycleData) {
    return (
      <div className="bg-app-cream/30 rounded-lg p-6 text-center">
        <span className="text-2xl block mb-2">📅</span>
        <p className="text-sm text-app-charcoal font-medium mb-1">
          No active cycle detected
        </p>
        <p className="text-xs text-app-gray">
          Log period flow to start tracking a new cycle
        </p>
      </div>
    );
  }

  // Calculate estimated cycle length for the ring
  const estimatedLength =
    completeCycles.length > 0
      ? Math.round(
          completeCycles.reduce((sum, c) => sum + (c.length || 0), 0) /
            completeCycles.length
        )
      : 28;

  // Format cycle start date
  const formatDate = (dateStr: string): string => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const {
    cycleDay,
    phase,
    phaseIsKnown,
    periodTypicallyStarts,
    symptomsLoggedThisCycle,
  } = cycleData;

  // Only show phase if user has logged phases beyond just "menstrual"
  const showPhase = phaseIsKnown && phase && phase !== "not_sure";

  return (
    <div className="space-y-4">
      {/* Main cycle info */}
      <div className="flex items-center gap-6">
        {/* Cycle progress ring */}
        <CycleProgressRing
          currentDay={cycleDay}
          estimatedLength={estimatedLength}
          size="lg"
        />

        {/* Cycle details */}
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold text-app-charcoal">
              Day {cycleDay}
            </h3>
            {showPhase && phase && (
              <PhasePill phase={phase} size="md" />
            )}
          </div>

          <p className="text-sm text-app-gray mt-1">
            Started {formatDate(cycleData.cycleStartDate)}
          </p>

          {/* Time-to-event estimate */}
          {periodTypicallyStarts && completeCycles.length >= 2 && (
            <p className="text-sm text-app-charcoal mt-3">
              Based on your {completeCycles.length} previous cycles, your period
              has typically started between{" "}
              <span className="font-medium text-app-teal">
                day {periodTypicallyStarts.dayRange[0]}
              </span>{" "}
              and{" "}
              <span className="font-medium text-app-teal">
                day {periodTypicallyStarts.dayRange[1]}
              </span>
              .
            </p>
          )}

          {/* Early data message */}
          {completeCycles.length < 2 && (
            <p className="text-sm text-app-gray mt-3">
              After 2+ complete cycles, you&apos;ll see when your period
              typically starts.
            </p>
          )}
        </div>
      </div>

      {/* Symptoms logged this cycle */}
      {symptomsLoggedThisCycle.length > 0 && (
        <SymptomsLoggedDisplay symptoms={symptomsLoggedThisCycle} />
      )}
    </div>
  );
}

// ============================================
// SYMPTOMS LOGGED DISPLAY
// Shows symptoms logged in current cycle
// ============================================

interface SymptomsLoggedDisplayProps {
  symptoms: { name: string; isPeriodRelated: boolean }[];
}

function SymptomsLoggedDisplay({ symptoms }: SymptomsLoggedDisplayProps) {
  const maxToShow = 10;
  
  // Split by type, period-related first
  const periodSymptoms = symptoms.filter((s) => s.isPeriodRelated);
  const generalSymptoms = symptoms.filter((s) => !s.isPeriodRelated);
  
  // Limit display
  const periodToShow = periodSymptoms.slice(0, maxToShow);
  const remainingSlots = maxToShow - periodToShow.length;
  const generalToShow = generalSymptoms.slice(0, remainingSlots);
  const overflow = symptoms.length - (periodToShow.length + generalToShow.length);

  return (
    <div className="bg-app-cream/30 rounded-lg p-3">
      <p className="text-xs text-app-gray mb-2">Logged this cycle:</p>
      <div className="flex flex-wrap gap-1.5">
        {/* Period symptoms - red */}
        {periodToShow.map((symptom) => (
          <span
            key={`period-${symptom.name}`}
            className="px-2 py-0.5 text-xs bg-app-red/10 text-app-red rounded-full border border-app-red/20"
          >
            {symptom.name}
          </span>
        ))}

        {/* General symptoms - teal */}
        {generalToShow.map((symptom) => (
          <span
            key={`general-${symptom.name}`}
            className="px-2 py-0.5 text-xs bg-app-teal/10 text-app-teal rounded-full border border-app-teal/20"
          >
            {symptom.name}
          </span>
        ))}

        {overflow > 0 && (
          <span className="px-2 py-0.5 text-xs text-app-gray">
            +{overflow} more
          </span>
        )}
      </div>
    </div>
  );
}