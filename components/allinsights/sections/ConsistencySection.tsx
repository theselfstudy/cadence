"use client";

import { useState, useRef } from "react";
import { CollapsibleSection } from "@/components/cycleinsights/shared/CollapsibleSection";
import { ConsistencyResult, groupConsistencyResults, ItemCategory } from "@/lib/allInsightsUtils";

// ============================================
// CONSISTENCY SECTION
// Tabbed layout: Highly Consistent | Moderate | Variable
// With grouped headers: Symptom → Bristol → Medicine
// Color coded by category type
// ============================================

interface ConsistencySectionProps {
  consistencyData: ConsistencyResult[];
  totalEntries: number;
  defaultExpanded?: boolean;
}

type TabType = "highly_consistent" | "moderate" | "variable";

const TAB_CONFIG: { id: TabType; label: string; subtitle: string }[] = [
  { id: "highly_consistent", label: "Consistent", subtitle: "Most days" },
  { id: "moderate", label: "Moderate", subtitle: "Occasionally" },
  { id: "variable", label: "Variable", subtitle: "Unpredictable" },
];

const CATEGORY_ORDER: ItemCategory[] = ["symptom", "bristol", "medication"];
const CATEGORY_LABELS: Record<ItemCategory, string> = {
  symptom: "Symptoms",
  bristol: "Bristol",
  medication: "Medicine",
};

// Color coding by category type
const CATEGORY_COLORS: Record<ItemCategory, { bg: string; bgLight: string; text: string }> = {
  symptom: {
    bg: "bg-app-teal",
    bgLight: "bg-app-teal/10",
    text: "text-app-teal",
  },
  bristol: {
    bg: "bg-app-plumb",
    bgLight: "bg-app-plumb/10",
    text: "text-app-plumb",
  },
  medication: {
    bg: "bg-app-green",
    bgLight: "bg-app-green/10",
    text: "text-app-green",
  },
};

export function ConsistencySection({ consistencyData, totalEntries, defaultExpanded = true }: ConsistencySectionProps) {
  const [activeTab, setActiveTab] = useState<TabType>("highly_consistent");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [isAtBottom, setIsAtBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Hide section if not enough data (≥20 entries)
  if (totalEntries < 20) {
    return null;
  }

  const hasData = consistencyData.length > 0;
  const grouped = groupConsistencyResults(consistencyData);

  // Count items in each tab
  const tabCounts: Record<TabType, number> = {
    highly_consistent:
      grouped.highly_consistent.symptom.length +
      grouped.highly_consistent.bristol.length +
      grouped.highly_consistent.medication.length,
    moderate:
      grouped.moderate.symptom.length +
      grouped.moderate.bristol.length +
      grouped.moderate.medication.length,
    variable:
      grouped.variable.symptom.length +
      grouped.variable.bristol.length +
      grouped.variable.medication.length,
  };

  const currentCategories = grouped[activeTab];

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      setIsAtBottom(scrollTop + clientHeight >= scrollHeight - 10);
    }
  };

  const toggleCategory = (category: ItemCategory) => {
    const key = `${activeTab}-${category}`;
    setExpandedCategories(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isCategoryExpanded = (category: ItemCategory) => {
    return expandedCategories[`${activeTab}-${category}`] ?? false;
  };

  return (
    <CollapsibleSection
      title="Consistency & Variability"
      badge={hasData ? `${consistencyData.length} tracked` : undefined}
      helpText="Shows how regularly each item appears. Consistent items appear most days, moderate items occasionally, and variable items are unpredictable."
      defaultExpanded={defaultExpanded}
      icon={
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h12M4 14h8M4 18h14" />
        </svg>
      }
    >
      {/* Sticky Tab Navigation */}
      <div className="sticky top-0 bg-white z-10 -mx-4 px-4 pt-1 pb-0">
        <div className="flex border-b border-app-border">
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? "text-app-teal"
                  : "text-app-gray hover:text-app-charcoal"
              }`}
            >
              {tab.label}
              {tabCounts[tab.id] > 0 && (
                <span className="ml-1.5 text-xs bg-app-cream px-1.5 py-0.5 rounded-full">
                  {tabCounts[tab.id]}
                </span>
              )}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-app-teal" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Tab Content */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="max-h-[28rem] overflow-y-auto mt-4"
      >
        {tabCounts[activeTab] === 0 ? (
          <EmptyState tab={activeTab} />
        ) : (
          <div className="space-y-4">
            {CATEGORY_ORDER.map((category) => {
              const categoryItems = currentCategories[category];
              const colors = CATEGORY_COLORS[category];
              const isExpanded = isCategoryExpanded(category);
              const displayItems = isExpanded ? categoryItems : categoryItems.slice(0, 5);
              const hasMore = categoryItems.length > 5;

              return (
                <div key={category}>
                  <h4 className={`text-xs font-medium ${colors.text} uppercase tracking-wide mb-2`}>
                    {CATEGORY_LABELS[category]}
                  </h4>
                  {categoryItems.length === 0 ? (
                    <p className="text-xs text-app-gray/60 italic pl-2">
                      No {CATEGORY_LABELS[category].toLowerCase()} in this category
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {displayItems.map((item) => (
                        <ConsistencyCard
                          key={`${item.itemType}-${item.itemName}`}
                          item={item}
                          colors={colors}
                        />
                      ))}
                      {hasMore && (
                        <button
                          type="button"
                          onClick={() => toggleCategory(category)}
                          className={`text-xs ${colors.text} hover:opacity-80 text-center w-full py-1 transition-colors`}
                        >
                          {isExpanded
                            ? "Show less"
                            : `+${categoryItems.length - 5} more`
                          }
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Scroll indicator - outside scrollable area, hidden when at bottom */}
      {tabCounts[activeTab] > 3 && !isAtBottom && (
        <p className="text-xs text-app-gray text-center py-2 border-t border-app-border/30">
          ↓ Scroll to see more
        </p>
      )}

      {/* Disclaimer */}
      <div className="bg-app-cream/50 rounded-lg p-3 mt-4">
        <p className="text-xs text-app-gray">
          These patterns show what occurs together, not what causes what. You might find it
          helpful to notice these connections in your own experience.
        </p>
      </div>
    </CollapsibleSection>
  );
}

interface ConsistencyCardProps {
  item: ConsistencyResult;
  colors: { bg: string; bgLight: string; text: string };
}

function ConsistencyCard({ item, colors }: ConsistencyCardProps) {
  return (
    <div className={`rounded-lg p-3 ${colors.bgLight}`}>
      <div className="flex items-center justify-between">
        <span className="font-medium text-app-charcoal">{item.itemName}</span>
        <span className="text-sm text-app-gray">
          ~{item.daysPerWeek} days/week
        </span>
      </div>
      <p className="text-xs text-app-gray mt-1">{item.description}</p>
    </div>
  );
}

function EmptyState({ tab }: { tab: TabType }) {
  const messages: Record<TabType, { title: string; subtitle: string }> = {
    highly_consistent: {
      title: "No highly consistent items",
      subtitle: "Items appearing 60%+ of days will show here",
    },
    moderate: {
      title: "No moderately consistent items",
      subtitle: "Items appearing 30-59% of days will show here",
    },
    variable: {
      title: "No variable items",
      subtitle: "Items appearing less than 30% of days will show here",
    },
  };

  return (
    <div className="text-center py-6 text-app-gray">
      <p className="text-sm">{messages[tab].title}</p>
      <p className="text-xs mt-1">{messages[tab].subtitle}</p>
    </div>
  );
}
