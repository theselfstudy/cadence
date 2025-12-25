"use client";


import React, { useState, useEffect } from "react";
import { useSettings } from "@/stores/useSettings";
import { useGoogleLogin } from "@react-oauth/google";
import { useEntries } from "@/stores/useEntries";
import type { MedicineCategory, LogSection } from "@/types";
import { LogSelectionModal } from "@/components/entry/LogSelectionModal";


import {
  BRISTOL_TYPES,
  POST_BOWEL_FEELINGS,
  CYCLE_PHASES,
  FLOW_LEVELS,
  PAIN_SCALE_INFO,
  PRODUCT_OPTIONS,
  MEDICINE_CATEGORIES,
} from "@/lib/constants";

import type {
  TimeValue,
  BristolScaleType,
  PostBowelFeeling,
  CyclePhase,
  SymptomEntry,
  ProductUsageEntry,
  CustomProduct,
  ProductTracking,
  Medicine, 
  MedicineLogEntry,
  StoredEntry, 
  PainScaleType,
} from "@/types";

function getCurrentTime(is24Hour: boolean): TimeValue {
  const now = new Date();
  let hour = now.getHours();
  const minute = now.getMinutes();
  let period: "AM" | "PM" = "AM";

  if (!is24Hour) {
    period = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
  }

  return { hour, minute, period };
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Checks if a product usage entry is complete based on product requirements.
 * - Products with sizes (pad, tampon, liner): Must have a size selected
 * - Products with custom products (cup, disc, other): Must have a customProductId selected
 */
function isProductUsageComplete(
  usage: ProductUsageEntry,
  productOptions: typeof PRODUCT_OPTIONS,
  customProducts: Record<string, CustomProduct[]>
): { isComplete: boolean; missingField: 'size' | 'customProduct' | null } {
  const product = productOptions.find((p) => p.type === usage.productType);
  if (!product) return { isComplete: true, missingField: null };

  // Check if this product requires a custom product selection
  if (product.allowCustomProducts) {
    const productCustomItems = customProducts[usage.productType] ?? [];
    if (productCustomItems.length > 0 && !usage.customProductId) {
      return { isComplete: false, missingField: 'customProduct' };
    }
  }

  // Check if this product requires a size selection
  // Only require size if the product has predefined sizes
  if (product.hasSizes && product.sizes && product.sizes.length > 0 && !usage.size) {
    return { isComplete: false, missingField: 'size' };
  }

  return { isComplete: true, missingField: null };
}

// Sanitize text to prevent XSS
function sanitizeText(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .replace(/`/g, "&#96;")
    .replace(/\(/g, "&#40;")
    .replace(/\)/g, "&#41;");
}

// Validate notes - returns true if safe
function isNoteSafe(input: string): boolean {
  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<[^>]+on\w+\s*=/gi,
    /javascript:/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<link/gi,
    /<style/gi,
    /<img[^>]+onerror/gi,
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(input));
}

// =============================================================================
// MEDICINE CATEGORY COLORS
// =============================================================================

const MEDICINE_CATEGORY_COLORS: Record<MedicineCategory, { bg: string; text: string }> = {
  bowel: { bg: "bg-app-plumb", text: "text-app-plumb" },
  period: { bg: "bg-app-red", text: "text-app-red" },
  symptom: { bg: "bg-app-teal", text: "text-app-teal" },
  other: { bg: "bg-app-gray", text: "text-app-gray" },
};

// =============================================================================
// CONSOLIDATED MEDICINE LOG COMPONENT
// =============================================================================

function ConsolidatedMedicineLog({
  medicines,
  loggedMedicines,
  onChange,
  is24Hour,
}: ConsolidatedMedicineLogProps) {
  if (medicines.length === 0) {
    return (
      <p className="text-sm text-app-gray italic">
        No medicines configured. Add medicines in Settings → Medicine Log.
      </p>
    );
  }

  const toggleMedicine = (medicine: Medicine) => {
    const exists = loggedMedicines.find((l) => l.medicineId === medicine.id);
    if (exists) {
      onChange(loggedMedicines.filter((l) => l.medicineId !== medicine.id));
    } else {
      onChange([
        ...loggedMedicines,
        {
          medicineId: medicine.id,
          medicineName: medicine.name,
          dosage: medicine.dosage || "",
          time: medicine.timeSensitive ? getCurrentTime(is24Hour) : undefined,
        },
      ]);
    }
  };

  const updateLogEntry = (medicineId: string, updates: Partial<MedicineLogEntry>) => {
    onChange(
      loggedMedicines.map((l) =>
        l.medicineId === medicineId ? { ...l, ...updates } : l
      )
    );
  };

  return (
    <div className="space-y-4">
      {/* Category Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {MEDICINE_CATEGORIES.filter((cat) => 
          medicines.some((m) => m.categories.includes(cat.value))
        ).map((cat) => (
          <div key={cat.value} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${MEDICINE_CATEGORY_COLORS[cat.value].bg}`} />
            <span className="text-app-gray">{cat.label}</span>
          </div>
        ))}
      </div>

      {/* Medicine Selection */}
      <div className="flex flex-wrap gap-2">
        {medicines.map((medicine) => {
          const isSelected = loggedMedicines.some((l) => l.medicineId === medicine.id);
          return (
            <button
              key={medicine.id}
              type="button"
              onClick={() => toggleMedicine(medicine)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                isSelected
                  ? "bg-app-taupe text-white"
                  : "bg-app-cream text-app-charcoal border border-app-border hover:border-app-taupe"
              }`}
            >
              {/* Category dots */}
              <span className="flex items-center gap-0.5">
                {medicine.categories.map((cat) => (
                  <span
                    key={cat}
                    className={`w-2 h-2 rounded-full ${MEDICINE_CATEGORY_COLORS[cat].bg} ${
                      isSelected ? "opacity-70" : ""
                    }`}
                    title={cat.charAt(0).toUpperCase() + cat.slice(1)}
                  />
                ))}
              </span>
              {medicine.name}
              {medicine.timeSensitive && " ⏰"}
            </button>
          );
        })}
      </div>

      {/* Details for Selected Medicines */}
      {loggedMedicines.length > 0 && (
        <div className="space-y-2 pt-2">
          {loggedMedicines.map((entry) => {
            const medicine = medicines.find((m) => m.id === entry.medicineId);
            if (!medicine) return null;

            return (
              <div
                key={entry.medicineId}
                className="p-3 bg-app-taupe/5 rounded-lg border border-app-taupe/20"
              >
                {/* Medicine Name with Category Dots */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex items-center gap-0.5">
                    {medicine.categories.map((cat) => (
                      <span
                        key={cat}
                        className={`w-2.5 h-2.5 rounded-full ${MEDICINE_CATEGORY_COLORS[cat].bg}`}
                        title={cat.charAt(0).toUpperCase() + cat.slice(1)}
                      />
                    ))}
                  </span>
                  <p className="text-sm font-medium text-app-charcoal">
                    {medicine.name}
                  </p>
                </div>

                {/* Dosage Input */}
                <div className="mb-2">
                  <label className="block text-xs text-app-gray mb-1">Dosage taken:</label>
                  <input
                    type="text"
                    value={entry.dosage}
                    onChange={(e) =>
                      updateLogEntry(entry.medicineId, { dosage: e.target.value })
                    }
                    placeholder={medicine.dosage || "e.g., 2 pills, 200mg..."}
                    className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-white focus:outline-none focus:ring-2 focus:ring-app-taupe text-sm"
                  />
                </div>

                {/* Time Input (if time-sensitive) */}
                {medicine.timeSensitive && (
                  <div>
                    <label className="block text-xs text-app-gray mb-1">Time taken: *</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={is24Hour ? 0 : 1}
                        max={is24Hour ? 23 : 12}
                        value={entry.time?.hour ?? 12}
                        onChange={(e) =>
                          updateLogEntry(entry.medicineId, {
                            time: { ...entry.time!, hour: Number(e.target.value) },
                          })
                        }
                        className="w-16 px-2 py-2 rounded-lg border border-app-border bg-app-white focus:outline-none focus:ring-2 focus:ring-app-taupe text-center text-sm"
                      />
                      <span className="text-app-gray font-bold">:</span>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={entry.time?.minute?.toString().padStart(2, "0") ?? "00"}
                        onChange={(e) =>
                          updateLogEntry(entry.medicineId, {
                            time: { ...entry.time!, minute: Number(e.target.value) },
                          })
                        }
                        className="w-16 px-2 py-2 rounded-lg border border-app-border bg-app-white focus:outline-none focus:ring-2 focus:ring-app-taupe text-center text-sm"
                      />
                      {!is24Hour && (
                        <select
                          value={entry.time?.period ?? "AM"}
                          onChange={(e) =>
                            updateLogEntry(entry.medicineId, {
                              time: { ...entry.time!, period: e.target.value as "AM" | "PM" },
                            })
                          }
                          className="px-2 py-2 rounded-lg border border-app-border bg-app-white focus:outline-none focus:ring-2 focus:ring-app-taupe text-sm"
                        >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function EntryPage() {
  const { timeFormat, symptoms, periodTracking, stoolTracking, medicineTracking, googleSheet, isGoogleSheetConnected } = useSettings();
  const { addEntry, syncEntryToSheet } = useEntries();
  const is24Hour = timeFormat === "24h";

  // Store access token for sync after OAuth completes
  const [pendingAccessToken, setPendingAccessToken] = useState<string | null>(null);
  const [pendingEntryId, setPendingEntryId] = useState<string | null>(null);

  // Google OAuth for syncing entries
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      console.log("OAuth success, got access token");
      setPendingAccessToken(tokenResponse.access_token);
    },
    onError: (error) => {
      console.error("Google login error:", error);
      setIsSubmitting(false);
    },
    scope: "https://www.googleapis.com/auth/spreadsheets",
  });

  // Safe access to settings
  const safeSymptoms = symptoms ?? {
    selected: [],
    custom: [],
    intensityTracking: { enabled: false, scaleType: "simple" },
  };
  const safePeriodTracking = periodTracking ?? {
    enabled: false,
    personalQuestions: false,
    periodSymptoms: [],
    customPeriodSymptoms: [],
  };

  const safeStoolTracking = stoolTracking ?? { enabled: false };
  const intensityEnabled = safeSymptoms.intensityTracking?.enabled ?? false;
  const painScaleType = safeSymptoms.intensityTracking?.scaleType ?? "simple";

  const [loggedMedicines, setLoggedMedicines] = useState<MedicineLogEntry[]>([]);

  const [productUsage, setProductUsage] = useState<ProductUsageEntry[]>([]);

  // Log section selection - null means modal is open, array means user has selected
  const [selectedLogSections, setSelectedLogSections] = useState<LogSection[] | null>(null);

// Safe access
const safeMedicineTracking = medicineTracking ?? { enabled: false, medicines: [] };

  // Combined list of all period-related symptoms (selected + custom)
  const periodSymptomsList = [
    ...(safePeriodTracking.periodSymptoms ?? []),
    ...(safePeriodTracking.customPeriodSymptoms ?? []),
  ];

  const [cyclePhase, setCyclePhase] = useState<CyclePhase | null>(null);
  // Check if menstrual phase is selected
  const isMenstrualPhase = cyclePhase === "menstrual";

  // Helper to check if a section should be displayed
  const shouldShowSection = (section: LogSection): boolean => {
    if (!selectedLogSections) return false;
    return selectedLogSections.includes(section);
  };

  // Compute available sections based on settings
  const availableSections = {
    symptoms: safeSymptoms.selected.length > 0,
    bowel: safeStoolTracking.enabled,
    period: safePeriodTracking.enabled,
    medicine: safeMedicineTracking.enabled && safeMedicineTracking.medicines.length > 0,
  };

  // Handle modal confirmation
  const handleLogSelectionConfirm = (sections: LogSection[]) => {
    setSelectedLogSections(sections);
  };

  const allSymptomsToShow = Array.from(
    new Set([
      // General symptoms - always show
      // BUT exclude custom period symptoms (they should ONLY show when menstrual)
      ...safeSymptoms.selected.filter(
        (symptom) => !(safePeriodTracking.customPeriodSymptoms ?? []).includes(symptom)
      ),
      
      // All period symptoms (default + custom) - only when menstrual
      ...(isMenstrualPhase ? periodSymptomsList : []),
    ])
  );

  // Form state
  const [startTime, setStartTime] = useState<TimeValue>(getCurrentTime(is24Hour));
  const [endTime, setEndTime] = useState<TimeValue>(getCurrentTime(is24Hour));
  const [bristolType, setBristolType] = useState<BristolScaleType | null>(null);
  const [postFeeling, setPostFeeling] = useState<PostBowelFeeling | null>(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<SymptomEntry[]>([]);
  const [flowLevel, setFlowLevel] = useState<string | null>(null);
  const [periodPainLevel, setPeriodPainLevel] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [notesWarning, setNotesWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Effect to sync entry after OAuth completes
  // This runs when pendingAccessToken is set by the OAuth callback
  useEffect(() => {
    const syncPendingEntry = async () => {
      if (pendingAccessToken && pendingEntryId) {
        console.log("OAuth complete, syncing entry to Google Sheets...");
        
        try {
          const success = await syncEntryToSheet(pendingEntryId, pendingAccessToken);
          
          if (success) {
            console.log("Entry synced to Google Sheets successfully!");
          } else {
            console.warn("Entry saved locally but failed to sync to Google Sheets. Will retry later.");
          }
        } catch (error) {
          console.error("Error syncing to sheet:", error);
        }
        
        // Clear pending state
        setPendingAccessToken(null);
        setPendingEntryId(null);
        
        // Show success and reset form
        setIsSubmitting(false);
        setSubmitSuccess(true);

        setTimeout(() => {
          resetForm();
          setSubmitSuccess(false);
        }, 2000);
      }
    };

    syncPendingEntry();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAccessToken, pendingEntryId]);

  // Toggle symptom selection
  const toggleSymptom = (symptomName: string) => {
    const exists = selectedSymptoms.find((s) => s.name === symptomName);
    const isPeriodRelated = periodSymptomsList.includes(symptomName);

    if (exists) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s.name !== symptomName));
    } else {
      setSelectedSymptoms([
        ...selectedSymptoms,
        {
          name: symptomName,
          intensity: undefined,
          isPeriodRelated: isMenstrualPhase && isPeriodRelated,
        },
      ]);
    }
  };

  // Update symptom intensity
  const updateSymptomIntensity = (symptomName: string, intensity: number) => {
    setSelectedSymptoms(
      selectedSymptoms.map((s) =>
        s.name === symptomName ? { ...s, intensity } : s
      )
    );
  };

    // Handle notes change with security check
  const handleNotesChange = (value: string) => {
    setNotes(value);
    if (!isNoteSafe(value)) {
      setNotesWarning("⚠️ Some characters were detected that aren't allowed for security reasons.");
    } else {
      setNotesWarning(null);
    }
  };

  // Helper to format TimeValue to string for storage
  const formatTimeToString = (time: TimeValue): string => {
    if (is24Hour) {
      return `${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}`;
    }
    return `${time.hour}:${time.minute.toString().padStart(2, '0')} ${time.period}`;
  };

  // Handle form submission
    const handleSubmit = async () => {
    // Validation
    if (!isNoteSafe(notes)) {
      alert("Please remove any code-like content from the notes field.");
      return;
    }

    // Validate product usage completeness (only if period section selected and in menstrual phase)
    if (shouldShowSection("period") && isMenstrualPhase && safePeriodTracking.productTracking?.enabled && productUsage.length > 0) {
      const customProducts = safePeriodTracking.productTracking.customProducts ?? {};
      const incompleteProducts = productUsage.filter((usage) => {
        const validation = isProductUsageComplete(usage, PRODUCT_OPTIONS, customProducts);
        return !validation.isComplete;
      });

      if (incompleteProducts.length > 0) {
        const productNames = incompleteProducts
          .map((p) => {
            const product = PRODUCT_OPTIONS.find((opt) => opt.type === p.productType);
            return product?.label ?? p.productType;
          })
          .join(", ");
        alert(`Please complete the selection for: ${productNames}`);
        return;
      }
    }

    setIsSubmitting(true);

    // Build symptom intensities map (separating general vs period-related)
    const symptomIntensities: Record<string, number | null> = {};
    const periodSymptomIntensities: Record<string, number | null> = {};

    for (const symptom of selectedSymptoms) {
      const isPeriodRelated = periodSymptomsList.includes(symptom.name);
      if (isPeriodRelated && isMenstrualPhase) {
        periodSymptomIntensities[symptom.name] = symptom.intensity ?? null;
      } else {
        symptomIntensities[symptom.name] = symptom.intensity ?? null;
      }
    }

    // Medicine logs from consolidated section
    const allMedicineLogs = loggedMedicines;

    // Build the stored entry in the format expected by the entry store
    const entryData: Omit<StoredEntry, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'> = {
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format for sheets
      startTime: formatTimeToString(startTime),
      endTime: formatTimeToString(endTime),
      painScale: painScaleType as PainScaleType,
      symptomIntensities,
      periodSymptomIntensities,
      cyclePhase: safePeriodTracking.enabled ? cyclePhase : null,
      periodFlow: isMenstrualPhase ? flowLevel : null,
      productUsage: isMenstrualPhase ? productUsage : [],
      stoolType: safeStoolTracking.enabled ? bristolType : null,
      stoolFeeling: safeStoolTracking.enabled ? postFeeling : null,
      medicineLog: allMedicineLogs,
      notes: notes ? sanitizeText(notes) : '',
    };

    // Step 1: Always save to localStorage first (works offline)
    const savedEntry = addEntry(entryData);
    console.log("Entry saved to localStorage:", savedEntry.id);

    // Step 2: If Google Sheet is connected, sync to sheet
    if (isGoogleSheetConnected && googleSheet.url) {
      console.log("Google Sheet connected, initiating sync...");
      
      // Store the entry ID so we can sync it after OAuth completes
      setPendingEntryId(savedEntry.id);
      
      // Trigger OAuth to get fresh access token
      // The onSuccess callback will set pendingAccessToken
      googleLogin();
    } else {
      // No Google Sheet connected - just show success
      console.log("No Google Sheet connected, entry saved locally only");
      setIsSubmitting(false);
      setSubmitSuccess(true);

      setTimeout(() => {
        resetForm();
        setSubmitSuccess(false);
      }, 2000);
    }
  };

  // Reset form
  const resetForm = () => {
    setStartTime(getCurrentTime(is24Hour));
    setEndTime(getCurrentTime(is24Hour));
    setBristolType(null);
    setPostFeeling(null);
    setSelectedSymptoms([]);
    setCyclePhase(null);
    setFlowLevel(null);
    setPeriodPainLevel(null);
    setNotes("");
    setNotesWarning(null);
    setProductUsage([]);
    setLoggedMedicines([]);
    // Reset to show modal again for next entry
    setSelectedLogSections(null);
  };

  return (
    <>
      {/* Log Selection Modal - shows when no sections selected yet */}
      {selectedLogSections === null && (
        <LogSelectionModal
          availableSections={availableSections}
          onConfirm={handleLogSelectionConfirm}
        />
      )}
      <div className="space-y-6 pb-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-app-charcoal">New Entry</h1>
          <p className="text-app-gray">{formatDate(new Date())}</p>
        </div>
        <div className="text-sm text-app-gray">📅 Today</div>
      </div>

      {/* Start Time Card */}
      <section className="card">
        <TimeInputSection
          label="⏱️ Start Time"
          value={startTime}
          onChange={setStartTime}
          is24Hour={is24Hour}
        />
      </section>

      {/* Bristol Stool Scale - Conditional */}
      {safeStoolTracking.enabled && shouldShowSection("bowel") && (
        <section className="card">
          <h2 className="text-lg font-semibold text-app-charcoal mb-4">
            💩 Bristol Stool Scale
          </h2>
          
          {/* Bristol Type - Circular Buttons */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-app-charcoal mb-3">
              What does it look like?
            </label>
            <div className="flex flex-wrap gap-2 justify-center">
              {BRISTOL_TYPES.map((type) => (
                <button
                  key={type.type}
                  type="button"
                  onClick={() => setBristolType(type.type as BristolScaleType)}
                  className={`w-12 h-12 rounded-full text-lg font-semibold transition-all ${
                    bristolType === type.type
                      ? "bg-app-plumb text-white scale-110"
                      : "bg-app-cream text-app-charcoal border-2 border-app-border hover:border-app-plumb"
                  }`}
                >
                  {type.type}
                </button>
              ))}
            </div>
            {bristolType && (
              <div className="mt-3 p-3 bg-app-cream rounded-lg">
                <p className="text-sm font-medium text-app-charcoal">
                  Type {bristolType}: {BRISTOL_TYPES.find((t) => t.type === bristolType)?.name}
                </p>
                <p className="text-sm text-app-gray mt-1">
                  {BRISTOL_TYPES.find((t) => t.type === bristolType)?.description}
                </p>
              </div>
            )}
          </div>

          {/* Post Feeling - Oval Chips */}
          <div>
            <label className="block text-sm font-medium text-app-charcoal mb-3">
              How do you feel after?
            </label>
            <div className="flex flex-wrap gap-2">
              {POST_BOWEL_FEELINGS.map((feeling) => (
                <button
                  key={feeling.value}
                  type="button"
                  onClick={() => setPostFeeling(feeling.value)}
                  className={`mb-4 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    postFeeling === feeling.value
                      ? "bg-app-plumb text-white"
                      : "bg-app-cream text-app-charcoal border border-app-border hover:border-app-plumb"
                  }`}
                >
                  {feeling.label}
                </button>
              ))}
            </div>
            {postFeeling && (
              <p className="mt-3 text-sm text-app-gray">
                {POST_BOWEL_FEELINGS.find((f) => f.value === postFeeling)?.description}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Period Tracking - Conditional */}
      {safePeriodTracking.enabled && shouldShowSection("period") && (
        <section className="card">
          <h2 className="text-lg font-semibold text-app-charcoal mb-4">
            🌸 Cycle Log
          </h2>
          
          {/* Cycle Phase Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-app-charcoal mb-2">
              Where are you in your cycle?
            </label>
            <div className="flex flex-wrap gap-2">
              {CYCLE_PHASES.map((phase) => {
                const isSelected = cyclePhase === phase.value;
                const bgColor =
                  phase.value === "menstrual"
                    ? "#791D1E"
                    : phase.value === "follicular"
                    ? "#104B55"
                    : phase.value === "ovulation"
                    ? "#3F592E"
                    : phase.value === "luteal"
                    ? "#C4B7A6"
                    : "#7A7A7A";
                return (
                  <button
                    key={phase.value}
                    type="button"
                    onClick={() => setCyclePhase(phase.value)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isSelected
                        ? "text-white"
                        : "bg-app-cream text-app-charcoal border border-app-border hover:border-app-green"
                    }`}
                    style={isSelected ? { backgroundColor: bgColor } : {}}
                  >
                    {phase.label}
                  </button>
                );
              })}
            </div>
            {cyclePhase && (
              <p className="mt-2 text-sm text-app-gray">
                {CYCLE_PHASES.find((p) => p.value === cyclePhase)?.description}
              </p>
            )}
          </div>

          {/* Flow Level - Only during Menstrual phase when enabled */}
          {safePeriodTracking.trackFlow && isMenstrualPhase && (
            <div className="pt-4 pb-4 border-t border-app-border">
              <label className="block text-sm font-medium text-app-charcoal mb-2">
                Flow Level
              </label>
              <div className="flex flex-wrap gap-2">
                {FLOW_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => setFlowLevel(level.value)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      flowLevel === level.value
                        ? "bg-app-red text-white"
                        : "bg-app-cream text-app-charcoal border border-app-border hover:border-app-red"
                    }`}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Product Usage - Only during Menstrual phase when enabled */}
          {safePeriodTracking.productTracking?.enabled && isMenstrualPhase && (
            <div className="pt-4 pb-4 border-t border-app-border">
              <label className="block text-sm font-medium text-app-charcoal mb-3">
                Products Used
              </label>
              <ProductUsageEntrySection
                productTracking={safePeriodTracking.productTracking}
                selectedProductUsage={productUsage}
                onChange={setProductUsage}
              />
            </div>
          )}
        </section>
      )}

      {/* Symptoms Section */}
      {allSymptomsToShow.length > 0 && shouldShowSection("symptoms") && (
        <section className="card">
          <h2 className="text-lg font-semibold text-app-charcoal mb-4">
            🏷️ General Symptoms
          </h2>
          <p className="text-sm text-app-gray mb-3">
            Select any symptoms you&apos;re experiencing:
          </p>

          {/* Legend - only show during menstrual phase when there are period symptoms */}
          {isMenstrualPhase && periodSymptomsList.length > 0 && (
            <div className="flex flex-wrap gap-4 mb-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-app-red"></span>
                <span className="text-app-gray">Period-related</span>
              </div>
            </div>
          )}

          {/* Symptom Chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            {allSymptomsToShow.map((symptom) => {
              const selected = selectedSymptoms.find((s) => s.name === symptom);
              const isPeriodRelated = periodSymptomsList.includes(symptom);
              const accentColor = isMenstrualPhase && isPeriodRelated ? "red" : "teal";
              
              const colorClasses = {
                red: {
                  selected: "bg-app-red text-white",
                  unselected: "bg-app-cream text-app-charcoal border border-app-border hover:border-app-red",
                },
                teal: {
                  selected: "bg-app-teal text-white",
                  unselected: "bg-app-cream text-app-charcoal border border-app-border hover:border-app-teal",
                },
              };

              return (
                <button
                  key={symptom}
                  type="button"
                  onClick={() => toggleSymptom(symptom)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selected
                      ? colorClasses[accentColor].selected
                      : colorClasses[accentColor].unselected
                  }`}
                >
                  {symptom}
                  {isMenstrualPhase && isPeriodRelated && (
                    <span className="w-1.5 h-1.5 rounded-full bg-app-red ml-1 inline-block"></span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Intensity Sliders for Selected Symptoms */}
          {intensityEnabled && selectedSymptoms.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-app-border">
              <p className="text-sm font-medium text-app-charcoal">Intensity levels:</p>
              {selectedSymptoms.map((symptom) => {
                const isPeriodRelated = periodSymptomsList.includes(symptom.name);
                const accentColor = isMenstrualPhase && isPeriodRelated ? "red" : "teal";
                const scaleInfo = PAIN_SCALE_INFO[painScaleType];
                const maxValue = 10;

                return (
                  <div
                    key={symptom.name}
                    className={`p-3 rounded-lg ${
                      accentColor === "red" ? "bg-app-red/5" : "bg-app-teal/5"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-app-charcoal">
                        {symptom.name}
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          accentColor === "red" ? "text-app-red" : "text-app-teal"
                        }`}
                      >
                        {symptom.intensity ?? (painScaleType === "mankoski" ? 0 : 1)} / {maxValue}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={painScaleType === "mankoski" ? 0 : 1}
                      max={maxValue}
                      value={symptom.intensity ?? (painScaleType === "mankoski" ? 0 : 1)}
                      onChange={(e) => updateSymptomIntensity(symptom.name, Number(e.target.value))}
                      className={`w-full ${
                        accentColor === "red" ? "accent-app-red" : "accent-app-teal"
                      }`}
                    />
                    <div className="flex justify-between text-xs text-app-gray mt-1">
                      <span>{scaleInfo.levels[0].label}</span>
                      <span>{scaleInfo.levels[scaleInfo.levels.length - 1].label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Medicine Log - Consolidated */}
      {safeMedicineTracking.enabled && safeMedicineTracking.medicines.length > 0 && shouldShowSection("medicine") && (
        <section className="card">
          <h2 className="text-lg font-semibold text-app-charcoal mb-4">
            💊 Medicine Log
          </h2>
          <p className="text-sm text-app-gray mb-4">
            Log any medications you&apos;re taking with this entry:
          </p>
          <ConsolidatedMedicineLog
            medicines={safeMedicineTracking.medicines}
            loggedMedicines={loggedMedicines}
            onChange={setLoggedMedicines}
            is24Hour={is24Hour}
          />
        </section>
      )}

      {/* Notes Section */}
      <section className="card">
        <h2 className="text-lg font-semibold text-app-charcoal mb-4">📝 Additional Notes</h2>
        <p className="text-sm text-app-gray mb-3">
          Optional — Add any additional thoughts or observations
        </p>
        <textarea
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="How are you feeling today? Any additional details..."
          rows={4}
          className={`w-full px-4 py-3 rounded-lg border bg-app-white focus:outline-none focus:ring-2 resize-none text-app-charcoal ${
            notesWarning
              ? "border-app-red focus:ring-app-red"
              : "border-app-border focus:ring-app-green"
          }`}
        />
        {/* {notesWarning && (
          <p className="mt-2 text-sm text-app-red">{notesWarning}</p>
        )}
        <p className="mt-2 text-xs text-app-gray">
          🔒 For security, code-like content is not allowed in notes.
        </p> */}
      </section>

      {/* End Time Card */}
      <section className="card">
        <TimeInputSection
          label="⏱️ End Time"
          value={endTime}
          onChange={setEndTime}
          is24Hour={is24Hour}
        />
      </section>

      {/* Submit Button */}
      <div className="pt-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || submitSuccess || !!notesWarning}
          className={`w-full py-4 rounded-lg font-semibold text-white transition-all ${
            submitSuccess
              ? "bg-app-green"
              : isSubmitting
              ? "bg-app-teal/70 cursor-wait"
              : notesWarning
              ? "bg-app-gray cursor-not-allowed"
              : "bg-app-teal hover:bg-app-teal"
          }`}
        >
          {submitSuccess ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="w-5 h-5"
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
              Entry Saved!
            </span>
          ) : isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Saving...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="w-5 h-5"
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
              Submit Entry
            </span>
          )}
        </button>
      </div>
    </div>
    </>
  );
}

// ============================================
// Helper Components
// ============================================

interface TimeInputSectionProps {
  label: string;
  value: TimeValue;
  onChange: (value: TimeValue) => void;
  is24Hour: boolean;
}

function TimeInputSection({ label, value, onChange, is24Hour }: TimeInputSectionProps) {
  const setNow = () => {
    const now = new Date();
    let hour = now.getHours();
    const minute = now.getMinutes();
    let period: "AM" | "PM" = "AM";

    if (!is24Hour) {
      period = hour >= 12 ? "PM" : "AM";
      hour = hour % 12 || 12;
    }

    onChange({ hour, minute, period });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-app-charcoal">{label}</h2>
        <button
          type="button"
          onClick={setNow}
          className="px-4 py-2 rounded-lg bg-app-green text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Now
        </button>
      </div>
      <div className="flex items-center justify-center gap-2">
        <div className="w-20">
          <input
            type="number"
            min={is24Hour ? 0 : 1}
            max={is24Hour ? 23 : 12}
            value={value.hour}
            onChange={(e) => onChange({ ...value, hour: Number(e.target.value) })}
            className="w-full px-3 py-3 rounded-lg border border-app-border bg-app-white focus:outline-none focus:ring-2 focus:ring-app-green text-center text-lg font-medium text-app-charcoal"
          />
          <p className="text-xs text-app-gray text-center mt-1">Hour</p>
        </div>
        <span className="text-2xl text-app-gray font-bold pb-5">:</span>
        <div className="w-20">
          <input
            type="number"
            min={0}
            max={59}
            value={value.minute.toString().padStart(2, "0")}
            onChange={(e) => onChange({ ...value, minute: Number(e.target.value) })}
            className="w-full px-3 py-3 rounded-lg border border-app-border bg-app-white focus:outline-none focus:ring-2 focus:ring-app-green text-center text-lg font-medium text-app-charcoal"
          />
          <p className="text-xs text-app-gray text-center mt-1">Min</p>
        </div>
        {!is24Hour && (
          <div className="w-20">
            <select
              value={value.period}
              onChange={(e) => onChange({ ...value, period: e.target.value as "AM" | "PM" })}
              className="w-full px-2 py-3 rounded-lg border border-app-border bg-app-white focus:outline-none focus:ring-2 focus:ring-app-green text-center text-lg font-medium text-app-charcoal"
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
            <p className="text-xs text-app-gray text-center mt-1 invisible">Period</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface ConsolidatedMedicineLogProps {
  medicines: Medicine[];
  loggedMedicines: MedicineLogEntry[];
  onChange: (entries: MedicineLogEntry[]) => void;
  is24Hour: boolean;
}

interface ProductUsageEntrySectionProps {
  productTracking: ProductTracking;
  selectedProductUsage: ProductUsageEntry[];
  onChange: (usage: ProductUsageEntry[]) => void;
}

function ProductUsageEntrySection({ 
  productTracking, 
  selectedProductUsage, 
  onChange 
}: ProductUsageEntrySectionProps) {
  // Use string[] instead of ProductType[]
  const selectedProducts = productTracking.selectedProducts ?? [];
  const customProducts = productTracking.customProducts ?? {};

  // Check which products have incomplete selections
  const getProductValidation = (productType: string) => {
    const usage = selectedProductUsage.find((p) => p.productType === productType);
    if (!usage) return null;
    return isProductUsageComplete(usage, PRODUCT_OPTIONS, customProducts);
  };

  // productType is now string
  const toggleProduct = (productType: string) => {
    const exists = selectedProductUsage.find((p) => p.productType === productType);
    if (exists) {
      onChange(selectedProductUsage.filter((p) => p.productType !== productType));
    } else {
      onChange([...selectedProductUsage, { productType }]);
    }
  };

  // productType is now string
  const updateProductDetails = (
    productType: string,
    updates: Partial<ProductUsageEntry>
  ) => {
    onChange(
      selectedProductUsage.map((p) =>
        p.productType === productType ? { ...p, ...updates } : p
      )
    );
  };

  if (selectedProducts.length === 0) {
    return (
      <p className="text-sm text-app-gray italic">
        No products configured. Add products in Settings → Period Tracking.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Product Selection Chips */}
      <div className="flex flex-wrap gap-2">
        {selectedProducts.map((productType) => {
          const product = PRODUCT_OPTIONS.find((p) => p.type === productType);
          const isSelected = selectedProductUsage.some((p) => p.productType === productType);
          
          if (!product) return null;
          
          return (
            <button
              key={productType}
              type="button"
              onClick={() => toggleProduct(productType)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                isSelected
                  ? "bg-app-red text-white"
                  : "bg-app-cream text-app-charcoal border border-app-border hover:border-app-red"
              }`}
            >
              {product.label}
            </button>
          );
        })}
      </div>

      {/* Details for Selected Products */}
      {selectedProductUsage.map((usage) => {
        const product = PRODUCT_OPTIONS.find((p) => p.type === usage.productType);
        if (!product) return null;

        // Access custom products using string key
        const productCustomItems = customProducts[usage.productType] ?? [];
        const hasCustomProducts = product.allowCustomProducts && productCustomItems.length > 0;
        
        // Check validation status
        const validation = isProductUsageComplete(usage, PRODUCT_OPTIONS, customProducts);
        const isIncomplete = !validation.isComplete;

        return (
          <div
            key={usage.productType}
            className={`p-3 rounded-lg border ${
              isIncomplete 
                ? "bg-app-red/10 border-app-red/40" 
                : "bg-app-red/5 border-app-red/20"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-app-charcoal">
                {product.label} details:
              </p>
              {isIncomplete && (
                <span className="text-xs text-app-red font-medium">
                  ⚠️ Selection required
                </span>
              )}
            </div>

            {/* Custom Product Selection (for cups, discs, etc.) */}
            {hasCustomProducts && (
              <div className="mb-3">
                <p className={`text-xs mb-2 ${
                  validation.missingField === 'customProduct' 
                    ? "text-app-red font-medium" 
                    : "text-app-gray"
                }`}>
                  Which one? {validation.missingField === 'customProduct' && "*"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {productCustomItems.map((cp: CustomProduct) => (
                    <button
                      key={cp.id}
                      type="button"
                      onClick={() =>
                        updateProductDetails(usage.productType, {
                          customProductId: usage.customProductId === cp.id ? undefined : cp.id,
                        })
                      }
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        usage.customProductId === cp.id
                          ? "bg-app-red opacity-85 text-white"
                          : "bg-app-white text-app-charcoal border border-app-border hover:border-app-red"
                      }`}
                    >
                      {cp.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size Selection */}
            {product.hasSizes && product.sizes && product.sizes.length > 0 && (
              <div>
                <p className={`text-xs mb-2 ${
                  validation.missingField === 'size' 
                    ? "text-app-red font-medium" 
                    : "text-app-gray"
                }`}>
                  Size/Absorbency: {validation.missingField === 'size' && "*"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size: string) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() =>
                        updateProductDetails(usage.productType, {
                          size: usage.size === size ? undefined : size,
                        })
                      }
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        usage.size === size
                          ? "bg-app-red opacity-85 text-white"
                          : "bg-app-white text-app-charcoal border border-app-border hover:border-app-red"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}