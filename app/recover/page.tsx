"use client";

import Link from 'next/link';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSettings } from '@/stores/useSettings';
import { useSavedFilters } from '@/stores/useSavedFilters';
import { useGoogleLogin } from '@react-oauth/google';
import { GOOGLE_SHEET_URL_PATTERN } from '@/lib/constants';
import { useButtonRateLimit } from '@/hooks/useRateLimit';
import { SecureSheetURLInput } from '@/components/ui/SecureInput';

// Helper function to extract ID from URL
function getSpreadsheetIdFromUrl(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

export default function RecoverPage() {
  const router = useRouter();
  const { loadSettingsFromSheet, isSyncing } = useSettings();
  const loadSavedFiltersFromSheet = useSavedFilters((state) => state.loadFromSheet);
  const [sheetUrl, setSheetUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Rate limiting: Allow 3 restore requests per minute
  const restoreRateLimit = useButtonRateLimit({
    maxRequests: 3,
    windowMs: 60000, // 1 minute
    key: 'recover-restore',
    storageType: 'localStorage'
  });

  // This hook handles the real Google login for the restore flow
  const restoreLogin = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    onSuccess: async (tokenResponse) => {
      const spreadsheetId = getSpreadsheetIdFromUrl(sheetUrl);
      if (!spreadsheetId) {
        setError("That doesn't look like a valid Google Sheet URL.");
        return;
      }

      console.log("Google Auth Success! Restoring settings...");
      const success = await loadSettingsFromSheet(spreadsheetId, tokenResponse.access_token);

      if (success) {
        // Also restore saved filters
        await loadSavedFiltersFromSheet(spreadsheetId, tokenResponse.access_token);
        
        alert("Settings restored successfully!");
        router.push('/');
      } else {
        setError("Could not find or load settings from this sheet. Please ensure it's a valid Cadence sheet and that you have granted permission.");
      }
    },
    onError: () => {
      setError('Google Authentication failed. Please try again.');
    },
    onNonOAuthError: () => {
      setError('Google sign-in was cancelled. Please try again.');
  },
  });

  const handleRestore = () => {
  setError(null);

  // Rate limit check
  if (restoreRateLimit.isRateLimited) {
    setError(`Please wait ${restoreRateLimit.getFormattedTime()} before attempting to restore again.`);
    return;
  }

  if (!sheetUrl.trim()) {
    setError("Please enter your Google Sheet URL first.");
    return;
  }

  // Validate Google Sheets URL format
  if (!GOOGLE_SHEET_URL_PATTERN.test(sheetUrl.trim())) {
    setError("Please enter a valid Google Sheets URL");
    return;
  }

  // Attempt rate limit check
  if (!restoreRateLimit.attempt()) {
    setError(`Rate limit reached. Please wait ${restoreRateLimit.getFormattedTime()} before trying again.`);
    return;
  }

  // This will trigger the Google login popup
  restoreLogin();
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-app-cream">
      <div className="max-w-md w-full p-8 space-y-6 bg-app-white border border-app-border rounded-lg shadow-md">
        <div className="text-center">
            <h1 className="text-3xl font-bold text-app-charcoal">Restore Your Setup</h1>
            <p className="text-app-gray mt-2">
            Paste your Google Sheet URL below, then connect to restore all your settings.
            </p>
        </div>
        
        {/* Google Sheet URL Input */}
        <div className="text-left">
          <SecureSheetURLInput
            value={sheetUrl}
            onChange={setSheetUrl}
            label="Your Cadence Google Sheet URL"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            required={true}
            errorMessage={error || undefined}
          />
        </div>

        {restoreRateLimit.isRateLimited && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              ⏱️ Rate limit reached. Please wait <strong>{restoreRateLimit.getFormattedTime()}</strong> before restoring again.
            </p>
          </div>
        )}

        <div className="pt-2 text-center">
          <button
            onClick={handleRestore}
            disabled={isSyncing || !sheetUrl || restoreRateLimit.isRateLimited}
            className="w-full btn-primary disabled:bg-app-gray/50 disabled:cursor-not-allowed"
          >
            {isSyncing ? "Restoring..." : "Connect Google & Restore"}
          </button>
        
            <Link href="/" className="inline-block mt-4 text-sm text-app-gray hover:underline">
                Or, start fresh
            </Link>
        </div>
      </div>
    </div>
  );
}