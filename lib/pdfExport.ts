// ============================================
// PDF Export Utility - Clinician-Focused Reports
// ============================================

import type { StoredEntry, LogSection } from "@/types";
import { BRISTOL_TYPES } from "@/lib/constants";

// ============================================
// Helper Functions
// ============================================

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);

  return `${startDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })} - ${endDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function calculateDaysDifference(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// ============================================
// Data Analysis Functions
// ============================================

interface CycleStats {
  cycleCount: number;
  averageLength: number | null;
  periodDetails: Array<{
    cycleNumber: number;
    startDate: string;
    endDate: string | null;
    lengthDays: number | null;
    averageFlow: string;
  }>;
}

function analyzeCycleData(entries: StoredEntry[]): CycleStats {
  // Filter entries with menstrual phase
  const menstrualEntries = entries.filter(e => e.cyclePhase === "menstrual");

  if (menstrualEntries.length === 0) {
    return { cycleCount: 0, averageLength: null, periodDetails: [] };
  }

  // Group consecutive menstrual entries into cycles
  const sortedEntries = [...menstrualEntries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const cycles: Array<{ start: string; end: string; flows: string[] }> = [];
  let currentCycle: { start: string; end: string; flows: string[] } | null = null;

  sortedEntries.forEach((entry, index) => {
    const prevEntry = index > 0 ? sortedEntries[index - 1] : null;
    const daysDiff = prevEntry
      ? calculateDaysDifference(prevEntry.date, entry.date)
      : 0;

    // Start new cycle if no current cycle or if gap > 10 days
    if (!currentCycle || daysDiff > 10) {
      if (currentCycle) cycles.push(currentCycle);
      currentCycle = {
        start: entry.date,
        end: entry.date,
        flows: entry.periodFlow ? [entry.periodFlow] : []
      };
    } else {
      // Continue current cycle
      currentCycle.end = entry.date;
      if (entry.periodFlow) currentCycle.flows.push(entry.periodFlow);
    }
  });

  if (currentCycle) cycles.push(currentCycle);

  // Calculate cycle lengths (from start of one to start of next)
  const cycleLengths: number[] = [];
  for (let i = 0; i < cycles.length - 1; i++) {
    const length = calculateDaysDifference(cycles[i].start, cycles[i + 1].start);
    cycleLengths.push(length);
  }

  const averageLength = cycleLengths.length > 0
    ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length)
    : null;

  const periodDetails = cycles.map((cycle, index) => {
    const avgFlow = getAverageFlow(cycle.flows);

    return {
      cycleNumber: index + 1,
      startDate: cycle.start,
      endDate: cycle.end,
      lengthDays: index < cycles.length - 1 ? cycleLengths[index] : null,
      averageFlow: avgFlow,
    };
  });

  return {
    cycleCount: cycles.length,
    averageLength,
    periodDetails,
  };
}

function getAverageFlow(flows: string[]): string {
  if (flows.length === 0) return "Not tracked";

  const flowWeights: Record<string, number> = {
    spotting: 1,
    light: 2,
    medium: 3,
    heavy: 4,
  };

  const avgWeight = flows.reduce((sum, flow) => sum + (flowWeights[flow] || 0), 0) / flows.length;

  if (avgWeight <= 1.5) return "Spotting/Light";
  if (avgWeight <= 2.5) return "Light/Medium";
  if (avgWeight <= 3.5) return "Medium/Heavy";
  return "Heavy";
}

interface StoolStats {
  totalEntries: number;
  mostCommonType: number | null;
  distribution: Record<number, number>;
}

function analyzeStoolLogs(entries: StoredEntry[]): StoolStats {
  const stoolEntries = entries.filter(e => e.stoolType !== null);

  if (stoolEntries.length === 0) {
    return { totalEntries: 0, mostCommonType: null, distribution: {} };
  }

  const distribution: Record<number, number> = {};
  stoolEntries.forEach(entry => {
    if (entry.stoolType) {
      distribution[entry.stoolType] = (distribution[entry.stoolType] || 0) + 1;
    }
  });

  const mostCommonType = Object.entries(distribution).sort(
    ([, a], [, b]) => b - a
  )[0]?.[0];

  return {
    totalEntries: stoolEntries.length,
    mostCommonType: mostCommonType ? Number(mostCommonType) : null,
    distribution,
  };
}

interface SymptomStats {
  totalEntries: number;
  topSymptoms: Array<{ name: string; count: number; avgIntensity: number | null }>;
  severityBreakdown: {
    mild: number;
    moderate: number;
    severe: number;
  };
}

function analyzeSymptoms(entries: StoredEntry[]): SymptomStats {
  const symptomCounts: Record<string, { count: number; intensities: number[] }> = {};

  entries.forEach(entry => {
    // General symptoms
    Object.entries(entry.symptomIntensities || {}).forEach(([symptom, intensity]) => {
      if (!symptomCounts[symptom]) {
        symptomCounts[symptom] = { count: 0, intensities: [] };
      }
      symptomCounts[symptom].count++;
      if (intensity !== null && intensity !== undefined) {
        symptomCounts[symptom].intensities.push(intensity);
      }
    });

    // Period symptoms
    Object.entries(entry.periodSymptomIntensities || {}).forEach(([symptom, intensity]) => {
      const label = `${symptom} (period)`;
      if (!symptomCounts[label]) {
        symptomCounts[label] = { count: 0, intensities: [] };
      }
      symptomCounts[label].count++;
      if (intensity !== null && intensity !== undefined) {
        symptomCounts[label].intensities.push(intensity);
      }
    });
  });

  const topSymptoms = Object.entries(symptomCounts)
    .map(([name, data]) => ({
      name,
      count: data.count,
      avgIntensity: data.intensities.length > 0
        ? Math.round((data.intensities.reduce((a, b) => a + b, 0) / data.intensities.length) * 10) / 10
        : null,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // Severity breakdown (assuming 0-10 scale)
  const allIntensities = Object.values(symptomCounts).flatMap(d => d.intensities);
  const severityBreakdown = {
    mild: allIntensities.filter(i => i <= 3).length,
    moderate: allIntensities.filter(i => i > 3 && i <= 7).length,
    severe: allIntensities.filter(i => i > 7).length,
  };

  return {
    totalEntries: entries.filter(e =>
      Object.keys(e.symptomIntensities || {}).length > 0 ||
      Object.keys(e.periodSymptomIntensities || {}).length > 0
    ).length,
    topSymptoms,
    severityBreakdown,
  };
}

interface MedicationStats {
  medications: Array<{
    name: string;
    frequency: number;
    commonDosage: string;
  }>;
}

function analyzeMedications(entries: StoredEntry[]): MedicationStats {
  const medCounts: Record<string, { count: number; dosages: string[] }> = {};

  entries.forEach(entry => {
    entry.medicineLog?.forEach(med => {
      if (!medCounts[med.medicineName]) {
        medCounts[med.medicineName] = { count: 0, dosages: [] };
      }
      medCounts[med.medicineName].count++;
      if (med.dosage) {
        medCounts[med.medicineName].dosages.push(med.dosage);
      }
    });
  });

  const medications = Object.entries(medCounts)
    .map(([name, data]) => {
      // Find most common dosage
      const dosageCounts: Record<string, number> = {};
      data.dosages.forEach(d => {
        dosageCounts[d] = (dosageCounts[d] || 0) + 1;
      });
      const commonDosage = Object.entries(dosageCounts).sort(
        ([, a], [, b]) => b - a
      )[0]?.[0] || "Not tracked";

      return {
        name,
        frequency: data.count,
        commonDosage,
      };
    })
    .sort((a, b) => b.frequency - a.frequency);

  return { medications };
}

// ============================================
// PDF Generation
// ============================================

interface PDFOptions {
  sections: LogSection[];
  dateRange: {
    start: string;
    end: string;
  };
  entries: StoredEntry[];
}

export async function generatePDFReport(options: PDFOptions): Promise<void> {
  const { sections, dateRange, entries } = options;

  // Filter entries by date range
  const filteredEntries = entries.filter(entry => {
    const entryDate = new Date(entry.date);
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    return entryDate >= startDate && entryDate <= endDate;
  });

  // Dynamically import jsPDF (client-side only)
  const { default: jsPDF } = await import("jspdf");

  // Create PDF document
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  // Colors (using RGB values)
  const colors = {
    primary: [16, 75, 85], // app-teal
    text: [89, 87, 46], // app-charcoal
    gray: [122, 122, 122], // app-gray
    accent: [63, 89, 46], // app-green
  };

  // Helper to add a new page if needed
  const checkPageBreak = (requiredSpace: number = 10) => {
    if (yPos + requiredSpace > pageHeight - margin - 20) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // Helper to add text
  const addText = (
    text: string,
    fontSize: number,
    isBold: boolean = false,
    color: number[] = colors.text,
    indent: number = 0
  ) => {
    checkPageBreak(fontSize + 2);
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFont("helvetica", isBold ? "bold" : "normal");

    const lines = doc.splitTextToSize(text, contentWidth - indent);
    lines.forEach((line: string) => {
      checkPageBreak(fontSize + 2);
      doc.text(line, margin + indent, yPos);
      yPos += fontSize * 0.5 + 2;
    });
  };

  // ============================================
  // HEADER
  // ============================================

  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Health Tracking Report", margin, yPos);
  yPos += 10;

  // Generation info
  doc.setFontSize(9);
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  })}`, margin, yPos);
  yPos += 6;

  doc.text(`Report Period: ${formatDateRange(dateRange.start, dateRange.end)}`, margin, yPos);
  yPos += 6;

  doc.text(`Patient Data: Self-reported`, margin, yPos);
  yPos += 12;

  // ============================================
  // OVERVIEW SECTION
  // ============================================

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
  doc.text("Overview", margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const periodDays = calculateDaysDifference(dateRange.start, dateRange.end) + 1;
  addText(`Report period: ${periodDays} days`, 10);
  addText(`Total entries: ${filteredEntries.length}`, 10);

  const sectionLabels: Record<LogSection, string> = {
    symptoms: "Symptoms",
    bowel: "Stool logs",
    period: "Cycle data",
    medicine: "Medications",
  };
  addText(`Categories included: ${sections.map(s => sectionLabels[s]).join(", ")}`, 10);

  yPos += 6;

  // ============================================
  // CYCLE DATA SECTION
  // ============================================

  if (sections.includes("period")) {
    checkPageBreak(20);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.text("Cycle Data", margin, yPos);
    yPos += 8;

    const cycleStats = analyzeCycleData(filteredEntries);

    if (cycleStats.cycleCount === 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
      addText("No cycle data logged in this period", 10);
    } else {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);

      addText(`Cycles tracked: ${cycleStats.cycleCount}`, 10);
      if (cycleStats.averageLength) {
        addText(`Average cycle length: ${cycleStats.averageLength} days`, 10);
      }

      yPos += 4;
      doc.setFont("helvetica", "bold");
      addText("Period details:", 10);
      doc.setFont("helvetica", "normal");

      cycleStats.periodDetails.forEach(detail => {
        checkPageBreak(15);
        addText(`• Cycle ${detail.cycleNumber}: Started ${new Date(detail.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`, 9, false, colors.text, 5);
        if (detail.lengthDays) {
          addText(`  Length: ${detail.lengthDays} days, Flow: ${detail.averageFlow}`, 9, false, colors.gray, 5);
        } else {
          addText(`  Flow: ${detail.averageFlow} (ongoing or last cycle)`, 9, false, colors.gray, 5);
        }
      });
    }

    yPos += 6;
  }

  // ============================================
  // STOOL LOGS SECTION
  // ============================================

  if (sections.includes("bowel")) {
    checkPageBreak(20);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.text("Stool Logs", margin, yPos);
    yPos += 8;

    const stoolStats = analyzeStoolLogs(filteredEntries);

    if (stoolStats.totalEntries === 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
      addText("No stool entries in this period", 10);
    } else {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);

      addText(`Total bowel movements logged: ${stoolStats.totalEntries}`, 10);

      if (stoolStats.mostCommonType) {
        const bristol = BRISTOL_TYPES.find(b => b.type === stoolStats.mostCommonType);
        addText(`Most common type: Type ${stoolStats.mostCommonType} - ${bristol?.name || "Unknown"}`, 10);
      }

      yPos += 4;
      doc.setFont("helvetica", "bold");
      addText("Bristol Stool Scale distribution:", 10);
      doc.setFont("helvetica", "normal");

      Object.entries(stoolStats.distribution)
        .sort(([a], [b]) => Number(a) - Number(b))
        .forEach(([type, count]) => {
          const bristol = BRISTOL_TYPES.find(b => b.type === Number(type));
          const percentage = Math.round((count / stoolStats.totalEntries) * 100);
          addText(`• Type ${type} (${bristol?.name}): ${count} entries (${percentage}%)`, 9, false, colors.text, 5);
        });
    }

    yPos += 6;
  }

  // ============================================
  // SYMPTOMS SECTION
  // ============================================

  if (sections.includes("symptoms")) {
    checkPageBreak(20);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.text("Symptoms", margin, yPos);
    yPos += 8;

    const symptomStats = analyzeSymptoms(filteredEntries);

    if (symptomStats.totalEntries === 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
      addText("No symptoms logged in this period", 10);
    } else {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);

      addText(`Entries with symptoms: ${symptomStats.totalEntries}`, 10);

      if (symptomStats.topSymptoms.length > 0) {
        yPos += 4;
        doc.setFont("helvetica", "bold");
        addText("Most frequent symptoms:", 10);
        doc.setFont("helvetica", "normal");

        symptomStats.topSymptoms.forEach((symptom, index) => {
          const intensityStr = symptom.avgIntensity
            ? `, avg intensity: ${symptom.avgIntensity}/10`
            : "";
          addText(`${index + 1}. ${symptom.name}: ${symptom.count} occurrences${intensityStr}`, 9, false, colors.text, 5);
        });
      }

      // Severity breakdown
      const totalWithIntensity = symptomStats.severityBreakdown.mild +
        symptomStats.severityBreakdown.moderate +
        symptomStats.severityBreakdown.severe;

      if (totalWithIntensity > 0) {
        yPos += 4;
        doc.setFont("helvetica", "bold");
        addText("Severity distribution:", 10);
        doc.setFont("helvetica", "normal");

        addText(`• Mild (0-3): ${symptomStats.severityBreakdown.mild} reports`, 9, false, colors.text, 5);
        addText(`• Moderate (4-7): ${symptomStats.severityBreakdown.moderate} reports`, 9, false, colors.text, 5);
        addText(`• Severe (8-10): ${symptomStats.severityBreakdown.severe} reports`, 9, false, colors.text, 5);
      }
    }

    yPos += 6;
  }

  // ============================================
  // MEDICATIONS SECTION
  // ============================================

  if (sections.includes("medicine")) {
    checkPageBreak(20);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.text("Medications", margin, yPos);
    yPos += 8;

    const medStats = analyzeMedications(filteredEntries);

    if (medStats.medications.length === 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
      addText("No medications logged in this period", 10);
    } else {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);

      addText("Active medications and usage:", 10);
      yPos += 2;

      medStats.medications.forEach(med => {
        addText(`• ${med.name}`, 9, true, colors.text, 5);
        addText(`  Frequency: ${med.frequency} times, Common dosage: ${med.commonDosage}`, 9, false, colors.gray, 5);
      });
    }

    yPos += 6;
  }

  // ============================================
  // FOOTER - Disclaimer
  // ============================================

  // Move to bottom of last page
  const totalPages = doc.getNumberOfPages();
  doc.setPage(totalPages);

  // Add disclaimer at bottom
  const disclaimerY = pageHeight - margin - 15;
  doc.setFontSize(8);
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
  doc.setFont("helvetica", "italic");

  const disclaimer = "This report contains self-reported data and is intended to support clinical conversations, not replace diagnosis.";
  const disclaimerLines = doc.splitTextToSize(disclaimer, contentWidth);

  let disclaimerYPos = disclaimerY;
  disclaimerLines.forEach((line: string) => {
    doc.text(line, margin, disclaimerYPos);
    disclaimerYPos += 4;
  });

  // Add page numbers to all pages
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin - 20,
      pageHeight - margin,
      { align: "right" }
    );
  }

  // Generate filename
  const dateStr = new Date().toISOString().split("T")[0];
  const filename = `health-report-${dateStr}.pdf`;

  // Save PDF
  doc.save(filename);
}
