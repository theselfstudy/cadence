"use client";

import { useState } from "react";
import type { BatchSyncProgress, BatchSyncResult } from "@/types";

// =============================================================================
// TYPES
// =============================================================================

interface SyncEntriesModalProps {
  /** Number of entries available to sync */
  entryCount: number;
  /** Called when user confirms sync */
  onSync: (onProgress: (progress: BatchSyncProgress) => void) => Promise<BatchSyncResult>;
  /** Called when user skips sync */
  onSkip: () => void;
  /** Called when user cancels (closes modal) */
  onCancel: () => void;
}

type ModalState = "prompt" | "syncing" | "complete" | "error";

// =============================================================================
// COMPONENT
// =============================================================================

export function SyncEntriesModal({
  entryCount,
  onSync,
  onSkip,
  onCancel,
}: SyncEntriesModalProps) {
  const [state, setState] = useState<ModalState>("prompt");
  const [progress, setProgress] = useState<BatchSyncProgress | null>(null);
  const [result, setResult] = useState<BatchSyncResult | null>(null);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const handleSync = async () => {
    setState("syncing");
    
    try {
      const syncResult = await onSync((prog) => {
        setProgress(prog);
      });
      
      setResult(syncResult);
      setState(syncResult.success ? "complete" : "error");
    } catch (error) {
      console.error("Sync error:", error);
      setResult({
        success: false,
        total: entryCount,
        succeeded: 0,
        failed: entryCount,
        failedEntryIds: [],
      });
      setState("error");
    }
  };

  const handleRetry = () => {
    setProgress(null);
    setResult(null);
    handleSync();
  };

  // ---------------------------------------------------------------------------
  // RENDER HELPERS
  // ---------------------------------------------------------------------------

  const renderPrompt = () => (
    <>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-app-teal/10 flex items-center justify-center">
          <span className="text-2xl">📤</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-app-charcoal">
            Sync Existing Entries?
          </h2>
          <p className="text-sm text-app-gray">
            {entryCount} {entryCount === 1 ? "entry" : "entries"} found on this device
          </p>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <p className="text-app-gray">
          You have entries stored locally that haven&apos;t been synced to your 
          Google Sheet yet. Would you like to sync them now?
        </p>
        
        <div className="p-3 bg-app-cream rounded-lg border border-app-border">
          <p className="text-sm text-app-charcoal">
            <strong>What happens during sync:</strong>
          </p>
          <ul className="text-sm text-app-gray mt-2 space-y-1">
            <li>• Entries will be added to the correct monthly tabs</li>
            <li>• Duplicate entries will be automatically skipped</li>
            <li>• Your local entries will be marked as synced</li>
          </ul>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleSync}
          className="flex-1 py-3 px-4 rounded-lg bg-app-teal text-white font-semibold hover:opacity-90 transition-colors"
        >
          Sync {entryCount} {entryCount === 1 ? "Entry" : "Entries"}
        </button>
        <button
          onClick={onSkip}
          className="py-3 px-4 rounded-lg bg-app-cream text-app-charcoal border border-app-border hover:bg-app-border transition-colors"
        >
          Skip for Now
        </button>
      </div>
      
      <p className="text-xs text-app-gray text-center mt-3">
        You can always sync entries later from the dashboard.
      </p>
    </>
  );

  const renderSyncing = () => (
    <>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-app-teal/10 flex items-center justify-center animate-pulse">
          <span className="text-2xl">⏳</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-app-charcoal">
            Syncing Entries...
          </h2>
          <p className="text-sm text-app-gray">
            Please don&apos;t close this window
          </p>
        </div>
      </div>

      {progress && (
        <div className="space-y-4">
          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-sm text-app-gray mb-2">
              <span>Progress</span>
              <span>{progress.completed} of {progress.total}</span>
            </div>
            <div className="h-3 bg-app-cream rounded-full overflow-hidden">
              <div 
                className="h-full bg-app-teal transition-all duration-300 ease-out"
                style={{ 
                  width: `${(progress.completed / progress.total) * 100}%` 
                }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-app-green" />
              <span className="text-app-gray">Synced: {progress.succeeded}</span>
            </div>
            {progress.failed > 0 && (
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-app-red" />
                <span className="text-app-gray">Failed: {progress.failed}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );

  const renderComplete = () => (
    <>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-app-green/10 flex items-center justify-center">
          <span className="text-2xl">✅</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-app-charcoal">
            Sync Complete!
          </h2>
          <p className="text-sm text-app-gray">
            Your entries are now in your Google Sheet
          </p>
        </div>
      </div>

      {result && (
        <div className="p-4 bg-app-green/10 rounded-lg border border-app-green/20 mb-6">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-app-green">{result.succeeded}</p>
              <p className="text-xs text-app-gray">Synced</p>
            </div>
            {result.failed > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-app-red">{result.failed}</p>
                <p className="text-xs text-app-gray">Failed</p>
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={onCancel}
        className="w-full py-3 px-4 rounded-lg bg-app-green text-white font-semibold hover:opacity-90 transition-colors"
      >
        Done
      </button>
    </>
  );

  const renderError = () => (
    <>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-app-red/10 flex items-center justify-center">
          <span className="text-2xl">⚠️</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-app-charcoal">
            Sync Incomplete
          </h2>
          <p className="text-sm text-app-gray">
            Some entries couldn&apos;t be synced
          </p>
        </div>
      </div>

      {result && (
        <div className="space-y-3 mb-6">
          <div className="p-4 bg-app-cream rounded-lg border border-app-border">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-app-green">{result.succeeded}</p>
                <p className="text-xs text-app-gray">Synced</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-app-red">{result.failed}</p>
                <p className="text-xs text-app-gray">Failed</p>
              </div>
            </div>
          </div>
          
          <p className="text-sm text-app-gray">
            Failed entries will remain in local storage. You can try syncing 
            them again later from the dashboard.
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleRetry}
          className="flex-1 py-3 px-4 rounded-lg bg-app-teal text-white font-semibold hover:opacity-90 transition-colors"
        >
          Retry Failed Entries
        </button>
        <button
          onClick={onCancel}
          className="py-3 px-4 rounded-lg bg-app-cream text-app-charcoal border border-app-border hover:bg-app-border transition-colors"
        >
          Continue Anyway
        </button>
      </div>
    </>
  );

  // ---------------------------------------------------------------------------
  // MAIN RENDER
  // ---------------------------------------------------------------------------

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
        {state === "prompt" && renderPrompt()}
        {state === "syncing" && renderSyncing()}
        {state === "complete" && renderComplete()}
        {state === "error" && renderError()}
      </div>
    </div>
  );
}