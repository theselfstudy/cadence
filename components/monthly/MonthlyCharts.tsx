"use client";

import { useMemo, useState } from "react";
import type { StoredEntry } from "@/types";
import type { 
  WeekWithinMonth, 
  BristolWeekData, 
  MonthlySymptomHeatMapData,
  CyclePhaseSymptomData 
} from "@/lib/monthlyUtils";
import { CYCLE_PHASES } from "@/lib/constants";

// ============================================
// MONTHLY CHARTS
// Tabs: Symptom Frequency | Bristol Trend | Cycle Logs | Medicine Logs
// ============================================

interface MonthlyChartsProps {
  /** All entries for the current month */
  entries: StoredEntry[];
  /** Filtered entries based on day/category selection */
  filteredEntries: StoredEntry[];
  /** Weeks within the current month */
  weeksInMonth: WeekWithinMonth[];
  /** Bristol data grouped by week */
  bristolTrendData: BristolWeekData[];
  /** Symptom heat map data for the month */
  symptomHeatMapData: MonthlySymptomHeatMapData[];
  /** Cycle phase × symptom heat map data */
  cyclePhaseHeatMapData: CyclePhaseSymptomData[];
  /** Which tracking sections are enabled */
  enabledSections: {
    symptoms: boolean;
    bowel: boolean;
    cycle: boolean;
    medicine: boolean;
  };
  /** Currently selected days for filtering */
  selectedDays?: number[];
  /** Callback when a day is clicked */
  onDayClick?: (day: number) => void;
  /** Custom products from settings for name lookup */
  customProducts?: Record<string, { id: string; name: string }[]>;
  /** Medicines from settings to check period category */
  medicines?: { id: string; name: string; categories: string[] }[];
  /** Current month range for date context */
  monthRange?: { year: number; month: number; label: string };
}

export function MonthlyCharts({
  entries,
  filteredEntries,
  weeksInMonth,
  bristolTrendData,
  symptomHeatMapData,
  // cyclePhaseHeatMapData,
  enabledSections,
  selectedDays = [],
  onDayClick,
  customProducts = {},
  medicines = [],
  monthRange,
}: MonthlyChartsProps) {
  const [activeChart, setActiveChart] = useState<"symptoms" | "bristol" | "cycle" | "medicine">("symptoms");

  // Determine which entries to use for charts - filtered if days selected, otherwise full month
  const chartEntries = selectedDays.length > 0 ? filteredEntries : entries;

  // Build chart data from appropriate entries
  const { symptomFrequencyData, cycleData, medicineData } = useMemo(() => {
    return buildChartData(chartEntries, medicines);
  }, [chartEntries, medicines]);

  // Determine which charts are available based on data and settings
  const hasBristolData = bristolTrendData.some(w => w.totalBMs > 0);
  const hasSymptomData = symptomHeatMapData.length > 0;
  const hasCycleData = cycleData.phases.length > 0 || cycleData.flows.length > 0;
  const hasMedicineData = medicineData.medicines.length > 0;

  // Available chart tabs
  const availableTabs: { id: "bristol" | "symptoms" | "cycle" | "medicine"; label: string; icon: string; hasData: boolean }[] = [];

  if (enabledSections.symptoms) {
    availableTabs.push({ id: "symptoms", label: "Symptom Frequency", icon: "🏷️", hasData: hasSymptomData });
  }
  if (enabledSections.bowel) {
    availableTabs.push({ id: "bristol", label: "Bristol Trend", icon: "🧻", hasData: hasBristolData });
  }
  if (enabledSections.cycle) {
    availableTabs.push({ id: "cycle", label: "Cycle Logs", icon: "🌸", hasData: hasCycleData });
  }
  if (enabledSections.medicine) {
    availableTabs.push({ id: "medicine", label: "Medicine Logs", icon: "💊", hasData: hasMedicineData });
  }

  // If no tabs available, don't render
  if (availableTabs.length === 0) {
    return null;
  }

  // Ensure active chart is valid
  const validActiveChart = availableTabs.some((t) => t.id === activeChart)
    ? activeChart
    : availableTabs[0].id;

  return (
    <div className="bg-app-white rounded-xl border border-app-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-app-border bg-app-cream/50">
        <h3 className="text-sm font-semibold text-app-charcoal flex items-center gap-2">
          <span>📅</span>
          Monthly Charts
          {selectedDays.length > 0 && (
            <span className="text-xs font-normal text-app-teal">
              ({selectedDays.length} day{selectedDays.length !== 1 ? "s" : ""} selected)
            </span>
          )}
        </h3>
        <p className="text-xs text-app-gray mt-0.5">
          {selectedDays.length > 0 
            ? "Showing data for selected days only"
            : "Click on the tabs to view each section's data"}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-app-border overflow-x-auto">
        {availableTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveChart(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              validActiveChart === tab.id
                ? "text-app-charcoal border-b-2 border-app-teal bg-app-cream/30"
                : "text-app-gray hover:text-app-charcoal hover:bg-app-cream/20"
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Chart Content */}
      <div className="p-4">
        {validActiveChart === "bristol" && (
          <BristolTrendChart 
            data={bristolTrendData} 
            weeksInMonth={weeksInMonth}
          />
        )}
        {validActiveChart === "symptoms" && (
          <SymptomFrequencyChart 
            data={symptomFrequencyData} 
            heatMapData={symptomHeatMapData}
            selectedDays={selectedDays}
            onDayClick={onDayClick}
          />
        )}
        {validActiveChart === "cycle" && (
          <CycleLogsChart 
            data={cycleData} 
            customProducts={customProducts} 
          />
        )}
        {validActiveChart === "medicine" && (
          <MedicineLogsChart data={medicineData} />
        )}
      </div>
    </div>
  );
}

// ============================================
// BRISTOL TREND CHART (Weekly Breakdown)
// ============================================

interface BristolTrendChartProps {
  data: BristolWeekData[];
  weeksInMonth: WeekWithinMonth[];
}

function BristolTrendChart({ data, weeksInMonth }: BristolTrendChartProps) {
  const [hoveredWeek, setHoveredWeek] = useState<number | null>(null);

  const hasData = data.some(w => w.totalBMs > 0);

  if (!hasData) {
    return (
      <div className="text-center py-8">
        <span className="text-3xl block mb-2">🧻</span>
        <p className="text-app-charcoal font-medium">No bowel data this month</p>
        <p className="text-sm text-app-gray mt-1">Log bowel movements to see weekly trends</p>
      </div>
    );
  }

  // Calculate totals
  const totalBMs = data.reduce((sum, w) => sum + w.totalBMs, 0);
  const allTypes = data.flatMap(w => w.types);
  const avgType = allTypes.length > 0
    ? (allTypes.reduce((a, b) => a + b, 0) / allTypes.length).toFixed(1)
    : "—";
  const totalNormal = data.reduce((sum, w) => sum + w.normalRangeCount, 0);
  const normalPercent = totalBMs > 0 ? Math.round((totalNormal / totalBMs) * 100) : 0;

  // Find max BMs in any week for scaling
  const maxBMs = Math.max(...data.map(w => w.totalBMs), 1);

  return (
    <div>
      <div className="mb-4">
        <h4 className="text-sm font-medium text-app-charcoal">Bristol Weekly Trend</h4>
        <p className="text-xs text-app-gray mt-0.5">
          Bowel movement patterns by week • Hover for details
        </p>
      </div>
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-2 bg-app-plumb/10 rounded-lg text-center">
          <p className="text-lg font-bold text-app-plumb">{totalBMs}</p>
          <p className="text-xs text-app-gray">Total BMs</p>
        </div>
        <div className="p-2 bg-app-plumb/10 rounded-lg text-center">
          <p className="text-lg font-bold text-app-plumb">{normalPercent}%</p>
          <p className="text-xs text-app-gray">Normal (3-4)</p>
        </div>
      </div>

      {/* Weekly Bar Chart */}
      <div className="space-y-3">
        {data.map((weekData, index) => {
          const week = weeksInMonth[index];
          if (!week) return null;

          const isHovered = hoveredWeek === index;
          const barWidth = maxBMs > 0 ? (weekData.totalBMs / maxBMs) * 100 : 0;
          const normalPercent = weekData.totalBMs > 0 
            ? Math.round((weekData.normalRangeCount / weekData.totalBMs) * 100) 
            : 0;

          return (
            <div 
              key={index}
              className={`p-3 rounded-lg border transition-all ${
                isHovered ? "border-app-plumb bg-app-plumb/5" : "border-app-border"
              }`}
              onMouseEnter={() => setHoveredWeek(index)}
              onMouseLeave={() => setHoveredWeek(null)}
            >
              {/* Week label and count */}
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-app-charcoal">{week.label}</p>
                <p className="text-sm text-app-plumb font-medium">
                  {weekData.totalBMs} BM{weekData.totalBMs !== 1 ? "s" : ""}
                </p>
              </div>

              {/* Progress bar */}
              <div className="h-6 bg-app-border/30 rounded-lg relative overflow-hidden">
                {/* Normal range portion (types 3-4) */}
                {weekData.normalRangeCount > 0 && (
                  <div
                    className="absolute left-0 top-0 bottom-0 bg-app-teal/60 transition-all"
                    style={{ width: `${(weekData.normalRangeCount / maxBMs) * 100}%` }}
                  />
                )}
                {/* Non-normal portion */}
                {weekData.totalBMs - weekData.normalRangeCount > 0 && (
                  <div
                    className="absolute top-0 bottom-0 bg-app-plumb/60 transition-all"
                    style={{ 
                      left: `${(weekData.normalRangeCount / maxBMs) * 100}%`,
                      width: `${((weekData.totalBMs - weekData.normalRangeCount) / maxBMs) * 100}%` 
                    }}
                  />
                )}
                {/* Count label */}
                {weekData.totalBMs > 0 && barWidth > 15 && (
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-app-charcoal">
                    {weekData.totalBMs}
                  </span>
                )}
              </div>

              {/* Expanded details on hover */}
              {isHovered && weekData.totalBMs > 0 && (
                <div className="mt-3 pt-3 border-t border-app-border grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-app-gray">Most Common</p>
                    <p className="font-medium text-app-charcoal">
                      {weekData.mostCommonType ? `Type ${weekData.mostCommonType}` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-app-gray">Average</p>
                    <p className="font-medium text-app-charcoal">
                      {weekData.avgType?.toFixed(1) ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-app-gray">Normal Range</p>
                    <p className="font-medium text-app-teal">{normalPercent}%</p>
                  </div>
                  <div>
                    <p className="text-app-gray">Type Breakdown</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {Object.entries(weekData.typeCounts)
                        .sort((a, b) => Number(a[0]) - Number(b[0]))
                        .map(([type, count]) => (
                          <span 
                            key={type} 
                            className={`px-1.5 py-0.5 rounded text-xs ${
                              type === "3" || type === "4" 
                                ? "bg-app-teal/20 text-app-teal" 
                                : "bg-app-plumb/20 text-app-plumb"
                            }`}
                          >
                            T{type}: {count}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-app-gray">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-app-teal/60" />
          <span>Normal (Type 3-4)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-app-plumb/60" />
          <span>Other Types</span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SYMPTOM FREQUENCY CHART
// ============================================

interface SymptomFrequencyData {
  name: string;
  totalCount: number;
  avgIntensity: number | null;
  isPeriodRelated: boolean;
  highestIntensity: number | null;
  highestIntensityDate: string | null;
  lowestIntensity: number | null;
  lowestIntensityDate: string | null;
}


interface SymptomFrequencyChartProps {
  data: SymptomFrequencyData[];
  heatMapData: MonthlySymptomHeatMapData[];
  selectedDays?: number[];
  onDayClick?: (day: number) => void;
}

function SymptomFrequencyChart({ 
  data, 
  heatMapData,
  selectedDays = [],
  onDayClick,
}: SymptomFrequencyChartProps) {
  const [viewMode, setViewMode] = useState<"table" | "heatmap">("heatmap");

  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <span className="text-3xl block mb-2">🏷️</span>
        <p className="text-app-charcoal font-medium">No symptoms this month</p>
        <p className="text-sm text-app-gray mt-1">Log symptoms to see frequency data</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-medium text-app-charcoal">Symptom Frequency</h4>
          <p className="text-xs text-app-gray mt-0.5">
            {viewMode === "table" ? "How often each symptom was logged" : "Daily symptom intensity"}
          </p>
        </div>
        
        {/* View Toggle */}
        <div className="flex rounded-lg overflow-hidden border border-app-border">
          <button
            onClick={() => setViewMode("heatmap")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === "heatmap"
                ? "bg-app-teal text-white"
                : "bg-white text-app-charcoal hover:bg-app-cream"
            }`}
          >
            Heat Map
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === "table"
                ? "bg-app-teal text-white"
                : "bg-white text-app-charcoal hover:bg-app-cream"
            }`}
          >
            Table
          </button>
        </div>
      </div>

      {viewMode === "table" ? (
        <div className="max-h-80 overflow-y-auto border border-app-border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-app-cream sticky top-0">
              <tr>
                <th className="text-left py-2 px-3 font-medium text-app-charcoal">Symptom</th>
                <th className="text-center py-2 px-3 font-medium text-app-charcoal">
                  <span className="block text-xs">Highest</span>
                  <span className="text-app-gray font-normal text-xs">Int / Date</span>
                </th>
                <th className="text-center py-2 px-3 font-medium text-app-charcoal">
                  <span className="block text-xs">Lowest</span>
                  <span className="text-app-gray font-normal text-xs">Int / Date</span>
                </th>
                <th className="text-right py-2 px-3 font-medium text-app-charcoal w-16">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {data.map((item) => {
                // Format date as "Jan 5"
                const formatDateShort = (dateStr: string | null): string => {
                  if (!dateStr) return "—";
                  const [, month, day] = dateStr.split("-").map(Number);
                  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                  return `${monthNames[month - 1]} ${day}`;
                };

                return (
                  <tr key={item.name} className="hover:bg-app-cream/30">
                    <td className="py-2 px-3">
                      <span className={item.isPeriodRelated ? "text-app-red" : "text-app-charcoal"}>
                        {item.name}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      {item.highestIntensity !== null ? (
                        <>
                          <span className="text-app-red font-medium">{item.highestIntensity}</span>
                          <span className="text-app-gray text-xs ml-1">/ {formatDateShort(item.highestIntensityDate)}</span>
                        </>
                      ) : (
                        <span className="text-app-gray">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {item.lowestIntensity !== null ? (
                        <>
                          <span className="text-app-teal font-medium">{item.lowestIntensity}</span>
                          <span className="text-app-gray text-xs ml-1">/ {formatDateShort(item.lowestIntensityDate)}</span>
                        </>
                      ) : (
                        <span className="text-app-gray">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-app-teal font-medium text-right">{item.totalCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <MonthlySymptomHeatMap 
          data={heatMapData} 
          selectedDays={selectedDays}
          onDayClick={onDayClick}
        />
      )}

      <p className="text-xs text-app-gray mt-2 text-center">
        {data.length} symptom{data.length !== 1 ? "s" : ""} tracked this month
      </p>
    </div>
  );
}

// ============================================
// MONTHLY SYMPTOM HEAT MAP
// ============================================

interface MonthlySymptomHeatMapProps {
  data: MonthlySymptomHeatMapData[];
  selectedDays?: number[];
  onDayClick?: (day: number) => void;
}

function MonthlySymptomHeatMap({ data, selectedDays = [], onDayClick }: MonthlySymptomHeatMapProps) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  if (data.length === 0) {
    return (
      <p className="text-xs text-app-gray text-center py-4">No symptom data for heat map</p>
    );
  }

  // Get number of days from first symptom's data
  const daysInMonth = data[0]?.days.length || 31;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Day headers */}
        <div className="flex mb-1">
          <div className="w-28 shrink-0" />
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isSelected = selectedDays.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => onDayClick?.(day)}
                disabled={!onDayClick}
                className={`flex-1 min-w-[18px] text-center text-xs py-1 rounded transition-colors ${
                  isSelected
                    ? "bg-app-teal text-white font-medium"
                    : onDayClick
                      ? "text-app-gray hover:bg-app-cream"
                      : "text-app-gray"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* Symptom rows */}
        <div className="space-y-0.5 max-h-64 overflow-y-auto">
          {data.slice(0, 15).map((symptom) => (
            <div key={symptom.symptom} className="flex items-center">
              <div className="w-28 shrink-0 pr-2">
                <p className="text-xs text-app-charcoal truncate" title={symptom.symptom}>
                  {symptom.symptom}
                </p>
              </div>
              {symptom.days.map((day) => {
                const cellKey = `${symptom.symptom}-${day.day}`;
                const isHovered = hoveredCell === cellKey;
                const isSelected = selectedDays.includes(day.day);

                return (
                  <button
                    key={day.day}
                    type="button"
                    onClick={() => onDayClick?.(day.day)}
                    onMouseEnter={() => setHoveredCell(cellKey)}
                    onMouseLeave={() => setHoveredCell(null)}
                    className={`flex-1 min-w-[18px] h-6 rounded-sm transition-all mx-px ${
                      getIntensityStyle(day.intensity, day.logged)
                    } ${isHovered ? "ring-1 ring-app-charcoal" : ""} ${
                      isSelected ? "ring-1 ring-app-teal" : ""
                    }`}
                    title={getCellTitle(symptom.symptom, day.day, day.intensity, day.logged)}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {data.length > 15 && (
          <p className="text-xs text-app-gray text-center mt-2">
            Showing top 15 of {data.length} symptoms
          </p>
        )}

        {/* Legend */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-app-gray">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-app-border" />
            <span>Not logged</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-app-teal/50" />
            <span>Low intensity</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-app-teal/75" />
            <span>Medium intensity</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-app-teal" />
            <span>High intensity</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// CYCLE LOGS CHART
// ============================================

interface CycleData {
  phases: { phase: string; label: string; count: number }[];
  flows: { flow: string; count: number; dates?: string[] }[];
  dayBreakdown: {
    day: number;
    dateStr: string;
    phase: string | null;
    flow: string | null;
    products: { type: string; customProductId?: string; size?: string }[];
    periodMedicines: { name: string; dosage?: string }[];
    periodSymptoms: { name: string; intensity: number | null }[];
  }[];
}

interface CycleLogsChartProps {
  data: CycleData;
  customProducts?: Record<string, { id: string; name: string }[]>;
}

function CycleLogsChart({ data, customProducts = {} }: CycleLogsChartProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const hasData = data.phases.length > 0 || data.flows.length > 0;

  if (!hasData) {
    return (
      <div className="text-center py-8">
        <span className="text-3xl block mb-2">🌸</span>
        <p className="text-app-charcoal font-medium">No cycle data this month</p>
        <p className="text-sm text-app-gray mt-1">Log cycle data to see patterns</p>
      </div>
    );
  }

  const selectedDayData = selectedDay
    ? data.dayBreakdown.find(d => d.day === selectedDay)
    : null;

  // Helper to get custom product name
  const getProductDisplayName = (product: { type: string; customProductId?: string; size?: string }): string => {
    // Filter out boolean-like or invalid size values
    const validSize = product.size && !["yes", "true", "false", "no"].includes(product.size.toLowerCase())
      ? product.size
      : null;

    if (product.customProductId) {
      // Look up custom product name
      const customProductList = customProducts[product.type] || [];
      const customProduct = customProductList.find(cp => cp.id === product.customProductId);
      if (customProduct) {
        return validSize ? `${customProduct.name} (${validSize})` : customProduct.name;
      }
    }
    // Fallback to formatted type name
    const formattedType = product.type
      .replace(/-/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase());
    return validSize ? `${formattedType} (${validSize})` : formattedType;
  };

  // Deduplicate period symptoms for selected day
  const getDeduplicatedSymptoms = (symptoms: { name: string; intensity: number | null }[]) => {
    const seen = new Map<string, number | null>();
    for (const s of symptoms) {
      // Keep the highest intensity if duplicated
      const existing = seen.get(s.name);
      if (existing === undefined || (s.intensity !== null && (existing === null || s.intensity > existing))) {
        seen.set(s.name, s.intensity);
      }
    }
    return Array.from(seen.entries()).map(([name, intensity]) => ({ name, intensity }));
  };

  // Deduplicate products for selected day
  const getDeduplicatedProducts = (products: { type: string; customProductId?: string; size?: string }[]) => {
    const seen = new Set<string>();
    const unique: { type: string; customProductId?: string; size?: string }[] = [];
    for (const p of products) {
      const key = `${p.type}-${p.customProductId || ""}-${p.size || ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(p);
      }
    }
    return unique;
  };

  return (
    <div>
      <div className="mb-4">
        <h4 className="text-sm font-medium text-app-charcoal">Cycle Logs</h4>
        <p className="text-xs text-app-gray mt-0.5">
          Cycle phases and flow levels
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Phases */}
        {data.phases.length > 0 && (
          <div>
            <p className="text-xs font-medium text-app-gray mb-2">Phases Logged</p>
            <div className="space-y-2">
              {data.phases.map((item) => {
                const isMenstrual = item.phase === "menstrual";
                return (
                  <div
                    key={item.phase}
                    className={`flex items-center justify-between p-2 rounded-lg ${
                      isMenstrual ? "bg-app-red/10" : "bg-app-teal/10"
                    }`}
                  >
                    <span className="text-sm text-app-charcoal">{item.label}</span>
                    <span className={`text-sm font-medium ${isMenstrual ? "text-app-red" : "text-app-teal"}`}>
                      {item.count} days
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Flow Levels */}
        {data.flows.length > 0 && (
          <div>
            <p className="text-xs font-medium text-app-gray mb-2">Flow Levels</p>
            <div className="space-y-2">
              {data.flows.map((item) => {
                // Format dates for display
                const formatFlowDates = (dates?: string[]): string => {
                  if (!dates || dates.length === 0) return "";
                  const sortedDates = [...dates].sort();
                  const formatted = sortedDates.map(d => {
                    const [, month, day] = d.split("-").map(Number);
                    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    return `${monthNames[month - 1]} ${day}`;
                  });
                  
                  if (formatted.length <= 3) {
                    return formatted.join(", ");
                  }
                  return `${formatted[0]}, ${formatted[1]}, +${formatted.length - 2} more`;
                };
                
                return (
                  <div
                    key={item.flow}
                    className="p-2 bg-app-red/5 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-app-charcoal capitalize">{item.flow}</span>
                      <span className="text-sm text-app-red font-medium">{item.count} day{item.count !== 1 ? "s" : ""}</span>
                    </div>
                    {item.dates && item.dates.length > 0 && (
                      <p className="text-xs text-app-gray mt-1">
                        {formatFlowDates(item.dates)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Day breakdown - compact calendar strip */}
      {data.dayBreakdown.some(d => d.phase || d.flow) && (
        <div className="mt-4 pt-4 border-t border-app-border">
          <p className="text-xs font-medium text-app-gray mb-2">By Day (tap for details)</p>
          
          {/* Scrollable horizontal day strip */}
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-1 min-w-max">
              {data.dayBreakdown.map((day) => {
                const hasData = day.phase || day.flow;
                const hasDetails = day.products.length > 0 || day.periodMedicines.length > 0 || day.periodSymptoms.length > 0;
                const isSelected = selectedDay === day.day;
                const isMenstrual = day.phase === "menstrual";

                return (
                  <button
                    key={day.day}
                    type="button"
                    onClick={() => setSelectedDay(isSelected ? null : day.day)}
                    className={`w-8 h-10 rounded-md text-xs transition-all flex flex-col items-center justify-center shrink-0 border ${
                      hasData 
                        ? isMenstrual 
                          ? "bg-app-red/20 text-app-red border-app-red" 
                          : "bg-app-teal/10 text-app-teal border-app-teal"
                        : "bg-app-cream/50 text-app-gray border-transparent"
                    } ${isSelected 
                        ? isMenstrual 
                          ? "ring-2 ring-app-red shadow-md scale-105" 
                          : "ring-2 ring-app-teal shadow-md scale-105"
                        : "hover:scale-105"
                    }`}
                  >
                    <span className="font-medium">{day.day}</span>
                    {hasDetails && (
                      <span className="w-1 h-1 rounded-full mt-0.5 bg-app-green" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend for day strip */}
          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-app-gray">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-app-red/20 border border-app-red" />
              <span>Period</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-app-teal/10 border border-app-teal" />
              <span>Other phases</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-app-green" />
              <span>Has details</span>
            </div>
          </div>

          {/* Selected day details */}
          {selectedDayData && (
            <div className={`mt-3 p-3 rounded-lg border ${
              selectedDayData.phase === "menstrual"
                ? "bg-app-red/5 border-app-red/20"
                : "bg-app-teal/5 border-app-teal/20"
              }`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-app-charcoal">Day {selectedDayData.day}</p>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="text-app-gray hover:text-app-charcoal p-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Phase & Flow row */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-app-gray">Phase</p>
                  <p className="text-app-charcoal font-medium capitalize">
                    {formatCyclePhase(selectedDayData.phase)}
                  </p>
                </div>
                <div>
                  <p className="text-app-gray">Flow</p>
                  <p className="text-app-charcoal font-medium capitalize">
                    {selectedDayData.flow || "—"}
                  </p>
                </div>
              </div>

              {/* Products used - deduplicated with custom names */}
              {selectedDayData.products.length > 0 && (
                <div className={`mt-2 pt-2 border-t ${
                  selectedDayData.phase === "menstrual" ? "border-app-red/20" : "border-app-teal/20"
                }`}>
                  <p className="text-xs text-app-gray mb-1">Products Used</p>
                  <div className="flex flex-wrap gap-1">
                    {getDeduplicatedProducts(selectedDayData.products).map((p, i) => (
                      <span 
                        key={i} 
                        className="px-2 py-0.5 text-xs bg-app-red/10 text-app-red rounded"
                      >
                        {getProductDisplayName(p)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Period symptoms - deduplicated */}
              {selectedDayData.periodSymptoms.length > 0 && (
                <div className={`mt-2 pt-2 border-t ${
                  selectedDayData.phase === "menstrual" ? "border-app-red/20" : "border-app-teal/20"
                }`}>
                  <p className="text-xs text-app-gray mb-1">Period Symptoms</p>
                  <div className="flex flex-wrap gap-1">
                    {getDeduplicatedSymptoms(selectedDayData.periodSymptoms).map((s, i) => (
                      <span 
                        key={i} 
                        className="px-2 py-0.5 text-xs bg-app-red/10 text-app-red rounded"
                      >
                        {s.name}{s.intensity !== null ? ` (${s.intensity})` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Period medicines - deduplicated */}
              {selectedDayData.periodMedicines.length > 0 && (
                <div className={`mt-2 pt-2 border-t ${
                  selectedDayData.phase === "menstrual" ? "border-app-red/20" : "border-app-teal/20"
                }`}>
                  <p className="text-xs text-app-gray mb-1">Period Medicines</p>
                  <div className="flex flex-wrap gap-1">
                    {[...new Map(selectedDayData.periodMedicines.map(m => [m.name, m])).values()].map((m, i) => (
                      <span 
                        key={i} 
                        className="px-2 py-0.5 text-xs bg-app-taupe/20 text-app-charcoal rounded"
                      >
                        {m.name}{m.dosage ? ` (${m.dosage})` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// MEDICINE LOGS CHART
// ============================================

interface MedicineItem {
  name: string;
  count: number;
  dosages: string[];
  daysUsed: number[];
  dosagesByDay: Record<number, string[]>;
}

interface MedicineChartData {
  medicines: MedicineItem[];
  totalDoses: number;
  daysWithMedicine: number;
  timeDistribution: { period: string; count: number }[];
}

interface MedicineLogsChartProps {
  data: MedicineChartData;
}

function MedicineLogsChart({ data }: MedicineLogsChartProps) {
  const [hoveredCell, setHoveredCell] = useState<{ medicine: string; day: number } | null>(null);

  if (data.medicines.length === 0) {
    return (
      <div className="text-center py-8">
        <span className="text-3xl block mb-2">💊</span>
        <p className="text-app-charcoal font-medium">No medicines this month</p>
        <p className="text-sm text-app-gray mt-1">Log medicines to see usage patterns</p>
      </div>
    );
  }

  // Get all days that have any medicine data
  const allDays = [...new Set(data.medicines.flatMap(m => m.daysUsed))].sort((a, b) => a - b);
  
  // If no specific days, create a range from 1-31
  const daysToShow = allDays.length > 0 ? allDays : Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div>
      <div className="mb-4">
        <h4 className="text-sm font-medium text-app-charcoal">Medicine Logs</h4>
        <p className="text-xs text-app-gray mt-0.5">
          Medicine usage patterns this month • Hover for dosage details
        </p>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 bg-app-taupe/10 rounded-lg text-center">
          <p className="text-xl font-bold text-app-taupe">{data.totalDoses}</p>
          <p className="text-xs text-app-gray">Total doses</p>
        </div>
        <div className="p-3 bg-app-taupe/10 rounded-lg text-center">
          <p className="text-xl font-bold text-app-taupe">{data.medicines.length}</p>
          <p className="text-xs text-app-gray">Medicines</p>
        </div>
        <div className="p-3 bg-app-taupe/10 rounded-lg text-center">
          <p className="text-xl font-bold text-app-taupe">{data.daysWithMedicine}</p>
          <p className="text-xs text-app-gray">Days taken</p>
        </div>
      </div>

      {/* Medicine × Day Checkmark Grid */}
      <div className="border border-app-border rounded-lg overflow-visible">
        <div className="overflow-x-auto">
          <div className="min-w-max">
            {/* Header row - Days */}
            <div className="flex bg-app-cream border-b border-app-border">
              <div className="w-32 shrink-0 px-3 py-2 text-xs font-medium text-app-charcoal border-r border-app-border">
                Medicine
              </div>
              <div className="flex">
                {daysToShow.map(day => (
                  <div
                    key={day}
                    className="w-8 shrink-0 py-2 text-center text-xs font-medium text-app-gray border-r border-app-border/50 last:border-r-0"
                  >
                    {day}
                  </div>
                ))}
              </div>
            </div>

            {/* Medicine rows */}
            <div className="max-h-64 overflow-y-auto">
              {data.medicines.map((medicine, idx) => (
                <div 
                  key={medicine.name}
                  className={`flex ${idx % 2 === 0 ? "bg-white" : "bg-app-cream/30"} border-b border-app-border last:border-b-0`}
                >
                  {/* Medicine name */}
                  <div className="w-32 shrink-0 px-3 py-2 border-r border-app-border">
                    <p className="text-xs font-medium text-app-charcoal truncate" title={medicine.name}>
                      {medicine.name}
                    </p>
                    <p className="text-xs text-app-gray">{medicine.count}×</p>
                  </div>

                  {/* Day checkmarks */}
                  <div className="flex">
                    {daysToShow.map(day => {
                      const taken = medicine.daysUsed.includes(day);
                      const dosagesForDay = medicine.dosagesByDay[day] || [];
                      const isHovered = hoveredCell?.medicine === medicine.name && hoveredCell?.day === day;

                      return (
                        <div
                          key={day}
                          className={`w-8 shrink-0 py-2 flex items-center justify-center border-r border-app-border/30 last:border-r-0 relative ${
                            taken ? "bg-app-teal/10" : ""
                          } ${isHovered && taken ? "bg-app-teal/20" : ""}`}
                          onMouseEnter={() => taken && setHoveredCell({ medicine: medicine.name, day })}
                          onMouseLeave={() => setHoveredCell(null)}
                        >
                          {taken && (
                            <svg 
                              className="w-4 h-4 text-app-teal" 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M5 13l4 4L19 7" 
                              />
                            </svg>
                          )}

                          {/* Hover tooltip - position below for first row to avoid clipping */}
                          {isHovered && taken && (
                            <div className={`absolute left-1/2 -translate-x-1/2 z-20 pointer-events-none ${
                              idx === 0 ? "top-full mt-1" : "bottom-full mb-1"
                            }`}>
                              <div className="bg-app-charcoal text-white text-xs rounded-md px-2 py-1.5 whitespace-nowrap shadow-lg">
                                <p className="font-medium">Day {day}</p>
                                {dosagesForDay.length > 0 ? (
                                  <p className="text-app-cream/80">
                                    {[...new Set(dosagesForDay)].join(", ")}
                                  </p>
                                ) : (
                                  <p className="text-app-cream/60 italic">No dosage logged</p>
                                )}
                                {/* Arrow - flip for first row */}
                                <div className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${
                                  idx === 0 
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
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Time of Day Distribution */}
      {data.timeDistribution.length > 0 && (
        <div className="mt-4 pt-4 border-t border-app-border">
          <p className="text-xs font-medium text-app-gray mb-2">Time of Day</p>
          <div className="flex gap-2">
            {[
              { label: "Morning", keys: ["Morning", "Afternoon"] },
              { label: "Evening", keys: ["Evening", "Night"] },
            ].map(({ label, keys }) => {
              const count = keys.reduce(
                (sum, k) => sum + (data.timeDistribution.find(t => t.period === k)?.count || 0),
                0
              );
              const totalCount = data.timeDistribution.reduce((sum, t) => sum + t.count, 0);
              const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;

              return (
                <div key={label} className="flex-1 text-center">
                  <div className="h-12 bg-app-border/30 rounded-lg relative overflow-hidden mb-1">
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-app-taupe/60 transition-all"
                      style={{ height: `${percentage}%` }}
                    />
                    {count > 0 && (
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-app-charcoal">
                        {count}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-app-gray">{label}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex items-center justify-center gap-4 text-xs text-app-gray">
        <div className="flex items-center gap-1.5">
          <svg className="w-3 h-3 text-app-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Medicine taken (hover for dosage)</span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// BUILD CHART DATA HELPER
// ============================================

function buildChartData(
  entries: StoredEntry[],
  medicines: { id: string; name: string; categories: string[] }[] = []
): {
  symptomFrequencyData: SymptomFrequencyData[];
  cycleData: CycleData;
  medicineData: MedicineChartData;
} {
  // ===== SYMPTOM FREQUENCY =====
  const symptomStats: Record<string, { 
    count: number; 
    totalIntensity: number; 
    intensityCount: number; 
    isPeriodRelated: boolean;
    highestIntensity: number | null;
    highestIntensityDate: string | null;
    lowestIntensity: number | null;
    lowestIntensityDate: string | null;
  }> = {};

  for (const entry of entries) {
    for (const [symptom, intensity] of Object.entries(entry.symptomIntensities)) {
      if (!symptomStats[symptom]) {
        symptomStats[symptom] = { 
          count: 0, 
          totalIntensity: 0, 
          intensityCount: 0, 
          isPeriodRelated: false,
          highestIntensity: null,
          highestIntensityDate: null,
          lowestIntensity: null,
          lowestIntensityDate: null,
        };
      }
      symptomStats[symptom].count++;
      if (intensity !== null) {
        symptomStats[symptom].totalIntensity += intensity;
        symptomStats[symptom].intensityCount++;
        
        // Track highest intensity
        if (symptomStats[symptom].highestIntensity === null || intensity > symptomStats[symptom].highestIntensity) {
          symptomStats[symptom].highestIntensity = intensity;
          symptomStats[symptom].highestIntensityDate = entry.date;
        }
        // Track lowest intensity
        if (symptomStats[symptom].lowestIntensity === null || intensity < symptomStats[symptom].lowestIntensity) {
          symptomStats[symptom].lowestIntensity = intensity;
          symptomStats[symptom].lowestIntensityDate = entry.date;
        }
      }
    }
    for (const [symptom, intensity] of Object.entries(entry.periodSymptomIntensities)) {
      if (!symptomStats[symptom]) {
        symptomStats[symptom] = { 
          count: 0, 
          totalIntensity: 0, 
          intensityCount: 0, 
          isPeriodRelated: true,
          highestIntensity: null,
          highestIntensityDate: null,
          lowestIntensity: null,
          lowestIntensityDate: null,
        };
      }
      symptomStats[symptom].count++;
      symptomStats[symptom].isPeriodRelated = true;
      if (intensity !== null) {
        symptomStats[symptom].totalIntensity += intensity;
        symptomStats[symptom].intensityCount++;
        
        // Track highest intensity
        if (symptomStats[symptom].highestIntensity === null || intensity > symptomStats[symptom].highestIntensity) {
          symptomStats[symptom].highestIntensity = intensity;
          symptomStats[symptom].highestIntensityDate = entry.date;
        }
        // Track lowest intensity
        if (symptomStats[symptom].lowestIntensity === null || intensity < symptomStats[symptom].lowestIntensity) {
          symptomStats[symptom].lowestIntensity = intensity;
          symptomStats[symptom].lowestIntensityDate = entry.date;
        }
      }
    }
  }

  const symptomFrequencyData: SymptomFrequencyData[] = Object.entries(symptomStats)
    .map(([name, data]) => ({
      name,
      totalCount: data.count,
      avgIntensity: data.intensityCount > 0
        ? Math.round((data.totalIntensity / data.intensityCount) * 10) / 10
        : null,
      isPeriodRelated: data.isPeriodRelated,
      highestIntensity: data.highestIntensity,
      highestIntensityDate: data.highestIntensityDate,
      lowestIntensity: data.lowestIntensity,
      lowestIntensityDate: data.lowestIntensityDate,
    }))
    .sort((a, b) => b.totalCount - a.totalCount);

  // ===== CYCLE DATA ===== Use maps to deduplicate by date (day of month)
  const dayBreakdownMap: Record<number, {
    day: number;
    dateStr: string;
    phase: string | null;
    flow: string | null;
    products: { type: string; customProductId?: string; size?: string }[];
    periodMedicines: { name: string; dosage?: string }[];
    periodSymptoms: { name: string; intensity: number | null }[];
  }> = {};

  // Track unique date -> phase/flow for accurate counting
  const dateToPhase: Record<string, string> = {};
  const dateToFlow: Record<string, string> = {};

  for (const entry of entries) {
    const entryDate = new Date(entry.date + "T12:00:00");
    const day = entryDate.getDate();

    if (!dayBreakdownMap[day]) {
      dayBreakdownMap[day] = {
        day,
        dateStr: entry.date,
        phase: null,
        flow: null,
        products: [],
        periodMedicines: [],
        periodSymptoms: [],
      };
    }

    if (entry.cyclePhase) {
      dateToPhase[entry.date] = entry.cyclePhase;
      dayBreakdownMap[day].phase = entry.cyclePhase;
    }
    if (entry.periodFlow) {
      dateToFlow[entry.date] = entry.periodFlow;
      dayBreakdownMap[day].flow = entry.periodFlow;
    }

    // Products
    if (entry.productUsage) {
      for (const product of entry.productUsage) {
        dayBreakdownMap[day].products.push({
          type: product.productType,
          customProductId: product.customProductId,
          size: product.size,
        });
      }
    }

    // Period medicines
    for (const med of entry.medicineLog) {
      const medicineSettings = medicines.find(m => m.id === med.medicineId || m.name === med.medicineName);
      if (medicineSettings?.categories.includes("period")) {
        dayBreakdownMap[day].periodMedicines.push({
          name: med.medicineName,
          dosage: med.dosage,
        });
      }
    }

    // Period symptoms
    for (const [symptom, intensity] of Object.entries(entry.periodSymptomIntensities)) {
      dayBreakdownMap[day].periodSymptoms.push({ name: symptom, intensity });
    }
  }

  // Count phases by unique dates (not entries)
  const phaseCounts: Record<string, number> = {};
  for (const phase of Object.values(dateToPhase)) {
    phaseCounts[phase] = (phaseCounts[phase] || 0) + 1;
  }

  // Count flows by unique dates and track which dates
  const flowCounts: Record<string, { count: number; dates: string[] }> = {};
  for (const [date, flow] of Object.entries(dateToFlow)) {
    if (!flowCounts[flow]) {
      flowCounts[flow] = { count: 0, dates: [] };
    }
    flowCounts[flow].count++;
    flowCounts[flow].dates.push(date);
  }

  // Define phase order: Menstrual, Follicular, Ovulation, Luteal, Not Sure
  const phaseOrder = ["menstrual", "follicular", "ovulation", "luteal", "not_sure"];
  
  const cycleData: CycleData = {
    phases: phaseOrder
      .filter(phase => phaseCounts[phase] !== undefined)
      .map(phase => ({
        phase,
        label: CYCLE_PHASES.find(p => p.value === phase)?.label || phase,
        count: phaseCounts[phase],
      })),
    flows: Object.entries(flowCounts)
      .map(([flow, data]) => ({ 
        flow, 
        count: data.count,
        dates: data.dates.sort(),
      }))
      .sort((a, b) => b.count - a.count),
    dayBreakdown: Object.values(dayBreakdownMap).sort((a, b) => a.day - b.day),
  };

  // ===== MEDICINE DATA =====
  const medicineMap: Record<string, {
    count: number;
    dosages: string[];
    daysUsed: Set<number>;
    dosagesByDay: Record<number, string[]>;
  }> = {};
  const daysWithMedicine = new Set<string>();
  const timeDistribution: Record<string, number> = {};

  for (const entry of entries) {
    for (const log of entry.medicineLog) {
      if (!medicineMap[log.medicineName]) {
        medicineMap[log.medicineName] = { count: 0, dosages: [], daysUsed: new Set(), dosagesByDay: {} };
      }

      medicineMap[log.medicineName].count++;
      if (log.dosage) {
        medicineMap[log.medicineName].dosages.push(log.dosage);
      }

      const entryDate = new Date(entry.date + "T12:00:00");
      const dayOfMonth = entryDate.getDate();
      medicineMap[log.medicineName].daysUsed.add(dayOfMonth);

      // Track dosage for this specific day
      if (log.dosage) {
        if (!medicineMap[log.medicineName].dosagesByDay[dayOfMonth]) {
          medicineMap[log.medicineName].dosagesByDay[dayOfMonth] = [];
        }
        medicineMap[log.medicineName].dosagesByDay[dayOfMonth].push(log.dosage);
      }
      daysWithMedicine.add(entry.date);

      // Time of day
      let hour: number | null = null;
      if (log.time) {
        hour = log.time.period === "PM" && log.time.hour !== 12
          ? log.time.hour + 12
          : log.time.period === "AM" && log.time.hour === 12
            ? 0
            : log.time.hour;
      } else if (entry.startTime) {
        const [hourStr] = entry.startTime.split(":");
        hour = parseInt(hourStr, 10);
      }

      if (hour !== null) {
        let period: string;
        if (hour >= 5 && hour < 12) period = "Morning";
        else if (hour >= 12 && hour < 17) period = "Afternoon";
        else if (hour >= 17 && hour < 21) period = "Evening";
        else period = "Night";
        timeDistribution[period] = (timeDistribution[period] || 0) + 1;
      }
    }
  }

  const medicineData: MedicineChartData = {
    medicines: Object.entries(medicineMap)
      .map(([name, data]) => ({
        name,
        count: data.count,
        dosages: data.dosages,
        daysUsed: Array.from(data.daysUsed).sort((a, b) => a - b),
        dosagesByDay: data.dosagesByDay,
      }))
      .sort((a, b) => b.count - a.count),
    totalDoses: Object.values(medicineMap).reduce((sum, m) => sum + m.count, 0),
    daysWithMedicine: daysWithMedicine.size,
    timeDistribution: Object.entries(timeDistribution)
      .map(([period, count]) => ({ period, count }))
      .sort((a, b) => {
        const order = ["Morning", "Afternoon", "Evening", "Night"];
        return order.indexOf(a.period) - order.indexOf(b.period);
      }),
  };

  return { symptomFrequencyData, cycleData, medicineData };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getIntensityStyle(intensity: number | null, logged: boolean): string {
  if (!logged) return "bg-app-border";
  if (intensity === null) return "bg-app-teal/30";
  if (intensity <= 3) return "bg-app-teal/50";
  if (intensity <= 6) return "bg-app-teal/75";
  return "bg-app-teal";
}

function getCellTitle(
  symptom: string,
  day: number,
  intensity: number | null,
  logged: boolean
): string {
  if (!logged) return `${symptom} - Day ${day}: Not logged`;
  if (intensity === null) return `${symptom} - Day ${day}: Logged (no intensity)`;
  return `${symptom} - Day ${day}: Intensity ${intensity}/10`;
}

function formatCyclePhase(phase: string | null): string {
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