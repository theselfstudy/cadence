"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";

import { useEntries } from "@/stores/useEntries";
import { useSettings } from "@/stores/useSettings";

import {
  getMonthRange,
  getEntriesForMonth,
  calculateMonthlyStats,
  compareMonths,
  buildMonthlySymptomHeatMap,
  buildBristolWeeklyTrend,
  buildCyclePhaseSymptomHeatMap,
  detectCycleBoundaries,
  compareCycles,
  getWeeksInMonth,
  getDataMonthBounds
} from "@/lib/monthlyUtils";

import { useMonthlyFilters } from "@/hooks/useMonthlyFilters";

import {
  MonthlyNavigation,
  MonthlyStatsCards,
  MonthlyComparison,
  MonthlyCharts,
  CycleInsights,
} from "@/components/monthly";

import { FilterBar } from "@/components/history";

import { BRISTOL_TYPES, POST_BOWEL_FEELINGS, CYCLE_PHASES } from "@/lib/constants";
import type { StoredEntry, TimeFormat } from "@/types";
import { EntryCard } from "@/components/ui/EntryCard";

// ============================================
// TYPES
// ============================================

type ViewMode = "cards" | "table";

// ============================================
// MONTHLY PAGE
// ============================================

export default function MonthlyPage() {
  // Client-side rendering guard
  const [isClient, setIsClient] = useState(false);

  // Store data
  const entries = useEntries((state) => state.entries);
  const weekStartDay = useSettings((state) => state.weekStartDay);
  const timeFormat = useSettings((state) => state.timeFormat);
  const stoolTrackingEnabled = useSettings((state) => state.stoolTracking.enabled);
  const periodTrackingEnabled = useSettings((state) => state.periodTracking.enabled);
  const medicineTrackingEnabled = useSettings((state) => state.medicineTracking.enabled);
  const symptomsEnabled = useSettings((state) => state.symptoms.enabled);

  const settings = useSettings();

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [showStats, setShowStats] = useState(true);
  const [showEntries, setShowEntries] = useState(true);
  const [showCycleInsights, setShowCycleInsights] = useState(true);

  // Initialize client-side
  useEffect(() => {
    setIsClient(true);
  }, []);


  // Use monthly filters hook
  const {
    monthOffset,
    monthRange,
    canGoNext,
    canGoPrev,
    goToNextMonth,
    goToPrevMonth,
    goToCurrentMonth,
    // goToMonth,
    monthEntries,
    prevMonthEntries,
    filteredEntries,
    selectedDays,
    filters,
    // activeFilterCount,
    categoryFilterCounts,
    availableOptions,
    hasAdvancedFilters,
    totalFilterCount,
    toggleDay,
    selectRange,
    selectAllDays,
    toggleSymptom,
    toggleCyclePhase,
    toggleFlowLevel,
    toggleBristolType,
    toggleFeeling,
    toggleMedicine,
    selectAllSymptoms,
    selectAllCycle,
    selectAllBowel,
    selectAllMedicine,
    clearCategory,
    setFilters,
    clearAllFilters,
    clearAllFiltersAndDays,
  } = useMonthlyFilters(entries);


  // Reset comparison offset when main month changes
  // useEffect(() => {
  //   setComparisonOffset(0);
  // }, [monthOffset]);

  // Calculate stats for filtered entries
  const stats = useMemo(
    () => calculateMonthlyStats(filteredEntries),
    [filteredEntries]
  );

  // Calculate cycle data for stats card - deduplicated by date
  const cycleData = useMemo(() => {
    // Track unique date -> phase mapping (last phase wins if multiple entries same day)
    const dateToPhase: Record<string, string> = {};
    const daysWithCycleData = new Set<string>();

    for (const entry of filteredEntries) {
      if (entry.cyclePhase) {
        dateToPhase[entry.date] = entry.cyclePhase;
        daysWithCycleData.add(entry.date);
      }
    }

    // Count phases by unique days
    const phases: Record<string, number> = {};
    for (const phase of Object.values(dateToPhase)) {
      phases[phase] = (phases[phase] || 0) + 1;
    }

    // Most common phase
    let currentPhase: string | null = null;
    let maxCount = 0;
    for (const [phase, count] of Object.entries(phases)) {
      if (count > maxCount) {
        maxCount = count;
        currentPhase = phase;
      }
    }

    return {
      currentCyclePhase: currentPhase,
      cycleDaysLogged: daysWithCycleData.size,
    };
  }, [filteredEntries]);

  // Calculate phase date ranges for the current month - deduplicated by date
  const phaseRanges = useMemo(() => {
    const ranges: { phase: string; startDate: string; endDate: string | null; days: number }[] = [];
    
    // Priority order for phases (higher = more priority)
    // Menstrual > Ovulation > Follicular > Luteal > Not Sure
    const phasePriority: Record<string, number> = {
      menstrual: 5,
      ovulation: 4,
      follicular: 3,
      luteal: 2,
      not_sure: 1,
    };
    
    // Deduplicate entries by date using priority-based selection
    const dateToPhase: Record<string, string> = {};
    for (const entry of filteredEntries) {
      if (entry.cyclePhase) {
        const existingPhase = dateToPhase[entry.date];
        const existingPriority = existingPhase ? (phasePriority[existingPhase] || 0) : 0;
        const newPriority = phasePriority[entry.cyclePhase] || 0;
        
        // Keep the higher priority phase
        if (newPriority > existingPriority) {
          dateToPhase[entry.date] = entry.cyclePhase;
        }
      }
    }
    
    // Convert to sorted array of unique date-phase pairs
    const uniqueDayPhases = Object.entries(dateToPhase)
      .map(([date, phase]) => ({ date, phase }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    if (uniqueDayPhases.length === 0) return ranges;
    
    let currentPhase = uniqueDayPhases[0].phase;
    let startDate = uniqueDayPhases[0].date;
    let days = 1;
    let lastDate = uniqueDayPhases[0].date;
    
    for (let i = 1; i < uniqueDayPhases.length; i++) {
      const { date, phase } = uniqueDayPhases[i];
      if (phase === currentPhase) {
        days++;
        lastDate = date;
      } else {
        // Save previous range
        ranges.push({
          phase: currentPhase,
          startDate,
          endDate: lastDate,
          days,
        });
        // Start new range
        currentPhase = phase;
        startDate = date;
        lastDate = date;
        days = 1;
      }
    }
    
    // Push the last range
    if (currentPhase) {
      const today = new Date().toISOString().split("T")[0];
      const isOngoing = lastDate >= today.slice(0, 7); // Same month check
      
      ranges.push({
        phase: currentPhase,
        startDate,
        endDate: isOngoing ? null : lastDate,
        days,
      });
    }
    
    return ranges;
  }, [filteredEntries]);

  // Calculate top symptoms with intensities for the stats card
  const topSymptoms = useMemo(() => {
    const symptomStats: Record<string, {
      count: number;
      totalIntensity: number;
      intensityCount: number;
      isPeriodRelated: boolean;
    }> = {};

    for (const entry of filteredEntries) {
      // Regular symptoms
      for (const [symptom, intensity] of Object.entries(entry.symptomIntensities)) {
        if (!symptomStats[symptom]) {
          symptomStats[symptom] = { count: 0, totalIntensity: 0, intensityCount: 0, isPeriodRelated: false };
        }
        symptomStats[symptom].count += 1;
        if (intensity !== null) {
          symptomStats[symptom].totalIntensity += intensity;
          symptomStats[symptom].intensityCount += 1;
        }
      }
      // Period-related symptoms
      for (const [symptom, intensity] of Object.entries(entry.periodSymptomIntensities)) {
        if (!symptomStats[symptom]) {
          symptomStats[symptom] = { count: 0, totalIntensity: 0, intensityCount: 0, isPeriodRelated: true };
        }
        symptomStats[symptom].count += 1;
        symptomStats[symptom].isPeriodRelated = true;
        if (intensity !== null) {
          symptomStats[symptom].totalIntensity += intensity;
          symptomStats[symptom].intensityCount += 1;
        }
      }
    }

    return Object.entries(symptomStats)
      .map(([name, data]) => ({
        name,
        count: data.count,
        avgIntensity:
          data.intensityCount > 0
            ? Math.round((data.totalIntensity / data.intensityCount) * 10) / 10
            : null,
        isPeriodRelated: data.isPeriodRelated,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredEntries]);

  // Calculate last month's top symptoms for comparison
  const lastMonthTopSymptoms = useMemo(() => {
    const symptomStats: Record<string, {
      count: number;
      totalIntensity: number;
      intensityCount: number;
      isPeriodRelated: boolean;
    }> = {};

    for (const entry of prevMonthEntries) {
      // Regular symptoms
      for (const [symptom, intensity] of Object.entries(entry.symptomIntensities)) {
        if (!symptomStats[symptom]) {
          symptomStats[symptom] = { count: 0, totalIntensity: 0, intensityCount: 0, isPeriodRelated: false };
        }
        symptomStats[symptom].count += 1;
        if (intensity !== null) {
          symptomStats[symptom].totalIntensity += intensity;
          symptomStats[symptom].intensityCount += 1;
        }
      }
      // Period-related symptoms
      for (const [symptom, intensity] of Object.entries(entry.periodSymptomIntensities)) {
        if (!symptomStats[symptom]) {
          symptomStats[symptom] = { count: 0, totalIntensity: 0, intensityCount: 0, isPeriodRelated: true };
        }
        symptomStats[symptom].count += 1;
        symptomStats[symptom].isPeriodRelated = true;
        if (intensity !== null) {
          symptomStats[symptom].totalIntensity += intensity;
          symptomStats[symptom].intensityCount += 1;
        }
      }
    }

    return Object.entries(symptomStats)
      .map(([name, data]) => ({
        name,
        count: data.count,
        avgIntensity:
          data.intensityCount > 0
            ? Math.round((data.totalIntensity / data.intensityCount) * 10) / 10
            : null,
        isPeriodRelated: data.isPeriodRelated,
      }))
      .sort((a, b) => b.count - a.count);
  }, [prevMonthEntries]);

  // Stats card comparison - based on current month view
    // Stats card comparison - based on current month view
  const statsComparison = useMemo(
    () => compareMonths(monthEntries, prevMonthEntries),
    [monthEntries, prevMonthEntries]
  );

  // Month-over-month comparison - ALWAYS uses full month data
  // Ignores day/date range selections - those only affect stats cards and charts
  const monthOverMonthComparison = useMemo(
    () => compareMonths(monthEntries, prevMonthEntries),
    [monthEntries, prevMonthEntries]
  );

  // Labels for comparison - always full month labels
  const comparisonLabels = useMemo(() => {
    const currentRange = getMonthRange(monthOffset);
    const prevRange = getMonthRange(monthOffset - 1);
    return {
      current: currentRange.shortLabel,
      previous: prevRange.shortLabel,
    };
  }, [monthOffset]);

  // Build symptom heat map data
  const symptomHeatMapData = useMemo(
    () => buildMonthlySymptomHeatMap(monthEntries, monthOffset),
    [monthEntries, monthOffset]
  );

  // Build Bristol weekly trend data
  const bristolTrendData = useMemo(
    () => buildBristolWeeklyTrend(
      selectedDays.length > 0 ? filteredEntries : monthEntries, 
      monthOffset, 
      weekStartDay
    ),
    [monthEntries, filteredEntries, selectedDays.length, monthOffset, weekStartDay]
  );

  // Build cycle phase × symptom heat map (uses all entries, not just this month)
  const cyclePhaseHeatMapData = useMemo(
    () => buildCyclePhaseSymptomHeatMap(entries),
    [entries]
  );

  // Detect cycles and build comparison
  const detectedCycles = useMemo(
    () => detectCycleBoundaries(entries),
    [entries]
  );

  const cycleComparison = useMemo(
    () => compareCycles(entries, detectedCycles),
    [entries, detectedCycles]
  );

  // Get weeks for the current month (for Bristol trend X-axis)
  const weeksInMonth = useMemo(
    () => getWeeksInMonth(monthOffset, weekStartDay),
    [monthOffset, weekStartDay]
  );

  // Enabled sections config
  const enabledSections = {
    symptoms: symptomsEnabled,
    bowel: stoolTrackingEnabled,
    cycle: periodTrackingEnabled,
    medicine: medicineTrackingEnabled,
  };

  // Days in current month for calendar display
  const daysInMonth = useMemo(() => {
    return monthRange.end.getDate();
  }, [monthRange]);

  if (!isClient) {
    return <MonthlyPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="text-app-gray hover:text-app-charcoal">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-app-charcoal">Monthly View</h1>
        </div>

        {/* Filter count badge */}
        {totalFilterCount > 0 && (
          <span className="text-sm text-app-teal">
            {totalFilterCount} filter{totalFilterCount !== 1 ? "s" : ""} active
          </span>
        )}
      </div>

      {/* Month Navigation */}
      <MonthlyNavigation
        monthRange={monthRange}
        monthOffset={monthOffset}
        canGoNext={canGoNext}
        canGoPrev={canGoPrev}
        onNextMonth={goToNextMonth}
        onPrevMonth={goToPrevMonth}
        onCurrentMonth={goToCurrentMonth}
        hasDataThisMonth={monthEntries.length > 0}
      />

      {/* Filters Section */}
      <div className="card">
        {/* Calendar Day Filter */}
        <MonthCalendarFilter
          monthRange={monthRange}
          daysInMonth={daysInMonth}
          selectedDays={selectedDays}
          onToggleDay={toggleDay}
          onSelectRange={selectRange}
          onSelectAll={selectAllDays}
          entries={monthEntries}
          weekStartDay={weekStartDay}
        />

        {/* Category Filters */}
        <div className="mt-4 pt-4 border-t border-app-border">
          <FilterBar
            filters={filters}
            availableOptions={availableOptions}
            categoryFilterCounts={categoryFilterCounts}
            hasFilters={hasAdvancedFilters}
            onLoadSavedFilter={setFilters}
            toggleSymptom={toggleSymptom}
            toggleCyclePhase={toggleCyclePhase}
            toggleFlowLevel={toggleFlowLevel}
            toggleBristolType={toggleBristolType}
            toggleFeeling={toggleFeeling}
            toggleMedicine={toggleMedicine}
            selectAllSymptoms={selectAllSymptoms}
            selectAllCycle={selectAllCycle}
            selectAllBowel={selectAllBowel}
            selectAllMedicine={selectAllMedicine}
            clearCategory={clearCategory}
            clearAllFilters={clearAllFilters}
            hideSavedFilters={true}
          />
        </div>

        {/* Clear All Filters */}
        {totalFilterCount > 0 && (
          <div className="mt-4 pt-4 border-t border-app-border flex justify-end">
            <button
              onClick={clearAllFiltersAndDays}
              className="text-sm text-app-red hover:text-app-red/80 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Entry Count Summary */}
      {(totalFilterCount > 0 || filteredEntries.length !== monthEntries.length) && (
        <p className="text-sm text-app-gray">
          Showing {filteredEntries.length} of {monthEntries.length} entries this month
        </p>
      )}

      {/* Stats Section - Shown by default, collapsible */}
      <div className="card">
        <button
          onClick={() => setShowStats(!showStats)}
          className="w-full flex items-center justify-between"
        >
          <h2 className="text-lg font-semibold text-app-charcoal">Month at a Glance</h2>
          <span className="text-app-gray text-xl">{showStats ? "−" : "+"}</span>
        </button>

        {showStats && (
          <div className="mt-4 space-y-6">
            {/* Stats Cards */}
            <MonthlyStatsCards
            stats={stats}
            comparison={statsComparison}
            hasPreviousMonthData={prevMonthEntries.length > 0}
            topSymptoms={topSymptoms}
            lastMonthTopSymptoms={lastMonthTopSymptoms}
            periodTrackingEnabled={periodTrackingEnabled}
            currentCyclePhase={cycleData.currentCyclePhase}
            cycleDaysLogged={cycleData.cycleDaysLogged}
            daysInMonth={daysInMonth}
            phaseRanges={phaseRanges}
            selectedDays={selectedDays}
            monthRange={monthRange}
          />

            {/* Charts */}
            <MonthlyCharts
              entries={monthEntries}
              filteredEntries={filteredEntries}
              weeksInMonth={weeksInMonth}
              bristolTrendData={bristolTrendData}
              symptomHeatMapData={symptomHeatMapData}
              cyclePhaseHeatMapData={cyclePhaseHeatMapData}
              enabledSections={enabledSections}
              selectedDays={selectedDays}
              onDayClick={toggleDay}
              customProducts={settings.periodTracking.productTracking?.customProducts}
              medicines={settings.medicineTracking.medicines}
              monthRange={monthRange}
            />

            {/* Month Comparison */}
            <MonthlyComparison
              comparison={monthOverMonthComparison}
              hasPreviousMonthData={prevMonthEntries.length > 0}
              currentMonthLabel={comparisonLabels.current}
              previousMonthLabel={comparisonLabels.previous}
            />
          </div>
        )}
      </div>

      {/* Cycle Insights Section - Only show if period tracking enabled */}
      {periodTrackingEnabled && (
        <div className="card">
          <button
            onClick={() => setShowCycleInsights(!showCycleInsights)}
            className="w-full flex items-center justify-between"
          >
            <div>
            <h2 className="text-lg font-semibold text-app-charcoal flex items-center gap-2">
              <span>🌸</span>
              Cycle Insights
            </h2>
            <p className="text-xs text-app-gray mt-0.5">
              Cycle-to-cycle comparison and patterns
            </p>
          </div>
            <span className="text-app-gray text-xl">{showCycleInsights ? "−" : "+"}</span>
          </button>

          {showCycleInsights && (
            <div className="mt-4">
              <CycleInsights
                detectedCycles={detectedCycles}
                cycleComparison={cycleComparison}
                cyclePhaseHeatMapData={cyclePhaseHeatMapData}
                entries={entries}
              />
            </div>
          )}
        </div>
      )}

      {/* Entry List Section - Shown by default */}
      <div className="card">
        <button
          onClick={() => setShowEntries(!showEntries)}
          className="w-full flex items-center justify-between"
        >
          <div>
            <h2 className="text-lg font-semibold text-app-charcoal">
              Entries ({filteredEntries.length})
            </h2>
            {filteredEntries.length !== monthEntries.length && (
              <p className="text-xs text-app-gray">
                Filtered from {monthEntries.length} total
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* View Toggle (only when expanded) */}
            {showEntries && (
              <div className="flex rounded-lg overflow-hidden border border-app-border">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewMode("cards");
                  }}
                  className={`px-2 py-1 text-xs transition-colors ${
                    viewMode === "cards"
                      ? "bg-app-teal text-white"
                      : "bg-white text-app-charcoal hover:bg-app-cream"
                  }`}
                  title="Card View"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                    />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewMode("table");
                  }}
                  className={`px-2 py-1 text-xs transition-colors ${
                    viewMode === "table"
                      ? "bg-app-teal text-white"
                      : "bg-white text-app-charcoal hover:bg-app-cream"
                  }`}
                  title="Table View"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              </div>
            )}
            <span className="text-app-gray text-xl">{showEntries ? "−" : "+"}</span>
          </div>
        </button>

        {showEntries && (
          <div className="mt-4">
            {filteredEntries.length === 0 ? (
              <EmptyEntriesState
                hasMonthEntries={monthEntries.length > 0}
                hasFilters={totalFilterCount > 0}
                onClearFilters={clearAllFiltersAndDays}
              />
            ) : viewMode === "cards" ? (
              <div className="space-y-3">
                {filteredEntries.map((entry) => (
                  <EntryCard 
                    key={entry.id} 
                    entry={entry} 
                    timeFormat={timeFormat}
                    customProducts={settings.periodTracking.productTracking?.customProducts}
                  />
                ))}
              </div>
            ) : (
              <EntryTable entries={filteredEntries} timeFormat={timeFormat} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// MONTH CALENDAR FILTER COMPONENT
// ============================================

interface MonthCalendarFilterProps {
  monthRange: ReturnType<typeof getMonthRange>;
  daysInMonth: number;
  selectedDays: number[];
  onToggleDay: (day: number) => void;
  onSelectRange: (days: number[]) => void;
  onSelectAll: () => void;
  entries: StoredEntry[];
  weekStartDay: "sunday" | "monday";
}

function MonthCalendarFilter({
  monthRange,
  daysInMonth,
  selectedDays,
  onToggleDay,
  onSelectRange,
  onSelectAll,
  entries,
  weekStartDay,
}: MonthCalendarFilterProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [rangeStart, setRangeStart] = useState<number | null>(null);
  const [hoverDay, setHoverDay] = useState<number | null>(null);

  // Count entries per day and track menstruation days
  const { entriesPerDay, menstruationDays, maxEntries } = useMemo(() => {
    const counts: Record<number, number> = {};
    const menstrualDays = new Set<number>();
    let max = 0;

    for (const entry of entries) {
      const entryDate = new Date(entry.date + "T12:00:00");
      if (
        entryDate.getMonth() === monthRange.month &&
        entryDate.getFullYear() === monthRange.year
      ) {
        const day = entryDate.getDate();
        counts[day] = (counts[day] || 0) + 1;
        if (counts[day] > max) max = counts[day];

        // Check for menstruation (period flow or menstrual phase)
        if (entry.periodFlow || entry.cyclePhase === "menstrual") {
          menstrualDays.add(day);
        }
      }
    }
    return { entriesPerDay: counts, menstruationDays: menstrualDays, maxEntries: max };
  }, [entries, monthRange.month, monthRange.year]);

  // Get intensity level (0-3) for heatmap coloring
  const getIntensityLevel = (count: number): number => {
    if (count === 0) return 0;
    if (maxEntries <= 1) return count > 0 ? 2 : 0;
    const ratio = count / maxEntries;
    if (ratio <= 0.33) return 1;
    if (ratio <= 0.66) return 2;
    return 3;
  };

  // Day labels based on week start preference
  const dayLabels = weekStartDay === "monday" 
    ? ["M", "T", "W", "T", "F", "S", "S"]
    : ["S", "M", "T", "W", "T", "F", "S"];

  // Get day of week for first day of month, adjusted for week start
  const firstDayOfMonth = new Date(monthRange.year, monthRange.month, 1).getDay();
  const firstDayOfWeek = weekStartDay === "monday"
    ? (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1) // Shift Sunday (0) to end (6)
    : firstDayOfMonth;

  // Calculate preview range while hovering
  const previewRange = useMemo(() => {
    if (rangeStart === null || hoverDay === null) return [];
    const start = Math.min(rangeStart, hoverDay);
    const end = Math.max(rangeStart, hoverDay);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [rangeStart, hoverDay]);

  // Handle day click for range selection
  const handleDayClick = (day: number) => {
    if (rangeStart === null) {
      // First click - set range start
      setRangeStart(day);
    } else {
      // Second click - complete the range
      const start = Math.min(rangeStart, day);
      const end = Math.max(rangeStart, day);
      const range = Array.from({ length: end - start + 1 }, (_, i) => start + i);
      onSelectRange(range);
      setRangeStart(null);
    }
  };

  // Handle single day toggle (for when user wants to deselect or toggle individual days)
  const handleDayDoubleClick = (day: number) => {
    setRangeStart(null);
    onToggleDay(day);
  };

  // Cancel range selection
  const cancelRangeSelection = () => {
    setRangeStart(null);
  };

  // Count summary for header
  const totalDaysWithEntries = Object.keys(entriesPerDay).length;
  const totalPeriodDays = menstruationDays.size;

  return (
    <div>
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-2"
      >
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-app-charcoal">Filter by Day</p>
          <span className="text-xs text-app-gray">
            <span className="text-app-red ml-1">{totalPeriodDays} period day{totalPeriodDays !== 1 ? "s" : ""} logged </span>
            • {totalDaysWithEntries} total day{totalDaysWithEntries !== 1 ? "s" : ""} logged
          </span>
        </div>
        <div className="flex items-center gap-2">
          {selectedDays.length > 0 && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onSelectAll();
              }}
              className="text-xs text-app-teal hover:text-app-teal/80 cursor-pointer"
            >
              Clear ({selectedDays.length})
            </span>
          )}
          <svg
            className={`w-4 h-4 text-app-gray transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Collapsible Content */}
      <div
        className={`overflow-hidden transition-all duration-200 ${
          isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="bg-app-cream/50 rounded-lg p-3 border border-app-border">
          {/* Help text */}
          <p className="text-xs text-app-gray/70 text-center mt-2">
            Click once to start range • Click twice to toggle a single day
          </p>
          {/* Day of week headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {dayLabels.map((label, i) => (
              <div key={i} className="text-center text-xs font-medium text-app-gray py-1">
                {label}
              </div>
            ))}
          </div>

          {/* Calendar grid - heatmap style */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-10" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const entryCount = entriesPerDay[day] || 0;
              const hasEntries = entryCount > 0;
              const isMenstruating = menstruationDays.has(day);
              const isSelected = selectedDays.includes(day);
              const isRangeStart = rangeStart === day;
              const isInPreview = previewRange.includes(day);
              const intensity = getIntensityLevel(entryCount);

              // Heatmap background colors based on intensity
              const intensityClasses = [
                "bg-app-white", // 0 - no entries
                "bg-app-teal/20", // 1 - low
                "bg-app-teal/40", // 2 - medium
                "bg-app-teal/60", // 3 - high
              ];

                // Determine background and border classes based on state
                const getButtonClasses = () => {
                  if (isSelected) {
                    return isMenstruating
                      ? "bg-app-red text-white ring-2 ring-app-red ring-offset-1"
                      : "bg-app-teal text-white ring-2 ring-app-teal ring-offset-1";
                  }
                  if (isRangeStart) {
                    return isMenstruating
                      ? "bg-app-red/70 text-white ring-2 ring-app-red"
                      : "bg-app-teal/70 text-white ring-2 ring-app-teal";
                  }
                  if (isInPreview) {
                    return isMenstruating
                      ? "bg-app-red/30 text-app-charcoal ring-1 ring-app-red/50"
                      : "bg-app-teal/30 text-app-charcoal ring-1 ring-app-teal/50";
                  }
                  if (hasEntries) {
                    if (isMenstruating) {
                      return "bg-app-red/30 text-app-charcoal hover:ring-2 hover:ring-app-red/50";
                    }
                    return `${intensityClasses[intensity]} text-app-charcoal hover:ring-2 hover:ring-app-teal/50`;
                  }
                  return "bg-app-white text-app-gray hover:bg-app-cream border border-app-border/50";
                };

                return (
                  <button
                    key={day}
                    onClick={() => handleDayClick(day)}
                    onDoubleClick={() => handleDayDoubleClick(day)}
                    onMouseEnter={() => setHoverDay(day)}
                    onMouseLeave={() => setHoverDay(null)}
                    className={`h-10 rounded-md text-xs font-medium transition-all flex flex-col items-center justify-center gap-0.5 ${getButtonClasses()}`}
                    title={
                      hasEntries
                        ? `${entryCount} ${entryCount === 1 ? "entry" : "entries"}${isMenstruating ? " • Period" : ""}${rangeStart ? " • Click to complete range" : ""}`
                        : rangeStart ? "Click to complete range" : "No entries"
                    }
                  >
                    <span>{day}</span>
                    {/* Indicator dots - consistent size, side by side */}
                    {hasEntries && !isSelected && !isRangeStart && (
                      <div className="flex items-center gap-0.5">
                        {isMenstruating ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-app-red" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-app-teal" />
                        )}
                      </div>
                    )}
                  </button>
                );
            })}
          </div>

          <div className="bg-app-cream/50 rounded-lg p-3">
          {/* Range selection hint */}
          {rangeStart !== null && (
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-app-teal">
                📅 Click another day to complete range (selected: Day {rangeStart})
              </span>
              <button
                onClick={cancelRangeSelection}
                className="text-app-gray hover:text-app-red"
              >
                Cancel
              </button>
            </div>
          )}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-app-border/50">
            {/* Cycle indicators */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-xs text-app-gray">
                <span className="w-1.5 h-1.5 rounded-full bg-app-red" />
                <span>Period</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-app-gray">
                <span className="w-1.5 h-1.5 rounded-full bg-app-teal" />
                <span>Entries</span>
              </div>
            </div>

            {/* Intensity scale */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-app-gray mr-1">Intensity:</span>
              <div className="flex items-center gap-0.5">
                <span className="w-3 h-3 rounded bg-app-teal/20" title="Low" />
                <span className="w-3 h-3 rounded bg-app-teal/40" title="Medium" />
                <span className="w-3 h-3 rounded bg-app-teal/60" title="High" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// ENTRY TABLE COMPONENT
// ============================================

interface EntryTableProps {
  entries: StoredEntry[];
  timeFormat: TimeFormat;
}

function EntryTable({ entries, timeFormat }: EntryTableProps) {
  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <div className="inline-block min-w-full align-middle">
        <table className="min-w-full text-sm">
          <thead className="bg-app-cream border-b border-app-border">
            <tr>
              <th className="text-left p-3 font-medium text-app-charcoal whitespace-nowrap">
                Date
              </th>
              <th className="text-left p-3 font-medium text-app-charcoal whitespace-nowrap">
                Time
              </th>
              <th className="text-left p-3 font-medium text-app-charcoal whitespace-nowrap">
                Symptoms
              </th>
              <th className="text-left p-3 font-medium text-app-charcoal whitespace-nowrap">
                Bristol
              </th>
              <th className="text-left p-3 font-medium text-app-charcoal whitespace-nowrap">
                Cycle
              </th>
              <th className="text-left p-3 font-medium text-app-charcoal whitespace-nowrap">
                Meds
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-app-cream/50 transition-colors">
                <td className="p-3 whitespace-nowrap">
                  <p className="font-medium text-app-charcoal">{formatDateShort(entry.date)}</p>
                  <p className="text-xs text-app-gray">{getDayOfWeek(entry.date)}</p>
                </td>
                <td className="p-3 whitespace-nowrap text-app-gray">
                  {formatTimeForDisplay(entry.startTime, timeFormat)}
                </td>
                <td className="p-3">
                  {Object.keys(entry.symptomIntensities).length +
                    Object.keys(entry.periodSymptomIntensities).length >
                  0 ? (
                    <span className="inline-flex items-center px-2 py-0.5 bg-app-teal/10 text-app-teal text-xs rounded-full">
                      {Object.keys(entry.symptomIntensities).length +
                        Object.keys(entry.periodSymptomIntensities).length}{" "}
                      logged
                    </span>
                  ) : (
                    <span className="text-app-gray">—</span>
                  )}
                </td>
                <td className="p-3 whitespace-nowrap">
                  {entry.stoolType ? (
                    <span className="inline-flex items-center px-2 py-0.5 bg-app-plumb/10 text-app-plumb text-xs rounded-full">
                      Type {entry.stoolType}
                    </span>
                  ) : (
                    <span className="text-app-gray">—</span>
                  )}
                </td>
                <td className="p-3 whitespace-nowrap">
                  {entry.cyclePhase ? (
                    <span className="inline-flex items-center px-2 py-0.5 bg-app-red/10 text-app-red text-xs rounded-full capitalize">
                      {entry.cyclePhase.replace("_", " ")}
                    </span>
                  ) : (
                    <span className="text-app-gray">—</span>
                  )}
                </td>
                <td className="p-3 whitespace-nowrap">
                  {entry.medicineLog.length > 0 ? (
                    <span className="inline-flex items-center px-2 py-0.5 bg-app-taupe/20 text-app-charcoal text-xs rounded-full">
                      {entry.medicineLog.length} taken
                    </span>
                  ) : (
                    <span className="text-app-gray">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================
// EMPTY STATES
// ============================================

interface EmptyEntriesStateProps {
  hasMonthEntries: boolean;
  hasFilters: boolean;
  onClearFilters: () => void;
}

function EmptyEntriesState({ hasMonthEntries, hasFilters, onClearFilters }: EmptyEntriesStateProps) {
  if (hasFilters && hasMonthEntries) {
    return (
      <div className="text-center py-8">
        <span className="text-3xl block mb-2">🔍</span>
        <p className="text-app-charcoal font-medium">No entries match your filters</p>
        <p className="text-sm text-app-gray mt-1">Try adjusting your filters</p>
        <button
          onClick={onClearFilters}
          className="mt-4 px-4 py-2 text-sm bg-app-teal text-white rounded-lg hover:bg-app-teal/90 transition-colors"
        >
          Clear All Filters
        </button>
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      <span className="text-3xl block mb-2">📋</span>
      <p className="text-app-charcoal font-medium">No entries this month</p>
      <p className="text-sm text-app-gray mt-1">Start logging to see your entries here</p>
      <Link
        href="/entry"
        className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-app-teal text-white rounded-lg hover:bg-app-teal/90 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Log Entry
      </Link>
    </div>
  );
}

function MonthlyPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-40 bg-app-border rounded animate-pulse" />
      <div className="h-24 bg-app-border rounded-xl animate-pulse" />
      <div className="h-48 bg-app-border rounded-lg animate-pulse" />
      <div className="h-64 bg-app-border rounded-lg animate-pulse" />
      <div className="h-48 bg-app-border rounded-lg animate-pulse" />
    </div>
  );
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatDateShort(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getDayOfWeek(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[date.getDay()];
}

function formatTimeForDisplay(timeStr: string, format: TimeFormat): string {
  if (!timeStr) return "";

  const [hourStr, minuteStr] = timeStr.split(":");
  const hour = parseInt(hourStr, 10);
  const minute = minuteStr || "00";

  if (format === "24h") {
    return `${hourStr.padStart(2, "0")}:${minute}`;
  }

  // 12h format
  if (hour === 0) return `12:${minute} AM`;
  if (hour === 12) return `12:${minute} PM`;
  if (hour > 12) return `${hour - 12}:${minute} PM`;
  return `${hour}:${minute} AM`;
}

function calculateDuration(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return "—";

  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);

  let startTotal = startHour * 60 + startMin;
  let endTotal = endHour * 60 + endMin;

  // Handle crossing midnight
  if (endTotal < startTotal) {
    endTotal += 24 * 60;
  }

  const duration = endTotal - startTotal;

  if (duration < 60) {
    return `${duration}m`;
  }

  const hours = Math.floor(duration / 60);
  const mins = duration % 60;

  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}