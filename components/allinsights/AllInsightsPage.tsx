"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useEntries, useEntriesRevision } from "@/stores/useEntries";
import { useFreshData } from "@/hooks/useFreshData";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useSettings } from "@/stores/useSettings";
import { SyncWithGoogleSheetsButton, SyncStatusBadge } from "@/components/sync";
import { EntriesSection } from "@/components/cycleinsights/sections/EntriesSection";
import { CollapsibleSection } from "@/components/cycleinsights/shared/CollapsibleSection";

import { ChangeDetectionSection } from "./sections/ChangeDetectionSection";
import { WeeklyLoadSection } from "./sections/WeeklyLoadSection";
import { CoOccurrenceSection } from "./sections/CoOccurrenceSection";
import { ConsistencySection } from "./sections/ConsistencySection";

import {
  calculateSummaryStats,
  calculateChangeDetection,
  calculateWeeklyLoadStats,
  calculateConsistencyMetrics,
} from "@/lib/allInsightsUtils";

// ============================================
// ALL INSIGHTS PAGE
// Cycle-agnostic insights for all users
// Uses time-based windows instead of cycle-based aggregations
// ============================================

export function AllInsightsPage() {
  // ============================================
  // DATA FROM STORES
  // ============================================

  const entries = useEntries((state) => state.entries);
  const revision = useEntriesRevision();
  const renderKey = useFreshData();
  const isGoogleSheetConnected = useSettings((state) => state.isGoogleSheetConnected);
  const periodTrackingEnabled = useSettings((state) => state.periodTracking.enabled);
  const isMobile = useIsMobile();

  // ============================================
  // CALCULATIONS
  // ============================================

  const summaryStats = useMemo(() => {
    return calculateSummaryStats(entries);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, revision, renderKey]);

  const weeklyLoadStats = useMemo(() => {
    return calculateWeeklyLoadStats(entries);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, revision]);

  const changeDetection = useMemo(() => {
    if (summaryStats.uniqueDaysLogged < 14) return [];
    return calculateChangeDetection(entries);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, revision, summaryStats.uniqueDaysLogged]);

  const consistencyMetrics = useMemo(() => {
    if (summaryStats.uniqueDaysLogged < 7) return [];
    return calculateConsistencyMetrics(entries);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, revision, summaryStats.uniqueDaysLogged]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* Page Header with Sync Button */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-app-charcoal">All Insights</h1>
          <p className="text-app-gray">Patterns & trends across all your data</p>
          {isGoogleSheetConnected && (
            <div className="mt-2">
              <SyncStatusBadge />
            </div>
          )}
        </div>
        {isGoogleSheetConnected && (
          <SyncWithGoogleSheetsButton variant="subtle" />
        )}
      </div>

      {/* Cycle Insights Note - only show if period tracking is enabled */}
      {periodTrackingEnabled && (
        <div className="bg-app-red/5 rounded-lg p-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-app-plumb flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-app-charcoal">
            Looking for cycle trends? Head to{" "}
            <Link href="/dashboard/cycleinsights" className="text-app-red font-medium hover:underline">
              Cycle Insights
            </Link>
          </p>
        </div>
      )}

      {/* Section 1: Trust Banner / Summary Stats */}
      <TrustBanner stats={summaryStats} />

      {/* Section 2: Weekly Load (≥20 entries) - Right after TrustBanner */}
      <WeeklyLoadSection
        loadStats={weeklyLoadStats}
        totalEntries={summaryStats.totalEntries}
        defaultExpanded={true}
      />

      {/* Section 3: Change Detection (≥20 entries) */}
      <ChangeDetectionSection
        changes={changeDetection}
        totalEntries={summaryStats.totalEntries}
        defaultExpanded={!isMobile}
      />

      {/* Section 4: Co-Occurrences (14+ days) */}
      <CoOccurrenceSection
        entries={entries}
        uniqueDaysLogged={summaryStats.uniqueDaysLogged}
        defaultExpanded={!isMobile}
      />

      {/* Section 5: Consistency & Variability (≥20 entries) */}
      <ConsistencySection
        consistencyData={consistencyMetrics}
        totalEntries={summaryStats.totalEntries}
        uniqueDaysLogged={summaryStats.uniqueDaysLogged}
        defaultExpanded={!isMobile}
      />

      {/* Section 6: Entries - Always show */}
      <CollapsibleSection
        title="All Entries"
        helpText="Browse all your logged entries. Use the filters to find specific dates or entry types."
        defaultExpanded={!isMobile}
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        }
        badge={summaryStats.totalEntries > 0 ? `${summaryStats.totalEntries} entries` : undefined}
      >
        <EntriesSection entries={entries} />
      </CollapsibleSection>
    </div>
  );
}

// ============================================
// TRUST BANNER COMPONENT
// ============================================

interface TrustBannerProps {
  stats: ReturnType<typeof calculateSummaryStats>;
}

function TrustBanner({ stats }: TrustBannerProps) {
  const hasData = stats.totalEntries > 0;
  const daysUntilBasicInsights = Math.max(0, 7 - stats.uniqueDaysLogged);
  const daysUntilFullInsights = Math.max(0, 14 - stats.uniqueDaysLogged);

  return (
    <div className="card p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 flex items-center justify-center">
          <svg className="w-8 h-8 text-app-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth={0.5} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
          </svg>
        </div>
        <div>
          <h2 className="font-semibold text-app-charcoal">Your Data Summary</h2>
          <p className="text-sm text-app-gray">
            {!hasData
              ? "Start logging to see insights"
              : `${stats.totalEntries} entries across ${stats.uniqueDaysLogged} days`}
          </p>
        </div>
      </div>

      {hasData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-app-cream rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-app-charcoal">{stats.uniqueDaysLogged}</p>
            <p className="text-xs text-app-gray">Days Logged</p>
          </div>
          <div className="bg-app-cream rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-app-charcoal">{stats.totalEntries}</p>
            <p className="text-xs text-app-gray">Total Entries</p>
          </div>
          <div className="bg-app-cream rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-app-charcoal">{stats.uniqueSymptoms}</p>
            <p className="text-xs text-app-gray">Symptoms Tracked</p>
          </div>
          <div className="bg-app-cream rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-app-charcoal">{stats.uniqueMedications}</p>
            <p className="text-xs text-app-gray">Medications Logged</p>
          </div>
        </div>
      )}

      {/* Progress messaging */}
      {hasData && daysUntilBasicInsights > 0 && (
        <div className="mt-4 bg-app-cream/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-app-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-sm font-medium text-app-charcoal">Unlocking Insights</span>
          </div>
          <p className="text-sm text-app-gray">
            Log for {daysUntilBasicInsights} more day{daysUntilBasicInsights !== 1 ? "s" : ""} to unlock basic insights
            {daysUntilFullInsights > 0 && stats.uniqueDaysLogged >= 7 && (
              <>, or {daysUntilFullInsights} more for change detection and co-occurrences</>
            )}
          </p>
          {/* Progress dots - shows progress toward 7 days for basic insights */}
          <div className="flex items-center gap-1 mt-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full ${
                  i < stats.uniqueDaysLogged ? "bg-app-teal" : "bg-app-border"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {hasData && stats.uniqueDaysLogged >= 7 && daysUntilFullInsights > 0 && (
        <p className="text-sm text-app-gray mt-3 bg-app-cream/50 rounded-lg p-2">
          {daysUntilFullInsights} more day{daysUntilFullInsights !== 1 ? "s" : ""} to unlock change detection and co-occurrences
        </p>
      )}
    </div>
  );
}
