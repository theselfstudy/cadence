"use client";

import Link from 'next/link';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSettings } from '@/stores/useSettings';
import { useSavedFilters } from '@/stores/useSavedFilters';
import { useGoogleLogin } from '@react-oauth/google';
import { GOOGLE_SHEET_URL_PATTERN } from '@/lib/constants';

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
  
  if (!sheetUrl.trim()) {
    setError("Please enter your Google Sheet URL first.");
    return;
  }
  
  // Validate Google Sheets URL format
  if (!GOOGLE_SHEET_URL_PATTERN.test(sheetUrl.trim())) {
    setError("Please enter a valid Google Sheets URL");
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
            Enter your Google Sheet URL below, then connect to restore all your settings.
            </p>
        </div>
        
        {/* THIS IS THE NEW, WORKING FORM */}
        <div className="text-left">
          <label htmlFor="sheetUrl" className="block text-sm font-medium text-app-charcoal mb-1">
            Your Cadence Google Sheet URL
          </label>
          <input
            id="sheetUrl"
            type="url"
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="w-full px-4 py-2 rounded-lg border border-app-border bg-app-white focus:outline-none focus:ring-2 focus:ring-app-green"
          />
        </div>

        {error && <p className="p-3 bg-app-red/10 text-app-red text-sm rounded-md text-center">{error}</p>}

        <div className="pt-2 text-center">
          <button
            onClick={handleRestore}
            disabled={isSyncing || !sheetUrl}
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