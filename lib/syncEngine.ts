import { useSyncState, SyncPhase } from '@/stores/useSyncState';
import { useSettings } from '@/stores/useSettings';
import { useEntries } from '@/stores/useEntries';
import { useSavedFilters } from '@/stores/useSavedFilters';
import { useSyncTracker } from '@/stores/useSyncTracker';
import {
  verifySheetConnection,
  getSpreadsheetIdFromUrl,
} from '@/lib/googleSheets';
import { getOAuthToken, clearOAuthToken, triggerOAuthRedirect } from '@/lib/oauthHelpers';

export class SyncEngine {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Execute full sync from start
   */
  async executeFullSync(): Promise<void> {
    const { updatePhase } = useSyncState.getState();

    try {
      // Phase 1: Verify
      updatePhase('verify');
      await this.verifySheet();

      // Phase 2: Push entries
      updatePhase('push-entries');
      await this.pushEntries();

      // Phase 3: Push settings
      updatePhase('push-settings');
      await this.pushSettings();

      // Phase 4: Push filters
      updatePhase('push-filters');
      await this.pushFilters();

      // Phase 5: Pull entries
      updatePhase('pull-entries');
      await this.pullEntries();

      // Phase 6: Pull settings
      updatePhase('pull-settings');
      await this.pullSettings();

      // Phase 7: Pull filters
      updatePhase('pull-filters');
      await this.pullFilters();

      // Phase 8: Finalize
      updatePhase('finalize');
      await this.finalize();

      // Complete
      useSyncState.getState().completeSync(true);
      clearOAuthToken();
    } catch (error) {
      console.error('Sync error:', error);
      useSyncState.getState().updatePhase('error');
      useSyncState.getState().completeSync(false);
      throw error;
    }
  }

  /**
   * Resume sync from a specific phase
   */
  async resumeFromPhase(phase: SyncPhase): Promise<void> {
    const phaseHandlers: Record<string, () => Promise<void>> = {
      'verify': () => this.verifySheet(),
      'push-entries': () => this.pushEntries(),
      'push-settings': () => this.pushSettings(),
      'push-filters': () => this.pushFilters(),
      'pull-entries': () => this.pullEntries(),
      'pull-settings': () => this.pullSettings(),
      'pull-filters': () => this.pullFilters(),
      'finalize': () => this.finalize(),
    };

    const handler = phaseHandlers[phase];
    if (!handler) {
      throw new Error(`Unknown phase: ${phase}`);
    }

    try {
      // Execute current phase
      await handler();

      // Continue with remaining phases
      const phaseOrder = Object.keys(phaseHandlers);
      const currentIndex = phaseOrder.indexOf(phase);

      for (let i = currentIndex + 1; i < phaseOrder.length; i++) {
        const nextPhase = phaseOrder[i] as SyncPhase;
        useSyncState.getState().updatePhase(nextPhase);
        await phaseHandlers[nextPhase]();
      }

      useSyncState.getState().completeSync(true);
      clearOAuthToken();
    } catch (error) {
      console.error('Resume sync error:', error);
      useSyncState.getState().updatePhase('error');
      useSyncState.getState().completeSync(false);
      throw error;
    }
  }

  /**
   * Phase 1: Verify sheet connection
   */
  private async verifySheet(): Promise<void> {
    const { googleSheet } = useSettings.getState();

    if (!googleSheet.url) {
      throw new Error('No Google Sheet connected');
    }

    const spreadsheetId = getSpreadsheetIdFromUrl(googleSheet.url);

    if (!spreadsheetId) {
      throw new Error('Invalid spreadsheet URL');
    }

    const result = await verifySheetConnection(spreadsheetId, this.accessToken);

    if (!result.success) {
      throw new Error(result.message || 'Sheet verification failed');
    }
  }

  /**
   * Phase 2: Push entries to sheet
   */
  private async pushEntries(): Promise<void> {
    const { batchSyncEntries } = useEntries.getState();
    const { updatePhase } = useSyncState.getState();

    const result = await batchSyncEntries(this.accessToken, (progress) => {
      updatePhase('push-entries', {
        entriesTotal: progress.total,
        entriesSynced: progress.succeeded,
        currentEntryIndex: progress.current,
      });
    });

    if (!result.success && result.failed > 0) {
      // Don't throw error if some entries failed - continue with sync
      console.warn(`${result.failed} entries failed to sync`);
    }
  }

  /**
   * Phase 3: Push settings to sheet
   */
  private async pushSettings(): Promise<void> {
    const { saveSettingsToSheet } = useSettings.getState();

    // Always push settings to ensure sheet is created (even if no changes)
    console.log('[SyncEngine] Pushing settings to sheet...');
    const success = await saveSettingsToSheet(this.accessToken);
    if (!success) {
      console.warn('[SyncEngine] Failed to push settings - continuing with sync');
    } else {
      console.log('[SyncEngine] Settings pushed successfully');
    }
  }

  /**
   * Phase 4: Push filters to sheet
   */
  private async pushFilters(): Promise<void> {
    const { syncToSheet } = useSavedFilters.getState();

    // Always attempt to push filters (ensures sheet is created even if empty)
    console.log('[SyncEngine] Pushing filters to sheet...');
    const success = await syncToSheet(this.accessToken);
    if (!success) {
      console.warn('[SyncEngine] Failed to push filters - continuing with sync');
    } else {
      console.log('[SyncEngine] Filters pushed successfully');
    }
  }

  /**
   * Phase 5: Pull entries from sheet
   */
  private async pullEntries(): Promise<void> {
    const { importEntriesFromSheet } = useEntries.getState();

    const result = await importEntriesFromSheet(this.accessToken);

    if (!result.success && result.error) {
      console.warn(`Failed to pull entries: ${result.error}`);
    }
  }

  /**
   * Phase 6: Pull settings from sheet
   */
  private async pullSettings(): Promise<void> {
    const { loadSettingsFromSheet, googleSheet } = useSettings.getState();
    const spreadsheetId = getSpreadsheetIdFromUrl(googleSheet.url!);

    if (!spreadsheetId) {
      throw new Error('Invalid spreadsheet URL');
    }

    const success = await loadSettingsFromSheet(
      spreadsheetId,
      this.accessToken,
      googleSheet.name || undefined
    );

    // Settings sheet might not exist yet - this is OK
    if (!success) {
      console.log('Settings sheet does not exist yet');
    }
  }

  /**
   * Phase 7: Pull filters from sheet
   */
  private async pullFilters(): Promise<void> {
    const { loadFromSheet } = useSavedFilters.getState();
    const { googleSheet } = useSettings.getState();
    const spreadsheetId = getSpreadsheetIdFromUrl(googleSheet.url!);

    if (!spreadsheetId) {
      throw new Error('Invalid spreadsheet URL');
    }

    const success = await loadFromSheet(spreadsheetId, this.accessToken);

    // Filters sheet might not exist yet - this is OK
    if (!success) {
      console.log('Filters sheet does not exist yet');
    }
  }

  /**
   * Phase 8: Finalize sync - update sync tracker
   */
  private async finalize(): Promise<void> {
    const now = new Date().toISOString();
    const syncTracker = useSyncTracker.getState();

    syncTracker.updateEntrySyncTime(now);
    syncTracker.updateSettingsSyncTime(now);
    syncTracker.updateFiltersSyncTime(now);
  }
}

/**
 * Start a new sync from the beginning
 */
export async function startSync(): Promise<void> {
  const token = getOAuthToken();

  if (!token) {
    // Trigger OAuth
    useSyncState.getState().setPendingOAuthRedirect(true, window.location.pathname);
    triggerOAuthRedirect(window.location.pathname);
    return;
  }

  useSyncState.getState().startSync();

  const engine = new SyncEngine(token);
  await engine.executeFullSync();
}

/**
 * Resume sync from where it left off
 */
export async function resumeSync(): Promise<void> {
  const token = getOAuthToken();

  if (!token) {
    // Need OAuth again
    useSyncState.getState().setPendingOAuthRedirect(true, window.location.pathname);
    triggerOAuthRedirect(window.location.pathname);
    return;
  }

  const { currentPhase } = useSyncState.getState();

  const engine = new SyncEngine(token);
  await engine.resumeFromPhase(currentPhase.phase);
}
