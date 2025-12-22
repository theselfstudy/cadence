'use client';

import { useRouter } from 'next/navigation';
import { useSettings } from '@/stores/useSettings';

/**
 * A router hook that prompts the user if there are unsaved settings changes.
 * Only prompts in Signed In mode (when Google Sheet is connected).
 * Anonymous mode data is auto-persisted to localStorage, so no prompt needed.
 */
export function useSafeRouter() {
  const router = useRouter();
  const hasUnsavedChanges = useSettings((state) => state.hasUnsavedChanges);
  const isGoogleSheetConnected = useSettings((state) => state.isGoogleSheetConnected);

  const push = (href: string) => {
    // Only prompt if: 1) there are unsaved changes AND 2) user is in Signed In mode
    // Anonymous mode auto-saves to localStorage, so no prompt needed
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