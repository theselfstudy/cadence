// /components/cycleinsights/sections/DetailedViewsSection.tsx
"use client";

import { useState } from "react";
import type { StoredEntry } from "@/types";
import type { 
  DetectedCycle, 
  CycleComparison, 
  CyclePhaseSymptomData 
} from "@/lib/monthlyUtils";

// ============================================
// DETAILED VIEWS SECTION (PLACEHOLDER)
// Will be built in Phase 4
// ============================================

interface DetailedViewsSectionProps {
  cycles: DetectedCycle[];
  entries: StoredEntry[];
  cycleComparison: CycleComparison | null;
  cyclePhaseHeatMapData: CyclePhaseSymptomData[];
}

export function DetailedViewsSection({
  cycles,
  entries,
  cycleComparison,
  cyclePhaseHeatMapData,
}: DetailedViewsSectionProps) {
  return (
    <div className="bg-app-cream/30 rounded-lg p-6 text-center">
      <span className="text-2xl block mb-2">📊</span>
      <p className="text-sm text-app-charcoal font-medium mb-1">
        Detailed Views
      </p>
      <p className="text-xs text-app-gray">
        Comprehensive cycle history and detailed breakdowns will appear here.
      </p>
      <p className="text-xs text-app-gray mt-2">
        {cycles.length} cycle{cycles.length !== 1 ? "s" : ""} • {entries.length} entries
      </p>
      <p className="text-xs text-app-teal mt-2 font-medium">
        Coming in Phase 4
      </p>
    </div>
  );
}