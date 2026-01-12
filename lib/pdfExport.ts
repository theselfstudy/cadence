// ============================================
// PDF Export Utility
// ============================================

import type { StoredEntry, LogSection, TimeFormat } from "@/types";
import { BRISTOL_TYPES, POST_BOWEL_FEELINGS, CYCLE_PHASES, FLOW_LEVELS } from "@/lib/constants";

// ============================================
// Helper Functions
// ============================================

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
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

function formatTimeForDisplay(timeStr: string, format: TimeFormat): string {
  if (!timeStr) return "";
  
  const parts = timeStr.split(" ");
  if (parts.length === 2) {
    // 12h format: "12:30 PM"
    return timeStr;
  }
  
  // 24h format: "14:30"
  const [hourStr, minuteStr] = timeStr.split(":");
  const hour = parseInt(hourStr, 10);
  const minute = minuteStr || "00";
  
  if (format === "24h") {
    return `${hourStr.padStart(2, "0")}:${minute}`;
  }
  
  // Convert to 12h
  if (hour === 0) return `12:${minute} AM`;
  if (hour === 12) return `12:${minute} PM`;
  if (hour > 12) return `${hour - 12}:${minute} PM`;
  return `${hour}:${minute} AM`;
}

function calculateDuration(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return "—";
  
  // Handle both 12h and 24h formats
  const parseTime = (timeStr: string): number => {
    const parts = timeStr.split(" ");
    if (parts.length === 2) {
      // 12h format
      const [time, period] = parts;
      const [hour, minute] = time.split(":").map(Number);
      let totalMinutes = hour * 60 + minute;
      if (period === "PM" && hour !== 12) totalMinutes += 12 * 60;
      if (period === "AM" && hour === 12) totalMinutes -= 12 * 60;
      return totalMinutes;
    } else {
      // 24h format
      const [hour, minute] = timeStr.split(":").map(Number);
      return hour * 60 + minute;
    }
  };
  
  const startTotal = parseTime(startTime);
  const endTotal = parseTime(endTime);
  
  let diff = endTotal - startTotal;
  if (diff < 0) diff += 24 * 60; // Handle overnight
  
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function getBristolTypeName(type: number | null): string {
  if (!type) return "—";
  const bristol = BRISTOL_TYPES.find((t) => t.type === type);
  return bristol ? `Type ${type}: ${bristol.name}` : `Type ${type}`;
}

function getPostFeelingLabel(feeling: string | null): string {
  if (!feeling) return "—";
  const postFeeling = POST_BOWEL_FEELINGS.find((f) => f.value === feeling);
  return postFeeling ? postFeeling.label : feeling;
}

function getCyclePhaseLabel(phase: string | null): string {
  if (!phase) return "—";
  const cyclePhase = CYCLE_PHASES.find((p) => p.value === phase);
  return cyclePhase ? cyclePhase.label : phase;
}

function getFlowLevelLabel(flow: string | null): string {
  if (!flow) return "—";
  const flowLevel = FLOW_LEVELS.find((f) => f.value === flow);
  return flowLevel ? flowLevel.label : flow;
}

// ============================================
// PDF Generation
// ============================================

interface PDFOptions {
  sections: LogSection[];
  timeFormat: TimeFormat;
  entries: StoredEntry[];
}

export async function generatePDFReport(options: PDFOptions): Promise<void> {
  const { sections, timeFormat, entries } = options;
  
  // Dynamically import jsPDF (client-side only)
  const { default: jsPDF } = await import("jspdf");
  
  // Sort entries by date (oldest first)
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // Create PDF document
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;
  
  // Colors (using RGB values)
  const colors = {
    header: [63, 89, 46], // app-green
    text: [89, 87, 46], // app-charcoal
    gray: [122, 122, 122], // app-gray
    accent: [16, 75, 85], // app-teal
  };
  
  // Helper to add a new page if needed
  const checkPageBreak = (requiredSpace: number = 10) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };
  
  // Helper to add text with word wrapping
  const addText = (text: string, fontSize: number, isBold: boolean = false, color: number[] = colors.text) => {
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);
    if (isBold) {
      doc.setFont("helvetica", "bold");
    } else {
      doc.setFont("helvetica", "normal");
    }
    
    const lines = doc.splitTextToSize(text, contentWidth);
    lines.forEach((line: string) => {
      checkPageBreak(fontSize + 2);
      doc.text(line, margin, yPos);
      yPos += fontSize * 0.5 + 2;
    });
    return yPos;
  };
  
  // Header
  doc.setTextColor(colors.header[0], colors.header[1], colors.header[2]);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("Health Tracking Report", margin, yPos);
  yPos += 15;
  
  // Report metadata
  doc.setFontSize(10);
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleDateString("en-US", { 
    year: "numeric", 
    month: "long", 
    day: "numeric" 
  })}`, margin, yPos);
  yPos += 8;
  
  doc.text(`Total Entries: ${entries.length}`, margin, yPos);
  yPos += 8;
  
  if (entries.length > 0) {
    const oldest = sortedEntries[0]?.date;
    const newest = sortedEntries[sortedEntries.length - 1]?.date;
    doc.text(
      `Date Range: ${formatDateShort(oldest || "")} - ${formatDateShort(newest || "")}`,
      margin,
      yPos
    );
    yPos += 12;
  }
  
  // Sections included
  doc.setFontSize(10);
  doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
  doc.setFont("helvetica", "bold");
  doc.text("Sections Included:", margin, yPos);
  yPos += 8;
  
  doc.setFont("helvetica", "normal");
  const sectionLabels: Record<LogSection, string> = {
    symptoms: "General Symptoms",
    bowel: "Bowel Movement",
    period: "Period / Cycle",
    medicine: "Medicine",
  };
  
  sections.forEach((section) => {
    doc.text(`• ${sectionLabels[section]}`, margin + 5, yPos);
    yPos += 6;
  });
  
  yPos += 10;
  
  // Add a line separator
  doc.setDrawColor(colors.gray[0], colors.gray[1], colors.gray[2]);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;
  
  // Process each entry
  sortedEntries.forEach((entry, index) => {
    checkPageBreak(30);
    
    // Entry header
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(colors.accent[0], colors.accent[1], colors.accent[2]);
    doc.text(`Entry ${index + 1}: ${formatDate(entry.date)}`, margin, yPos);
    yPos += 8;
    
    // Time and duration
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    const timeStr = `${formatTimeForDisplay(entry.startTime, timeFormat)} → ${formatTimeForDisplay(entry.endTime, timeFormat)}`;
    const duration = calculateDuration(entry.startTime, entry.endTime);
    doc.text(`Time: ${timeStr} (Duration: ${duration})`, margin, yPos);
    yPos += 7;
    
    // Symptoms section
    if (sections.includes("symptoms")) {
      const generalSymptoms = Object.entries(entry.symptomIntensities || {});
      const periodSymptoms = Object.entries(entry.periodSymptomIntensities || {});
      
      if (generalSymptoms.length > 0 || periodSymptoms.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("Symptoms:", margin, yPos);
        yPos += 6;
        doc.setFont("helvetica", "normal");
        
        generalSymptoms.forEach(([symptom, intensity]) => {
          const intensityStr = intensity !== null && intensity !== undefined ? ` (Intensity: ${intensity})` : "";
          yPos = addText(`• ${symptom}${intensityStr}`, 9);
        });
        
        periodSymptoms.forEach(([symptom, intensity]) => {
          const intensityStr = intensity !== null && intensity !== undefined ? ` (Intensity: ${intensity})` : "";
          yPos = addText(`• ${symptom} [Period-related]${intensityStr}`, 9);
        });
        
        yPos += 2;
      }
    }
    
    // Bowel section
    if (sections.includes("bowel")) {
      if (entry.stoolType || entry.stoolFeeling) {
        doc.setFont("helvetica", "bold");
        doc.text("Bowel Movement:", margin, yPos);
        yPos += 6;
        doc.setFont("helvetica", "normal");
        
        if (entry.stoolType) {
          yPos = addText(`Type: ${getBristolTypeName(entry.stoolType)}`, 9);
        }
        if (entry.stoolFeeling) {
          yPos = addText(`Feeling: ${getPostFeelingLabel(entry.stoolFeeling)}`, 9);
        }
        yPos += 2;
      }
    }
    
    // Period section
    if (sections.includes("period")) {
      if (entry.cyclePhase || entry.periodFlow || (entry.productUsage && entry.productUsage.length > 0)) {
        doc.setFont("helvetica", "bold");
        doc.text("Period / Cycle:", margin, yPos);
        yPos += 6;
        doc.setFont("helvetica", "normal");
        
        if (entry.cyclePhase) {
          yPos = addText(`Phase: ${getCyclePhaseLabel(entry.cyclePhase)}`, 9);
        }
        if (entry.periodFlow) {
          yPos = addText(`Flow: ${getFlowLevelLabel(entry.periodFlow)}`, 9);
        }
        if (entry.productUsage && entry.productUsage.length > 0) {
          const products = entry.productUsage.map((p) => {
            let productStr = p.productType;
            if (p.size) productStr += ` (${p.size})`;
            return productStr;
          }).join(", ");
          yPos = addText(`Products: ${products}`, 9);
        }
        yPos += 2;
      }
    }
    
    // Medicine section
    if (sections.includes("medicine")) {
      if (entry.medicineLog && entry.medicineLog.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("Medications:", margin, yPos);
        yPos += 6;
        doc.setFont("helvetica", "normal");
        
        entry.medicineLog.forEach((med) => {
          let medStr = med.medicineName;
          if (med.dosage) medStr += ` - ${med.dosage}`;
          if (med.time) {
            const timeStr = formatTimeForDisplay(
              `${med.time.hour}:${med.time.minute.toString().padStart(2, "0")} ${med.time.period}`,
              timeFormat
            );
            medStr += ` at ${timeStr}`;
          }
          yPos = addText(`• ${medStr}`, 9);
        });
        
        yPos += 2;
      }
    }
    
    // Notes
    if (entry.notes) {
      doc.setFont("helvetica", "bold");
      doc.text("Notes:", margin, yPos);
      yPos += 6;
      doc.setFont("helvetica", "normal");
      yPos = addText(entry.notes, 9);
      yPos += 2;
    }
    
    // Add spacing between entries
    yPos += 8;
    
    // Add separator line between entries (except last)
    if (index < sortedEntries.length - 1) {
      doc.setDrawColor(colors.gray[0], colors.gray[1], colors.gray[2]);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;
    }
  });
  
  // Footer on last page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - margin - 20,
      pageHeight - 10,
      { align: "right" }
    );
  }
  
  // Generate filename
  const dateStr = new Date().toISOString().split("T")[0];
  const filename = `health-report-${dateStr}.pdf`;
  
  // Save PDF
  doc.save(filename);
}
