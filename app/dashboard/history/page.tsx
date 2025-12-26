"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useEntries } from "@/stores/useEntries";
import { useSettings } from "@/stores/useSettings";
import type { StoredEntry } from "@/types";

// ============================================
// HISTORY PAGE - RAW DATA VIEW
// ============================================

export default function HistoryPage() {
  const [isClient, setIsClient] = useState(false);
  const entries = useEntries((state) => state.entries);
  const { isGoogleSheetConnected } = useSettings();

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <HistorySkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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
          All your logged entries ({entries.length} total)
        </p>
      </div>

      {/* Mode Indicator */}
      <div className="p-3 bg-app-cream rounded-lg border border-app-border">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isGoogleSheetConnected ? "bg-app-teal" : "bg-app-gray"}`} />
          <span className="text-sm text-app-charcoal">
            {isGoogleSheetConnected 
              ? "Showing entries from localStorage (Google Sheet sync available)" 
              : "Showing entries from localStorage (Anonymous Mode)"}
          </span>
        </div>
      </div>

      {/* Debug Info */}
      <div className="p-3 bg-app-plumb/10 rounded-lg border border-app-plumb/20">
        <p className="text-xs text-app-plumb font-medium mb-1">🔧 Debug Info</p>
        <p className="text-xs text-app-gray">
          Data source: localStorage key "{`TrackWell-entries`}"
        </p>
        <p className="text-xs text-app-gray">
          Entry count: {entries.length}
        </p>
      </div>

      {/* Entries List */}
      {entries.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {/* Sort entries by date descending (most recent first) */}
          {[...entries]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
        </div>
      )}

      {/* Raw JSON View (for debugging) */}
      {entries.length > 0 && (
        <details className="card">
          <summary className="cursor-pointer text-sm font-medium text-app-gray hover:text-app-charcoal">
            🔍 View Raw JSON Data
          </summary>
          <pre className="mt-4 p-4 bg-app-charcoal text-app-cream text-xs rounded-lg overflow-x-auto">
            {JSON.stringify(entries, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

// ============================================
// ENTRY CARD COMPONENT
// ============================================

interface EntryCardProps {
  entry: StoredEntry;
}

function EntryCard({ entry }: EntryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { isGoogleSheetConnected } = useSettings();

  // Count non-empty symptoms
  const symptomCount = Object.values(entry.symptomIntensities).filter(v => v !== null).length;
  const periodSymptomCount = Object.values(entry.periodSymptomIntensities).filter(v => v !== null).length;
  const medicineCount = entry.medicineLog.length;
  const productCount = entry.productUsage.length;

  // Context-aware sync status display
  const getSyncStatusDisplay = () => {
    // Anonymous mode - entries are always local-only
    if (!isGoogleSheetConnected) {
      return {
        label: "Local",
        style: "bg-app-gray/20 text-app-gray",
        icon: "💾",
      };
    }
    
    // Signed-in mode - show actual sync status
    switch (entry.syncStatus) {
      case "synced":
        return {
          label: "Synced",
          style: "bg-app-green/20 text-app-green",
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

  return (
    <div className="card">
      {/* Header Row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-app-charcoal">
            {formatDate(entry.date)}
          </p>
          <p className="text-sm text-app-gray">
            {entry.startTime} → {entry.endTime}
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
          <span className="text-xs bg-app-red/10 text-app-red px-2 py-1 rounded-full">
            {entry.cyclePhase}
          </span>
        )}
        {medicineCount > 0 && (
          <span className="text-xs bg-app-taupe/20 text-app-taupe px-2 py-1 rounded-full">
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
              <DataRow label="Feeling" value={entry.stoolFeeling ?? "—"} />
            </Section>
          )}

          {/* Period Tracking */}
          {(entry.cyclePhase || entry.periodFlow || entry.productUsage.length > 0) && (
            <Section title="🌸 Cycle">
              <DataRow label="Phase" value={entry.cyclePhase ?? "—"} />
              <DataRow label="Flow" value={entry.periodFlow ?? "—"} />
              {entry.productUsage.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-app-gray mb-1">Products:</p>
                  <pre className="text-xs bg-app-cream p-2 rounded overflow-x-auto">
                    {JSON.stringify(entry.productUsage, null, 2)}
                  </pre>
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
                      {intensity ?? "—"}
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
                      {intensity ?? "—"}
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

function EmptyState() {
  return (
    <div className="card text-center py-12">
      <span className="text-4xl block mb-4">📋</span>
      <h3 className="text-lg font-semibold text-app-charcoal mb-2">No entries yet</h3>
      <p className="text-app-gray mb-4">Start logging to see your history here</p>
      <Link
        href="/entry"
        className="inline-flex items-center gap-2 px-6 py-3 bg-app-green text-white font-medium rounded-lg hover:bg-app-green-dark transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Log Your First Entry
      </Link>
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

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
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