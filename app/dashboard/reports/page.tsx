"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/stores/useSettings";
import { useEntries } from "@/stores/useEntries";
import { ReportSectionModal } from "@/components/entry";
import { generatePDFReport } from "@/lib/pdfExport";
import type { LogSection } from "@/types";

// =============================================================================
// REPORTS PAGE
// =============================================================================

export default function ReportsPage() {
  const router = useRouter();
  const { symptoms, periodTracking, stoolTracking, medicineTracking, timeFormat } = useSettings();
  const { entries } = useEntries();
  const [showModal, setShowModal] = useState(true);
  const [selectedSections, setSelectedSections] = useState<LogSection[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

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
  const safeMedicineTracking = medicineTracking ?? { enabled: false, medicines: [] };

  // Compute available sections based on settings
  const availableSections = {
    symptoms: safeSymptoms.selected.length > 0,
    bowel: safeStoolTracking.enabled,
    period: safePeriodTracking.enabled,
    medicine: safeMedicineTracking.enabled && safeMedicineTracking.medicines.length > 0,
  };

  // Handle modal confirmation
  const handleSectionConfirm = (sections: LogSection[]) => {
    setSelectedSections(sections);
    setShowModal(false);
  };

  // Handle modal cancel
  const handleModalCancel = () => {
    router.push("/dashboard");
  };

  // Generate PDF report
  const generatePDF = async () => {
    if (!selectedSections || selectedSections.length === 0) {
      return;
    }

    setIsGenerating(true);

    try {
      // Generate PDF using the utility function
      await generatePDFReport({
        sections: selectedSections,
        timeFormat: timeFormat || "12h",
        entries: entries,
      });
      
      // Reset to allow generating another report after a short delay
      setTimeout(() => {
        setSelectedSections(null);
        setShowModal(true);
        setIsGenerating(false);
      }, 500);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate report. Please try again.");
      setIsGenerating(false);
    }
  };

  return (
    <>
      {/* Report Section Selection Modal */}
      {showModal && (
        <ReportSectionModal
          availableSections={availableSections}
          onConfirm={handleSectionConfirm}
          onCancel={handleModalCancel}
        />
      )}

      {/* Main Page Content */}
      {!showModal && selectedSections && (
        <div className="space-y-6">
          {/* Page Header */}
          <div>
            <h1 className="text-2xl font-bold text-app-charcoal">Generate Report</h1>
            <p className="text-app-gray">Create a PDF report for healthcare providers</p>
          </div>

          {/* Selected Sections Summary */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-app-charcoal mb-4">
              Selected Sections
            </h2>
            <div className="flex flex-wrap gap-2">
              {selectedSections.map((section) => {
                const sectionLabels: Record<LogSection, string> = {
                  symptoms: "General Symptoms",
                  bowel: "Bowel Movement",
                  period: "Period / Cycle",
                  medicine: "Medicine",
                };
                const sectionIcons: Record<LogSection, string> = {
                  symptoms: "🏷️",
                  bowel: "🧻",
                  period: "🌸",
                  medicine: "💊",
                };
                return (
                  <div
                    key={section}
                    className="px-4 py-2 rounded-lg bg-app-green/10 border border-app-green text-app-charcoal font-medium flex items-center gap-2"
                  >
                    <span>{sectionIcons[section]}</span>
                    <span>{sectionLabels[section]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Report Info */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-app-charcoal mb-4">
              Report Information
            </h2>
            <div className="space-y-2 text-sm text-app-gray">
              <p>
                <strong className="text-app-charcoal">Total Entries:</strong> {entries.length}
              </p>
              <p>
                <strong className="text-app-charcoal">Date Range:</strong>{" "}
                {entries.length > 0
                  ? (() => {
                      const sortedEntries = [...entries].sort(
                        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
                      );
                      const oldest = sortedEntries[0]?.date;
                      const newest = sortedEntries[sortedEntries.length - 1]?.date;
                      return `${new Date(oldest || "").toLocaleDateString()} - ${new Date(newest || "").toLocaleDateString()}`;
                    })()
                  : "No entries"}
              </p>
              <p className="text-xs text-app-gray mt-4">
                This report will include all entries with the selected sections. Perfect for
                sharing with your PCP, nutritionist, or therapist.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={generatePDF}
              disabled={isGenerating}
              className={`w-full py-4 rounded-xl font-semibold text-white transition-all ${
                isGenerating
                  ? "bg-app-teal/70 cursor-wait"
                  : "bg-app-teal hover:opacity-90"
              }`}
            >
              {isGenerating ? (
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
                  Generating Report...
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
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Generate PDF Report
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedSections(null);
                setShowModal(true);
              }}
              className="w-full py-3 rounded-xl text-center font-medium text-app-gray hover:text-app-charcoal hover:bg-app-cream transition-colors"
            >
              Change Sections
            </button>

            <button
              type="button"
              onClick={handleModalCancel}
              className="w-full py-3 rounded-xl text-center font-medium text-app-gray hover:text-app-charcoal hover:bg-app-cream transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </>
  );
}
