"use client";

import { useState, useMemo } from "react";
import type { StoredEntry } from "@/types";
import type { 
  DetectedCycle, 
  CycleComparison, 
  CyclePhaseSymptomData 
} from "@/lib/monthlyUtils";

// ============================================
// CYCLE INSIGHTS
// Cycle-to-cycle comparison and phase × symptom patterns
// Only shown when period tracking is enabled
// ============================================

interface CycleInsightsProps {
  /** Detected cycle boundaries */
  detectedCycles: DetectedCycle[];
  /** Comparison between current and previous cycle */
  cycleComparison: CycleComparison | null;
  /** Phase × symptom heat map data */
  cyclePhaseHeatMapData: CyclePhaseSymptomData[];
  /** All entries for additional analysis */
  entries: StoredEntry[];
}

export function CycleInsights({
  detectedCycles,
  cycleComparison,
  cyclePhaseHeatMapData,
  entries,
}: CycleInsightsProps) {
  const [activeTab, setActiveTab] = useState<"comparison" | "patterns" | "medicines">("comparison");
  // Check if we have enough data
  const hasAnyCycleData = detectedCycles.length > 0;
  const hasComparisonData = cycleComparison !== null && cycleComparison.previousCycle !== null;
  const hasPatternData = cyclePhaseHeatMapData.length > 0;

  if (!hasAnyCycleData && !hasPatternData) {
    return (
      <div className="text-center py-8">
        <span className="text-3xl block mb-2">🌸</span>
        <p className="text-app-charcoal font-medium">No cycle data yet</p>
        <p className="text-sm text-app-gray mt-1">
          Log period flow to start tracking cycles and see patterns
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex rounded-lg overflow-hidden border border-app-border">
        <button
          onClick={() => setActiveTab("comparison")}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === "comparison"
              ? "bg-app-red text-white"
              : "bg-white text-app-charcoal hover:bg-app-cream"
          }`}
        >
          <span className="hidden sm:inline">Cycle to Cycle </span>Comparison
        </button>
        <button
          onClick={() => setActiveTab("patterns")}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === "patterns"
              ? "bg-app-red text-white"
              : "bg-white text-app-charcoal hover:bg-app-cream"
          }`}
        >
          <span className="hidden sm:inline">Phase ×</span> Symptoms
        </button>
        <button
          onClick={() => setActiveTab("medicines")}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === "medicines"
              ? "bg-app-red text-white"
              : "bg-white text-app-charcoal hover:bg-app-cream"
          }`}
        >
          <span className="hidden sm:inline">Phase × </span>Medicines
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "comparison" && (
        <CycleComparisonView
          detectedCycles={detectedCycles}
          cycleComparison={cycleComparison}
        />
      )}
      {activeTab === "patterns" && (
        <PhasePatternView
          cyclePhaseHeatMapData={cyclePhaseHeatMapData}
          entries={entries}
        />
      )}
      {activeTab === "medicines" && (
        <PhaseMedicineView entries={entries} />
      )}
    </div>
  );
}

// ============================================
// CYCLE COMPARISON VIEW
// ============================================

interface CycleComparisonViewProps {
  detectedCycles: DetectedCycle[];
  cycleComparison: CycleComparison | null;
}

function CycleComparisonView({ detectedCycles, cycleComparison }: CycleComparisonViewProps) {
  if (detectedCycles.length === 0) {
    return (
      <div className="text-center py-8 bg-app-cream/30 rounded-lg">
        <span className="text-2xl block mb-2">📅</span>
        <p className="text-app-charcoal font-medium">No cycles detected</p>
        <p className="text-sm text-app-gray mt-1">
          A new cycle is detected when you log period flow after 5+ days without flow
        </p>
      </div>
    );
  }

  const currentCycle = cycleComparison?.currentCycle || detectedCycles[detectedCycles.length - 1];
  const previousCycle = cycleComparison?.previousCycle;
  const hasComparison = previousCycle !== null;

  return (
    <div className="space-y-4">
      {/* Cycle Overview Cards */}
      <div className={`grid gap-4 ${hasComparison ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
        {/* Current Cycle Card */}
        <CycleCard
          title="Current Cycle"
          cycle={currentCycle}
          accentColor="red"
          isOngoing={currentCycle.isOngoing}
        />

        {/* Previous Cycle Card */}
        {hasComparison && previousCycle && (
          <CycleCard
            title="Previous Cycle"
            cycle={previousCycle}
            accentColor="gray"
            isOngoing={false}
          />
        )}
      </div>

      {/* Comparison Summary */}
      {hasComparison && cycleComparison && (
        <div className="bg-app-white rounded-xl border border-app-border overflow-hidden">
          <div className="px-4 py-3 bg-app-cream/50 border-b border-app-border">
            <h4 className="text-sm font-semibold text-app-charcoal">Cycle Changes</h4>
          </div>
          <div className="p-4 space-y-4">
            {/* Length Change */}
            {cycleComparison.lengthChange !== null && (
              <div className="flex items-center justify-between p-3 bg-app-red/5 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-app-charcoal">Cycle Length</p>
                  <p className="text-xs text-app-gray">Compared to previous cycle</p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${
                    cycleComparison.lengthChange === 0 
                      ? "text-app-gray" 
                      : cycleComparison.lengthChange > 0 
                        ? "text-app-red" 
                        : "text-app-teal"
                  }`}>
                    {cycleComparison.lengthChange === 0 
                      ? "Same" 
                      : `${cycleComparison.lengthChange > 0 ? "+" : ""}${cycleComparison.lengthChange} days`
                    }
                  </p>
                </div>
              </div>
            )}

            {/* Symptom Changes */}
            <div className="grid grid-cols-2 gap-3">
              {/* New Symptoms */}
              <div className="p-3 bg-app-cream/50 rounded-lg">
                <p className="text-xs font-medium text-app-gray mb-2">New This Cycle</p>
                {cycleComparison.symptoms.newInCurrent.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {cycleComparison.symptoms.newInCurrent.slice(0, 4).map((symptom) => (
                      <span
                        key={symptom}
                        className="px-2 py-0.5 text-xs bg-app-red/10 text-app-red rounded-full"
                      >
                        {symptom}
                      </span>
                    ))}
                    {cycleComparison.symptoms.newInCurrent.length > 4 && (
                      <span className="text-xs text-app-gray">
                        +{cycleComparison.symptoms.newInCurrent.length - 4}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-app-gray italic">No new symptoms</p>
                )}
              </div>

              {/* Resolved Symptoms */}
              <div className="p-3 bg-app-cream/50 rounded-lg">
                <p className="text-xs font-medium text-app-gray mb-2">Resolved</p>
                {cycleComparison.symptoms.resolvedFromPrevious.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {cycleComparison.symptoms.resolvedFromPrevious.slice(0, 4).map((symptom) => (
                      <span
                        key={symptom}
                        className="px-2 py-0.5 text-xs bg-app-teal/10 text-app-teal rounded-full"
                      >
                        {symptom}
                      </span>
                    ))}
                    {cycleComparison.symptoms.resolvedFromPrevious.length > 4 && (
                      <span className="text-xs text-app-gray">
                        +{cycleComparison.symptoms.resolvedFromPrevious.length - 4}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-app-gray italic">None resolved</p>
                )}
              </div>
            </div>

            {/* Flow Pattern Comparison */}
            {(Object.keys(cycleComparison.flowPattern.current).length > 0 ||
              Object.keys(cycleComparison.flowPattern.previous).length > 0) && (
              <div>
                <p className="text-xs font-medium text-app-gray mb-2">Flow Pattern</p>
                <div className="grid grid-cols-2 gap-3">
                  {/* Current Flow */}
                  <div>
                    <p className="text-xs text-app-red font-medium mb-1">This Cycle</p>
                    {Object.keys(cycleComparison.flowPattern.current).length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(cycleComparison.flowPattern.current)
                          .sort((a, b) => b[1] - a[1])
                          .map(([flow, count]) => (
                            <span
                              key={flow}
                              className="px-2 py-0.5 text-xs bg-app-red/10 text-app-red rounded capitalize"
                            >
                              {flow}: {count}d
                            </span>
                          ))}
                      </div>
                    ) : (
                      <p className="text-xs text-app-gray italic">No flow data</p>
                    )}
                  </div>

                  {/* Previous Flow */}
                  <div>
                    <p className="text-xs text-app-gray font-medium mb-1">Last Cycle</p>
                    {Object.keys(cycleComparison.flowPattern.previous).length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(cycleComparison.flowPattern.previous)
                          .sort((a, b) => b[1] - a[1])
                          .map(([flow, count]) => (
                            <span
                              key={flow}
                              className="px-2 py-0.5 text-xs bg-app-gray/10 text-app-gray rounded capitalize"
                            >
                              {flow}: {count}d
                            </span>
                          ))}
                      </div>
                    ) : (
                      <p className="text-xs text-app-gray italic">No flow data</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Top Symptoms Comparison */}
            {(cycleComparison.symptoms.current.length > 0 ||
              cycleComparison.symptoms.previous.length > 0) && (
              <div>
                <p className="text-xs font-medium text-app-gray mb-2">Top Symptoms by Cycle</p>
                <div className="grid grid-cols-2 gap-3">
                  {/* Current Cycle Symptoms */}
                  <div>
                    <p className="text-xs text-app-red font-medium mb-1">This Cycle</p>
                    {cycleComparison.symptoms.current.length > 0 ? (
                      <div className="bg-app-cream rounded-md overflow-hidden">
                        <table className="w-full text-xs">
                          <tbody>
                            {cycleComparison.symptoms.current.slice(0, 3).map((s) => (
                              <tr key={s.name} className="border-b border-app-border/50 last:border-0">
                                <td className="py-1 px-2 text-app-charcoal truncate max-w-[80px]" title={s.name}>
                                  {s.name}
                                </td>
                                <td className="py-1 px-2 text-app-red text-right font-medium">
                                  {s.count}×
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-app-gray italic">No symptoms</p>
                    )}
                  </div>

                  {/* Previous Cycle Symptoms */}
                  <div>
                    <p className="text-xs text-app-gray font-medium mb-1">Last Cycle</p>
                    {cycleComparison.symptoms.previous.length > 0 ? (
                      <div className="bg-app-cream rounded-md overflow-hidden">
                        <table className="w-full text-xs">
                          <tbody>
                            {cycleComparison.symptoms.previous.slice(0, 3).map((s) => (
                              <tr key={s.name} className="border-b border-app-border/50 last:border-0">
                                <td className="py-1 px-2 text-app-charcoal truncate max-w-[80px]" title={s.name}>
                                  {s.name}
                                </td>
                                <td className="py-1 px-2 text-app-gray text-right font-medium">
                                  {s.count}×
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-app-gray italic">No symptoms</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No comparison available message */}
      {!hasComparison && (
        <div className="p-4 bg-app-cream/50 rounded-lg border border-app-border">
          <p className="text-sm text-app-charcoal">
            <span className="font-medium">Only one cycle detected.</span>{" "}
            Keep logging to see cycle-to-cycle comparisons.
          </p>
          <p className="text-xs text-app-gray mt-1">
            A new cycle starts when you log period flow after 5+ days without flow.
          </p>
        </div>
      )}

      {/* Cycle History Summary */}
      {detectedCycles.length > 1 && (
        <CycleHistorySummary cycles={detectedCycles} />
      )}
    </div>
  );
}

// ============================================
// CYCLE CARD COMPONENT
// ============================================

interface CycleCardProps {
  title: string;
  cycle: DetectedCycle;
  accentColor: "red" | "gray";
  isOngoing: boolean;
}

function CycleCard({ title, cycle, accentColor, isOngoing }: CycleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const flowDaysCount = cycle.flowDays.length;
  const totalDaysLogged = Object.values(cycle.phasesLogged).reduce((sum, count) => sum + count, 0);

  const bgColor = accentColor === "red" ? "bg-app-red/5" : "bg-app-gray/5";
  const borderColor = accentColor === "red" ? "border-app-red/20" : "border-app-gray/20";
  const textColor = accentColor === "red" ? "text-app-red" : "text-app-gray";

  return (
    <div className={`rounded-xl border ${borderColor} ${bgColor} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 text-left"
      >
        <div className="flex items-start justify-between">
          <div>
            <h4 className={`text-sm font-semibold ${textColor}`}>{title}</h4>
            <p className="text-xs text-app-gray mt-0.5">
              Started {formatDateShort(cycle.startDate)}
              {isOngoing && " (ongoing)"}
            </p>
          </div>
          <svg
            className={`w-4 h-4 text-app-gray transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="text-center">
            <p className={`text-lg font-bold ${textColor}`}>
              {cycle.length ?? (isOngoing ? calculateDaysSinceStart(cycle.startDate) : "—")}
            </p>
            <p className="text-xs text-app-gray">{isOngoing && !cycle.length ? "Day" : "Days"}</p>
          </div>
          <div className="text-center">
            <p className={`text-lg font-bold ${textColor}`}>{flowDaysCount}</p>
            <p className="text-xs text-app-gray">Flow Days</p>
          </div>
          <div className="text-center">
            <p className={`text-lg font-bold ${textColor}`}>{totalDaysLogged}</p>
            <p className="text-xs text-app-gray">Logged</p>
          </div>
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-app-border/50 space-y-3">
          {/* Date Range */}
          <div>
            <p className="text-xs text-app-gray">Date Range</p>
            <p className="text-sm text-app-charcoal">
              {formatDateShort(cycle.startDate)} → {cycle.endDate ? formatDateShort(cycle.endDate) : "Ongoing"}
            </p>
          </div>

          {/* Phases Logged */}
          {Object.keys(cycle.phasesLogged).length > 0 && (
            <div>
              <p className="text-xs text-app-gray mb-1">Phases Logged</p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(cycle.phasesLogged)
                  .sort((a, b) => b[1] - a[1])
                  .map(([phase, count]) => (
                    <span
                      key={phase}
                      className={`px-2 py-0.5 text-xs rounded capitalize ${
                        accentColor === "red" 
                          ? "bg-app-red/10 text-app-red" 
                          : "bg-app-gray/10 text-app-gray"
                      }`}
                    >
                      {formatPhase(phase)}: {count}d
                    </span>
                  ))}
              </div>
            </div>
          )}

          {/* Flow Days */}
          {cycle.flowDays.length > 0 && (
            <div>
              <p className="text-xs text-app-gray mb-1">Flow Pattern</p>
              <div className="flex flex-wrap gap-1">
                {cycle.flowDays.slice(0, 7).map((day, i) => (
                  <span
                    key={i}
                    className={`px-2 py-0.5 text-xs rounded capitalize ${
                      accentColor === "red" 
                        ? "bg-app-red/10 text-app-red" 
                        : "bg-app-gray/10 text-app-gray"
                    }`}
                  >
                    {day.flow}
                  </span>
                ))}
                {cycle.flowDays.length > 7 && (
                  <span className="text-xs text-app-gray">+{cycle.flowDays.length - 7} more</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// CYCLE HISTORY SUMMARY
// ============================================

interface CycleHistorySummaryProps {
  cycles: DetectedCycle[];
}

function CycleHistorySummary({ cycles }: CycleHistorySummaryProps) {
  // Calculate averages
  const completedCycles = cycles.filter(c => c.length !== null);
  const avgLength = completedCycles.length > 0
    ? Math.round(completedCycles.reduce((sum, c) => sum + (c.length || 0), 0) / completedCycles.length)
    : null;
  
  const avgFlowDays = cycles.length > 0
    ? Math.round(cycles.reduce((sum, c) => sum + c.flowDays.length, 0) / cycles.length)
    : null;

  // Find shortest and longest
  const lengths = completedCycles.map(c => c.length).filter((l): l is number => l !== null);
  const shortest = lengths.length > 0 ? Math.min(...lengths) : null;
  const longest = lengths.length > 0 ? Math.max(...lengths) : null;

  return (
    <div className="bg-app-white rounded-xl border border-app-border overflow-hidden">
      <div className="px-4 py-3 bg-app-cream/50 border-b border-app-border">
        <h4 className="text-sm font-semibold text-app-charcoal">Cycle History</h4>
        <p className="text-xs text-app-gray mt-0.5">
          Based on {cycles.length} detected cycle{cycles.length !== 1 ? "s" : ""}
        </p>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-app-red/5 rounded-lg">
            <p className="text-xl font-bold text-app-red">{avgLength ?? "—"}</p>
            <p className="text-xs text-app-gray">Avg Length</p>
          </div>
          <div className="text-center p-3 bg-app-red/5 rounded-lg">
            <p className="text-xl font-bold text-app-red">{avgFlowDays ?? "—"}</p>
            <p className="text-xs text-app-gray">Avg Flow Days</p>
          </div>
          <div className="text-center p-3 bg-app-red/5 rounded-lg">
            <p className="text-xl font-bold text-app-red">{shortest ?? "—"}</p>
            <p className="text-xs text-app-gray">Shortest</p>
          </div>
          <div className="text-center p-3 bg-app-red/5 rounded-lg">
            <p className="text-xl font-bold text-app-red">{longest ?? "—"}</p>
            <p className="text-xs text-app-gray">Longest</p>
          </div>
        </div>

        {/* Cycle length variance note */}
        {shortest !== null && longest !== null && longest - shortest > 7 && (
          <p className="text-xs text-app-gray mt-3 p-2 bg-app-cream/50 rounded">
            Your cycle length varies by {longest - shortest} days. This is worth mentioning to your healthcare provider if concerned.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================
// PHASE PATTERN VIEW
// ============================================

interface PhasePatternViewProps {
  cyclePhaseHeatMapData: CyclePhaseSymptomData[];
  entries: StoredEntry[];
}

function PhasePatternView({ cyclePhaseHeatMapData, entries }: PhasePatternViewProps) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  if (cyclePhaseHeatMapData.length === 0) {
    return (
      <div className="text-center py-8 bg-app-cream/30 rounded-lg">
        <span className="text-2xl block mb-2">📊</span>
        <p className="text-app-charcoal font-medium">No phase patterns yet</p>
        <p className="text-sm text-app-gray mt-1">
          Log symptoms with cycle phases to see correlations
        </p>
      </div>
    );
  }

  const phases = ["menstrual", "follicular", "ovulation", "luteal"];
  const phaseLabels: Record<string, string> = {
    menstrual: "Period",
    follicular: "Follicular",
    ovulation: "Ovulation",
    luteal: "Luteal",
  };

  // Find max intensity for scaling
  const maxIntensity = Math.max(
    ...cyclePhaseHeatMapData.flatMap(s =>
      Object.values(s.phases).map(p => p.avgIntensity ?? 0)
    ),
    1
  );

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-app-charcoal">Phase & Symptom Patterns</h4>
        <p className="text-xs text-app-gray mt-0.5">
          See which symptoms tend to occur during each cycle phase and at what intensities
        </p>
      </div>

      {/* Heat Map */}
      <div className="overflow-x-auto">
        <div className="min-w-[400px]">
          {/* Phase Headers */}
          <div className="flex mb-2">
            <div className="w-32 shrink-0" />
            {phases.map((phase) => (
              <div key={phase} className="flex-1 min-w-[70px] text-center">
                <p className="text-xs font-medium text-app-charcoal">{phaseLabels[phase]}</p>
              </div>
            ))}
          </div>

          {/* Symptom Rows */}
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {cyclePhaseHeatMapData.slice(0, 15).map((symptom, rowIndex) => (
              <div key={symptom.symptom} className="flex items-center">
                {/* Symptom Name */}
                <div className="w-32 shrink-0 pr-2">
                  <p 
                    className={`text-xs truncate ${
                      symptom.isPeriodRelated ? "text-app-red" : "text-app-charcoal"
                    }`}
                    title={symptom.symptom}
                  >
                    {symptom.symptom}
                  </p>
                </div>

                {/* Phase Cells */}
                {phases.map((phase) => {
                  const data = symptom.phases[phase];
                  const cellKey = `${symptom.symptom}-${phase}`;
                  const isHovered = hoveredCell === cellKey;
                  const hasData = data && data.count > 0;
                  const intensity = data?.avgIntensity ?? 0;

                  return (
                    <div key={phase} className="flex-1 min-w-[70px] px-1 relative">
                    <button
                      type="button"
                      onMouseEnter={() => setHoveredCell(cellKey)}
                      onMouseLeave={() => setHoveredCell(null)}
                      className={`w-full h-10 rounded-lg transition-all flex items-center justify-center ${
                        hasData
                          ? getPhaseIntensityStyle(intensity, maxIntensity, symptom.isPeriodRelated, phase)
                          : "bg-app-border/30"
                      } ${isHovered ? "ring-2 ring-app-charcoal ring-offset-1" : ""}`}
                    >
                      {hasData && (
                        <span className="text-xs font-medium">
                          {data.avgIntensity !== null ? data.avgIntensity.toFixed(1) : data.count}
                        </span>
                      )}
                    </button>

                    {/* Hover tooltip - position below for first row to avoid clipping */}
                    {isHovered && hasData && (
                      <div className={`absolute left-1/2 -translate-x-1/2 z-20 pointer-events-none ${
                        rowIndex <= 2 ? "top-full mt-2" : "bottom-full mb-2"
                      }`}>
                        <div className="bg-app-charcoal text-white text-xs rounded-md px-3 py-2 whitespace-nowrap shadow-lg">
                          <p className="font-medium mb-1">{symptom.symptom}</p>
                          <div className="space-y-0.5 text-app-cream/90">
                            <p>Phase: {phaseLabels[phase]}</p>
                            <p>Logged: {data.count} time{data.count !== 1 ? "s" : ""}</p>
                            {data.avgIntensity !== null && (
                              <p>Avg intensity: {data.avgIntensity.toFixed(1)}/10</p>
                            )}
                          </div>
                          {/* Arrow - flip for first row */}
                          <div className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${
                            rowIndex === 0 
                              ? "bottom-full border-b-app-charcoal" 
                              : "top-full border-t-app-charcoal"
                          }`} />
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            ))}
          </div>

          {cyclePhaseHeatMapData.length > 15 && (
            <p className="text-xs text-app-gray text-center mt-2">
              Showing top 15 of {cyclePhaseHeatMapData.length} symptoms
            </p>
          )}
        </div>
      </div>

      {/* Color meaning */}
      <div className="flex items-center justify-center gap-4 text-xs text-app-gray mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-app-red" />
          <span>Period / Period symptoms</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-app-teal" />
          <span>Other symptoms</span>
        </div>
      </div>

      {/* Insights */}
      <PhaseInsights data={cyclePhaseHeatMapData} />
    </div>
  );
}

// ============================================
// PHASE INSIGHTS
// ============================================

interface PhaseInsightsProps {
  data: CyclePhaseSymptomData[];
}

function PhaseInsights({ data }: PhaseInsightsProps) {
  // Find strongest correlations (symptoms that appear much more in one phase)
  const insights = useMemo(() => {
    const results: { symptom: string; phase: string; intensity: number; isPeriodRelated: boolean }[] = [];

    for (const symptom of data) {
      // Find the phase with highest intensity for this symptom
      let maxPhase: string | null = null;
      let maxIntensity = 0;
      let totalCount = 0;

      for (const [phase, phaseData] of Object.entries(symptom.phases)) {
        totalCount += phaseData.count;
        if (phaseData.avgIntensity !== null && phaseData.avgIntensity > maxIntensity) {
          maxIntensity = phaseData.avgIntensity;
          maxPhase = phase;
        }
      }

      // Only include if there's meaningful data
      if (maxPhase && maxIntensity >= 4 && totalCount >= 3) {
        results.push({
          symptom: symptom.symptom,
          phase: maxPhase,
          intensity: maxIntensity,
          isPeriodRelated: symptom.isPeriodRelated,
        });
      }
    }

    return results
      .sort((a, b) => b.intensity - a.intensity)
      .slice(0, 5);
  }, [data]);

  if (insights.length === 0) {
    return null;
  }

  const phaseLabels: Record<string, string> = {
    menstrual: "Period",
    follicular: "Follicular",
    ovulation: "Ovulation",
    luteal: "Luteal",
  };

  return (
    <div className="bg-app-cream/50 rounded-lg p-4">
      <h5 className="text-sm font-medium text-app-charcoal mb-2">Key Patterns</h5>
      <div className="space-y-2">
        {insights.map((insight, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className={insight.isPeriodRelated ? "text-app-red" : "text-app-teal"}>
              {insight.symptom}
            </span>
            <span className="text-app-gray">peaks in intensity during the</span>
            <span className="font-medium text-app-charcoal">
              {phaseLabels[insight.phase]} phase
            </span>
            <span className="text-xs text-app-gray">
              (avg {insight.intensity.toFixed(1)}/10)
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-app-gray mt-3">
        These patterns can help you anticipate symptoms and plan accordingly.
      </p>
    </div>
  );
}

// ============================================
// PHASE MEDICINE PATTERNS
// ============================================

interface PhaseMedicinePatternsProps {
  entries: StoredEntry[];
}

function PhaseMedicinePatterns({ entries }: PhaseMedicinePatternsProps) {
  const phaseMedicineData = useMemo(() => {
    const data: Record<string, Record<string, number>> = {
      menstrual: {},
      follicular: {},
      ovulation: {},
      luteal: {},
    };

    for (const entry of entries) {
      if (!entry.cyclePhase || entry.cyclePhase === "not_sure") continue;
      
      for (const med of entry.medicineLog) {
        if (!data[entry.cyclePhase][med.medicineName]) {
          data[entry.cyclePhase][med.medicineName] = 0;
        }
        data[entry.cyclePhase][med.medicineName]++;
      }
    }

    return data;
  }, [entries]);

  // Check if we have any medicine data
  const hasMedicineData = Object.values(phaseMedicineData).some(
    phase => Object.keys(phase).length > 0
  );

  if (!hasMedicineData) {
    return null;
  }

  const phases = ["menstrual", "follicular", "ovulation", "luteal"];
  const phaseLabels: Record<string, string> = {
    menstrual: "Period",
    follicular: "Follicular",
    ovulation: "Ovulation",
    luteal: "Luteal",
  };

  // Get top medicines per phase
  const topMedicinesPerPhase = phases.map(phase => {
    const medicines = Object.entries(phaseMedicineData[phase])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    return { phase, medicines };
  }).filter(p => p.medicines.length > 0);

  if (topMedicinesPerPhase.length === 0) {
    return null;
  }

  return (
    <div className="bg-app-cream/50 rounded-lg p-4 mt-4">
      <h5 className="text-sm font-medium text-app-charcoal mb-3 flex items-center gap-2">
        <span>💊</span>
        Medicine Patterns
      </h5>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {phases.map(phase => {
          const medicines = phaseMedicineData[phase];
          const topMeds = Object.entries(medicines)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
          const hasData = topMeds.length > 0;

          return (
            <div 
              key={phase}
              className={`p-3 rounded-lg ${
                phase === "menstrual" ? "bg-app-red/10" : "bg-app-teal/10"
              }`}
            >
              <p className={`text-xs font-medium mb-2 ${
                phase === "menstrual" ? "text-app-red" : "text-app-teal"
              }`}>
                {phaseLabels[phase]}
              </p>
              {hasData ? (
                <div className="space-y-1">
                  {topMeds.map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between text-xs">
                      <span className="text-app-charcoal truncate max-w-[80px]" title={name}>
                        {name}
                      </span>
                      <span className="text-app-gray">{count}×</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-app-gray italic">No medicines logged</p>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-app-gray mt-3">
        Shows which medicines you commonly take during each cycle phase.
      </p>
    </div>
  );
}

// ============================================
// PHASE MEDICINE VIEW
// ============================================

interface PhaseMedicineViewProps {
  entries: StoredEntry[];
}

function PhaseMedicineView({ entries }: PhaseMedicineViewProps) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  // Build phase × medicine data
  const { phaseMedicineData, allMedicines, maxCount } = useMemo(() => {
    const data: Record<string, Record<string, { count: number; dosages: string[] }>> = {
      menstrual: {},
      follicular: {},
      ovulation: {},
      luteal: {},
    };

    const medicineSet = new Set<string>();
    let max = 0;

    for (const entry of entries) {
      if (!entry.cyclePhase || entry.cyclePhase === "not_sure") continue;

      for (const med of entry.medicineLog) {
        medicineSet.add(med.medicineName);

        if (!data[entry.cyclePhase][med.medicineName]) {
          data[entry.cyclePhase][med.medicineName] = { count: 0, dosages: [] };
        }
        data[entry.cyclePhase][med.medicineName].count++;
        if (med.dosage) {
          data[entry.cyclePhase][med.medicineName].dosages.push(med.dosage);
        }
        if (data[entry.cyclePhase][med.medicineName].count > max) {
          max = data[entry.cyclePhase][med.medicineName].count;
        }
      }
    }

    // Sort medicines by total usage
    const medicines = Array.from(medicineSet).sort((a, b) => {
      const aTotal = Object.values(data).reduce((sum, phase) => sum + (phase[a]?.count || 0), 0);
      const bTotal = Object.values(data).reduce((sum, phase) => sum + (phase[b]?.count || 0), 0);
      return bTotal - aTotal;
    });

    return { phaseMedicineData: data, allMedicines: medicines, maxCount: max };
  }, [entries]);

  // Check if we have data
  if (allMedicines.length === 0) {
    return (
      <div className="text-center py-8 bg-app-cream/30 rounded-lg">
        <span className="text-2xl block mb-2">💊</span>
        <p className="text-app-charcoal font-medium">No medicine data with cycle phases</p>
        <p className="text-sm text-app-gray mt-1">
          Log medicines while tracking your cycle phase to see patterns
        </p>
      </div>
    );
  }

  const phases = ["menstrual", "follicular", "ovulation", "luteal"];
  const phaseLabels: Record<string, string> = {
    menstrual: "Period",
    follicular: "Follicular",
    ovulation: "Ovulation",
    luteal: "Luteal",
  };

  // Calculate phase totals for summary
  const phaseTotals = phases.map(phase => ({
    phase,
    total: Object.values(phaseMedicineData[phase]).reduce((sum, m) => sum + m.count, 0),
  }));

  // Find insights
  const insights = useMemo(() => {
    const results: { medicine: string; phase: string; count: number; percentage: number }[] = [];

    for (const medicine of allMedicines) {
      let maxPhase: string | null = null;
      let maxCount = 0;
      let totalCount = 0;

      for (const phase of phases) {
        const count = phaseMedicineData[phase][medicine]?.count || 0;
        totalCount += count;
        if (count > maxCount) {
          maxCount = count;
          maxPhase = phase;
        }
      }

      if (maxPhase && maxCount >= 2 && totalCount >= 3) {
        const percentage = Math.round((maxCount / totalCount) * 100);
        if (percentage >= 40) {
          results.push({ medicine, phase: maxPhase, count: maxCount, percentage });
        }
      }
    }

    return results.sort((a, b) => b.percentage - a.percentage).slice(0, 5);
  }, [allMedicines, phaseMedicineData]);

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-app-charcoal">Phase × Medicine Patterns</h4>
        <p className="text-xs text-app-gray mt-0.5">
          See which medicines you tend to take during each cycle phase
        </p>
      </div>

      {/* Phase Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {phaseTotals.map(({ phase, total }) => (
          <div
            key={phase}
            className={`p-3 rounded-lg text-center ${
              phase === "menstrual" ? "bg-app-red/10" : "bg-app-taupe/10"
            }`}
          >
            <p className={`text-lg font-bold ${
              phase === "menstrual" ? "text-app-red" : "text-app-taupe"
            }`}>
              {total}
            </p>
            <p className="text-xs text-app-gray">{phaseLabels[phase]}</p>
          </div>
        ))}
      </div>

      {/* Heat Map Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[400px]">
          {/* Phase Headers */}
          <div className="flex mb-2">
            <div className="w-32 shrink-0" />
            {phases.map((phase) => (
              <div key={phase} className="flex-1 min-w-[70px] text-center">
                <p className={`text-xs font-medium ${
                  phase === "menstrual" ? "text-app-red" : "text-app-charcoal"
                }`}>
                  {phaseLabels[phase]}
                </p>
              </div>
            ))}
          </div>

          {/* Medicine Rows */}
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {allMedicines.slice(0, 10).map((medicine, rowIndex) => (
              <div key={medicine} className="flex items-center">
                {/* Medicine Name */}
                <div className="w-32 shrink-0 pr-2">
                  <p
                    className="text-xs text-app-charcoal truncate"
                    title={medicine}
                  >
                    {medicine}
                  </p>
                </div>

                {/* Phase Cells */}
                {phases.map((phase) => {
                  const data = phaseMedicineData[phase][medicine];
                  const cellKey = `${medicine}-${phase}`;
                  const isHovered = hoveredCell === cellKey;
                  const hasData = data && data.count > 0;
                  const count = data?.count || 0;

                  return (
                    <div key={phase} className="flex-1 min-w-[70px] px-1 relative">
                      <button
                        type="button"
                        onMouseEnter={() => setHoveredCell(cellKey)}
                        onMouseLeave={() => setHoveredCell(null)}
                        className={`w-full h-10 rounded-lg transition-all flex items-center justify-center ${
                          hasData
                            ? getMedicineIntensityStyle(count, maxCount, phase)
                            : "bg-app-border/30"
                        } ${isHovered ? "ring-2 ring-app-charcoal ring-offset-1" : ""}`}
                      >
                        {hasData && (
                          <span className="text-xs font-medium">{count}</span>
                        )}
                      </button>

                      {/* Hover tooltip */}
                      {isHovered && hasData && (
                        <div className={`absolute left-1/2 -translate-x-1/2 z-20 pointer-events-none ${
                          rowIndex <= 2 ? "top-full mt-2" : "bottom-full mb-2"
                        }`}>
                          <div className="bg-app-charcoal text-white text-xs rounded-md px-3 py-2 whitespace-nowrap shadow-lg">
                            <p className="font-medium mb-1">{medicine}</p>
                            <div className="space-y-0.5 text-app-cream/90">
                              <p>Phase: {phaseLabels[phase]}</p>
                              <p>Taken: {data.count} time{data.count !== 1 ? "s" : ""}</p>
                              {data.dosages.length > 0 && (
                                <p>Dosages: {[...new Set(data.dosages)].slice(0, 3).join(", ")}</p>
                              )}
                            </div>
                            {/* Arrow */}
                            <div className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${
                              rowIndex <= 2
                                ? "bottom-full border-b-app-charcoal"
                                : "top-full border-t-app-charcoal"
                            }`} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {allMedicines.length > 10 && (
            <p className="text-xs text-app-gray text-center mt-2">
              Showing top 10 of {allMedicines.length} medicines
            </p>
          )}
        </div>
      </div>

      {/* Legend */}
      {/* <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-app-gray pt-2 border-t border-app-border">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-app-border/30" />
          <span>Not taken</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-app-taupe/30" />
          <span>Low frequency</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-app-taupe/60" />
          <span>Medium frequency</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-app-taupe" />
          <span>High frequency</span>
        </div>
      </div> */}

      {/* Color meaning */}
      <div className="flex items-center justify-center gap-4 text-xs text-app-gray">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-app-red" />
          <span>Period phase</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-app-taupe" />
          <span>Other phases</span>
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="bg-app-cream/50 rounded-lg p-4">
          <h5 className="text-sm font-medium text-app-charcoal mb-2">Key Patterns</h5>
          <div className="space-y-2">
            {insights.map((insight, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="text-app-taupe font-medium">{insight.medicine}</span>
                <span className="text-app-gray">mostly taken during</span>
                <span className={`font-medium ${
                  insight.phase === "menstrual" ? "text-app-red" : "text-app-charcoal"
                }`}>
                  {phaseLabels[insight.phase]}
                </span>
                <span className="text-xs text-app-gray">
                  ({insight.percentage}% of usage)
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-app-gray mt-3">
            These patterns can help you anticipate medication needs during your cycle.
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDateShort(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatPhase(phase: string): string {
  const phaseMap: Record<string, string> = {
    menstrual: "Period",
    follicular: "Follicular",
    ovulation: "Ovulation",
    luteal: "Luteal",
    not_sure: "Unsure",
  };
  return phaseMap[phase] || phase.charAt(0).toUpperCase() + phase.slice(1).replace("_", " ");
}

function getPhaseIntensityStyle(
  intensity: number,
  maxIntensity: number,
  isPeriodRelated: boolean,
  phase: string
): string {
  // Use red for period phase OR period-related symptoms, teal for others
  const useRed = phase === "menstrual" || isPeriodRelated;
  const ratio = intensity / maxIntensity;

  if (useRed) {
    if (ratio <= 0.33) return "bg-app-red/30 text-app-red";
    if (ratio <= 0.66) return "bg-app-red/60 text-white";
    return "bg-app-red text-white";
  } else {
    if (ratio <= 0.33) return "bg-app-teal/30 text-app-teal";
    if (ratio <= 0.66) return "bg-app-teal/60 text-white";
    return "bg-app-teal text-white";
  }
}

function calculateDaysSinceStart(startDate: string): number {
  const [year, month, day] = startDate.split("-").map(Number);
  const start = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include start day
  return diffDays;
}

function getMedicineIntensityStyle(count: number, maxCount: number, phase: string): string {
  const ratio = count / maxCount;
  const isPeriod = phase === "menstrual";

  if (isPeriod) {
    if (ratio <= 0.33) return "bg-app-red/30 text-app-red";
    if (ratio <= 0.66) return "bg-app-red/60 text-white";
    return "bg-app-red text-white";
  } else {
    if (ratio <= 0.33) return "bg-app-taupe/30 text-app-taupe";
    if (ratio <= 0.66) return "bg-app-taupe/60 text-white";
    return "bg-app-taupe text-white";
  }
}