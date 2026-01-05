"use client";

import { useState } from "react";
import type { MonthlyStats, MonthComparison } from "@/lib/monthlyUtils";

// ============================================
// MONTHLY STATS CARDS
// Shows: Top Symptom, Timing Patterns, Cycle Phase (if enabled), New This Month
// ============================================

interface MonthlyStatsCardsProps {
  /** Stats for the current month */
  stats: MonthlyStats;
  /** Comparison with previous month */
  comparison: MonthComparison | null;
  /** Whether there's data from the previous month */
  hasPreviousMonthData: boolean;
  /** Top symptoms with intensities for this month */
  topSymptoms?: { name: string; count: number; avgIntensity: number | null; isPeriodRelated: boolean }[];
  /** Top symptoms from last month for comparison */
  lastMonthTopSymptoms?: { name: string; count: number; avgIntensity: number | null; isPeriodRelated: boolean }[];
  /** Whether period tracking is enabled */
  periodTrackingEnabled?: boolean;
  /** Current cycle phase from this month's entries */
  currentCyclePhase?: string | null;
  /** Days logged with cycle data this month */
  cycleDaysLogged?: number;
  /** Total days in the current month */
  daysInMonth?: number;
 /** Getting phase ranges per month from entries */  
 phaseRanges?: { phase: string; startDate: string; endDate: string | null; days: number }[];

}

export function MonthlyStatsCards({
  stats,
  comparison,
  hasPreviousMonthData,
  topSymptoms = [],
  lastMonthTopSymptoms = [],
  periodTrackingEnabled = false,
  currentCyclePhase = null,
  cycleDaysLogged = 0,
  daysInMonth = 30,
  phaseRanges = [], 
}: MonthlyStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Top Symptom Card */}
      <StatCard
        label="Top Symptom"
        value={topSymptoms[0]?.name || "—"}
        subtext={
          topSymptoms[0]
            ? `${topSymptoms[0].count}× this month`
            : "No symptoms logged"
        }
        accentColor="teal"
        valueSize="small"
        expandedContent={
          topSymptoms.length > 0 ? (
            <div className="space-y-3">
              {/* Top 5 by Count */}
              <div>
                <p className="text-xs text-app-gray mb-1">Most Frequent</p>
                <div className="bg-app-cream rounded-md overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-app-border/50">
                        <th className="py-1.5 px-2 text-left text-app-gray font-medium">Symptom</th>
                        <th className="py-1.5 px-2 text-right text-app-gray font-medium">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topSymptoms.slice(0, 5).map((symptom) => (
                        <tr key={symptom.name} className="border-b border-app-border/50 last:border-0">
                          <td className="py-1.5 px-2 text-app-charcoal truncate max-w-[120px]">
                            {symptom.name}
                          </td>
                          <td className="py-1.5 px-2 text-app-teal text-right font-medium">
                            {symptom.count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Monthly summary */}
              <div className="pt-2 border-t border-app-border">
                <p className="text-xs text-app-gray">
                  {stats.uniqueSymptoms} unique symptom{stats.uniqueSymptoms !== 1 ? "s" : ""} logged across {stats.daysWithEntries} day{stats.daysWithEntries !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-app-gray">Log symptoms to see patterns.</p>
          )
        }
      />

      {/* Timing Patterns Card */}
      <StatCard
        label="Timing Patterns"
        value={getMostCommonTimeOfDay(stats.timeOfDayDistribution) || "—"}
        subtext={
          Object.keys(stats.timeOfDayDistribution).length > 0
            ? "most common time"
            : "No timing data"
        }
        accentColor="plumb"
        expandedContent={
          Object.keys(stats.timeOfDayDistribution).length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs text-app-gray mb-1">Distribution</p>
              <div className="bg-app-cream rounded-md overflow-hidden">
                <table className="w-full text-xs">
                  <tbody>
                    {["Morning", "Afternoon", "Evening", "Night"].map((time) => {
                      const count = stats.timeOfDayDistribution[time] || 0;
                      if (count === 0) return null;
                      const total = Object.values(stats.timeOfDayDistribution).reduce((sum, v) => sum + v, 0);
                      const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <tr key={time} className="border-b border-app-border/50 last:border-0">
                          <td className="py-1.5 px-2 text-app-charcoal">{time}</td>
                          <td className="py-1.5 px-2 text-app-gray text-right">
                            {count} <span className="text-app-gray/60">({percent}%)</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Most active day of week */}
              {stats.mostActiveDay && (
                <div className="pt-2 border-t border-app-border">
                  <p className="text-xs text-app-gray">
                    Most active day: <span className="text-app-charcoal font-medium">{stats.mostActiveDay}</span>
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-app-gray">Log entries to see timing patterns.</p>
          )
        }
      />

      {/* Cycle Phase Card - only if period tracking enabled */}
      {periodTrackingEnabled && (
        <CyclePhaseCard
          currentPhase={currentCyclePhase}
          daysLogged={cycleDaysLogged}
          daysInMonth={daysInMonth}
          topSymptoms={topSymptoms}
          phaseRanges={phaseRanges}
        />
      )}

      {/* New This Month Card */}
      <NewThisMonthCard
        comparison={comparison}
        hasPreviousMonthData={hasPreviousMonthData}
        topSymptoms={topSymptoms}
        lastMonthTopSymptoms={lastMonthTopSymptoms}
      />
    </div>
  );
}

// ============================================
// STAT CARD COMPONENT
// ============================================

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  accentColor: "teal" | "plumb" | "red" | "taupe" | "charcoal";
  valueSize?: "normal" | "small";
  expandedContent?: React.ReactNode;
}

function StatCard({
  label,
  value,
  subtext,
  accentColor,
  valueSize = "normal",
  expandedContent,
}: StatCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const showContent = isExpanded || isHovered;

  const accentClasses: Record<string, string> = {
    teal: "bg-app-teal",
    plumb: "bg-app-plumb",
    red: "bg-app-red",
    taupe: "bg-app-taupe",
    charcoal: "bg-app-charcoal",
  };

  const borderClasses: Record<string, string> = {
    teal: "border-app-teal",
    plumb: "border-app-plumb",
    red: "border-app-red",
    taupe: "border-app-taupe",
    charcoal: "border-app-charcoal",
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full bg-app-white rounded-xl border-2 shadow-sm overflow-hidden text-left transition-all duration-200 ${
          showContent
            ? `${borderClasses[accentColor]} shadow-md`
            : "border-app-border hover:border-app-gray/30"
        }`}
      >
        {/* Accent bar */}
        <div className={`h-1 ${accentClasses[accentColor]}`} />

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-app-gray uppercase tracking-wide">
              {label}
            </p>
            {expandedContent && (
              <svg
                className={`w-3.5 h-3.5 text-app-gray transition-transform flex-shrink-0 ${
                  showContent ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </div>

          {/* Main Value */}
          <p
            className={`font-bold text-app-charcoal mt-1 ${
              valueSize === "small" ? "text-lg truncate" : "text-2xl"
            }`}
          >
            {value}
          </p>

          {subtext && <p className="text-xs text-app-gray mt-1">{subtext}</p>}

          {/* Expanded Content */}
          {expandedContent && (
            <div
              className={`overflow-hidden transition-all duration-200 ${
                showContent ? "max-h-[500px] mt-3 pt-3 border-t border-app-border" : "max-h-0"
              }`}
            >
              {expandedContent}
            </div>
          )}
        </div>
      </button>
    </div>
  );
}

// ============================================
// CYCLE PHASE CARD
// ============================================

interface CyclePhaseCardProps {
  currentPhase: string | null;
  daysLogged: number;
  daysInMonth: number;
  topSymptoms: { name: string; count: number; avgIntensity: number | null; isPeriodRelated: boolean }[];
  phaseRanges: { phase: string; startDate: string; endDate: string | null; days: number }[];
}

function CyclePhaseCard({ 
  currentPhase, 
  daysLogged, 
  daysInMonth, 
  topSymptoms,
  phaseRanges,
}: CyclePhaseCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const showContent = isExpanded || isHovered;

  // Find highest intensity symptom (with isPeriodRelated info)
  const highestIntensity = topSymptoms
    .filter((s) => s.avgIntensity !== null)
    .sort((a, b) => (b.avgIntensity ?? 0) - (a.avgIntensity ?? 0))[0] as
    | { name: string; avgIntensity: number; count: number; isPeriodRelated: boolean }
    | undefined;

  // Get current phase range for the subtext date display
  const currentPhaseRange = phaseRanges.find(r => r.phase === currentPhase);

  // Format a date string to "Jan 21" format
  const formatDateShort = (dateStr: string): string => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Format phase range as "Jan 21 - Jan 24" or "Jan 21 - present"
  const formatPhaseRange = (range: { startDate: string; endDate: string | null; days: number }): string => {
    const start = formatDateShort(range.startDate);
    const end = range.endDate ? formatDateShort(range.endDate) : "present";
    return `${start} - ${end}`;
  };

  // Build subtext: show date range if available, otherwise fallback
  const getSubtext = (): string => {
    if (currentPhaseRange) {
      const rangeStr = formatPhaseRange(currentPhaseRange);
      return `${rangeStr} (${currentPhaseRange.days} day${currentPhaseRange.days !== 1 ? "s" : ""})`;
    }
    if (daysLogged > 0) {
      return `${daysLogged} day${daysLogged !== 1 ? "s" : ""} logged`;
    }
    return `No data for the current selection`;
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full bg-app-white rounded-xl border-2 shadow-sm overflow-hidden text-left transition-all duration-200 ${
          showContent
            ? "border-app-red shadow-md"
            : "border-app-border hover:border-app-gray/30"
        }`}
      >
        {/* Accent bar */}
        <div className="h-1 bg-app-red" />

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-app-gray uppercase tracking-wide">
              Cycle Phase
            </p>
            <svg
              className={`w-3.5 h-3.5 text-app-gray transition-transform flex-shrink-0 ${
                showContent ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Main Value */}
          <p className="text-xl font-bold text-app-charcoal mt-1 capitalize">
            {formatPhase(currentPhase)}
          </p>

          {/* Subtext: Date range */}
          <p className="text-xs text-app-red mt-1">
            {getSubtext()}
          </p>

          {/* Expanded Content */}
          <div
            className={`overflow-hidden transition-all duration-200 ${
              showContent ? "max-h-[500px] mt-3 pt-3 border-t border-app-border" : "max-h-0"
            }`}
          >
            <div className="space-y-3">
              {/* Highest Intensity Symptom */}
              {highestIntensity && (
                <div className={`p-2 rounded-lg ${highestIntensity.isPeriodRelated ? "bg-app-red/10" : "bg-app-teal/10"}`}>
                  <p className="text-xs text-app-gray">Most Intense</p>
                  <p className={`text-sm font-medium ${highestIntensity.isPeriodRelated ? "text-app-red" : "text-app-teal"}`}>
                    {highestIntensity.name}{" "}
                    <span className="text-app-charcoal">
                      (avg {highestIntensity.avgIntensity}/10)
                    </span>
                  </p>
                </div>
              )}

              {/* Symptoms by Intensity */}
              {topSymptoms.filter(s => s.avgIntensity !== null).length > 0 && (
                <div>
                  <p className="text-xs text-app-gray mb-1">By Intensity</p>
                  <div className="bg-app-cream rounded-md overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-app-border/50">
                          <th className="py-1.5 px-2 text-left text-app-gray font-medium">Symptom</th>
                          <th className="py-1.5 px-2 text-right text-app-gray font-medium">Avg</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topSymptoms
                          .filter(s => s.avgIntensity !== null)
                          .sort((a, b) => (b.avgIntensity ?? 0) - (a.avgIntensity ?? 0))
                          .slice(0, 5)
                          .map((symptom) => (
                            <tr key={symptom.name} className="border-b border-app-border/50 last:border-0">
                              <td className="py-1.5 px-2 text-app-charcoal truncate max-w-[100px]">
                                {symptom.name}
                              </td>
                              <td className="py-1.5 px-2 text-app-red text-right font-medium">
                                {symptom.avgIntensity}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* No symptoms */}
              {topSymptoms.filter(s => s.avgIntensity !== null).length === 0 && (
                <p className="text-xs text-app-gray italic">No symptoms with intensity logged</p>
              )}
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}

// ============================================
// NEW THIS MONTH CARD
// ============================================

interface NewThisMonthCardProps {
  comparison: MonthComparison | null;
  hasPreviousMonthData: boolean;
  topSymptoms: { name: string; count: number; avgIntensity: number | null; isPeriodRelated: boolean }[];
  lastMonthTopSymptoms: { name: string; count: number; avgIntensity: number | null; isPeriodRelated: boolean }[];
}

function NewThisMonthCard({
  comparison,
  hasPreviousMonthData,
  topSymptoms,
  lastMonthTopSymptoms,
}: NewThisMonthCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const showContent = isExpanded || isHovered;

  // No comparison available
  if (!hasPreviousMonthData || !comparison) {
    return (
      <div className="bg-app-white rounded-xl border-2 border-app-border shadow-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-app-teal via-app-plumb to-app-red" />
        <div className="p-4">
          <p className="text-xs font-medium text-app-gray uppercase tracking-wide">
            New This Month
          </p>
          <p className="text-2xl font-bold text-app-gray mt-1">—</p>
          <p className="text-xs text-app-gray mt-1">
            {hasPreviousMonthData ? "No new symptoms" : "No data from last month"}
          </p>
        </div>
      </div>
    );
  }

  // Determine headline
  const hasNewSymptoms = comparison.symptoms.newSymptoms.length > 0;
  const hasResolvedSymptoms = comparison.symptoms.resolvedSymptoms.length > 0;
  const newCount = comparison.symptoms.newSymptoms.length;

  let headlineText = "No new symptoms";
  let headlineColor = "text-app-gray";

  if (hasNewSymptoms) {
    const firstNew = comparison.symptoms.newSymptoms[0];
    headlineText = firstNew.name;
    headlineColor = firstNew.isPeriodRelated ? "text-app-red" : "text-app-teal";
  } else if (hasResolvedSymptoms) {
    headlineText = `${comparison.symptoms.resolvedSymptoms.length} resolved`;
    headlineColor = "text-app-teal";
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full bg-app-white rounded-xl border-2 shadow-sm overflow-hidden text-left transition-all duration-200 ${
          showContent
            ? "border-app-charcoal shadow-md"
            : "border-app-border hover:border-app-gray/30"
        }`}
      >
        {/* Gradient accent bar */}
        <div className="h-1 bg-gradient-to-r from-app-teal via-app-plumb to-app-red" />

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-app-gray uppercase tracking-wide">
              New This Month
            </p>
            <svg
              className={`w-3.5 h-3.5 text-app-gray transition-transform flex-shrink-0 ${
                showContent ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Headline */}
          <p className={`text-lg font-bold mt-1 truncate ${headlineColor}`}>{headlineText}</p>
          <p className="text-xs text-app-gray mt-1">
            {hasNewSymptoms && newCount > 1
              ? `+${newCount - 1} more new`
              : hasNewSymptoms
                ? "New symptom"
                : hasResolvedSymptoms
                  ? "From last month"
                  : "Patterns stable"}
          </p>

          {/* Expanded Content */}
          <div
            className={`overflow-hidden transition-all duration-200 ${
              showContent ? "max-h-[600px] mt-3 pt-3 border-t border-app-border" : "max-h-0"
            }`}
          >
            <div className="space-y-4">
              {/* New Symptoms Pills */}
              {hasNewSymptoms && newCount > 1 && (
                <div>
                  <p className="text-xs text-app-gray mb-1">All New Symptoms</p>
                  <div className="flex flex-wrap gap-1">
                    {comparison.symptoms.newSymptoms.map((symptom) => (
                      <span
                        key={symptom.name}
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          symptom.isPeriodRelated
                            ? "bg-app-red/10 text-app-red"
                            : "bg-app-teal/10 text-app-teal"
                        }`}
                      >
                        {symptom.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolved Symptoms */}
              {hasResolvedSymptoms && (
                <div>
                  <p className="text-xs text-app-gray mb-1">
                    Resolved
                    <span className="text-app-gray/60 ml-1">(0 logs this month)</span>
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {comparison.symptoms.resolvedSymptoms.slice(0, 6).map((symptom) => (
                      <span
                        key={symptom.name}
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          symptom.isPeriodRelated
                            ? "bg-app-red/10 text-app-red"
                            : "bg-app-teal/10 text-app-teal"
                        }`}
                      >
                        {symptom.name}
                      </span>
                    ))}
                    {comparison.symptoms.resolvedSymptoms.length > 6 && (
                      <span className="px-2 py-0.5 text-xs text-app-gray">
                        +{comparison.symptoms.resolvedSymptoms.length - 6}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Last Month's Top Symptoms */}
              {lastMonthTopSymptoms.length > 0 && (
                <div>
                  <p className="text-xs text-app-gray mb-1">Last Month&apos;s Top 5</p>
                  <div className="bg-app-cream rounded-md overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-app-border/50">
                          <th className="py-1.5 px-2 text-left text-app-gray font-medium">Symptom</th>
                          <th className="py-1.5 px-2 text-right text-app-gray font-medium">Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lastMonthTopSymptoms.slice(0, 5).map((symptom) => (
                          <tr key={symptom.name} className="border-b border-app-border/50 last:border-0">
                            <td className="py-1.5 px-2 text-app-charcoal truncate max-w-[100px]">
                              {symptom.name}
                            </td>
                            <td className="py-1.5 px-2 text-app-gray text-right font-medium">
                              {symptom.count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Intensity change indicator */}
              {comparison.symptoms.intensityChange !== null && comparison.symptoms.intensityChange !== 0 && (
                <div className="pt-2 border-t border-app-border">
                  <p className="text-xs text-app-gray">
                    Average intensity{" "}
                    <span className={comparison.symptoms.intensityChange < 0 ? "text-app-teal" : "text-app-red"}>
                      {comparison.symptoms.intensityChange < 0 ? "↓" : "↑"}{" "}
                      {Math.abs(comparison.symptoms.intensityChange).toFixed(1)}
                    </span>{" "}
                    vs last month
                  </p>
                </div>
              )}

              {/* No symptoms either month */}
              {topSymptoms.length === 0 && lastMonthTopSymptoms.length === 0 && (
                <p className="text-xs text-app-gray italic">No symptoms logged either month</p>
              )}
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getMostCommonTimeOfDay(distribution: Record<string, number>): string | null {
  const entries = Object.entries(distribution);
  if (entries.length === 0) return null;

  const sorted = entries.sort((a, b) => b[1] - a[1]);
  return sorted[0][0];
}

function formatPhase(phase: string | null): string {
  if (!phase) return "—";
  const phaseMap: Record<string, string> = {
    menstrual: "Period",
    follicular: "Follicular",
    ovulation: "Ovulation",
    luteal: "Luteal",
    not_sure: "Unsure",
  };
  return phaseMap[phase] || phase.charAt(0).toUpperCase() + phase.slice(1).replace("_", " ");
}