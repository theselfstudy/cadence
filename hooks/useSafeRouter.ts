'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useSettings } from '@/stores/useSettings';
import { validateSettings } from '@/lib/settingsValidation';

/**
 * A router hook that:
 * 1. Enforces settings validation when leaving settings page or during initial setup
 * 2. Prompts the user if there are unsaved settings changes (Signed In mode only)
 */
export function useSafeRouter() {
  const router = useRouter();
  const pathname = usePathname();
  const hasUnsavedChanges = useSettings((state) => state.hasUnsavedChanges);
  const isGoogleSheetConnected = useSettings((state) => state.isGoogleSheetConnected);
  const setupComplete = useSettings((state) => state.setupComplete);

  const push = (href: string) => {
    const state = useSettings.getState();

    // ---------------------------------------------------------------------------
    // STEP 1: Enforce validation when leaving settings or during initial setup
    // ---------------------------------------------------------------------------
    const isOnSettingsPage = pathname === '/settings';
    const isInSetupFlow = !setupComplete;

    if (isOnSettingsPage || isInSetupFlow) {
      const validation = validateSettings({
        periodTracking: state.periodTracking,
        medicineTracking: state.medicineTracking,
      });

      if (!validation.isValid) {
        alert(validation.validationMessage);
        return; // Block navigation
      }
    }

    // ---------------------------------------------------------------------------
    // STEP 2: Warn about unsaved changes in Signed In mode
    // ---------------------------------------------------------------------------
    if (hasUnsavedChanges && isGoogleSheetConnected) {
      const confirmed = window.confirm(
        'You have unsaved changes that haven\'t been synced to your Google Sheet. Leave without saving?'
      );
      if (!confirmed) return;
    }

    router.push(href);
  };

  return { ...router, push };
}