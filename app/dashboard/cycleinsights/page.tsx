"use client";

import { CycleInsightsPage } from "@/components/cycleinsights";

export default function CycleInsightsRoute() {
  return <CycleInsightsPage />;
}

// "use client";

// import { useState, useMemo, useEffect } from "react";
// import Link from "next/link";

// import { useEntries } from "@/stores/useEntries";
// import { useSettings } from "@/stores/useSettings";

// import { CycleInsights } from "@/components/cycleinsights";

// import type { StoredEntry } from "@/types";
// import type { 
//   DetectedCycle, 
//   CycleComparison, 
//   CyclePhaseSymptomData 
// } from "@/lib/monthlyUtils";

// // ============================================
// // CYCLE INSIGHTS PAGE
// // Deep dive into cycle patterns across all data
// // ============================================

// export default function CycleInsightsPage() {
//   const [isClient, setIsClient] = useState(false);

//   // Store data
//   const entries = useEntries((state) => state.entries);
//   const periodTrackingEnabled = useSettings((state) => state.periodTracking.enabled);

//   useEffect(() => {
//     setIsClient(true);
//   }, []);

//   // Detect cycles from all entries
//   const detectedCycles = useMemo(() => {
//     return detectCyclesFromEntries(entries);
//   }, [entries]);

//   // Build cycle comparison between most recent cycles
//   const cycleComparison = useMemo(() => {
//     if (detectedCycles.length < 2) return null;
//     const currentCycle = detectedCycles[detectedCycles.length - 1];
//     const previousCycle = detectedCycles[detectedCycles.length - 2];
//     return buildCycleComparison(currentCycle, previousCycle, entries);
//   }, [detectedCycles, entries]);

//   // Build phase × symptom heat map data
//   const cyclePhaseHeatMapData = useMemo(() => {
//     return buildPhaseSymptomHeatMap(entries);
//   }, [entries]);

//   if (!isClient) {
//     return <CycleInsightsPageSkeleton />;
//   }

//   // If period tracking is not enabled, show message
//   if (!periodTrackingEnabled) {
//     return (
//       <div className="space-y-6">
//         <PageHeader />
//         <div className="card text-center py-12">
//           <span className="text-4xl block mb-3">🌸</span>
//           <h2 className="text-xl font-semibold text-app-charcoal mb-2">
//             Period Tracking Not Enabled
//           </h2>
//           <p className="text-app-gray mb-4">
//             Enable period tracking in settings to access cycle insights.
//           </p>
//           <Link
//             href="/settings"
//             className="inline-flex items-center gap-2 px-4 py-2 bg-app-red text-white rounded-lg hover:bg-app-red/90 transition-colors"
//           >
//             Go to Settings
//           </Link>
//         </div>
//       </div>
//     );
//   }

//   // If no cycle data at all
//   if (detectedCycles.length === 0 && cyclePhaseHeatMapData.length === 0) {
//     return (
//       <div className="space-y-6">
//         <PageHeader />
//         <div className="card text-center py-12">
//           <span className="text-4xl block mb-3">📅</span>
//           <h2 className="text-xl font-semibold text-app-charcoal mb-2">
//             No Cycle Data Yet
//           </h2>
//           <p className="text-app-gray mb-4">
//             Start logging period flow and cycle phases to see insights here.
//           </p>
//           <Link
//             href="/entry"
//             className="inline-flex items-center gap-2 px-4 py-2 bg-app-red text-white rounded-lg hover:bg-app-red/90 transition-colors"
//           >
//             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//             </svg>
//             Log Entry
//           </Link>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-6">
//       <PageHeader />

//       {/* Summary Stats */}
//       <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
//         <SummaryCard
//           label="Cycles Tracked"
//           value={detectedCycles.length}
//           icon="🔄"
//         />
//         <SummaryCard
//           label="Avg Cycle Length"
//           value={calculateAvgCycleLength(detectedCycles)}
//           suffix="days"
//           icon="📏"
//         />
//         <SummaryCard
//           label="Avg Flow Days"
//           value={calculateAvgFlowDays(detectedCycles)}
//           suffix="days"
//           icon="💧"
//         />
//         <SummaryCard
//           label="Symptoms Tracked"
//           value={cyclePhaseHeatMapData.length}
//           icon="🏷️"
//         />
//       </div>

//       {/* Main Insights Component */}
//       <div className="card">
//         <CycleInsights
//           detectedCycles={detectedCycles}
//           cycleComparison={cycleComparison}
//           cyclePhaseHeatMapData={cyclePhaseHeatMapData}
//           entries={entries}
//         />
//       </div>
//     </div>
//   );
// }

// // ============================================
// // PAGE HEADER
// // ============================================

// function PageHeader() {
//   return (
//     <div className="flex items-center justify-between">
//       <div className="flex items-center gap-2">
//         <Link href="/dashboard" className="text-app-gray hover:text-app-charcoal">
//           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
//           </svg>
//         </Link>
//         <div>
//           <h1 className="text-2xl font-bold text-app-charcoal">Cycle Insights</h1>
//           <p className="text-sm text-app-gray">Deep dive into your cycle patterns</p>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ============================================
// // SUMMARY CARD
// // ============================================

// interface SummaryCardProps {
//   label: string;
//   value: number | string;
//   suffix?: string;
//   icon: string;
// }

// function SummaryCard({ label, value, suffix, icon }: SummaryCardProps) {
//   return (
//     <div className="bg-app-white rounded-xl border border-app-border p-4">
//       <div className="flex items-start justify-between">
//         <span className="text-xl">{icon}</span>
//       </div>
//       <p className="text-2xl font-bold text-app-red mt-2">
//         {value}
//         {suffix && <span className="text-sm font-normal text-app-gray ml-1">{suffix}</span>}
//       </p>
//       <p className="text-xs text-app-gray mt-1">{label}</p>
//     </div>
//   );
// }

// // ============================================
// // SKELETON LOADER
// // ============================================

// function CycleInsightsPageSkeleton() {
//   return (
//     <div className="space-y-6">
//       <div className="h-8 w-48 bg-app-border rounded animate-pulse" />
//       <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
//         {[...Array(4)].map((_, i) => (
//           <div key={i} className="h-24 bg-app-border rounded-xl animate-pulse" />
//         ))}
//       </div>
//       <div className="h-96 bg-app-border rounded-lg animate-pulse" />
//     </div>
//   );
// }

// // ============================================
// // CYCLE DETECTION & DATA BUILDING
// // ============================================

// /**
//  * Detect cycle boundaries from entries based on flow data
//  * A new cycle starts when flow is logged after 5+ days without flow
//  */
// function detectCyclesFromEntries(entries: StoredEntry[]): DetectedCycle[] {
//   // Filter entries with flow data and sort by date
//   const flowEntries = entries
//     .filter(e => e.periodFlow)
//     .sort((a, b) => a.date.localeCompare(b.date));

//   if (flowEntries.length === 0) return [];

//   const cycles: DetectedCycle[] = [];
//   let currentCycle: DetectedCycle | null = null;

//   for (const entry of flowEntries) {
//     const entryDate = new Date(entry.date + "T12:00:00");

//     if (!currentCycle) {
//       // Start first cycle
//       currentCycle = {
//         startDate: entry.date,
//         endDate: null,
//         length: null,
//         flowDays: [{ date: entry.date, flow: entry.periodFlow! }],
//         phasesLogged: {},
//         isOngoing: true,
//       };
//       if (entry.cyclePhase) {
//         currentCycle.phasesLogged[entry.cyclePhase] = 1;
//       }
//     } else {
//       // Check if this is a new cycle (5+ days gap)
//       const lastFlowDate = new Date(currentCycle.flowDays[currentCycle.flowDays.length - 1].date + "T12:00:00");
//       const daysDiff = Math.floor((entryDate.getTime() - lastFlowDate.getTime()) / (1000 * 60 * 60 * 24));

//       if (daysDiff >= 5) {
//         // End previous cycle
//         currentCycle.endDate = currentCycle.flowDays[currentCycle.flowDays.length - 1].date;
//         currentCycle.isOngoing = false;
        
//         // Calculate cycle length
//         const startDate = new Date(currentCycle.startDate + "T12:00:00");
//         const endDate = new Date(entry.date + "T12:00:00");
//         currentCycle.length = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
//         cycles.push(currentCycle);

//         // Start new cycle
//         currentCycle = {
//           startDate: entry.date,
//           endDate: null,
//           length: null,
//           flowDays: [{ date: entry.date, flow: entry.periodFlow! }],
//           phasesLogged: {},
//           isOngoing: true,
//         };
//       } else {
//         // Continue current cycle
//         // Only add if not a duplicate date
//         if (!currentCycle.flowDays.some(d => d.date === entry.date)) {
//           currentCycle.flowDays.push({ date: entry.date, flow: entry.periodFlow! });
//         }
//       }

//       // Track phases
//       if (entry.cyclePhase) {
//         currentCycle.phasesLogged[entry.cyclePhase] = (currentCycle.phasesLogged[entry.cyclePhase] || 0) + 1;
//       }
//     }
//   }

//   // Don't forget the last cycle
//   if (currentCycle) {
//     cycles.push(currentCycle);
//   }

//   return cycles;
// }

// /**
//  * Build comparison data between two cycles
//  */
// function buildCycleComparison(
//   currentCycle: DetectedCycle,
//   previousCycle: DetectedCycle,
//   entries: StoredEntry[]
// ): CycleComparison {
//   // Get entries for each cycle
//   const currentEnd = currentCycle.endDate || new Date().toISOString().split('T')[0];
//   const currentEntries = entries.filter(e => e.date >= currentCycle.startDate && e.date <= currentEnd);
//   const previousEntries = entries.filter(e => e.date >= previousCycle.startDate && e.date <= (previousCycle.endDate || previousCycle.startDate));

//   // Build symptom data for current cycle
//   const currentSymptoms = buildSymptomData(currentEntries);
//   const previousSymptoms = buildSymptomData(previousEntries);

//   // Find new and resolved symptoms
//   const currentSymptomNames = new Set(currentSymptoms.map(s => s.name));
//   const previousSymptomNames = new Set(previousSymptoms.map(s => s.name));
  
//   const newInCurrent = currentSymptoms
//     .filter(s => !previousSymptomNames.has(s.name))
//     .map(s => s.name);
//   const resolvedFromPrevious = previousSymptoms
//     .filter(s => !currentSymptomNames.has(s.name))
//     .map(s => s.name);

//   // Build flow pattern
//   const currentFlowPattern: Record<string, number> = {};
//   const previousFlowPattern: Record<string, number> = {};
  
//   for (const day of currentCycle.flowDays) {
//     currentFlowPattern[day.flow] = (currentFlowPattern[day.flow] || 0) + 1;
//   }
//   for (const day of previousCycle.flowDays) {
//     previousFlowPattern[day.flow] = (previousFlowPattern[day.flow] || 0) + 1;
//   }

//   // Length change
//   const lengthChange = currentCycle.length !== null && previousCycle.length !== null
//     ? currentCycle.length - previousCycle.length
//     : null;

//   return {
//     currentCycle,
//     previousCycle,
//     lengthChange,
//     symptoms: {
//       current: currentSymptoms,
//       previous: previousSymptoms,
//       newInCurrent,
//       resolvedFromPrevious,
//     },
//     flowPattern: {
//       current: currentFlowPattern,
//       previous: previousFlowPattern,
//     },
//   };
// }

// /**
//  * Build symptom data from entries
//  */
// function buildSymptomData(entries: StoredEntry[]): { name: string; count: number; avgIntensity: number | null }[] {
//   const symptomMap: Record<string, { count: number; totalIntensity: number; intensityCount: number }> = {};

//   for (const entry of entries) {
//     // Regular symptoms
//     for (const [name, intensity] of Object.entries(entry.symptomIntensities)) {
//       if (!symptomMap[name]) {
//         symptomMap[name] = { count: 0, totalIntensity: 0, intensityCount: 0 };
//       }
//       symptomMap[name].count++;
//       if (intensity !== null) {
//         symptomMap[name].totalIntensity += intensity;
//         symptomMap[name].intensityCount++;
//       }
//     }
    
//     // Period symptoms
//     for (const [name, intensity] of Object.entries(entry.periodSymptomIntensities)) {
//       if (!symptomMap[name]) {
//         symptomMap[name] = { count: 0, totalIntensity: 0, intensityCount: 0 };
//       }
//       symptomMap[name].count++;
//       if (intensity !== null) {
//         symptomMap[name].totalIntensity += intensity;
//         symptomMap[name].intensityCount++;
//       }
//     }
//   }

//   return Object.entries(symptomMap)
//     .map(([name, data]) => ({
//       name,
//       count: data.count,
//       avgIntensity: data.intensityCount > 0 
//         ? Math.round((data.totalIntensity / data.intensityCount) * 10) / 10 
//         : null,
//     }))
//     .sort((a, b) => b.count - a.count);
// }

// /**
//  * Build phase × symptom heat map data
//  */
// function buildPhaseSymptomHeatMap(entries: StoredEntry[]): CyclePhaseSymptomData[] {
//   const phases = ["menstrual", "follicular", "ovulation", "luteal"];
//   const symptomMap: Record<string, { 
//     isPeriodRelated: boolean; 
//     phases: Record<string, { count: number; totalIntensity: number; intensityCount: number }> 
//   }> = {};

//   for (const entry of entries) {
//     if (!entry.cyclePhase || entry.cyclePhase === "not_sure") continue;

//     // Regular symptoms
//     for (const [name, intensity] of Object.entries(entry.symptomIntensities)) {
//       if (!symptomMap[name]) {
//         symptomMap[name] = { 
//           isPeriodRelated: false, 
//           phases: Object.fromEntries(phases.map(p => [p, { count: 0, totalIntensity: 0, intensityCount: 0 }])) 
//         };
//       }
//       symptomMap[name].phases[entry.cyclePhase].count++;
//       if (intensity !== null) {
//         symptomMap[name].phases[entry.cyclePhase].totalIntensity += intensity;
//         symptomMap[name].phases[entry.cyclePhase].intensityCount++;
//       }
//     }

//     // Period symptoms
//     for (const [name, intensity] of Object.entries(entry.periodSymptomIntensities)) {
//       if (!symptomMap[name]) {
//         symptomMap[name] = { 
//           isPeriodRelated: true, 
//           phases: Object.fromEntries(phases.map(p => [p, { count: 0, totalIntensity: 0, intensityCount: 0 }])) 
//         };
//       }
//       symptomMap[name].isPeriodRelated = true;
//       symptomMap[name].phases[entry.cyclePhase].count++;
//       if (intensity !== null) {
//         symptomMap[name].phases[entry.cyclePhase].totalIntensity += intensity;
//         symptomMap[name].phases[entry.cyclePhase].intensityCount++;
//       }
//     }
//   }

//   return Object.entries(symptomMap)
//     .map(([symptom, data]) => ({
//       symptom,
//       isPeriodRelated: data.isPeriodRelated,
//       phases: Object.fromEntries(
//         Object.entries(data.phases).map(([phase, phaseData]) => [
//           phase,
//           {
//             count: phaseData.count,
//             avgIntensity: phaseData.intensityCount > 0 
//               ? Math.round((phaseData.totalIntensity / phaseData.intensityCount) * 10) / 10 
//               : null,
//           },
//         ])
//       ) as Record<string, { count: number; avgIntensity: number | null }>,
//     }))
//     .filter(s => Object.values(s.phases).some(p => p.count > 0))
//     .sort((a, b) => {
//       const aTotal = Object.values(a.phases).reduce((sum, p) => sum + p.count, 0);
//       const bTotal = Object.values(b.phases).reduce((sum, p) => sum + p.count, 0);
//       return bTotal - aTotal;
//     });
// }

// /**
//  * Calculate average cycle length
//  */
// function calculateAvgCycleLength(cycles: DetectedCycle[]): number | string {
//   const completedCycles = cycles.filter(c => c.length !== null);
//   if (completedCycles.length === 0) return "—";
//   const avg = completedCycles.reduce((sum, c) => sum + (c.length || 0), 0) / completedCycles.length;
//   return Math.round(avg);
// }

// /**
//  * Calculate average flow days
//  */
// function calculateAvgFlowDays(cycles: DetectedCycle[]): number | string {
//   if (cycles.length === 0) return "—";
  
//   // Deduplicate flow days per cycle
//   const avgFlowDays = cycles.reduce((sum, c) => {
//     const uniqueDates = new Set(c.flowDays.map(d => d.date));
//     return sum + uniqueDates.size;
//   }, 0) / cycles.length;
  
//   return Math.round(avgFlowDays * 10) / 10;
// }