// ============================================
// Entry Store - Zustand with localStorage persistence
// ============================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { EntryStore, StoredEntry, UserSettings } from '@/types';
import { appendEntryToSheet, getSpreadsheetIdFromUrl } from '@/lib/googleSheets';
import { STORAGE_KEYS } from '@/lib/constants';

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateEntryId(): string {
  return `entry_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================
// STORE DEFINITION
// ============================================

export const useEntries = create<EntryStore>()(
  persist(
    (set, get) => ({
      // ═══════════════════════════════════════
      // INITIAL STATE
      // ═══════════════════════════════════════
      entries: [],
      isSyncing: false,
      lastSyncAt: null,

      // ═══════════════════════════════════════
      // ACTIONS
      // ═══════════════════════════════════════

      /**
       * Adds a new entry to localStorage.
       * Returns the created entry with generated ID and timestamps.
       */
      addEntry: (entryData) => {
        const now = new Date().toISOString();
        const newEntry: StoredEntry = {
          ...entryData,
          id: generateEntryId(),
          createdAt: now,
          updatedAt: now,
          syncStatus: 'pending',
        };

        set((state) => ({
          entries: [...state.entries, newEntry],
        }));

        return newEntry;
      },

      /**
       * Syncs a specific entry to Google Sheets.
       */
      syncEntryToSheet: async (entryId: string, accessToken: string) => {
        const { entries } = get();
        const entry = entries.find((e) => e.id === entryId);
        
        if (!entry) {
          console.error(`Entry ${entryId} not found`);
          return false;
        }

        // Get settings from the settings store
        // We need to import dynamically to avoid circular dependency
        const { useSettings } = await import('./useSettings');
        const settings = useSettings.getState();
        
        if (!settings.googleSheet.url) {
          console.error('No Google Sheet connected');
          get().markEntryFailed(entryId, 'No Google Sheet connected');
          return false;
        }

        const spreadsheetId = getSpreadsheetIdFromUrl(settings.googleSheet.url);
        if (!spreadsheetId) {
          console.error('Invalid spreadsheet URL');
          get().markEntryFailed(entryId, 'Invalid spreadsheet URL');
          return false;
        }

        set({ isSyncing: true });

        const result = await appendEntryToSheet(
          entry,
          settings as UserSettings,
          spreadsheetId,
          accessToken
        );

        if (result.success) {
          get().markEntrySynced(entryId);
          set({ 
            isSyncing: false, 
            lastSyncAt: new Date().toISOString() 
          });
          return true;
        } else {
          get().markEntryFailed(entryId, result.error || 'Unknown error');
          set({ isSyncing: false });
          return false;
        }
      },

      /**
       * Marks an entry as successfully synced.
       */
      markEntrySynced: (entryId: string) => {
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === entryId
              ? { ...e, syncStatus: 'synced' as const, syncError: undefined, updatedAt: new Date().toISOString() }
              : e
          ),
        }));
      },

      /**
       * Marks an entry sync as failed.
       */
      markEntryFailed: (entryId: string, error: string) => {
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === entryId
              ? { ...e, syncStatus: 'error' as const, syncError: error, updatedAt: new Date().toISOString() }
              : e
          ),
        }));
      },

      /**
       * Gets all entries that haven't been synced yet.
       */
      getPendingEntries: () => {
        return get().entries.filter((e) => e.syncStatus === 'pending');
      },

      /**
       * Syncs all pending entries to Google Sheets.
       */
      syncAllPending: async (accessToken: string) => {
        const pendingEntries = get().getPendingEntries();
        
        for (const entry of pendingEntries) {
          await get().syncEntryToSheet(entry.id, accessToken);
        }
      },

      /**
       * Clears all entries (for testing/reset).
       */
      clearEntries: () => {
        set({ entries: [], lastSyncAt: null });
      },
    }),

    // ═══════════════════════════════════════
    // PERSIST CONFIGURATION
    // ═══════════════════════════════════════
    {
      name: STORAGE_KEYS.entries || 'TrackWell-entries',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ============================================
// SELECTOR HOOKS
// ============================================

export const useEntriesList = () => useEntries((state) => state.entries);
export const useIsSyncing = () => useEntries((state) => state.isSyncing);
export const usePendingEntries = () => useEntries((state) => state.getPendingEntries());