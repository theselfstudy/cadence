"use client";

import { useState } from "react";
import type { StoredEntry, TimeFormat } from "@/types";
import { BRISTOL_TYPES, POST_BOWEL_FEELINGS, CYCLE_PHASES } from "@/lib/constants";

// ============================================
// SHARED ENTRY CARD COMPONENT
// Used in /history, /weekly, and /monthly pages
// ============================================

interface EntryCardProps {
  entry: StoredEntry;
  timeFormat: TimeFormat;
  /** Custom products from settings for name lookup */
  customProducts?: Record<string, { id: string; name: string }[]>;
  /** Hide the date header (used inside DayCard where date is shown by the parent) */
  showDate?: boolean;
}

export function EntryCard({ entry, timeFormat, customProducts = {}, showDate = true }: EntryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Count symptoms
  const generalSymptomCount = Object.keys(entry.symptomIntensities).length;
  const periodSymptomCount = Object.keys(entry.periodSymptomIntensities).length;
  const oneOffSymptomCount = entry.oneOffSymptoms?.length || 0;
  const medicineCount = entry.medicineLog.length;
  const productCount = entry.productUsage?.length || 0;

  // Check if cycle phase is menstrual (for color coding)
  const isMenstrualPhase = entry.cyclePhase === "menstrual";

  return (
    <div className="bg-app-cream/50 rounded-lg border border-app-border p-4">
      {/* Header Row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          {/* Date: Day, Month Day, Year */}
          {showDate && <p className="font-semibold text-app-charcoal">{formatDate(entry.date)}</p>}
          {/* Time and Duration */}
          <p className={`text-sm ${showDate ? "text-app-gray" : "font-semibold text-app-charcoal"}`}>
            {entry.startTime === entry.endTime ? (
              formatTimeForDisplay(entry.startTime, timeFormat)
            ) : (
              <>
                {formatTimeForDisplay(entry.startTime, timeFormat)} → {formatTimeForDisplay(entry.endTime, timeFormat)}
                <span className="mx-2">·</span>
                <span className="text-app-teal font-medium">
                  {calculateDuration(entry.startTime, entry.endTime)}
                </span>
              </>
            )}
          </p>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-app-gray hover:text-app-charcoal p-1"
          aria-label={isExpanded ? "Collapse entry" : "Expand entry"}
        >
          <svg
            className={`w-5 h-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Summary Pills Row */}
      <div className="flex flex-wrap gap-2 mt-3">
        {/* Period Symptoms - Red */}
        {periodSymptomCount > 0 && (
          <span className="text-xs bg-app-red/10 text-app-red px-2 py-1 rounded-full">
            {periodSymptomCount} period symptom{periodSymptomCount !== 1 ? "s" : ""}
          </span>
        )}
        
        {/* General Symptoms - Teal */}
        {generalSymptomCount > 0 && (
          <span className="text-xs bg-app-teal/10 text-app-teal px-2 py-1 rounded-full">
            {generalSymptomCount} symptom{generalSymptomCount !== 1 ? "s" : ""}
          </span>
        )}

        {/* One-Off Symptoms - Plumb with border*/}
        {oneOffSymptomCount > 0 && (
          <span className="text-xs  border-app-plumb/30 bg-app-plumb/10 border-2 text-app-plumb px-2 py-1 rounded-full">
            {oneOffSymptomCount} custom
          </span>
        )}

        {/* Bristol Type - Plumb */}
        {entry.stoolType && (
          <span className="text-xs bg-app-plumb/10 text-app-plumb px-2 py-1 rounded-full">
            Bristol {entry.stoolType}
          </span>
        )}
        
        {/* Cycle Phase - Red if menstrual, Teal otherwise */}
        {entry.cyclePhase && (
          <span className={`text-xs px-2 py-1 rounded-full capitalize ${
            isMenstrualPhase 
              ? "bg-app-red/10 text-app-red" 
              : "bg-app-teal/10 text-app-teal"
          }`}>
            {entry.cyclePhase.replace("_", " ")}
          </span>
        )}
        
        {/* Medicines - Light Green */}
        {medicineCount > 0 && (
          <span className="text-xs bg-app-green/10 text-app-green px-2 py-1 rounded-full">
            {medicineCount} medicine{medicineCount !== 1 ? "s" : ""}
          </span>
        )}
        
        {/* Has Notes - Gray */}
        {entry.notes && (
          <span className="text-xs bg-app-gray/10 text-app-gray px-2 py-1 rounded-full">
            Has notes
          </span>
        )}
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-app-border space-y-4">
          {/* Symptoms Section */}
          {(generalSymptomCount > 0 || periodSymptomCount > 0) && (
            <Section title="Symptoms" icon="🏷️">
              <div className="flex flex-wrap gap-1.5">
                {/* Period Symptoms - Red */}
                {Object.entries(entry.periodSymptomIntensities).map(([symptom, intensity]) => (
                  <span
                    key={`period-${symptom}`}
                    className="text-xs bg-app-red/10 text-app-red px-2 py-1 rounded"
                  >
                    {symptom}{intensity !== null ? ` (${intensity})` : ""}
                  </span>
                ))}
                {/* General Symptoms - Teal */}
                {Object.entries(entry.symptomIntensities).map(([symptom, intensity]) => (
                  <span
                    key={`general-${symptom}`}
                    className="text-xs bg-app-teal/10 text-app-teal px-2 py-1 rounded"
                  >
                    {symptom}{intensity !== null ? ` (${intensity})` : ""}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* One-Off Symptoms Section */}
          {oneOffSymptomCount > 0 && (
            <Section title="One-Off Symptoms" icon="❖">
              <div className="flex flex-wrap gap-1.5">
                {entry.oneOffSymptoms?.map((symptom, idx) => (
                  <span
                    key={`oneoff-${idx}`}
                    className="text-xs border-app-plumb/30 bg-app-plumb/10 border-2 text-app-plumb px-2 py-1 rounded"
                  >
                    {symptom}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Bowel Movement Section */}
          {(entry.stoolType || entry.stoolFeeling) && (
            <Section title="Bowel Movement" icon="🧻">
              <p className="text-sm text-app-charcoal">
                {entry.stoolType && (
                  <>
                    Type {entry.stoolType} - {BRISTOL_TYPES.find((b) => b.type === entry.stoolType)?.name || "Unknown"}
                  </>
                )}
                {entry.stoolType && entry.stoolFeeling && (
                  <span className="text-app-gray"> · </span>
                )}
                {entry.stoolFeeling && (
                  <span className="text-app-gray">
                    {POST_BOWEL_FEELINGS.find((f) => f.value === entry.stoolFeeling)?.label || entry.stoolFeeling}
                  </span>
                )}
              </p>
            </Section>
          )}

          {/* Cycle Section */}
          {(entry.cyclePhase || entry.periodFlow || productCount > 0) && (
            <Section title="Cycle" icon="🌸">
              {/* Phase and Flow */}
              {(entry.cyclePhase || entry.periodFlow) && (
                <p className="text-sm text-app-charcoal">
                  {entry.cyclePhase && CYCLE_PHASES.find((p) => p.value === entry.cyclePhase)?.label}
                  {entry.cyclePhase && entry.periodFlow && (
                    <span className="text-app-gray"> · </span>
                  )}
                  {entry.periodFlow && (() => {
                    const parsed = parseFlowValue(entry.periodFlow);
                    return (
                      <span className="text-app-gray capitalize">
                        {parsed.level} flow
                        {parsed.startTime && (
                          <span> @ {formatTimeForDisplay(parsed.startTime, timeFormat)}</span>
                        )}
                      </span>
                    );
                  })()}
                </p>
              )}
              
              {/* Products Used */}
              {productCount > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-app-gray mb-1.5">Products Used</p>
                  <div className="flex flex-wrap gap-1.5">
                    {entry.productUsage.map((product, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-app-red/10 text-app-red px-2 py-1 rounded"
                      >
                        {formatProductName(product, customProducts)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* Medicines Section */}
          {medicineCount > 0 && (
            <Section title="Medicines" icon="💊">
              <div className="flex flex-wrap gap-1.5">
                {entry.medicineLog.map((log, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-app-green/10 text-app-charcoal px-2 py-1 rounded"
                  >
                    {log.medicineName}{log.dosage ? ` (${log.dosage})` : ""}{log.time ? ` @ ${formatTimeForDisplay(`${log.time.hour}:${log.time.minute.toString().padStart(2, '0')}${log.time.period ? ` ${log.time.period}` : ''}`, timeFormat)}` : ""}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Notes Section */}
          {entry.notes && (
            <Section title="Notes" icon="📝">
              <p className="text-sm text-app-charcoal whitespace-pre-wrap">{entry.notes}</p>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-app-gray mb-1.5 flex items-center gap-1">
        <span>{icon}</span>
        {title}
      </p>
      <div className="pl-0.5">{children}</div>
    </div>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/** Parse "heavy @ 4:44 PM" into { level: "heavy", startTime: "4:44 PM" } */
function parseFlowValue(flow: string | null): { level: string; startTime: string | null } {
  if (!flow) return { level: '', startTime: null };
  const match = flow.match(/^(.+?)\s*@\s*(.+)$/);
  if (match) return { level: match[1].trim(), startTime: match[2].trim() };
  return { level: flow, startTime: null };
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// function formatTimeForDisplay(timeStr: string, format: TimeFormat): string {
//   if (!timeStr) return "";

//   const [hourStr, minuteStr] = timeStr.split(":");
//   const hour = parseInt(hourStr, 10);
//   const minute = minuteStr || "00";

//   if (format === "24h") {
//     return `${hourStr.padStart(2, "0")}:${minute}`;
//   }

//   // 12h format
//   if (hour === 0) return `12:${minute} AM`;
//   if (hour === 12) return `12:${minute} PM`;
//   if (hour > 12) return `${hour - 12}:${minute} PM`;
//   return `${hour}:${minute} AM`;
// }

// function calculateDuration(startTime: string, endTime: string): string {
//   if (!startTime || !endTime) return "—";

//   const [startHour, startMin] = startTime.split(":").map(Number);
//   const [endHour, endMin] = endTime.split(":").map(Number);

//   let startTotal = startHour * 60 + startMin;
//   let endTotal = endHour * 60 + endMin;

//   // Handle crossing midnight
//   if (endTotal < startTotal) {
//     endTotal += 24 * 60;
//   }

//   const duration = endTotal - startTotal;

//   if (duration < 60) {
//     return `${duration}m`;
//   }

//   const hours = Math.floor(duration / 60);
//   const mins = duration % 60;

//   return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
// }

function formatTimeForDisplay(timeStr: string, format: TimeFormat): string {
  if (!timeStr) return "";

  let hour: number;
  let minute: number;

  // Check if input has AM/PM
  const ampmMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!ampmMatch) return "";

  hour = parseInt(ampmMatch[1], 10);
  minute = parseInt(ampmMatch[2], 10);
  const meridian = ampmMatch[3]?.toUpperCase();

  // Convert to 24h if necessary
  if (meridian) {
    if (meridian === "PM" && hour < 12) hour += 12;
    if (meridian === "AM" && hour === 12) hour = 0;
  }

  if (format === "24h") {
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  }

  // Convert back to 12h for display
  const displayMeridian = hour >= 12 ? "PM" : "AM";
  let displayHour = hour % 12;
  if (displayHour === 0) displayHour = 12;

  return `${displayHour}:${minute.toString().padStart(2, "0")} ${displayMeridian}`;
}

function calculateDuration(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return "—";

  const parseToMinutes = (timeStr: string) => {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!match) return NaN;
    let [_, hourStr, minStr, meridian] = match;
    let hour = parseInt(hourStr, 10);
    const min = parseInt(minStr, 10);
    if (meridian) {
      if (meridian.toUpperCase() === "PM" && hour < 12) hour += 12;
      if (meridian.toUpperCase() === "AM" && hour === 12) hour = 0;
    }
    return hour * 60 + min;
  };

  let startTotal = parseToMinutes(startTime);
  let endTotal = parseToMinutes(endTime);
  if (isNaN(startTotal) || isNaN(endTotal)) return "—";

  // Handle crossing midnight
  if (endTotal < startTotal) endTotal += 24 * 60;

  const duration = endTotal - startTotal;
  if (duration < 60) return `${duration}m`;

  const hours = Math.floor(duration / 60);
  const mins = duration % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Format product name with custom product lookup
 * Uses the same pattern as CycleInsights fix
 */
function formatProductName(
  product: { productType: string; customProductId?: string; size?: string },
  customProducts: Record<string, { id: string; name: string }[]>
): string {
  const typeLabels: Record<string, string> = {
    pad: "Pad",
    tampon: "Tampon",
    cup: "Cup",
    disc: "Disc",
    liner: "Liner",
    "period-underwear": "Period Underwear",
    other: "Other",
  };

  let customProduct: { id: string; name: string } | undefined;

  // Look up custom product by ID
  if (product.customProductId) {
    // First try the specific product type category
    if (customProducts[product.productType]) {
      customProduct = customProducts[product.productType].find(
        (cp) => cp.id === product.customProductId
      );
    }

    // If not found, search ALL categories
    if (!customProduct) {
      for (const products of Object.values(customProducts)) {
        const found = products.find((cp) => cp.id === product.customProductId);
        if (found) {
          customProduct = found;
          break;
        }
      }
    }
  }

  // Filter out invalid size values
  const validSize =
    product.size && !["yes", "true", "false", "no"].includes(product.size.toLowerCase())
      ? product.size
      : null;

  // If we found a custom product, use its name with type label
  if (customProduct) {
    const typeLabel =
      typeLabels[product.productType] ||
      product.productType.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return `${customProduct.name} (${typeLabel})`;
  }

  // Fallback to formatted product type
  const formattedType =
    typeLabels[product.productType] ||
    product.productType.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return validSize ? `${formattedType} (${validSize})` : formattedType;
}