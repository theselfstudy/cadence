"use client";

import { useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { useEntries } from "@/stores/useEntries";
import { useSettings } from "@/stores/useSettings";
import { useSavedFilters } from "@/stores/useSavedFilters";
import { useSyncTracker } from "@/stores/useSyncTracker";

// ============================================
// Types
// ============================================

type ModalState = "prompt" | "syncing" | "success" | "partial" | "error";

interface SyncResults {
  entries: { success: boolean; synced: number; failed: number };
  settings: { success: boolean };
  filters: { success: boolean };
}

interface SyncReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ============================================
// Component
// ============================================

export function SyncReminderModal({ isOpen, onClose }: SyncReminderModalProps) {
  const [state, setState] = useState<ModalState>("prompt");
  const [syncResults, setSyncResults] = useState<SyncResults | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [syncProgress, setSyncProgress] = useState<string>("");

  // Store hooks
  const { entries, batchSyncEntries } = useEntries();
  const { hasUnsavedChanges, saveSettingsToSheet } = useSettings();
  const { savedFilters, syncToSheet: syncFiltersToSheet } = useSavedFilters();
  const { dismissModalTemporarily } = useSyncTracker();

  // Calculate counts
  const pendingEntries = entries.filter(
    (e) => e.syncStatus === "pending" || e.syncStatus === "error"
  );
  const pendingEntriesCount = pendingEntries.length;
  const hasUnsavedSettings = hasUnsavedChanges;
  const hasFiltersToSync = savedFilters.length > 0;

  // OAuth login handler
  const googleLogin = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/spreadsheets",
    onSuccess: async (tokenResponse) => {
      setState("syncing");
      await performBatchSync(tokenResponse.access_token);
    },
    onError: (error) => {
      console.error("OAuth error:", error);
      setErrorMessage("Authentication failed. Please try again.");
      setState("error");
    },
  });

  // Batch sync function
  const performBatchSync = async (accessToken: string) => {
    const results: SyncResults = {
      entries: { success: false, synced: 0, failed: 0 },
      settings: { success: false },
      filters: { success: false },
    };

    try {
      // 1. Sync pending/error entries
      if (pendingEntriesCount > 0) {
        setSyncProgress(`Syncing ${pendingEntriesCount} entries...`);
        const entryResult = await batchSyncEntries(
          accessToken,
          (progress) => {
            setSyncProgress(
              `Syncing entries: ${progress.current}/${progress.total}`
            );
          }
        );

        results.entries = {
          success: entryResult.success,
          synced: entryResult.succeeded,
          failed: entryResult.failed,
        };
      } else {
        results.entries.success = true; // No entries to sync
      }

      // 2. Sync settings if changed
      if (hasUnsavedSettings) {
        setSyncProgress("Syncing settings...");
        results.settings.success = await saveSettingsToSheet(accessToken);
      } else {
        results.settings.success = true; // No settings to sync
      }

      // 3. Sync saved filters
      if (hasFiltersToSync) {
        setSyncProgress("Syncing saved filters...");
        results.filters.success = await syncFiltersToSheet(accessToken);
      } else {
        results.filters.success = true; // No filters to sync
      }

      // Determine final state
      setSyncResults(results);

      const allSuccess =
        results.entries.success &&
        results.settings.success &&
        results.filters.success;
      const anySuccess =
        results.entries.success ||
        results.settings.success ||
        results.filters.success;

      if (allSuccess) {
        setState("success");
      } else if (anySuccess) {
        setState("partial");
      } else {
        setErrorMessage("All sync operations failed. Please try again.");
        setState("error");
      }
    } catch (error) {
      console.error("Batch sync error:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
      setState("error");
    }
  };

  // Handle sync now
  const handleSyncNow = () => {
    googleLogin();
  };

  // Handle retry
  const handleRetry = () => {
    setState("prompt");
    setErrorMessage("");
    setSyncResults(null);
  };

  // Handle dismiss
  const handleDismiss = () => {
    dismissModalTemporarily();
    onClose();
  };

  // Handle done (after success)
  const handleDone = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
        {/* PROMPT STATE */}
        {state === "prompt" && (
          <>
            <div className="text-center">
              <div className="text-4xl mb-3">🔄</div>
              <h2 className="text-xl font-semibold text-app-charcoal mb-2">
                Time to Sync Your Data
              </h2>
              <p className="text-sm text-app-gray">
                It&apos;s been a while since your last sync. Let&apos;s back up your data to
                Google Sheets.
              </p>
            </div>

            {/* Show what needs syncing */}
            <div className="bg-app-cream rounded-lg p-4 space-y-2 text-sm">
              {pendingEntriesCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-app-gray">Entries to sync:</span>
                  <span className="font-medium text-app-charcoal">
                    {pendingEntriesCount}
                  </span>
                </div>
              )}
              {hasUnsavedSettings && (
                <div className="flex justify-between">
                  <span className="text-app-gray">Settings changes:</span>
                  <span className="font-medium text-app-charcoal">Yes</span>
                </div>
              )}
              {hasFiltersToSync && (
                <div className="flex justify-between">
                  <span className="text-app-gray">Saved filters:</span>
                  <span className="font-medium text-app-charcoal">
                    {savedFilters.length}
                  </span>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="space-y-2">
              <button
                onClick={handleSyncNow}
                className="w-full px-6 py-3 rounded-lg bg-app-green/60 text-white font-medium hover:opacity-90 transition-opacity"
              >
                Sync Now
              </button>
              <button
                onClick={handleDismiss}
                className="w-full px-6 py-3 rounded-lg bg-app-cream text-app-charcoal border border-app-border hover:bg-app-border transition-colors"
              >
                Dismiss for Now
              </button>
            </div>
          </>
        )}

        {/* SYNCING STATE */}
        {state === "syncing" && (
          <>
            <div className="text-center">
              <div className="text-4xl mb-3 animate-spin">⏳</div>
              <h2 className="text-xl font-semibold text-app-charcoal mb-2">
                Syncing Your Data
              </h2>
              <p className="text-sm text-app-gray">{syncProgress}</p>
            </div>

            {/* Progress indication */}
            <div className="bg-app-cream rounded-lg p-4">
              <div className="h-2 bg-app-border rounded-full overflow-hidden">
                <div className="h-full bg-app-green/60 animate-pulse w-3/4" />
              </div>
            </div>
          </>
        )}

        {/* SUCCESS STATE */}
        {state === "success" && syncResults && (
          <>
            <div className="text-center">
              <div className="text-4xl mb-3">✅</div>
              <h2 className="text-xl font-semibold text-app-charcoal mb-2">
                Successfully Synced!
              </h2>
              <p className="text-sm text-app-gray">
                All your data has been backed up to Google Sheets.
              </p>
            </div>

            {/* Show what was synced */}
            <div className="bg-app-green/10 rounded-lg p-4 space-y-2 text-sm">
              {syncResults.entries.synced > 0 && (
                <div className="flex justify-between">
                  <span className="text-app-gray">Entries synced:</span>
                  <span className="font-medium text-app-charcoal">
                    {syncResults.entries.synced}
                  </span>
                </div>
              )}
              {syncResults.settings.success && (
                <div className="flex justify-between">
                  <span className="text-app-gray">Settings:</span>
                  <span className="font-medium text-app-charcoal">Synced</span>
                </div>
              )}
              {syncResults.filters.success && hasFiltersToSync && (
                <div className="flex justify-between">
                  <span className="text-app-gray">Saved filters:</span>
                  <span className="font-medium text-app-charcoal">Synced</span>
                </div>
              )}
            </div>

            <button
              onClick={handleDone}
              className="w-full px-6 py-3 rounded-lg bg-app-green/60 text-white font-medium hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          </>
        )}

        {/* PARTIAL STATE */}
        {state === "partial" && syncResults && (
          <>
            <div className="text-center">
              <div className="text-4xl mb-3">⚠️</div>
              <h2 className="text-xl font-semibold text-app-charcoal mb-2">
                Partially Synced
              </h2>
              <p className="text-sm text-app-gray">
                Some items synced successfully, but others failed.
              </p>
            </div>

            {/* Show results */}
            <div className="bg-app-cream rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-app-gray">Entries:</span>
                <span
                  className={`font-medium ${
                    syncResults.entries.success
                      ? "text-app-green/80"
                      : "text-app-red"
                  }`}
                >
                  {syncResults.entries.success
                    ? `${syncResults.entries.synced} synced`
                    : `${syncResults.entries.failed} failed`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-app-gray">Settings:</span>
                <span
                  className={`font-medium ${
                    syncResults.settings.success
                      ? "text-app-green/80"
                      : "text-app-red"
                  }`}
                >
                  {syncResults.settings.success ? "Synced" : "Failed"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-app-gray">Filters:</span>
                <span
                  className={`font-medium ${
                    syncResults.filters.success
                      ? "text-app-green/80"
                      : "text-app-red"
                  }`}
                >
                  {syncResults.filters.success ? "Synced" : "Failed"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleRetry}
                className="w-full px-6 py-3 rounded-lg bg-app-green/60 text-white font-medium hover:opacity-90 transition-opacity"
              >
                Retry Failed Items
              </button>
              <button
                onClick={handleDone}
                className="w-full px-6 py-3 rounded-lg bg-app-cream text-app-charcoal border border-app-border hover:bg-app-border transition-colors"
              >
                Continue
              </button>
            </div>
          </>
        )}

        {/* ERROR STATE */}
        {state === "error" && (
          <>
            <div className="text-center">
              <div className="text-4xl mb-3">❌</div>
              <h2 className="text-xl font-semibold text-app-charcoal mb-2">
                Sync Failed
              </h2>
              <p className="text-sm text-app-gray mb-2">
                {errorMessage || "An error occurred while syncing your data."}
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleRetry}
                className="w-full px-6 py-3 rounded-lg bg-app-green/60 text-white font-medium hover:opacity-90 transition-opacity"
              >
                Retry
              </button>
              <button
                onClick={handleDismiss}
                className="w-full px-6 py-3 rounded-lg bg-app-cream text-app-charcoal border border-app-border hover:bg-app-border transition-colors"
              >
                Dismiss
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
