"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/stores/useSettings";
import { useEntries } from "@/stores/useEntries";
import { ReportSectionModal, type ReportConfig } from "@/components/entry";
import { generatePDFReport } from "@/lib/pdfExport";

// =============================================================================
// REPORTS PAGE
// =============================================================================

export default function ReportsPage() {
  const router = useRouter();
  const { symptoms, periodTracking, stoolTracking, medicineTracking } = useSettings();
  const { entries } = useEntries();
  const [showModal, setShowModal] = useState(true);
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
  const handleSectionConfirm = async (config: ReportConfig) => {
    setShowModal(false);
    setIsGenerating(true);

    try {
      // Generate PDF using the utility function
      await generatePDFReport({
        sections: config.sections,
        dateRange: config.dateRange,
        entries: entries,
      });

      // Show success message briefly then redirect
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate report. Please try again.");
      setIsGenerating(false);
      setShowModal(true);
    }
  };

  // Handle modal cancel
  const handleModalCancel = () => {
    router.push("/dashboard");
  };

  return (
    <>
      {/* Report Configuration Modal */}
      {showModal && !isGenerating && (
        <ReportSectionModal
          availableSections={availableSections}
          onConfirm={handleSectionConfirm}
          onCancel={handleModalCancel}
        />
      )}

      {/* Generating State */}
      {isGenerating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-app-charcoal/60 backdrop-blur-sm" />

          <div className="relative bg-app-white rounded-2xl shadow-xl p-8 max-w-sm mx-4">
            <div className="text-center">
              {/* Spinner */}
              <div className="mx-auto w-16 h-16 mb-4">
                <svg
                  className="w-full h-full animate-spin text-app-teal"
                  fill="none"
                  viewBox="0 0 24 24"
                >
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
              </div>

              <h2 className="text-xl font-bold text-app-charcoal mb-2">
                Generating Report
              </h2>
              <p className="text-sm text-app-gray">
                Analyzing your health data and creating PDF...
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
