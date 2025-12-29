"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useEntries } from "@/stores/useEntries";
import { useSettings } from "@/stores/useSettings";
import { downloadEntriesAsCSV, calculateSummaryStats } from "@/lib/csvExport";
import { useHistoryFilters } from "@/hooks/useHistoryFilters";
import { FilterBar } from "@/components/history";
import type { StoredEntry, TimeFormat } from "@/types";
import { BRISTOL_TYPES, POST_BOWEL_FEELINGS, CYCLE_PHASES } from "@/lib/constants";
import { useGoogleLogin } from "@react-oauth/google";


// ============================================
// TYPES
// ============================================

type DateRangeFilter = "7" | "30" | "90" | "all" | "custom";
type ViewMode = "cards" | "table";

interface DateRange {
  start: string;
  end: string;
}

// ============================================
// CONSTANTS
// ============================================

const ENTRIES_PER_PAGE = 10;

// ============================================
// HISTORY PAGE
// ============================================

export default function HistoryPage() {
  // Client-side rendering guard
  const [isClient, setIsClient] = useState(false);
  
  // Store data
  const entries = useEntries((state) => state.entries);
  const { isGoogleSheetConnected, timeFormat } = useSettings();

  const importEntriesFromSheet = useEntries((state) => state.importEntriesFromSheet);

  
  // Filter state
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>("30");
  const [customRange, setCustomRange] = useState<DateRange>({
    start: "",
    end: "",
  });
  
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [showStats, setShowStats] = useState(true);
  const [showBackupPrompt, setShowBackupPrompt] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Pagination state
  const [visibleCount, setVisibleCount] = useState(ENTRIES_PER_PAGE);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState<{
    imported: number;
    skipped: number;
  } | null>(null);

  // Date-filtered entries (before advanced filters)
  const dateFilteredEntries = useMemo(() => {
    const now = new Date();
    now.setHours(23, 59, 59, 999); // End of today
    
    let startDate: Date;
    let endDate: Date = now;
    
    switch (dateRangeFilter) {
      case "7":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "90":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 90);
        break;
      case "custom":
        if (customRange.start && customRange.end) {
          startDate = new Date(customRange.start);
          endDate = new Date(customRange.end);
          endDate.setHours(23, 59, 59, 999);
        } else {
          // If custom but no dates set, show all
          return [...entries].sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
        }
        break;
      case "all":
      default:
        return [...entries].sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
    }
    
    startDate.setHours(0, 0, 0, 0);
    
    return entries
      .filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= startDate && entryDate <= endDate;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [entries, dateRangeFilter, customRange]);

  // Advanced filters hook - operates on date-filtered entries
  const {
    filters,
    filteredEntries,
    activeFilters,
    activeFilterCount,
    categoryFilterCounts,
    availableOptions,
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
  } = useHistoryFilters(dateFilteredEntries);
  
  // Check if user should see backup prompt (anonymous mode, has entries, hasn't dismissed recently)
  useEffect(() => {
    setIsClient(true);
    
    // Show backup prompt for anonymous users with entries
    if (!isGoogleSheetConnected && entries.length > 0) {
      const lastDismissed = localStorage.getItem("trackwell-backup-prompt-dismissed");
      if (!lastDismissed) {
        setShowBackupPrompt(true);
      } else {
        // Show again after 7 days
        const dismissed = new Date(lastDismissed);
        const daysSince = (Date.now() - dismissed.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince > 7) {
          setShowBackupPrompt(true);
        }
      }
    }
  }, [isGoogleSheetConnected, entries.length]);
  
  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(ENTRIES_PER_PAGE);
  }, [dateRangeFilter, customRange, filters]);

  // Auto-expand advanced filters when filters are active
  useEffect(() => {
    if (hasFilters && !showAdvancedFilters) {
      setShowAdvancedFilters(true);
    }
  }, [hasFilters]);
  
  // Get visible entries for pagination
  const visibleEntries = useMemo(() => {
    return filteredEntries.slice(0, visibleCount);
  }, [filteredEntries, visibleCount]);
  
  const hasMoreEntries = visibleCount < filteredEntries.length;
  const remainingCount = filteredEntries.length - visibleCount;
  
  // Calculate stats for filtered entries
  const stats = useMemo(() => calculateSummaryStats(filteredEntries), [filteredEntries]);
  
  // Handle CSV export
  const handleExport = () => {
    if (filteredEntries.length === 0) return;
    
    downloadEntriesAsCSV(filteredEntries, {
      timeFormat: timeFormat,
      includeSymptoms: true,
      includePeriod: true,
      includeStool: true,
      includeMedicine: true,
    });
  };
  
  // Handle backup prompt dismiss
  const dismissBackupPrompt = () => {
    localStorage.setItem("trackwell-backup-prompt-dismissed", new Date().toISOString());
    setShowBackupPrompt(false);
  };

  // Handle refresh from sheet
  const refreshFromSheet = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    onSuccess: async (tokenResponse) => {
      setIsRefreshing(true);
      setRefreshResult(null);
      
      const result = await importEntriesFromSheet(tokenResponse.access_token);
      
      setIsRefreshing(false);
      
      if (result.success) {
        setRefreshResult({
          imported: result.imported,
          skipped: result.skipped,
        });
        
        // Clear the result after 5 seconds
        setTimeout(() => setRefreshResult(null), 5000);
      } else {
        alert(`Failed to refresh: ${result.error}`);
      }
    },
    onError: () => {
      setIsRefreshing(false);
      alert("Google Authentication failed. Please try again.");
    },
  });
  
  // Handle load more
  const handleLoadMore = () => {
    setVisibleCount(prev => prev + ENTRIES_PER_PAGE);
  };
  
  if (!isClient) {
    return <HistorySkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/dashboard" className="text-app-gray hover:text-app-charcoal">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-app-charcoal">History</h1>
          </div>
          <p className="text-app-gray">
            {filteredEntries.length} of {entries.length} entries
            {dateRangeFilter !== "all" && ` (${getFilterLabel(dateRangeFilter)})`}
            {activeFilterCount > 0 && (
              <span className="text-app-teal">
                {" "}· {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""} active
              </span>
            )}
          </p>
        </div>
        
        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={filteredEntries.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-app-teal text-white rounded-lg 
                     hover:bg-app-teal/90 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Anonymous Backup Prompt */}
      {showBackupPrompt && (
        <BackupPromptBanner 
          onExport={handleExport}
          onDismiss={dismissBackupPrompt}
          entryCount={entries.length}
        />
      )}

      {/* Mode Indicator */}
      <div className="p-3 bg-app-cream rounded-lg border border-app-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isGoogleSheetConnected ? "bg-app-teal" : "bg-app-gray"}`} />
            <span className="text-sm text-app-charcoal">
              {isGoogleSheetConnected 
                ? "Syncing with Google Sheets" 
                : "Local storage only (Anonymous Mode)"}
            </span>
          </div>
          
          {/* Refresh from Sheet button - only for connected users */}
          {isGoogleSheetConnected && (
            <button
              onClick={() => refreshFromSheet()}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-app-teal/10 text-app-teal 
                         rounded-lg hover:bg-app-teal/20 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors"
              title="Pull latest entries from your Google Sheet"
            >
              <svg 
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
              {isRefreshing ? "Refreshing..." : "Refresh from Sheet"}
            </button>
          )}
        </div>
        
        {/* Refresh result notification */}
        {refreshResult && (
          <div className="mt-2 p-2 bg-app-teal/10 rounded-lg text-sm text-app-teal flex items-center gap-2">
            <span>✓</span>
            <span>
              {refreshResult.imported > 0 
                ? `Imported ${refreshResult.imported} new ${refreshResult.imported === 1 ? 'entry' : 'entries'}`
                : 'Already up to date'}
              {refreshResult.skipped > 0 && ` (${refreshResult.skipped} skipped)`}
            </span>
          </div>
        )}
      </div>

      {/* Filters & Controls */}
      <div className="card">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Date Range Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-app-gray mr-1">Show:</span>
            {(["7", "30", "90", "all", "custom"] as DateRangeFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setDateRangeFilter(filter)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  dateRangeFilter === filter
                    ? "bg-app-teal text-white"
                    : "bg-app-cream text-app-charcoal hover:bg-app-border"
                }`}
              >
                {getFilterLabel(filter)}
              </button>
            ))}
          </div>
          
          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-app-gray">View:</span>
            <div className="flex rounded-lg overflow-hidden border border-app-border">
              <button
                onClick={() => setViewMode("cards")}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  viewMode === "cards"
                    ? "bg-app-teal text-white"
                    : "bg-white text-app-charcoal hover:bg-app-cream"
                }`}
                title="Card View"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  viewMode === "table"
                    ? "bg-app-teal text-white"
                    : "bg-white text-app-charcoal hover:bg-app-cream"
                }`}
                title="Table View"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
                        {/* Stats Toggle */}
            <button
              onClick={() => setShowStats(!showStats)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                showStats
                  ? "bg-app-plumb text-white"
                  : "bg-app-cream text-app-charcoal hover:bg-app-border"
              }`}
              title={showStats ? "Hide Statistics" : "Show Statistics"}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Custom Date Range Picker */}
        {dateRangeFilter === "custom" && (
          <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-app-border">
            <div className="flex items-center gap-2">
              <label className="text-sm text-app-gray">From:</label>
              <input
                type="date"
                value={customRange.start}
                onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
                className="px-3 py-1.5 text-sm border border-app-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-teal"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-app-gray">To:</label>
              <input
                type="date"
                value={customRange.end}
                onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
                className="px-3 py-1.5 text-sm border border-app-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-teal"
              />
            </div>
          </div>
        )}

        {/* Advanced Filters Toggle */}
        <div className="mt-4 pt-4 border-t border-app-border">
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center gap-2 text-sm text-app-charcoal hover:text-app-teal transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showAdvancedFilters ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <span>Advanced Filters</span>
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-app-teal text-white rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Advanced Filters Content */}
          {showAdvancedFilters && (
            <div className="mt-4">
              <FilterBar
                filters={filters}
                availableOptions={availableOptions}
                activeFilters={activeFilters}
                categoryFilterCounts={categoryFilterCounts}
                hasFilters={hasFilters}
                toggleSymptom={toggleSymptom}
                toggleCyclePhase={toggleCyclePhase}
                toggleFlowLevel={toggleFlowLevel}
                toggleBristolType={toggleBristolType}
                toggleFeeling={toggleFeeling}
                toggleMedicine={toggleMedicine}
                removeFilter={removeFilter}
                clearCategory={clearCategory}
                clearAllFilters={clearAllFilters}
              />
            </div>
          )}
        </div>
      </div>

      {/* Summary Statistics Panel */}
      {showStats && filteredEntries.length > 0 && (
        <SummaryStatsPanel stats={stats} timeFormat={timeFormat} />
      )}

      {/* Entries Display */}
      {filteredEntries.length === 0 ? (
        <EmptyState 
          hasAnyEntries={entries.length > 0} 
          hasDateFilteredEntries={dateFilteredEntries.length > 0}
          hasActiveFilters={hasFilters}
          onClearFilters={clearAllFilters}
        />
      ) : viewMode === "cards" ? (
        <div className="space-y-4">
          {/* Card List */}
          {visibleEntries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} timeFormat={timeFormat} />
          ))}
          
          {/* Load More Button */}
          {hasMoreEntries && (
            <div className="flex justify-center pt-4">
              <button
                onClick={handleLoadMore}
                className="flex items-center gap-2 px-6 py-3 bg-app-cream text-app-charcoal 
                           rounded-lg hover:bg-app-border transition-colors font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Show More ({remainingCount} remaining)
              </button>
            </div>
          )}
          
          {/* Showing count indicator */}
          {filteredEntries.length > ENTRIES_PER_PAGE && (
            <p className="text-center text-sm text-app-gray">
              Showing {visibleEntries.length} of {filteredEntries.length} entries
            </p>
          )}
        </div>
      ) : (
        <SummaryTable entries={filteredEntries} timeFormat={timeFormat} />
      )}

      {/* Debug JSON View */}
      {filteredEntries.length > 0 && (
        <details className="card">
          <summary className="cursor-pointer text-sm font-medium text-app-gray hover:text-app-charcoal">
            🔍 View Raw JSON Data ({filteredEntries.length} entries)
          </summary>
          <pre className="mt-4 p-4 bg-app-charcoal text-app-cream text-xs rounded-lg overflow-x-auto max-h-96">
            {JSON.stringify(filteredEntries, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

// ============================================
// BACKUP PROMPT BANNER
// ============================================

interface BackupPromptBannerProps {
  onExport: () => void;
  onDismiss: () => void;
  entryCount: number;
}

function BackupPromptBanner({ onExport, onDismiss, entryCount }: BackupPromptBannerProps) {
  return (
    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
      <div className="flex items-start gap-3">
        <span className="text-2xl">⚠️</span>
        <div className="flex-1">
          <h3 className="font-semibold text-amber-800">Back up your data</h3>
          <p className="text-sm text-amber-700 mt-1">
            You have {entryCount} {entryCount === 1 ? "entry" : "entries"} stored locally on this device. 
            Export to CSV to keep a backup, or{" "}
            <Link href="/settings" className="underline hover:text-amber-900">
              connect a Google Sheet
            </Link>{" "}
            for automatic cloud sync.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={onExport}
              className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              Export Now
            </button>
            <button
              onClick={onDismiss}
              className="px-3 py-1.5 text-sm text-amber-700 hover:text-amber-900 transition-colors"
            >
              Remind me later
            </button>
          </div>
        </div>
        <button onClick={onDismiss} className="text-amber-400 hover:text-amber-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ============================================
// SUMMARY STATISTICS PANEL
// ============================================

interface SummaryStatsPanelProps {
  stats: ReturnType<typeof calculateSummaryStats>;
  timeFormat: TimeFormat;
}

function SummaryStatsPanel({ stats }: SummaryStatsPanelProps) {
  // Get top symptoms
  const topSymptoms = Object.entries(stats.symptomCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  // Get top medicines
  const topMedicines = Object.entries(stats.medicineUsageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  // Format average duration
  const avgDuration = stats.avgDurationMinutes 
    ? stats.avgDurationMinutes < 60 
      ? `${stats.avgDurationMinutes} min`
      : `${Math.floor(stats.avgDurationMinutes / 60)}h ${stats.avgDurationMinutes % 60}m`
    : "—";

  return (
    <div className="card bg-gradient-to-br from-app-cream to-white">
      <h3 className="text-lg font-semibold text-app-charcoal mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-app-plumb" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Summary Statistics
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Total Entries */}
        <StatCard
          label="Total Entries"
          value={stats.totalEntries}
          icon="📊"
        />
        
        {/* Date Range */}
        <StatCard
          label="Date Range"
          value={stats.dateRange 
            ? `${formatDateShort(stats.dateRange.start)} - ${formatDateShort(stats.dateRange.end)}`
            : "—"
          }
          icon="📅"
          small
        />
        
        {/* Avg Duration */}
        <StatCard
          label="Avg Duration"
          value={avgDuration}
          icon="⏱️"
        />
        
        {/* Most Active Day */}
        <StatCard
          label="Most Active Day"
          value={getMostCommon(stats.entriesByDayOfWeek) || "—"}
          icon="📆"
        />
      </div>
      
      {/* Detailed Breakdowns */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Top Symptoms */}
        {topSymptoms.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-app-gray mb-2 flex justify-between">
              <span>Top Symptoms</span>
              <span className="text-xs">Count</span>
            </h4>
            <div className="space-y-1">
              {topSymptoms.map(([symptom, count]) => (
                <div key={symptom} className="flex justify-between text-sm">
                  <span className="text-app-charcoal">{symptom}</span>
                  <span className="text-app-teal font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Bristol Distribution */}
        {Object.keys(stats.bristolTypeCounts).length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-app-gray mb-2 flex justify-between">
              <span>Bristol Types</span>
              <span className="text-xs">Count</span>
            </h4>
            <div className="space-y-1">
              {Object.entries(stats.bristolTypeCounts)
                .sort((a, b) => Number(a[0]) - Number(b[0]))
                .map(([type, count]) => (
                  <div key={type} className="flex justify-between text-sm">
                    <span className="text-app-charcoal">Type {type}</span>
                    <span className="text-app-plumb font-medium">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
        
        {/* Cycle Phase Distribution */}
        {Object.keys(stats.cyclePhaseDistribution).length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-app-gray mb-2 flex justify-between">
              <span>Cycle Phases</span>
              <span className="text-xs">Count</span>
            </h4>
            <div className="space-y-1">
              {Object.entries(stats.cyclePhaseDistribution).map(([phase, count]) => {
                const phaseInfo = CYCLE_PHASES.find(p => p.value === phase);
                return (
                  <div key={phase} className="flex justify-between text-sm">
                    <span className="text-app-charcoal">{phaseInfo?.label || phase}</span>
                    <span className="text-app-red font-medium">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Top Medicines */}
        {topMedicines.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-app-gray mb-2 flex justify-between">
              <span>Medicines Taken</span>
              <span className="text-xs">Count</span>
            </h4>
            <div className="space-y-1">
              {topMedicines.map(([medicine, count]) => (
                <div key={medicine} className="flex justify-between text-sm">
                  <span className="text-app-charcoal truncate mr-2">{medicine}</span>
                  <span className="text-app-taupe font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Time of Day */}
        {Object.keys(stats.entriesByTimeOfDay).length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-app-gray mb-2 flex justify-between">
              <span>Time of Day</span>
              <span className="text-xs">Count</span>
            </h4>
            <div className="space-y-1">
              {["Morning", "Afternoon", "Evening", "Night"].map(tod => {
                const count = stats.entriesByTimeOfDay[tod] || 0;
                if (count === 0) return null;
                return (
                  <div key={tod} className="flex justify-between text-sm">
                    <span className="text-app-charcoal">{tod}</span>
                    <span className="text-app-gray font-medium">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  icon,
  small = false 
}: { 
  label: string; 
  value: string | number; 
  icon: string;
  small?: boolean;
}) {
  return (
    <div className="p-3 bg-white rounded-lg border border-app-border">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-app-gray">{label}</span>
      </div>
      <p className={`font-semibold text-app-charcoal ${small ? "text-sm" : "text-lg"}`}>
        {value}
      </p>
    </div>
  );
}

// ============================================
// SUMMARY TABLE VIEW
// ============================================

interface SummaryTableProps {
  entries: StoredEntry[];
  timeFormat: TimeFormat;
}

function SummaryTable({ entries, timeFormat }: SummaryTableProps) {
  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-app-cream border-b border-app-border">
            <tr>
              <th className="text-left p-3 font-medium text-app-charcoal whitespace-nowrap">Date</th>
              <th className="text-left p-3 font-medium text-app-charcoal whitespace-nowrap">Time</th>
              <th className="text-left p-3 font-medium text-app-charcoal whitespace-nowrap">Duration</th>
              <th className="text-left p-3 font-medium text-app-charcoal whitespace-nowrap">Symptoms</th>
              <th className="text-left p-3 font-medium text-app-charcoal whitespace-nowrap">Bristol</th>
              <th className="text-left p-3 font-medium text-app-charcoal whitespace-nowrap">Cycle</th>
              <th className="text-left p-3 font-medium text-app-charcoal whitespace-nowrap">Meds</th>
              <th className="text-left p-3 font-medium text-app-charcoal whitespace-nowrap">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {entries.map((entry) => (
              <SummaryTableRow key={entry.id} entry={entry} timeFormat={timeFormat} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryTableRow({ entry, timeFormat }: { entry: StoredEntry; timeFormat: TimeFormat }) {
  // Calculate duration
  const duration = calculateDuration(entry.startTime, entry.endTime);
  
  // Get symptom count
  const symptomCount = Object.keys(entry.symptomIntensities).length + 
                       Object.keys(entry.periodSymptomIntensities).length;
  
  // Get top symptom (by intensity, treating null as logged-without-intensity)
  const allSymptoms = {
    ...entry.symptomIntensities,
    ...entry.periodSymptomIntensities
  };
  const topSymptom = Object.entries(allSymptoms)
    .sort((a, b) => (b[1] ?? -1) - (a[1] ?? -1))[0];
  
  // Get medicine count
  const medCount = entry.medicineLog.length;
  
  return (
    <tr className="hover:bg-app-cream/50 transition-colors">
      {/* Date */}
      <td className="p-3 whitespace-nowrap">
        <div>
          <p className="font-medium text-app-charcoal">{formatDateShort(entry.date)}</p>
          <p className="text-xs text-app-gray">{getDayOfWeek(entry.date)}</p>
        </div>
      </td>
      
      {/* Time */}
      <td className="p-3 whitespace-nowrap text-app-gray">
        {formatTimeForDisplay(entry.startTime, timeFormat)} → {formatTimeForDisplay(entry.endTime, timeFormat)}
      </td>
      
      {/* Duration */}
      <td className="p-3 whitespace-nowrap text-app-charcoal">
        {duration}
      </td>
      
      {/* Symptoms */}
      <td className="p-3">
        {symptomCount > 0 ? (
          <div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-app-teal/10 text-app-teal text-xs rounded-full">
              {symptomCount} logged
            </span>
            {topSymptom && (
              <p className="text-xs text-app-gray mt-1 truncate max-w-[120px]">
                Top: {topSymptom[0]}
                {topSymptom[1] !== null && ` (${topSymptom[1]})`}
              </p>
            )}
          </div>
        ) : (
          <span className="text-app-gray">—</span>
        )}
      </td>
      
      {/* Bristol */}
      <td className="p-3 whitespace-nowrap">
        {entry.stoolType ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-app-plumb/10 text-app-plumb text-xs rounded-full">
            Type {entry.stoolType}
          </span>
        ) : (
          <span className="text-app-gray">—</span>
        )}
      </td>
      
      {/* Cycle Phase */}
      <td className="p-3 whitespace-nowrap">
        {entry.cyclePhase ? (
          <div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-app-red/10 text-app-red text-xs rounded-full capitalize">
              {entry.cyclePhase.replace("_", " ")}
            </span>
            {entry.periodFlow && (
              <p className="text-xs text-app-gray mt-1 capitalize">{entry.periodFlow}</p>
            )}
          </div>
        ) : (
          <span className="text-app-gray">—</span>
        )}
      </td>
      
      {/* Medicines */}
      <td className="p-3 whitespace-nowrap">
        {medCount > 0 ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-app-taupe/20 text-app-charcoal text-xs rounded-full">
            {medCount} taken
          </span>
        ) : (
          <span className="text-app-gray">—</span>
        )}
      </td>
      
      {/* Notes */}
      <td className="p-3 max-w-[150px]">
        {entry.notes ? (
          <p className="text-xs text-app-gray truncate" title={entry.notes}>
            {entry.notes}
          </p>
        ) : (
          <span className="text-app-gray">—</span>
        )}
      </td>
    </tr>
  );
}

// ============================================
// ENTRY CARD COMPONENT
// ============================================

interface EntryCardProps {
  entry: StoredEntry;
  timeFormat: TimeFormat;
}

function EntryCard({ entry, timeFormat }: EntryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { isGoogleSheetConnected } = useSettings();

  // Count non-empty symptoms (including 0 intensity)
  const symptomCount = Object.keys(entry.symptomIntensities).length;
  const periodSymptomCount = Object.keys(entry.periodSymptomIntensities).length;
  const medicineCount = entry.medicineLog.length;
  const productCount = entry.productUsage.length;

  // Context-aware sync status display
  const getSyncStatusDisplay = () => {
    if (!isGoogleSheetConnected) {
      return {
        label: "Local",
        style: "bg-app-gray/20 text-app-gray",
        icon: "💾",
      };
    }
    
    switch (entry.syncStatus) {
      case "synced":
        return {
          label: "Synced",
          style: "bg-green-100 text-green-800",
          icon: "☁️",
        };
      case "error":
        return {
          label: "Sync failed",
          style: "bg-app-red/20 text-app-red",
          icon: "⚠️",
        };
      case "pending":
      default:
        return {
          label: "Not synced",
          style: "bg-yellow-100 text-yellow-800",
          icon: "⏳",
        };
    }
  };

  const syncStatus = getSyncStatusDisplay();

  // Helper to format intensity display
  const formatIntensity = (intensity: number | null): string => {
    if (intensity === null) return "✓";
    return String(intensity);
  };

  return (
    <div className="card">
      {/* Header Row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-app-charcoal">
            {formatDate(entry.date)}
          </p>
          <p className="text-sm text-app-gray">
            {formatTimeForDisplay(entry.startTime, timeFormat)} → {formatTimeForDisplay(entry.endTime, timeFormat)}
            <span className="mx-2">·</span>
            <span className="text-app-teal">{calculateDuration(entry.startTime, entry.endTime)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span 
            className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${syncStatus.style}`}
            title={isGoogleSheetConnected 
              ? `Sync status: ${syncStatus.label}` 
              : "Stored on this device only"
            }
          >
            <span>{syncStatus.icon}</span>
            {syncStatus.label}
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-app-gray hover:text-app-charcoal"
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
      </div>

      {/* Quick Stats Row */}
      <div className="flex flex-wrap gap-2 mt-3">
        {symptomCount > 0 && (
          <span className="text-xs bg-app-teal/10 text-app-teal px-2 py-1 rounded-full">
            {symptomCount} symptom{symptomCount !== 1 ? "s" : ""}
          </span>
        )}
        {periodSymptomCount > 0 && (
          <span className="text-xs bg-app-red/10 text-app-red px-2 py-1 rounded-full">
            {periodSymptomCount} period symptom{periodSymptomCount !== 1 ? "s" : ""}
          </span>
        )}
        {entry.stoolType && (
          <span className="text-xs bg-app-plumb/10 text-app-plumb px-2 py-1 rounded-full">
            Bristol {entry.stoolType}
          </span>
        )}
        {entry.cyclePhase && (
          <span className="text-xs bg-app-red/10 text-app-red px-2 py-1 rounded-full capitalize">
            {entry.cyclePhase.replace("_", " ")}
          </span>
        )}
        {medicineCount > 0 && (
          <span className="text-xs bg-app-taupe/20 text-app-charcoal px-2 py-1 rounded-full">
            {medicineCount} medicine{medicineCount !== 1 ? "s" : ""}
          </span>
        )}
        {productCount > 0 && (
          <span className="text-xs bg-app-red/10 text-app-red px-2 py-1 rounded-full">
            {productCount} product{productCount !== 1 ? "s" : ""}
          </span>
        )}
        {entry.notes && (
          <span className="text-xs bg-app-gray/10 text-app-gray px-2 py-1 rounded-full">
            Has notes
          </span>
        )}
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-app-border space-y-4">
          {/* Metadata */}
          <Section title="📋 Metadata">
            <DataRow label="Entry ID" value={entry.id} mono />
            <DataRow label="Created" value={formatDateTime(entry.createdAt)} />
            <DataRow label="Updated" value={formatDateTime(entry.updatedAt)} />
            <DataRow label="Pain Scale" value={entry.painScale} />
            {entry.syncError && (
              <DataRow label="Sync Error" value={entry.syncError} error />
            )}
          </Section>

          {/* Stool Tracking */}
          {(entry.stoolType || entry.stoolFeeling) && (
            <Section title="🧻 Bowel Movement">
              <DataRow label="Bristol Type" value={entry.stoolType ?? "—"} />
              {entry.stoolType && (
                <DataRow 
                  label="Description" 
                  value={BRISTOL_TYPES.find(b => b.type === entry.stoolType)?.name ?? "—"} 
                />
              )}
              <DataRow 
                label="Feeling" 
                value={POST_BOWEL_FEELINGS.find(f => f.value === entry.stoolFeeling)?.label ?? entry.stoolFeeling ?? "—"} 
              />
            </Section>
          )}

          {/* Period Tracking */}
          {(entry.cyclePhase || entry.periodFlow || entry.productUsage.length > 0) && (
            <Section title="🌸 Cycle">
              <DataRow 
                label="Phase" 
                value={CYCLE_PHASES.find(p => p.value === entry.cyclePhase)?.label ?? entry.cyclePhase ?? "—"} 
              />
              <DataRow label="Flow" value={entry.periodFlow ?? "—"} />
              {entry.productUsage.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-app-gray mb-1">Products:</p>
                  <div className="flex flex-wrap gap-1">
                    {entry.productUsage.map((product, idx) => (
                      <span key={idx} className="text-xs bg-app-red/10 text-app-red px-2 py-0.5 rounded">
                        {product.productType}
                        {product.size && ` (${product.size})`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* General Symptoms */}
          {Object.keys(entry.symptomIntensities).length > 0 && (
            <Section title="🏷️ General Symptoms">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(entry.symptomIntensities).map(([symptom, intensity]) => (
                  <div key={symptom} className="text-sm">
                    <span className="text-app-charcoal">{symptom}:</span>{" "}
                    <span className="text-app-teal font-medium">
                      {formatIntensity(intensity)}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Period Symptoms */}
          {Object.keys(entry.periodSymptomIntensities).length > 0 && (
            <Section title="🌸 Period Symptoms">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(entry.periodSymptomIntensities).map(([symptom, intensity]) => (
                  <div key={symptom} className="text-sm">
                    <span className="text-app-charcoal">{symptom}:</span>{" "}
                    <span className="text-app-red font-medium">
                      {formatIntensity(intensity)}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Medicines */}
          {entry.medicineLog.length > 0 && (
            <Section title="💊 Medicines">
              <div className="space-y-1">
                {entry.medicineLog.map((log, idx) => (
                  <div key={idx} className="text-sm">
                    <span className="text-app-charcoal font-medium">{log.medicineName}</span>
                    {log.dosage && <span className="text-app-gray"> — {log.dosage}</span>}
                    {log.time && (
                      <span className="text-app-taupe">
                        {" "}@ {log.time.hour}:{log.time.minute.toString().padStart(2, "0")} {log.time.period}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Notes */}
          {entry.notes && (
            <Section title="📝 Notes">
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium text-app-charcoal mb-2">{title}</p>
      <div className="pl-2">{children}</div>
    </div>
  );
}

function DataRow({ 
  label, 
  value, 
  mono = false,
  error = false 
}: { 
  label: string; 
  value: string | number | null; 
  mono?: boolean;
  error?: boolean;
}) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-app-gray">{label}:</span>
      <span className={`
        ${mono ? "font-mono text-xs" : ""} 
        ${error ? "text-app-red" : "text-app-charcoal"}
      `}>
        {value ?? "—"}
      </span>
    </div>
  );
}

interface EmptyStateProps {
  hasAnyEntries: boolean;
  hasDateFilteredEntries: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

function EmptyState({ 
  hasAnyEntries, 
  hasDateFilteredEntries, 
  hasActiveFilters,
  onClearFilters 
}: EmptyStateProps) {
  // Determine which message to show
  const getMessage = () => {
    if (!hasAnyEntries) {
      return {
        title: "No entries yet",
        description: "Start logging to see your history here",
        showLogButton: true,
      };
    }
    
    if (hasActiveFilters && hasDateFilteredEntries) {
      return {
        title: "No entries match your filters",
        description: "Try adjusting or clearing your filters to see more entries",
        showClearFilters: true,
      };
    }
    
    return {
      title: "No entries in this date range",
      description: "Try adjusting your date filters or select 'All Time'",
      showLogButton: false,
    };
  };

  const message = getMessage();

  return (
    <div className="card text-center py-12">
      <span className="text-4xl block mb-4">📋</span>
      <h3 className="text-lg font-semibold text-app-charcoal mb-2">
        {message.title}
      </h3>
      <p className="text-app-gray mb-4">
        {message.description}
      </p>
      
      {message.showLogButton && (
        <Link
          href="/entry"
          className="inline-flex items-center gap-2 px-6 py-3 bg-app-teal text-white font-medium rounded-lg hover:bg-app-teal/90 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Log Your First Entry
        </Link>
      )}
      
      {message.showClearFilters && (
        <button
          onClick={onClearFilters}
          className="inline-flex items-center gap-2 px-6 py-3 bg-app-teal text-white font-medium rounded-lg hover:bg-app-teal/90 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Clear All Filters
        </button>
      )}
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-32 bg-app-border rounded animate-pulse" />
        <div className="h-4 w-48 bg-app-border rounded animate-pulse mt-2" />
      </div>
      <div className="h-12 bg-app-border rounded-lg animate-pulse" />
      <div className="h-24 bg-app-border rounded-lg animate-pulse" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="card">
          <div className="h-6 w-32 bg-app-border rounded animate-pulse" />
          <div className="h-4 w-24 bg-app-border rounded animate-pulse mt-2" />
          <div className="flex gap-2 mt-3">
            <div className="h-6 w-20 bg-app-border rounded-full animate-pulse" />
            <div className="h-6 w-16 bg-app-border rounded-full animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getFilterLabel(filter: DateRangeFilter): string {
  switch (filter) {
    case "7": return "7 Days";
    case "30": return "30 Days";
    case "90": return "90 Days";
    case "all": return "All Time";
    case "custom": return "Custom";
    default: return filter;
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(isoStr: string): string {
  const date = new Date(isoStr);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatTimeForDisplay(timeStr: string, format: TimeFormat): string {
  if (!timeStr) return "";
  
  const [hourStr, minuteStr] = timeStr.split(":");
  const hour = parseInt(hourStr, 10);
  const minute = minuteStr || "00";
  
  if (format === "24h") {
    return `${hourStr.padStart(2, "0")}:${minute}`;
  }
  
  // 12h format
  if (hour === 0) return `12:${minute} AM`;
  if (hour === 12) return `12:${minute} PM`;
  if (hour > 12) return `${hour - 12}:${minute} PM`;
  return `${hour}:${minute} AM`;
}

function calculateDuration(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return "—";
  
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);
  
  let startTotal = startHour * 60 + startMin;
  let endTotal = endHour * 60 + endMin;
  
  // Handle crossing midnight
  if (endTotal < startTotal) {
    endTotal += 24 * 60;
  }
  
  const duration = endTotal - startTotal;
  
  if (duration < 60) {
    return `${duration}m`;
  }
  
  const hours = Math.floor(duration / 60);
  const mins = duration % 60;
  
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function getDayOfWeek(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[date.getDay()];
}

function getMostCommon(counts: Record<string, number>): string | null {
  const entries = Object.entries(counts);
  if (entries.length === 0) return null;
  
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}