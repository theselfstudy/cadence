"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGoogleLogin } from "@react-oauth/google";
import { useSettings } from "@/stores/useSettings";
import { useSyncState } from "@/stores/useSyncState";
import { useSavedFilters } from "@/stores/useSavedFilters";
import { useEntries } from "@/stores/useEntries";
import { useButtonRateLimit } from "@/hooks/useRateLimit";
import { OAuthErrorModal } from "@/components/ui/OAuthErrorModal";
import { SheetDisconnectedModal } from "@/components/ui/SheetDisconnectedModal";
import { startSync } from "@/lib/syncEngine";
import {
  isMobileDevice,
  triggerOAuthRedirect,
  getOAuthToken,
  clearOAuthToken
} from "@/lib/oauthHelpers";

// ============================================
// Types
// ============================================

type ButtonVariant = "primary" | "secondary" | "subtle";
type ButtonMode = "sync" | "restore";

interface SyncWithGoogleSheetsButtonProps {
  /** Visual variant of the button */
  variant?: ButtonVariant;
  /** Mode: sync (default) or restore */
  mode?: ButtonMode;
  /** Show the sync status indicator below the button */
  showStatus?: boolean;
  /** Custom class names to apply */
  className?: string;
  /** Disable the button (e.g., when there are input security errors) */
  disabled?: boolean;
  /** Message to show when disabled due to input errors */
  disabledMessage?: string;
  /** Sheet URL for restore mode */
  sheetUrl?: string;
  /** Callback when restore completes successfully */
  onRestoreSuccess?: () => void;
  /** Callback when restore fails */
  onRestoreError?: (error: string) => void;
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

// Helper function to extract spreadsheet ID from URL
function getSpreadsheetIdFromUrl(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

export function SyncWithGoogleSheetsButton({
  variant = "primary",
  mode = "sync",
  showStatus = false,
  className = "",
  disabled = false,
  disabledMessage,
  sheetUrl,
  onRestoreSuccess,
  onRestoreError,
}: SyncWithGoogleSheetsButtonProps) {
  const router = useRouter();
  const [showOAuthError, setShowOAuthError] = useState(false);
  const [showSheetDisconnected, setShowSheetDisconnected] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Store hooks
  const { isGoogleSheetConnected, loadSettingsFromSheet } = useSettings();
  const { syncInProgress, currentPhase, lastSuccessfulSyncAt } = useSyncState();
  const loadSavedFiltersFromSheet = useSavedFilters((state) => state.loadFromSheet);
  const importEntriesFromSheet = useEntries((state) => state.importEntriesFromSheet);

  // Rate limiting: 3 syncs per minute
  const rateLimit = useButtonRateLimit({
    maxRequests: 3,
    windowMs: 60000,
    key: mode === "restore" ? "restore-google-sheets" : "sync-google-sheets",
    storageType: "localStorage",
  });

  // Check for OAuth token on page load (for mobile redirect return in restore mode)
  useEffect(() => {
    if (mode !== "restore") return;

    const token = getOAuthToken();
    const pendingSheetUrl = localStorage.getItem('restore_pending_sheet_url');

    if (token && pendingSheetUrl) {
      // We just returned from OAuth redirect, perform restore
      performRestore(pendingSheetUrl, token);
      localStorage.removeItem('restore_pending_sheet_url');
    }
  }, [mode]);

  // Perform the actual restore operation
  const performRestore = async (url: string, token: string) => {
    setIsRestoring(true);

    const spreadsheetId = getSpreadsheetIdFromUrl(url);
    if (!spreadsheetId) {
      onRestoreError?.("That doesn't look like a valid Google Sheet URL.");
      setIsRestoring(false);
      clearOAuthToken();
      return;
    }

    console.log("Restoring settings from sheet...");
    const success = await loadSettingsFromSheet(spreadsheetId, token);

    if (success) {
      // Also restore saved filters and entries
      await loadSavedFiltersFromSheet(spreadsheetId, token);
      await importEntriesFromSheet(token);

      clearOAuthToken();
      setIsRestoring(false);
      onRestoreSuccess?.();
      // Redirect to dashboard after successful restore
      router.push('/dashboard');
    } else {
      const errorMsg = "Could not find or load settings from this sheet. Please ensure it's a valid Cadence sheet and that you have granted permission.";
      onRestoreError?.(errorMsg);
      setIsRestoring(false);
      clearOAuthToken();
    }
  };

  // OAuth login handler (for desktop popup flow)
  const googleLogin = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/spreadsheets",
    onSuccess: async (tokenResponse) => {
      // Store token temporarily in sessionStorage
      sessionStorage.setItem('google_oauth_token', tokenResponse.access_token);
      sessionStorage.setItem('google_oauth_timestamp', Date.now().toString());

      if (mode === "restore") {
        // Perform restore
        if (!sheetUrl) {
          onRestoreError?.("Please enter a Google Sheet URL first.");
          return;
        }
        await performRestore(sheetUrl, tokenResponse.access_token);
      } else {
        // Start sync using new sync engine
        try {
          await startSync();
        } catch (error) {
          console.error("Sync error:", error);
          if ((error as Error).message?.includes('deleted') || (error as Error).message?.includes('access')) {
            setShowSheetDisconnected(true);
          }
        }
      }
    },
    onError: (error) => {
      console.error("OAuth error:", error);
      setShowOAuthError(true);
    },
    onNonOAuthError: () => {
      setShowOAuthError(true);
    },
  });

  // Handle button click - use hybrid OAuth approach
  const handleClick = () => {
    if (syncInProgress || isRestoring || rateLimit.isRateLimited || disabled) return;

    // Restore mode validation
    if (mode === "restore") {
      if (!sheetUrl || !sheetUrl.trim()) {
        onRestoreError?.("Please enter your Google Sheet URL first.");
        return;
      }
    }

    if (!rateLimit.attempt()) return;

    if (isMobileDevice()) {
      // Mobile: use redirect OAuth
      if (mode === "restore" && sheetUrl) {
        // Store sheet URL for after redirect
        localStorage.setItem('restore_pending_sheet_url', sheetUrl);
      }
      triggerOAuthRedirect(window.location.pathname);
    } else {
      // Desktop: use popup OAuth
      googleLogin();
    }
  };

  // Don't render if Google Sheet is not connected
  // BUT still render if we need to show the disconnected modal
  // ALSO always render in restore mode
  if (mode !== "restore" && !isGoogleSheetConnected && !showSheetDisconnected) {
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

  // Icon (sync or restore)
  const Icon = mode === "restore" ? (
    <svg
      className={`w-4 h-4 ${isRestoring ? "animate-spin" : ""}`}
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
  ) : (
    <svg
      className={`w-4 h-4 ${syncInProgress ? "animate-spin" : ""}`}
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

  // Format phase label for display
  const formatPhaseLabel = (): string => {
    const phase = currentPhase.phase;
    const progress = currentPhase.progress;

    switch (phase) {
      case 'verify':
        return 'Verifying connection...';
      case 'push-entries':
        return progress.entriesTotal > 0
          ? `Pushing entries (${progress.entriesSynced}/${progress.entriesTotal})`
          : 'Pushing entries...';
      case 'push-settings':
        return 'Pushing settings...';
      case 'push-filters':
        return 'Pushing filters...';
      case 'pull-entries':
        return 'Pulling entries...';
      case 'pull-settings':
        return 'Pulling settings...';
      case 'pull-filters':
        return 'Pulling filters...';
      case 'finalize':
        return 'Finalizing sync...';
      default:
        return 'Syncing...';
    }
  };

  const syncStatusText = formatTimeSinceSync(lastSuccessfulSyncAt);

  // Button text based on mode and state
  const getButtonText = () => {
    if (mode === "restore") {
      return isRestoring ? "Restoring..." : "Sign In with Google & Restore";
    }
    return syncInProgress ? formatPhaseLabel() : "Sync with Google Sheets";
  };

  const isButtonDisabled = mode === "restore"
    ? isRestoring || rateLimit.isRateLimited || disabled
    : syncInProgress || rateLimit.isRateLimited || disabled;

  return (
    <>
      {/* Show button when connected (sync mode) or always (restore mode) */}
      {(mode === "restore" || isGoogleSheetConnected) && (
        <div className={className}>
          <button
            onClick={handleClick}
            disabled={isButtonDisabled}
            className={buttonStyles[variant]}
            title={
              disabled && disabledMessage
                ? disabledMessage
                : mode === "restore"
                ? "Sign in with Google to restore your settings and entries"
                : "Push local changes and pull updates from Google Sheets"
            }
          >
            <span className="flex items-center gap-2">
              {Icon}
              {getButtonText()}
            </span>
          </button>

          {/* Input security warning */}
          {disabled && disabledMessage && (
            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              ⚠️ {disabledMessage}
            </div>
          )}

          {/* Rate limit warning */}
          {rateLimit.isRateLimited && (
            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              Please wait <strong>{rateLimit.getFormattedTime()}</strong> before
              syncing again.
            </div>
          )}

          {/* Sync status indicator */}
          {showStatus && !syncInProgress && (
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
      )}

      {/* Sheet Disconnected Modal - rendered outside the connected check */}
      <SheetDisconnectedModal
        isOpen={showSheetDisconnected}
        onClose={() => setShowSheetDisconnected(false)}
      />
    </>
  );
}
