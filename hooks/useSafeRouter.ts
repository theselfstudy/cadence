'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useSettings } from '@/stores/useSettings';
import { validateSettings } from '@/lib/settingsValidation';

/**
 * A router hook that enforces settings validation when leaving settings page
 * or during initial setup. Local changes are always allowed; syncing is explicit.
 */
export function useSafeRouter() {
  const router = useRouter();
  const pathname = usePathname();
  const setupComplete = useSettings((state) => state.setupComplete);

  const push = (href: string) => {
    const state = useSettings.getState();

    // ---------------------------------------------------------------------------
    // Enforce validation when leaving settings or during initial setup
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

    router.push(href);
  };

  return { ...router, push };
}