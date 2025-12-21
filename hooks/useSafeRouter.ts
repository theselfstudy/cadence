'use client';

import { useRouter } from 'next/navigation';
import { useSettings } from '@/stores/useSettings';

/**
 * A router hook that prompts the user if there are unsaved settings changes.
 * Use this instead of useRouter() for programmatic navigation.
 */
export function useSafeRouter() {
  const router = useRouter();
  const hasUnsavedChanges = useSettings((state) => state.hasUnsavedChanges);

  const push = (href: string) => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Leave without saving to Google Sheet?'
      );
      if (!confirmed) return;
    }
    router.push(href);
  };

  return { ...router, push };
}