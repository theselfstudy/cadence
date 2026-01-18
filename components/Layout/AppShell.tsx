"use client";

import { Header } from "./Header";
import React from "react";
import { SyncReminderModal } from "@/components/sync/SyncReminderModal";
import { useSyncReminder } from "@/hooks/useSyncReminder";

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * Main application shell component
 * Wraps all pages with consistent header and layout structure
 */
export function AppShell({ children }: AppShellProps) {
  const { showModal, closeModal } = useSyncReminder();

  return (
    <>
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
              Learn your Cadence
            </p>
          </div>
        </footer>
      </div>

      {/* Global 48-hour sync reminder modal */}
      <SyncReminderModal isOpen={showModal} onClose={closeModal} />
    </>
  );
}

export default AppShell;