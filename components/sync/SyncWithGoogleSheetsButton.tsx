"use client";

import { useState, useCallback } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { useEntries } from "@/stores/useEntries";
import { useSettings } from "@/stores/useSettings";
import { useSavedFilters } from "@/stores/useSavedFilters";
import { useSyncTracker } from "@/stores/useSyncTracker";
import { useButtonRateLimit } from "@/hooks/useRateLimit";
import { OAuthErrorModal } from "@/components/ui/OAuthErrorModal";

// ============================================
// Types
// ============================================

type ButtonVariant = "primary" | "secondary" | "subtle";

interface SyncWithGoogleSheetsButtonProps {
  /** Visual variant of the button */
  variant?: ButtonVariant;
  /** Show the sync status indicator below the button */
  showStatus?: boolean;
  /** Custom class names to apply */
  className?: string;
}

interface SyncResults {
  push: {
    entries: { success: boolean; synced: number; failed: number };
    settings: { success: boolean };
    filters: { success: boolean };
  };
  pull: {
    entries: { success: boolean; imported: number; skipped: number };
    settings: { success: boolean };
    filters: { success: boolean; count: number };
  };
}

// ============================================
// Helper: Extract spreadsheet ID from URL
// ============================================

function getSpreadsheetIdFromUrl(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

// ============================================
// Helper: Format time since last sync
// ============================================

function formatTimeSinceSync(lastSyncAt: string | null): string {
  if (!lastSyncAt) return "Not synced";

  const ms = Date.now() - new Date(lastSyncAt).getTime();
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `Synced ${days}d ago`;
  if (hours > 0) return `Synced ${hours}h ago`;
  if (minutes > 0) return `Synced ${minutes}m ago`;
  return "Synced just now";
}

// ============================================
// Component
// ============================================

export function SyncWithGoogleSheetsButton({
  variant = "primary",
  showStatus = false,
  className = "",
}: SyncWithGoogleSheetsButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState("");
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [showOAuthError, setShowOAuthError] = useState(false);

  // Store hooks
  const { entries, batchSyncEntries, importEntriesFromSheet } = useEntries();
  const {
    isGoogleSheetConnected,
    hasUnsavedChanges,
    saveSettingsToSheet,
    loadSettingsFromSheet,
    googleSheet,
  } = useSettings();
  const {
    savedFilters,
    syncToSheet: syncFiltersToSheet,
    loadFromSheet: loadFiltersFromSheet,
  } = useSavedFilters();
  const { getLastSuccessfulSyncAt } = useSyncTracker();

  // Rate limiting: 3 syncs per minute
  const rateLimit = useButtonRateLimit({
    maxRequests: 3,
    windowMs: 60000,
    key: "sync-google-sheets",
    storageType: "localStorage",
  });

  // Get pending items counts
  const pendingEntries = entries.filter(
    (e) => e.syncStatus === "pending" || e.syncStatus === "error"
  );
  const pendingEntriesCount = pendingEntries.length;
  const hasFiltersToSync = savedFilters.length > 0;

  // OAuth login handler
  const googleLogin = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/spreadsheets",
    onSuccess: async (tokenResponse) => {
      setIsSyncing(true);
      setSyncResult(null);
      await performFullSync(tokenResponse.access_token);
      setIsSyncing(false);
    },
    onError: (error) => {
      console.error("OAuth error:", error);
      setShowOAuthError(true);
      setIsSyncing(false);
    },
    onNonOAuthError: () => {
      setShowOAuthError(true);
      setIsSyncing(false);
    },
  });

  // Full sync: Push + Pull in one flow
  const performFullSync = useCallback(
    async (accessToken: string) => {
      const results: SyncResults = {
        push: {
          entries: { success: true, synced: 0, failed: 0 },
          settings: { success: true },
          filters: { success: true },
        },
        pull: {
          entries: { success: true, imported: 0, skipped: 0 },
          settings: { success: true },
          filters: { success: true, count: 0 },
        },
      };

      try {
        // ==========================================
        // PUSH PHASE: Local -> Google Sheets
        // ==========================================

        // 1. Push pending entries
        if (pendingEntriesCount > 0) {
          setSyncProgress(`Pushing ${pendingEntriesCount} entries...`);
          const entryResult = await batchSyncEntries(accessToken, (progress) => {
            setSyncProgress(`Pushing entries: ${progress.current}/${progress.total}`);
          });
          results.push.entries = {
            success: entryResult.success,
            synced: entryResult.succeeded,
            failed: entryResult.failed,
          };
        }

        // 2. Push settings if changed
        if (hasUnsavedChanges) {
          setSyncProgress("Pushing settings...");
          results.push.settings.success = await saveSettingsToSheet(accessToken);
        }

        // 3. Push saved filters
        if (hasFiltersToSync) {
          setSyncProgress("Pushing saved filters...");
          results.push.filters.success = await syncFiltersToSheet(accessToken);
        }

        // ==========================================
        // PULL PHASE: Google Sheets -> Local
        // ==========================================

        // 4. Pull entries from sheet
        setSyncProgress("Pulling entries from sheet...");
        const importResult = await importEntriesFromSheet(accessToken);
        results.pull.entries = {
          success: importResult.success,
          imported: importResult.imported,
          skipped: importResult.skipped,
        };

        // 5. Pull settings from sheet
        const spreadsheetId = getSpreadsheetIdFromUrl(googleSheet.url);
        if (spreadsheetId) {
          setSyncProgress("Pulling settings from sheet...");
          results.pull.settings.success = await loadSettingsFromSheet(
            spreadsheetId,
            accessToken
          );
        }

        // 6. Pull saved filters from sheet
        if (spreadsheetId) {
          setSyncProgress("Pulling saved filters from sheet...");
          const filterResult = await loadFiltersFromSheet(
            spreadsheetId,
            accessToken
          );
          results.pull.filters.success = filterResult;
        }

        // ==========================================
        // Build result message
        // ==========================================
        const messages: string[] = [];

        // Push results
        if (results.push.entries.synced > 0) {
          messages.push(`${results.push.entries.synced} entries pushed`);
        }
        if (results.push.entries.failed > 0) {
          messages.push(`${results.push.entries.failed} entries failed`);
        }

        // Pull results
        if (results.pull.entries.imported > 0) {
          messages.push(`${results.pull.entries.imported} entries imported`);
        }

        // If nothing happened
        if (messages.length === 0) {
          messages.push("Up to date");
        }

        const allPushSuccess =
          results.push.entries.success &&
          results.push.settings.success &&
          results.push.filters.success;
        const allPullSuccess =
          results.pull.entries.success &&
          results.pull.settings.success &&
          results.pull.filters.success;

        setSyncResult({
          success: allPushSuccess && allPullSuccess,
          message: messages.join(" · "),
        });

        // Clear result after 5 seconds
        setTimeout(() => setSyncResult(null), 5000);
      } catch (error) {
        console.error("Sync error:", error);
        setSyncResult({
          success: false,
          message: error instanceof Error ? error.message : "Sync failed",
        });
      }
    },
    [
      pendingEntriesCount,
      hasUnsavedChanges,
      hasFiltersToSync,
      batchSyncEntries,
      saveSettingsToSheet,
      syncFiltersToSheet,
      importEntriesFromSheet,
      loadSettingsFromSheet,
      loadFiltersFromSheet,
      googleSheet.url,
    ]
  );

  // Handle button click
  const handleClick = () => {
    if (isSyncing || rateLimit.isRateLimited) return;
    if (!rateLimit.attempt()) return;
    googleLogin();
  };

  // Don't render if Google Sheet is not connected
  if (!isGoogleSheetConnected) {
    return null;
  }

  // Button styles by variant
  const buttonStyles: Record<ButtonVariant, string> = {
    primary: `
      px-6 py-3 rounded-lg bg-app-green text-white font-medium
      hover:bg-app-plumb transition-opacity disabled:opacity-50 disabled:cursor-not-allowed
    `,
    secondary: `
      px-4 py-2 rounded-lg bg-app-teal text-white font-medium
      hover:bg-app-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed
    `,
    subtle: `
      flex items-center gap-1.5 px-3 py-1.5 text-sm bg-app-teal/10 text-app-teal
      rounded-lg hover:bg-app-teal/20 disabled:opacity-50 disabled:cursor-not-allowed
      transition-colors
    `,
  };

  // Sync icon
  const SyncIcon = (
    <svg
      className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`}
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
  );

  const lastSyncAt = getLastSuccessfulSyncAt();
  const syncStatusText = formatTimeSinceSync(lastSyncAt);

  return (
    <div className={className}>
      <button
        onClick={handleClick}
        disabled={isSyncing || rateLimit.isRateLimited}
        className={buttonStyles[variant]}
        title="Push local changes and pull updates from Google Sheets"
      >
        <span className="flex items-center gap-2">
          {SyncIcon}
          {isSyncing ? syncProgress || "Syncing..." : "Sync with Google Sheets"}
        </span>
      </button>

      {/* Rate limit warning */}
      {rateLimit.isRateLimited && (
        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          Please wait <strong>{rateLimit.getFormattedTime()}</strong> before
          syncing again.
        </div>
      )}

      {/* Sync result notification */}
      {syncResult && (
        <div
          className={`mt-2 p-2 rounded-lg text-sm flex items-center gap-2 ${
            syncResult.success
              ? "bg-app-teal/10 text-app-teal"
              : "bg-red-50 text-red-700"
          }`}
        >
          <span>{syncResult.success ? "✓" : "✗"}</span>
          <span>{syncResult.message}</span>
        </div>
      )}

      {/* Sync status indicator */}
      {showStatus && !syncResult && (
        <div className="mt-2 text-sm text-app-gray">
          Google Sheets: {syncStatusText}
        </div>
      )}

      {/* OAuth Error Modal */}
      <OAuthErrorModal
        isOpen={showOAuthError}
        onClose={() => setShowOAuthError(false)}
        onRetry={() => {
          setShowOAuthError(false);
          googleLogin();
        }}
        actionDescription="sync with Google Sheets"
      />
    </div>
  );
}
