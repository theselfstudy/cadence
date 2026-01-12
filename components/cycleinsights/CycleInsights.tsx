"use client";

import { useState, useMemo } from "react";
import type { StoredEntry } from "@/types";
import { useSettings } from "@/stores/useSettings";

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
  const [activeTab, setActiveTab] = useState<"comparison" | "patterns" | "medicines" | "stool">("comparison");
  // Independent cycle navigation - 0 = most recent cycle pair, -1 = one pair back, etc.
  const [cycleOffset, setCycleOffset] = useState(0);
  
  // Get custom products from settings for product name display
  const periodTracking = useSettings((state) => state.periodTracking);
  const customProducts = periodTracking.productTracking?.customProducts || {};
  // Navigation helpers for cycle-to-cycle comparison
  const maxOffset = Math.max(0, detectedCycles.length - 2); // Need at least 2 cycles for comparison
  const canGoNext = cycleOffset < 0;
  const canGoPrev = detectedCycles.length > 1 && Math.abs(cycleOffset) < maxOffset;
  
  const goToNextCycle = () => {
    if (canGoNext) setCycleOffset(prev => prev + 1);
  };
  const goToPrevCycle = () => {
    if (canGoPrev) setCycleOffset(prev => prev - 1);
  };
  const goToCurrentCycle = () => setCycleOffset(0);

  // Get the cycles for the current offset
  const currentCycleIndex = detectedCycles.length - 1 + cycleOffset;
  const selectedCurrentCycle = detectedCycles[currentCycleIndex] || null;
  const selectedPreviousCycle = currentCycleIndex > 0 ? detectedCycles[currentCycleIndex - 1] : null;

  // Format month labels for navigation
  const getMonthLabel = (dateStr: string | null): string => {
    if (!dateStr) return "—";
    const [year, month] = dateStr.split("-").map(Number);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${monthNames[month - 1]} ${year}`;
  };

  const currentCycleLabel = selectedCurrentCycle ? getMonthLabel(selectedCurrentCycle.startDate) : "—";
  const previousCycleLabel = selectedPreviousCycle ? getMonthLabel(selectedPreviousCycle.startDate) : "—";

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
          <span className="hidden sm:inline">Cycle × Cycle </span>Comparison
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
        <button
          onClick={() => setActiveTab("stool")}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === "stool"
              ? "bg-app-red text-white"
              : "bg-white text-app-charcoal hover:bg-app-cream"
          }`}
        >
          <span className="hidden sm:inline">Phase × </span>Stool
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "comparison" && (
        <CycleComparisonView
          detectedCycles={detectedCycles}
          cycleComparison={cycleComparison}
          selectedCurrentCycle={selectedCurrentCycle}
          selectedPreviousCycle={selectedPreviousCycle}
          currentCycleLabel={currentCycleLabel}
          previousCycleLabel={previousCycleLabel}
          cycleOffset={cycleOffset}
          canGoNext={canGoNext}
          canGoPrev={canGoPrev}
          goToNextCycle={goToNextCycle}
          goToPrevCycle={goToPrevCycle}
          goToCurrentCycle={goToCurrentCycle}
          entries={entries}
          customProducts={customProducts}
        />
      )}
      {activeTab === "patterns" && (
        <PhasePatternView
          cyclePhaseHeatMapData={cyclePhaseHeatMapData}
          entries={entries}
          cycleCount={detectedCycles.length}
        />
      )}
      {activeTab === "medicines" && (
        <PhaseMedicineView entries={entries} cycleCount={detectedCycles.length} />
      )}
      {activeTab === "stool" && (
        <PhaseStoolView entries={entries} cycleCount={detectedCycles.length} />
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
  selectedCurrentCycle: DetectedCycle | null;
  selectedPreviousCycle: DetectedCycle | null;
  currentCycleLabel: string;
  previousCycleLabel: string;
  cycleOffset: number;
  canGoNext: boolean;
  canGoPrev: boolean;
  goToNextCycle: () => void;
  goToPrevCycle: () => void;
  goToCurrentCycle: () => void;
  entries: StoredEntry[];
  customProducts: Record<string, { id: string; name: string }[]>;
}

function CycleComparisonView({ 
  detectedCycles, 
  cycleComparison,
  selectedCurrentCycle,
  selectedPreviousCycle,
  currentCycleLabel,
  previousCycleLabel,
  cycleOffset,
  canGoNext,
  canGoPrev,
  goToNextCycle,
  goToPrevCycle,
  goToCurrentCycle,
  entries,
  customProducts,
}: CycleComparisonViewProps) {
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

  const currentCycle = selectedCurrentCycle;
  const previousCycle = selectedPreviousCycle;
  const hasComparison = previousCycle !== null;
  
  // Check if we're viewing historical data with no previous cycle to compare
  const isHistoricalWithNoComparison = cycleOffset < 0 && !hasComparison;

    return (
    <div className="space-y-4">
      {/* Cycle Navigation */}
            {/* Cycle Navigation Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-app-charcoal">
            Comparing <span className="font-medium">{currentCycleLabel}</span>
            {hasComparison && (
              <> to <span className="font-medium">{previousCycleLabel}</span></>
            )}
          </p>
          <p className="text-xs text-app-gray">Use the arrows to switch months</p>
        </div>
        
        <div className="flex items-center gap-1 ml-2 border-l border-app-border pl-2">
          {/* Previous (Earlier) Button */}
          <button
            onClick={goToPrevCycle}
            disabled={!canGoPrev}
            className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
              canGoPrev 
                ? "text-app-charcoal hover:bg-app-cream" 
                : "text-app-gray/30 cursor-not-allowed"
            }`}
            title="Compare earlier cycles"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Current/Reset Button */}
          <button
            onClick={goToCurrentCycle}
            disabled={cycleOffset === 0}
            className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
              cycleOffset !== 0
                ? "text-app-teal hover:bg-app-teal/10"
                : "text-app-gray/40 cursor-not-allowed"
            }`}
            title="Return to current cycle comparison"
          >
            Current
          </button>

          {/* Next (Later) Button */}
          <button
            onClick={goToNextCycle}
            disabled={!canGoNext}
            className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
              canGoNext 
                ? "text-app-charcoal hover:bg-app-cream" 
                : "text-app-gray/30 cursor-not-allowed"
            }`}
            title="Compare later cycles"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* No comparison data message for historical view */}
      {isHistoricalWithNoComparison && (
        <div className="p-4 bg-app-cream/50 rounded-lg border border-app-border text-center">
          <p className="text-sm text-app-charcoal">
            No data for {previousCycleLabel} to compare with {currentCycleLabel}
          </p>
        </div>
      )}

      {/* Cycle Overview Cards */}
      <div className={`grid gap-4 ${hasComparison ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
        {/* Current Cycle Card */}
        {currentCycle && (
          <CycleCard
            title={`${currentCycleLabel} Cycle`}
            cycle={currentCycle}
            accentColor="red"
            isOngoing={currentCycle.isOngoing}
            entries={entries}
            symptomData={cycleComparison ? cycleComparison.symptoms.current : []}
            flowPattern={cycleComparison ? cycleComparison.flowPattern.current : {}}
            newSymptoms={cycleComparison ? cycleComparison.symptoms.newInCurrent : []}
            customProducts={customProducts}
          />
        )}

        {/* Previous Cycle Card */}
        {hasComparison && previousCycle && cycleComparison && (
          <CycleCard
            title={`${previousCycleLabel} Cycle`}
            cycle={previousCycle}
            accentColor="gray"
            isOngoing={false}
            entries={entries}
            symptomData={cycleComparison.symptoms.previous}
            flowPattern={cycleComparison.flowPattern.previous}
            resolvedSymptoms={cycleComparison.symptoms.resolvedFromPrevious}
            customProducts={customProducts}
          />
        )}
      </div>

      {/* Length Change Summary - compact version */}
      {hasComparison && cycleComparison && cycleComparison.lengthChange !== null && (
        <div className="flex items-center justify-center p-3 bg-app-red/5 rounded-lg">
          <p className="text-sm text-app-charcoal">
            Cycle length: {" "}
            <span className={`font-bold ${
              cycleComparison.lengthChange === 0 
                ? "text-app-gray" 
                : cycleComparison.lengthChange > 0 
                  ? "text-app-red" 
                  : "text-app-teal"
            }`}>
              {cycleComparison.lengthChange === 0 
                ? "Same as previous" 
                : `${cycleComparison.lengthChange > 0 ? "+" : ""}${cycleComparison.lengthChange} days vs previous`
              }
            </span>
          </p>
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
  entries: StoredEntry[];
  /** Symptom data for this cycle */
  symptomData?: { name: string; count: number; avgIntensity: number | null }[];
  /** Flow pattern for this cycle */
  flowPattern?: Record<string, number>;
  /** For current cycle: symptoms new this cycle */
  newSymptoms?: string[];
  /** For previous cycle: symptoms that resolved */
  resolvedSymptoms?: string[];
  /** Custom products map from settings: productType -> CustomProduct[] */
  customProducts?: Record<string, { id: string; name: string }[]>;
}

function CycleCard({ 
  title, 
  cycle, 
  accentColor, 
  isOngoing, 
  entries,
  symptomData = [],
  flowPattern = {},
  newSymptoms = [],
  resolvedSymptoms = [],
  customProducts = {},
}: CycleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const showContent = isExpanded || isHovered;

  // Deduplicate flow days by date
  const uniqueFlowDays = useMemo(() => {
    const seen = new Set<string>();
    return cycle.flowDays.filter(day => {
      if (seen.has(day.date)) return false;
      seen.add(day.date);
      return true;
    });
  }, [cycle.flowDays]);

  const flowDaysCount = uniqueFlowDays.length;

  // Extract products used during this cycle
  const productsUsed = useMemo(() => {
    const endDate = cycle.endDate || new Date().toISOString().split('T')[0];
    const cycleEntries = entries.filter(e => e.date >= cycle.startDate && e.date <= endDate);
    
    const typeLabels: Record<string, string> = {
      'pad': 'Pad',
      'tampon': 'Tampon',
      'cup': 'Cup',
      'disc': 'Disc',
      'liner': 'Liner',
      'period-underwear': 'Period Underwear',
      'other': 'Other',
    };
    
    const productSet = new Set<string>();
    for (const entry of cycleEntries) {
      for (const product of entry.productUsage || []) {
        let label = '';
        let customProduct: { id: string; name: string } | undefined;
        
        // Check if this is a custom product
        if (product.customProductId) {
          // First try the specific product type category
          if (customProducts[product.productType]) {
            customProduct = customProducts[product.productType].find(
              cp => cp.id === product.customProductId
            );
          }
          
          // If not found, search ALL categories (in case type doesn't match)
          if (!customProduct) {
            for (const products of Object.values(customProducts)) {
              const found = products.find(cp => cp.id === product.customProductId);
              if (found) {
                customProduct = found;
                break;
              }
            }
          }
        }
        
        if (customProduct) {
          const typeLabel = typeLabels[product.productType] || product.productType
            .replace(/-/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
          label = `${customProduct.name} (${typeLabel})`;
        }
        
        // Fallback to generic product type if no custom name found
        if (!label) {
          // Format the product type nicely (handle slugified values)
          label = typeLabels[product.productType] || product.productType
            .replace(/-/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
          
          // Filter out invalid size values
          const validSize = product.size && 
            !['yes', 'true', 'false', 'no'].includes(product.size.toLowerCase())
              ? product.size
              : null;
          
          if (validSize) {
            label += ` (${validSize})`;
          }
        }
        
        productSet.add(label);
      }
    }
    return Array.from(productSet);
  }, [cycle.startDate, cycle.endDate, entries, customProducts]);

  // Accent colors matching StatCard style
  const accentBarColor = accentColor === "red" ? "bg-app-red" : "bg-app-gray";
  const borderActiveColor = accentColor === "red" ? "border-app-red" : "border-app-gray";
  const textColor = accentColor === "red" ? "text-app-red" : "text-app-gray";

  // Calculate cycle length display
  const cycleLengthDisplay = cycle.length ?? (isOngoing ? calculateDaysSinceStart(cycle.startDate) : "—");
  const cycleLengthLabel = isOngoing && !cycle.length ? "Day" : "Days";

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
            ? `${borderActiveColor} shadow-md`
            : "border-app-border hover:border-app-gray/30"
        }`}
      >
        {/* Accent bar */}
        <div className={`h-1 ${accentBarColor}`} />

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-app-gray uppercase tracking-wide">
              {title}
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

          {/* Main Stats Row */}
          <div className="flex items-baseline gap-3 mt-1">
            <p className={`text-2xl font-bold ${textColor}`}>
              {cycleLengthDisplay}
            </p>
            <p className="text-sm text-app-gray">{cycleLengthLabel}</p>
            <span className="text-app-gray/40">•</span>
            <p className={`text-lg font-bold ${textColor}`}>{flowDaysCount}</p>
            <p className="text-sm text-app-gray">Flow</p>
          </div>

          {/* Subtext */}
          <p className="text-xs text-app-gray mt-1">
            {formatDateShort(cycle.startDate)} → {cycle.endDate ? formatDateShort(cycle.endDate) : "ongoing"}
          </p>

          {/* Expanded Content */}
          <div
            className={`overflow-hidden transition-all duration-200 ${
              showContent ? "max-h-[600px] mt-3 pt-3 border-t border-app-border" : "max-h-0"
            }`}
          >
            <div className="space-y-3">
              {/* Flow Pattern */}
              {(Object.keys(flowPattern).length > 0 || uniqueFlowDays.length > 0) && (
                <div>
                  <p className="text-xs text-app-gray mb-1">Flow Pattern</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.keys(flowPattern).length > 0 ? (
                      Object.entries(flowPattern)
                        .sort((a, b) => b[1] - a[1])
                        .map(([flow, count]) => (
                          <span
                            key={flow}
                            className={`px-2 py-0.5 text-xs rounded capitalize ${
                              accentColor === "red" 
                                ? "bg-app-red/10 text-app-red" 
                                : "bg-app-gray/10 text-app-gray"
                            }`}
                          >
                            {flow}: {count}d
                          </span>
                        ))
                    ) : (
                      (() => {
                        const flowCounts: Record<string, number> = {};
                        for (const day of uniqueFlowDays) {
                          flowCounts[day.flow] = (flowCounts[day.flow] || 0) + 1;
                        }
                        return Object.entries(flowCounts)
                          .sort((a, b) => b[1] - a[1])
                          .map(([flow, count]) => (
                            <span
                              key={flow}
                              className={`px-2 py-0.5 text-xs rounded capitalize ${
                                accentColor === "red" 
                                  ? "bg-app-red/10 text-app-red" 
                                  : "bg-app-gray/10 text-app-gray"
                              }`}
                            >
                              {flow}: {count}d
                            </span>
                          ));
                      })()
                    )}
                  </div>
                </div>
              )}

              {/* Products Used */}
              {productsUsed.length > 0 && (
                <div>
                  <p className="text-xs text-app-gray mb-1">Products Used</p>
                  <div className="flex flex-wrap gap-1">
                    {productsUsed.map((product) => (
                      <span
                        key={product}
                        className={`px-2 py-0.5 text-xs rounded ${
                          accentColor === "red" 
                            ? "bg-app-red/10 text-app-red" 
                            : "bg-app-gray/10 text-app-gray"
                        }`}
                      >
                        {product}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Symptoms */}
              {symptomData.length > 0 && (
                <div>
                  <p className="text-xs text-app-gray mb-1">Top Symptoms</p>
                  <div className="bg-app-cream rounded-md overflow-hidden">
                    <table className="w-full text-xs">
                      <tbody>
                        {symptomData.slice(0, 5).map((s) => (
                          <tr key={s.name} className="border-b border-app-border/50 last:border-0">
                            <td className="py-1.5 px-2 text-app-charcoal truncate max-w-[120px]" title={s.name}>
                              {s.name}
                            </td>
                            <td className={`py-1.5 px-2 text-right font-medium ${textColor}`}>
                              {s.count}×
                              {s.avgIntensity !== null && (
                                <span className="text-app-gray font-normal ml-1">
                                  ({s.avgIntensity.toFixed(1)})
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* New Symptoms (for current cycle) */}
              {newSymptoms.length > 0 && (
                <div>
                  <p className="text-xs text-app-gray mb-1">New This Cycle</p>
                  <div className="flex flex-wrap gap-1">
                    {newSymptoms.slice(0, 5).map((symptom) => (
                      <span
                        key={symptom}
                        className="px-2 py-0.5 text-xs bg-app-red/10 text-app-red rounded-full"
                      >
                        {symptom}
                      </span>
                    ))}
                    {newSymptoms.length > 5 && (
                      <span className="text-xs text-app-gray">+{newSymptoms.length - 5}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Resolved Symptoms (for previous cycle) */}
              {resolvedSymptoms.length > 0 && (
                <div>
                  <p className="text-xs text-app-gray mb-1">Resolved</p>
                  <div className="flex flex-wrap gap-1">
                    {resolvedSymptoms.slice(0, 5).map((symptom) => (
                      <span
                        key={symptom}
                        className="px-2 py-0.5 text-xs bg-app-teal/10 text-app-teal rounded-full"
                      >
                        {symptom}
                      </span>
                    ))}
                    {resolvedSymptoms.length > 5 && (
                      <span className="text-xs text-app-gray">+{resolvedSymptoms.length - 5}</span>
                    )}
                  </div>
                </div>
              )}

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

              {/* No data fallback */}
              {symptomData.length === 0 && 
               Object.keys(flowPattern).length === 0 && 
               uniqueFlowDays.length === 0 && 
               productsUsed.length === 0 && (
                <p className="text-xs text-app-gray italic">No detailed data for this cycle yet.</p>
              )}
            </div>
          </div>
        </div>
      </button>
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
            <p className="text-xl font-bold text-app-red">{avgFlowDays ?? "—"}</p>
            <p className="text-xs text-app-gray">Avg Flow Days</p>
          </div>
          <div className="text-center p-3 bg-app-red/5 rounded-lg">
            <p className="text-xl font-bold text-app-red">{shortest ?? "—"}</p>
            <p className="text-xs text-app-gray">Shortest</p>
          </div>
          <div className="text-center p-3 bg-app-red/5 rounded-lg">
            <p className="text-xl font-bold text-app-red">{avgLength ?? "—"}</p>
            <p className="text-xs text-app-gray">Avg Length</p>
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
  cycleCount: number;
}

function PhasePatternView({ cyclePhaseHeatMapData, entries, cycleCount }: PhasePatternViewProps) {
  const [activeCell, setActiveCell] = useState<string | null>(null);

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
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-app-charcoal">Phase & Symptom Patterns</h4>
          <span className="text-xs text-app-gray bg-app-cream/50 px-2 py-0.5 rounded-full">
            {cycleCount > 0 
              ? `Based on ${cycleCount} cycle${cycleCount !== 1 ? "s" : ""}`
              : "Based on all logged data"
            }
          </span>
        </div>
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
              <div 
                key={phase} 
                className={`flex-1 min-w-[70px] text-center ${
                  phase === "menstrual" ? "border-x border-t border-app-red/20 rounded-t-lg bg-app-red/5" : ""
                }`}
              >
                <p className={`text-xs font-medium ${
                  phase === "menstrual" ? "text-app-red" : "text-app-charcoal"
                }`}>
                  {phaseLabels[phase]}
                </p>
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
                  const isActive = activeCell === cellKey;
                  const hasData = data && data.count > 0;
                  const intensity = data?.avgIntensity ?? 0;

                  return (
                    <div 
                      key={phase} 
                      className={`flex-1 min-w-[70px] px-1 relative ${
                        phase === "menstrual" ? "border-x border-app-red/20 bg-app-red/5" : ""
                      }`}
                    >
                      <button
                        type="button"
                        onMouseEnter={() => hasData && setActiveCell(cellKey)}
                        onMouseLeave={() => setActiveCell(null)}
                        onClick={() => hasData && setActiveCell(isActive ? null : cellKey)}
                        className={`w-full h-10 rounded-lg transition-all flex items-center justify-center ${
                          hasData
                            ? getPhaseIntensityStyle(intensity, maxIntensity, symptom.isPeriodRelated, phase)
                            : "bg-app-border/30"
                        } ${isActive ? "ring-2 ring-app-charcoal ring-offset-1" : ""} ${
                          hasData ? "cursor-pointer" : "cursor-default"
                        }`}
                      >
                        {hasData && (
                          <span className="text-xs font-medium">
                            {data.avgIntensity !== null ? data.avgIntensity.toFixed(1) : data.count}
                          </span>
                        )}
                      </button>

                      {/* Info blurb dropdown */}
                      {isActive && hasData && (
                        <div className={`absolute left-1/2 -translate-x-1/2 z-30 ${
                          rowIndex <= 2 ? "top-full mt-2" : "bottom-full mb-2"
                        }`}>
                          <div className="bg-app-white border border-app-border rounded-lg shadow-lg min-w-[220px] overflow-hidden">
                            {/* Header */}
                            <div className={`px-3 py-2 border-b border-app-border ${
                              symptom.isPeriodRelated ? "bg-app-red/10" : "bg-app-teal/10"
                            }`}>
                              <p className={`font-semibold text-sm ${
                                symptom.isPeriodRelated ? "text-app-red" : "text-app-teal"
                              }`}>
                                {symptom.symptom}
                              </p>
                              <p className="text-xs text-app-gray">{phaseLabels[phase]} phase</p>
                            </div>
                            {/* Content */}
                            <div className="px-3 py-2 space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-app-gray">Times logged</span>
                                <span className="text-sm font-medium text-app-charcoal">{data.count}</span>
                              </div>
                              {data.avgIntensity !== null && (
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-app-gray">Avg intensity</span>
                                  <span className={`text-sm font-medium ${
                                    symptom.isPeriodRelated ? "text-app-red" : "text-app-teal"
                                  }`}>
                                    {data.avgIntensity.toFixed(1)}/10
                                  </span>
                                </div>
                              )}
                            </div>
                            {/* Arrow */}
                            <div className={`absolute left-1/2 -translate-x-1/2 ${
                              rowIndex <= 2 
                                ? "bottom-full border-8 border-transparent border-b-app-white drop-shadow-sm" 
                                : "top-full border-8 border-transparent border-t-app-white drop-shadow-sm"
                            }`} style={{ filter: rowIndex <= 2 ? undefined : 'drop-shadow(0 1px 1px rgba(0,0,0,0.1))' }} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Bottom border for period column */}
          <div className="flex">
            <div className="w-32 shrink-0" />
            {phases.map((phase) => (
              <div 
                key={phase} 
                className={`flex-1 min-w-[70px] ${
                  phase === "menstrual" ? "border-x border-b border-app-red/20 rounded-b-lg h-1" : ""
                }`}
              />
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
          <span>Period symptoms</span>
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
            <span className={`font-medium ${
              insight.phase === "menstrual" ? "text-app-red" : "text-app-teal"
            }`}>
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
  cycleCount: number;
}

function PhaseMedicineView({ entries, cycleCount }: PhaseMedicineViewProps) {
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

  // Calculate average per medicine per phase
  const getAverageCount = (medicine: string, phase: string): number | null => {
    const data = phaseMedicineData[phase][medicine];
    if (!data || data.count === 0 || cycleCount === 0) return null;
    return Math.round((data.count / cycleCount) * 10) / 10;
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
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-app-charcoal">Phase × Medicine Patterns</h4>
          <span className="text-xs text-app-gray bg-app-cream/50 px-2 py-0.5 rounded-full">
            {cycleCount > 0 
              ? `Based on ${cycleCount} cycle${cycleCount !== 1 ? "s" : ""}`
              : "Based on all logged data"
            }
          </span>
        </div>
        <p className="text-xs text-app-gray mt-0.5">
          See which medicines you tend to take during each cycle phase
        </p>
      </div>

      {/* Phase Summary Cards with Average */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {phaseTotals.map(({ phase, total }) => {
          const avgPerCycle = cycleCount > 0 ? Math.round((total / cycleCount) * 10) / 10 : null;
          return (
            <div
              key={phase}
              className={`p-3 rounded-lg text-center group relative ${
                phase === "menstrual" ? "bg-app-red/10" : "bg-app-green/10"
              }`}
              title={avgPerCycle !== null ? `Average of ${avgPerCycle} per cycle` : ""}
            >
              <p className={`text-lg font-bold ${
                phase === "menstrual" ? "text-app-red" : "text-app-charcoal/50"
              }`}>
                {total}
              </p>
              <p className="text-xs text-app-gray">{phaseLabels[phase]}</p>
              {avgPerCycle !== null && (
                <p className={`text-xs mt-1 ${
                  phase === "menstrual" ? "text-app-red/70" : "text-app-charcoal/50"
                }`}>
                  ~{avgPerCycle}× per cycle
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Heat Map Grid */}
      <div className="overflow-x-auto overflow-y-visible relative">
        <div className="min-w-[400px]">
          {/* Phase Headers */}
          <div className="flex mb-2">
            <div className="w-32 shrink-0" />
            {phases.map((phase) => (
              <div 
                key={phase} 
                className={`flex-1 min-w-[70px] text-center ${
                  phase === "menstrual" ? "border-x border-t border-app-red/20 rounded-t-lg bg-app-red/5" : ""
                }`}
              >
                <p className={`text-xs font-medium ${
                  phase === "menstrual" ? "text-app-red" : "text-app-charcoal"
                }`}>
                  {phaseLabels[phase]}
                </p>
              </div>
            ))}
          </div>

          {/* Medicine Rows */}
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {allMedicines.slice(0, 10).map((medicine) => (
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
                  const hasData = data && data.count > 0;
                  const count = data?.count || 0;
                  const avgPerCycle = getAverageCount(medicine, phase);

                  return (
                    <div 
                      key={phase} 
                      className={`flex-1 min-w-[70px] px-1 relative ${
                        phase === "menstrual" ? "border-x border-app-red/20 bg-app-red/5" : ""
                      }`}
                    >
                      <div
                        className={`w-full h-10 rounded-lg transition-all flex flex-col items-center justify-center ${
                          hasData
                            ? getMedicineIntensityStyle(count, maxCount, phase)
                            : "bg-app-green/5"
                        }`}
                        title={hasData && avgPerCycle !== null && cycleCount > 1
                          ? `Logged ${count} times total across ${cycleCount} cycles (avg ~${avgPerCycle} times per cycle)` 
                          : hasData 
                            ? `Logged ${count} time${count !== 1 ? "s" : ""}`
                            : "No data"
                        }
                      >
                        {hasData && (
                          <>
                            {avgPerCycle !== null && cycleCount > 1 && (
                              <span className="text-[10px] opacity-75 leading-none">~{avgPerCycle}×/cycle</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Bottom border for period column */}
          <div className="flex">
            <div className="w-32 shrink-0" />
            {phases.map((phase) => (
              <div 
                key={phase} 
                className={`flex-1 min-w-[70px] ${
                  phase === "menstrual" ? "border-x border-b border-app-red/20 rounded-b-lg h-1" : ""
                }`}
              />
            ))}
          </div>

          {allMedicines.length > 10 && (
            <p className="text-xs text-app-gray text-center mt-2">
              Showing top 10 of {allMedicines.length} medicines
            </p>
          )}
        </div>
      </div>

      {/* Color meaning */}
      <div className="flex items-center justify-center gap-4 text-xs text-app-gray">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-app-red" />
          <span>Period phase</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-app-green/40" />
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
                <span className="text-app-gray">mostly taken during the</span>
                <span className={`font-medium ${
                  insight.phase === "menstrual" ? "text-app-red" : "text-app-teal"
                }`}>
                  {phaseLabels[insight.phase]} phase
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
// PHASE STOOL VIEW
// ============================================

interface PhaseStoolViewProps {
  entries: StoredEntry[];
  cycleCount: number;
}

function PhaseStoolView({ entries, cycleCount }: PhaseStoolViewProps) {
  const [activeCell, setActiveCell] = useState<string | null>(null);

  // Build phase × stool data
  const { phaseStoolData, bristolTypes, maxCount } = useMemo(() => {
    const data: Record<string, Record<number, { count: number; feelings: string[] }>> = {
      menstrual: {},
      follicular: {},
      ovulation: {},
      luteal: {},
    };

    const typeSet = new Set<number>();
    let max = 0;

    for (const entry of entries) {
      if (!entry.cyclePhase || entry.cyclePhase === "not_sure") continue;
      if (!entry.stoolType) continue;

      typeSet.add(entry.stoolType);

      if (!data[entry.cyclePhase][entry.stoolType]) {
        data[entry.cyclePhase][entry.stoolType] = { count: 0, feelings: [] };
      }
      data[entry.cyclePhase][entry.stoolType].count++;
      if (entry.stoolFeeling) {
        data[entry.cyclePhase][entry.stoolType].feelings.push(entry.stoolFeeling);
      }
      if (data[entry.cyclePhase][entry.stoolType].count > max) {
        max = data[entry.cyclePhase][entry.stoolType].count;
      }
    }

    // Sort Bristol types
    const types = Array.from(typeSet).sort((a, b) => a - b);

    return { phaseStoolData: data, bristolTypes: types, maxCount: max };
  }, [entries]);

  // Check if we have data
  if (bristolTypes.length === 0) {
    return (
      <div className="text-center py-8 bg-app-cream/30 rounded-lg">
        <span className="text-2xl block mb-2">💩</span>
        <p className="text-app-charcoal font-medium">No stool data with cycle phases</p>
        <p className="text-sm text-app-gray mt-1">
          Log bowel movements while tracking your cycle phase to see patterns
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

  const bristolLabels: Record<number, string> = {
    1: "Type 1",
    2: "Type 2",
    3: "Type 3",
    4: "Type 4",
    5: "Type 5",
    6: "Type 6",
    7: "Type 7",
  };

  const bristolDescriptions: Record<number, string> = {
    1: "Hard lumps",
    2: "Lumpy sausage",
    3: "Cracked sausage",
    4: "Smooth snake",
    5: "Soft blobs",
    6: "Mushy",
    7: "Watery",
  };

  // Calculate phase totals for summary
  const phaseTotals = phases.map(phase => ({
    phase,
    total: Object.values(phaseStoolData[phase]).reduce((sum, d) => sum + d.count, 0),
  }));

  // Find insights - which Bristol types are more common in which phases
  const insights = useMemo(() => {
    const results: { type: number; phase: string; count: number; percentage: number }[] = [];

    for (const type of bristolTypes) {
      let maxPhase: string | null = null;
      let maxCount = 0;
      let totalCount = 0;

      for (const phase of phases) {
        const count = phaseStoolData[phase][type]?.count || 0;
        totalCount += count;
        if (count > maxCount) {
          maxCount = count;
          maxPhase = phase;
        }
      }

      if (maxPhase && maxCount >= 2 && totalCount >= 3) {
        const percentage = Math.round((maxCount / totalCount) * 100);
        if (percentage >= 40) {
          results.push({ type, phase: maxPhase, count: maxCount, percentage });
        }
      }
    }

    return results.sort((a, b) => b.percentage - a.percentage).slice(0, 5);
  }, [bristolTypes, phaseStoolData]);

  // Format feeling for display
  const formatFeeling = (feeling: string): string => {
    const feelingLabels: Record<string, string> = {
      complete_relief: "Complete relief",
      partial_relief: "Partial relief",
      incomplete: "Incomplete",
      discomfort: "Discomfort",
      pain: "Pain",
      urgency_remains: "Urgency remains",
    };
    return feelingLabels[feeling] || feeling;
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-app-charcoal">Phase × Stool Patterns</h4>
          <span className="text-xs text-app-gray bg-app-cream/50 px-2 py-0.5 rounded-full">
            {cycleCount > 0 
              ? `Based on ${cycleCount} cycle${cycleCount !== 1 ? "s" : ""}`
              : "Based on all logged data"
            }
          </span>
        </div>
        <p className="text-xs text-app-gray mt-0.5">
          See how your bowel movements correlate with each cycle phase
        </p>
      </div>

      {/* Phase Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {phaseTotals.map(({ phase, total }) => (
          <div
            key={phase}
            className={`p-3 rounded-lg text-center ${
              phase === "menstrual" ? "bg-app-red/10" : "bg-app-teal/10"
            }`}
          >
            <p className={`text-lg font-bold ${
              phase === "menstrual" ? "text-app-red" : "text-app-teal"
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
              <div 
                key={phase} 
                className={`flex-1 min-w-[70px] text-center ${
                  phase === "menstrual" ? "border-x border-t border-app-red/20 rounded-t-lg bg-app-red/5" : ""
                }`}
              >
                <p className={`text-xs font-medium ${
                  phase === "menstrual" ? "text-app-red" : "text-app-charcoal"
                }`}>
                  {phaseLabels[phase]}
                </p>
              </div>
            ))}
          </div>

          {/* Bristol Type Rows */}
          <div className="space-y-1">
            {bristolTypes.map((type, rowIndex) => (
              <div key={type} className="flex items-center">
                {/* Bristol Type Label */}
                <div className="w-32 shrink-0 pr-2">
                  <p className="text-xs text-app-charcoal font-medium">
                    {bristolLabels[type]}
                  </p>
                  <p className="text-xs text-app-gray truncate" title={bristolDescriptions[type]}>
                    {bristolDescriptions[type]}
                  </p>
                </div>

                {/* Phase Cells */}
                {phases.map((phase) => {
                  const data = phaseStoolData[phase][type];
                  const cellKey = `${type}-${phase}`;
                  const isActive = activeCell === cellKey;
                  const hasData = data && data.count > 0;
                  const count = data?.count || 0;

                  return (
                    <div 
                      key={phase} 
                      className={`flex-1 min-w-[70px] px-1 relative ${
                        phase === "menstrual" ? "border-x border-app-red/20 bg-app-red/5" : ""
                      }`}
                    >
                      <button
                        type="button"
                        onMouseEnter={() => hasData && setActiveCell(cellKey)}
                        onMouseLeave={() => setActiveCell(null)}
                        onClick={() => hasData && setActiveCell(isActive ? null : cellKey)}
                        className={`w-full h-10 rounded-lg transition-all flex items-center justify-center ${
                          hasData
                            ? getStoolIntensityStyle(count, maxCount, phase)
                            : "bg-app-border/30"
                        } ${isActive ? "ring-2 ring-app-charcoal ring-offset-1" : ""} ${
                          hasData ? "cursor-pointer" : "cursor-default"
                        }`}
                      >
                        {hasData && (
                          <span className="text-xs font-medium">{count}</span>
                        )}
                      </button>

                      {/* Info blurb dropdown */}
                      {isActive && hasData && (
                        <div className={`absolute left-1/2 -translate-x-1/2 z-30 ${
                          rowIndex <= 2 ? "top-full mt-2" : "bottom-full mb-2"
                        }`}>
                          <div className="bg-app-white border border-app-border rounded-lg shadow-lg min-w-[220px] overflow-hidden">
                            {/* Header */}
                            <div className={`px-3 py-2 border-b border-app-border ${
                              phase === "menstrual" ? "bg-app-red/10" : "bg-app-teal/10"
                            }`}>
                              <p className={`font-semibold text-sm ${
                                phase === "menstrual" ? "text-app-red" : "text-app-teal"
                              }`}>
                                {bristolLabels[type]}
                              </p>
                              <p className="text-xs text-app-gray">
                                {bristolDescriptions[type]} • {phaseLabels[phase]}
                              </p>
                            </div>
                            {/* Content */}
                            <div className="px-3 py-2 space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-app-gray">Times logged</span>
                                <span className="text-sm font-medium text-app-charcoal">{data.count}</span>
                              </div>
                              {data.feelings.length > 0 && (
                                <div>
                                  <span className="text-xs text-app-gray">How you felt</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {[...new Set(data.feelings)].slice(0, 3).map((feeling, i) => (
                                      <span 
                                        key={i}
                                        className={`px-2 py-0.5 text-xs rounded ${
                                          phase === "menstrual" 
                                            ? "bg-app-red/10 text-app-red" 
                                            : "bg-app-teal/10 text-app-teal"
                                        }`}
                                      >
                                        {formatFeeling(feeling)}
                                      </span>
                                    ))}
                                    {[...new Set(data.feelings)].length > 3 && (
                                      <span className="text-xs text-app-gray">
                                        +{[...new Set(data.feelings)].length - 3} more
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            {/* Arrow */}
                            <div className={`absolute left-1/2 -translate-x-1/2 ${
                              rowIndex < bristolTypes.length / 2 
                                ? "bottom-full border-8 border-transparent border-b-app-white drop-shadow-sm" 
                                : "top-full border-8 border-transparent border-t-app-white drop-shadow-sm"
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

          {/* Bottom border for period column */}
          <div className="flex">
            <div className="w-32 shrink-0" />
            {phases.map((phase) => (
              <div 
                key={phase} 
                className={`flex-1 min-w-[70px] ${
                  phase === "menstrual" ? "border-x border-b border-app-red/20 rounded-b-lg h-1" : ""
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Color meaning */}
      <div className="flex items-center justify-center gap-4 text-xs text-app-gray">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-app-red" />
          <span>Period phase</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-app-teal" />
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
                <span className="text-app-teal font-medium">
                  {bristolLabels[insight.type]}
                </span>
                <span className="text-app-gray">tends to peak during the</span>
                <span className={`font-medium ${
                  insight.phase === "menstrual" ? "text-app-red" : "text-app-teal"
                }`}>
                  {phaseLabels[insight.phase]} phase
                </span>
                <span className="text-xs text-app-gray">
                  ({insight.percentage}% of occurrences)
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-app-gray mt-3">
            These patterns can help you understand how your cycle affects your digestion.
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
    if (ratio <= 0.33) return "bg-app-green/15 text-app-charcoal";
    if (ratio <= 0.66) return "bg-app-green/40 text-app-charcoal";
    return "bg-app-green/55 text-white";
  }
}

function getStoolIntensityStyle(count: number, maxCount: number, phase: string): string {
  const ratio = count / maxCount;
  const isPeriod = phase === "menstrual";

  if (isPeriod) {
    if (ratio <= 0.33) return "bg-app-red/30 text-app-red";
    if (ratio <= 0.66) return "bg-app-red/60 text-white";
    return "bg-app-red text-white";
  } else {
    if (ratio <= 0.33) return "bg-app-teal/30 text-app-teal";
    if (ratio <= 0.66) return "bg-app-teal/60 text-white";
    return "bg-app-teal text-white";
  }
}

