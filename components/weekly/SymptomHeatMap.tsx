// "use client";

// import { useState } from "react";
// import type { SymptomHeatMapData } from "@/lib/weeklyUtils";

// // ============================================
// // SYMPTOM HEAT MAP
// // Symptom × Day grid visualization
// // Click a cell to filter by that day
// // ============================================

// interface SymptomHeatMapProps {
//   /** Heat map data from buildSymptomHeatMap() */
//   data: SymptomHeatMapData[];
//   /** Maximum height before scrolling (in pixels) */
//   maxHeight?: number;
//   /** Callback when a day cell is clicked - triggers filter */
//   onDayClick?: (day: string) => void;
//   /** Currently selected days for highlighting */
//   selectedDays?: string[];
// }

// export function SymptomHeatMap({
//   data,
//   maxHeight = 320,
//   onDayClick,
//   selectedDays = [],
// }: SymptomHeatMapProps) {
//   if (data.length === 0) {
//     return (
//       <div className="bg-app-white rounded-xl border border-app-border p-6 text-center">
//         <div className="w-12 h-12 rounded-full bg-app-cream mx-auto mb-3 flex items-center justify-center">
//           <span className="text-2xl">🏷️</span>
//         </div>
//         <p className="text-app-charcoal font-medium">No symptoms this week</p>
//         <p className="text-sm text-app-gray mt-1">
//           Symptoms you log will appear here as a heat map
//         </p>
//       </div>
//     );
//   }

//   // Get day labels from first symptom's data
//   const dayLabels = data[0]?.days.map((d) => d.day) || [];

//   return (
//     <div className="bg-app-white rounded-xl border border-app-border overflow-hidden">
//       {/* Header */}
//       <div className="px-4 py-3 border-b border-app-border bg-app-cream/50">
//         <h3 className="text-sm font-semibold text-app-charcoal flex items-center gap-2">
//           <span>🏷️</span>
//           Symptom Intensity Heat Map (Daily Breakdown)
//         </h3>
//         <p className="text-xs text-app-gray mt-0.5">
//           {onDayClick ? "Click a day column to filter" : ""}
//           {data.length > 8 && " • Scroll to see all"}
//         </p>
//       </div>

//       {/* Heat Map Grid */}
//       <div className="overflow-x-auto">
//         <div className="min-w-[400px] p-4">
//           {/* Day Headers - Clickable (sticky) */}
//           <div className="flex mb-2">
//             {/* Symptom name column spacer */}
//             <div className="w-28 sm:w-36 shrink-0" />
//             {/* Day columns */}
//             {dayLabels.map((day) => {
//               const isSelected = selectedDays.includes(day);
//               return (
//                 <button
//                   key={day}
//                   type="button"
//                   onClick={() => onDayClick?.(day)}
//                   disabled={!onDayClick}
//                   className={`flex-1 min-w-[40px] text-center text-xs font-medium transition-colors rounded py-1 ${
//                     isSelected
//                       ? "bg-app-teal text-white"
//                       : onDayClick
//                         ? "text-app-gray hover:bg-app-cream hover:text-app-charcoal cursor-pointer"
//                         : "text-app-gray"
//                   }`}
//                 >
//                   {day}
//                 </button>
//               );
//             })}
//           </div>

//           {/* Symptom Rows - Scrollable */}
//           <div 
//             className="space-y-1 overflow-y-auto pr-1"
//             style={{ maxHeight: `${maxHeight}px` }}
//           >
//             {data.map((symptom) => (
//               <SymptomRow
//                 key={symptom.symptom}
//                 data={symptom}
//                 onDayClick={onDayClick}
//                 selectedDays={selectedDays}
//               />
//             ))}
//           </div>

//           {/* Scroll indicator for many symptoms */}
//           {data.length > 8 && (
//             <div className="flex justify-center mt-2 text-app-gray/50">
//               <svg 
//                 className="w-4 h-4 animate-bounce" 
//                 fill="none" 
//                 stroke="currentColor" 
//                 viewBox="0 0 24 24"
//               >
//                 <path 
//                   strokeLinecap="round" 
//                   strokeLinejoin="round" 
//                   strokeWidth={2} 
//                   d="M19 9l-7 7-7-7" 
//                 />
//               </svg>
//             </div>
//           )}
//         </div>
//       </div>

//         {/* Legend */}
//         <div className="px-4 py-3 border-t border-app-border flex flex-wrap items-center justify-center gap-3 text-xs text-app-gray">
//         <div className="flex items-center gap-1.5">
//             <div className="w-4 h-4 rounded bg-app-border" />
//             <span>Not logged</span>
//         </div>
//         <div className="flex items-center gap-1.5">
//             <div className="w-4 h-4 rounded bg-app-teal/50" />
//             <span>Low intensity</span>
//         </div>
//         <div className="flex items-center gap-1.5">
//             <div className="w-4 h-4 rounded bg-app-teal/75" />
//             <span>Medium intensity</span>
//         </div>
//         <div className="flex items-center gap-1.5">
//             <div className="w-4 h-4 rounded bg-app-teal" />
//             <span>High intensity</span>
//         </div>
//         </div>
//     </div>
//   );
// }

// // ============================================
// // SYMPTOM ROW COMPONENT
// // ============================================

// interface SymptomRowProps {
//   data: SymptomHeatMapData;
//   onDayClick?: (day: string) => void;
//   selectedDays: string[];
// }

// function SymptomRow({ data, onDayClick, selectedDays }: SymptomRowProps) {
//   const [activeCell, setActiveCell] = useState<string | null>(null);

//   return (
//     <div className="flex items-center">
//       {/* Symptom Name */}
//       <div className="w-28 sm:w-36 shrink-0 pr-2">
//         <p className="text-sm text-app-charcoal truncate" title={data.symptom}>
//           {data.symptom}
//         </p>
//       </div>

//       {/* Day Cells */}
//       {data.days.map((day) => {
//         const isSelected = selectedDays.includes(day.day);
//         return (
//           <div key={day.day} className="flex-1 min-w-[40px] px-0.5">
//             <button
//               type="button"
//               onClick={() => onDayClick?.(day.day)}
//               onMouseEnter={() => setActiveCell(day.day)}
//               onMouseLeave={() => setActiveCell(null)}
//               className={`w-full h-8 rounded transition-all ${getIntensityStyle(
//                 day.intensity,
//                 day.logged
//               )} ${activeCell === day.day ? "ring-2 ring-app-charcoal ring-offset-1" : ""} ${
//                 isSelected ? "ring-2 ring-app-teal" : ""
//               }`}
//               title={getCellTitle(data.symptom, day.day, day.intensity, day.logged)}
//             >
//               {/* Show intensity number on hover/active */}
//               {activeCell === day.day && day.logged && (
//                 <span className="text-xs font-medium">
//                   {day.intensity !== null ? day.intensity : "✓"}
//                 </span>
//               )}
//             </button>
//           </div>
//         );
//       })}
//     </div>
//   );
// }

// // ============================================
// // HELPER FUNCTIONS
// // ============================================

// function getIntensityStyle(intensity: number | null, logged: boolean): string {
//   if (!logged) {
//     return "bg-app-border";
//   }

//   if (intensity === null) {
//     return "bg-app-teal/30 text-app-teal";
//   }

//   // 3 discrete levels: Low (1-3), Medium (4-6), High (7-10)
//   if (intensity <= 3) return "bg-app-teal/50 text-app-teal";
//   if (intensity <= 6) return "bg-app-teal/75 text-white";
//   return "bg-app-teal text-white";
// }

// function getCellTitle(
//   symptom: string,
//   day: string,
//   intensity: number | null,
//   logged: boolean
// ): string {
//   if (!logged) {
//     return `${symptom} - ${day}: Not logged`;
//   }

//   if (intensity === null) {
//     return `${symptom} - ${day}: Logged (no intensity)`;
//   }

//   return `${symptom} - ${day}: Intensity ${intensity}/10`;
// }