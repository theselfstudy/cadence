"use client";

import { useState, useRef } from "react";

import { FilterCategoryButton } from "./FilterCategoryButton";
import { FilterDropdown } from "./FilterDropdown";
import { FilterChips } from "./FilterChips";

import { getCategoryLabel, getCategoryIcon } from "@/lib/filterUtils";
import { CYCLE_PHASES, BRISTOL_TYPES, POST_BOWEL_FEELINGS } from "@/lib/constants";

import type {
  HistoryFilters,
  ActiveFilter,
  AvailableFilterOptions,
  CyclePhase,
  BristolScaleType,
  PostBowelFeeling,
  FlowLevel,
} from "@/types";

// ============================================
// TYPES
// ============================================

type CategoryKey = "symptoms" | "cycle" | "bowel" | "medicine";

interface FilterBarProps {
  filters: HistoryFilters;
  availableOptions: AvailableFilterOptions;
  activeFilters: ActiveFilter[];
  categoryFilterCounts: Record<string, number>;
  hasFilters: boolean;
  
  // Toggle actions
  toggleSymptom: (symptom: string) => void;
  toggleCyclePhase: (phase: CyclePhase) => void;
  toggleFlowLevel: (flow: FlowLevel) => void;
  toggleBristolType: (type: BristolScaleType) => void;
  toggleFeeling: (feeling: PostBowelFeeling) => void;
  toggleMedicine: (medicine: string) => void;
  
  // Clear actions
  removeFilter: (filter: ActiveFilter) => void;
  clearCategory: (category: string) => void;
  clearAllFilters: () => void;
}

// ============================================
// CONSTANTS
// ============================================

const FLOW_LEVELS: { value: FlowLevel; label: string }[] = [
  { value: "spotting", label: "Spotting" },
  { value: "light", label: "Light" },
  { value: "medium", label: "Medium" },
  { value: "heavy", label: "Heavy" },
];

const CATEGORIES: { key: CategoryKey; label: string; icon: string }[] = [
  { key: "symptoms", label: "Symptoms", icon: "🏷️" },
  { key: "cycle", label: "Cycle", icon: "🌸" },
  { key: "bowel", label: "Bowel", icon: "🧻" },
  { key: "medicine", label: "Medicine", icon: "💊" },
];

// ============================================
// COMPONENT
// ============================================

export function FilterBar({
  filters,
  availableOptions,
  activeFilters,
  categoryFilterCounts,
  hasFilters,
  toggleSymptom,
  toggleCyclePhase,
  toggleFlowLevel,
  toggleBristolType,
  toggleFeeling,
  toggleMedicine,
  removeFilter,
  clearCategory,
  clearAllFilters,
}: FilterBarProps) {
  const [openCategory, setOpenCategory] = useState<CategoryKey | null>(null);
  
  // Refs for each category button (for focus management)
  const buttonRefs = {
    symptoms: useRef<HTMLButtonElement>(null),
    cycle: useRef<HTMLButtonElement>(null),
    bowel: useRef<HTMLButtonElement>(null),
    medicine: useRef<HTMLButtonElement>(null),
  };

  const handleCategoryClick = (category: CategoryKey) => {
    setOpenCategory(prev => (prev === category ? null : category));
  };

  const handleCloseDropdown = () => {
    setOpenCategory(null);
  };

  // Build dropdown sections for each category
  const getDropdownSections = (category: CategoryKey) => {
    switch (category) {
      case "symptoms":
        return [
          {
            title: "Symptoms",
            options: availableOptions.symptoms.map(symptom => ({
              value: symptom,
              label: symptom,
              selected: filters.selectedSymptoms.includes(symptom),
            })),
            onToggle: toggleSymptom,
          },
        ];

      case "cycle":
        return [
          {
            title: "Phase",
            options: availableOptions.cyclePhases.map(phase => {
              const phaseInfo = CYCLE_PHASES.find(p => p.value === phase);
              return {
                value: phase,
                label: phaseInfo?.label || phase,
                selected: filters.selectedCyclePhases.includes(phase),
              };
            }),
            onToggle: (value: string) => toggleCyclePhase(value as CyclePhase),
          },
          {
            title: "Flow",
            options: FLOW_LEVELS.filter(flow =>
              availableOptions.flowLevels.includes(flow.value)
            ).map(flow => ({
              value: flow.value,
              label: flow.label,
              selected: filters.selectedFlowLevels.includes(flow.value),
            })),
            onToggle: (value: string) => toggleFlowLevel(value as FlowLevel),
          },
        ];

      case "bowel":
        return [
          {
            title: "Bristol Type",
            options: availableOptions.bristolTypes.map(type => {
              const bristolInfo = BRISTOL_TYPES.find(b => b.type === type);
              return {
                value: String(type),
                label: `Type ${type}${bristolInfo ? ` - ${bristolInfo.name}` : ""}`,
                selected: filters.selectedBristolTypes.includes(type),
              };
            }),
            onToggle: (value: string) =>
              toggleBristolType(Number(value) as BristolScaleType),
          },
          {
            title: "Feeling",
            options: availableOptions.feelings.map(feeling => {
              const feelingInfo = POST_BOWEL_FEELINGS.find(f => f.value === feeling);
              return {
                value: feeling,
                label: feelingInfo?.label || feeling,
                selected: filters.selectedFeelings.includes(feeling),
              };
            }),
            onToggle: (value: string) =>
              toggleFeeling(value as PostBowelFeeling),
          },
        ];

      case "medicine":
        return [
          {
            title: "Medicine",
            options: availableOptions.medicines.map(medicine => ({
              value: medicine,
              label: medicine,
              selected: filters.selectedMedicines.includes(medicine),
            })),
            onToggle: toggleMedicine,
          },
        ];

      default:
        return [];
    }
  };

  // Check if a category has any available options
  const categoryHasOptions = (category: CategoryKey): boolean => {
    switch (category) {
      case "symptoms":
        return availableOptions.symptoms.length > 0;
      case "cycle":
        return (
          availableOptions.cyclePhases.length > 0 ||
          availableOptions.flowLevels.length > 0
        );
      case "bowel":
        return (
          availableOptions.bristolTypes.length > 0 ||
          availableOptions.feelings.length > 0
        );
      case "medicine":
        return availableOptions.medicines.length > 0;
      default:
        return false;
    }
  };

  return (
    <div className="space-y-3">
      {/* Category Buttons Row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-app-gray">Filter by:</span>
        
        {CATEGORIES.map(category => (
          <div key={category.key} className="relative">
            <FilterCategoryButton
              ref={buttonRefs[category.key]}
              label={category.label}
              icon={category.icon}
              count={categoryFilterCounts[category.key] || 0}
              isOpen={openCategory === category.key}
              onClick={() => handleCategoryClick(category.key)}
              disabled={!categoryHasOptions(category.key)}
            />
            
            <FilterDropdown
              isOpen={openCategory === category.key}
              onClose={handleCloseDropdown}
              sections={getDropdownSections(category.key)}
              triggerRef={buttonRefs[category.key]}
              onClearCategory={() => clearCategory(category.key)}
              categoryCount={categoryFilterCounts[category.key] || 0}
            />
          </div>
        ))}
      </div>

      {/* Active Filter Chips */}
      {hasFilters && (
        <FilterChips
          filters={activeFilters}
          onRemove={removeFilter}
          onClearAll={clearAllFilters}
        />
      )}
    </div>
  );
}