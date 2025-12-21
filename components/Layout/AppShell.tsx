"use client";

import { Header } from "./Header";
import React from 'react';
import { SafeLink } from '@/components/ui/SafeLink';
import { useSettings } from '@/stores/useSettings';

interface AppShellProps {
  children: React.ReactNode;
}

const BlockingUI = () => {
  const { signOut } = useSettings();

  const handleContinueLocal = () => {
    // This action logs the user out, resolving the invalid state
    signOut();
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="max-w-md w-full p-8 space-y-6 bg-white border border-red-200 rounded-lg shadow-md text-center">
        <h2 className="text-2xl font-bold text-slate-800">Action Required</h2>
        <p className="text-slate-600">
          You are signed in but do not have a Google Sheet connected. To protect your data, please connect a sheet to continue or proceed in local-only mode.
        </p>
        <div className="flex flex-col space-y-3 pt-4">
          <SafeLink href="/settings" className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
            Connect Google Sheet
          </SafeLink>
          <button
            onClick={handleContinueLocal}
            className="w-full bg-slate-200 text-slate-800 font-semibold py-2 px-4 rounded-md hover:bg-slate-300 transition-colors"
          >
            Continue without signing in
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Main application shell component
 * Wraps all pages with consistent header and layout structure
 */
export function AppShell({ children }: AppShellProps) {
  const { isAuthenticated, isGoogleSheetConnected } = useSettings();
  const isInvalidState = isAuthenticated && !isGoogleSheetConnected;
  if (isInvalidState) {
    return <BlockingUI />;
  }
  return (
    <div className="min-h-screen flex flex-col bg-app-cream">
      {/* Header */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-app-border bg-app-white">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <p className="text-center text-sm text-app-gray">
            TrackWell — Your personal health companion
          </p>
        </div>
      </footer>
    </div>
  );
}

export default AppShell;