'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSettings } from '@/stores/useSettings';
import { validateSettings } from '@/lib/settingsValidation';
import { ComponentProps } from 'react';

/**
 * A Link component that:
 * 1. Enforces settings validation when leaving settings page or during initial setup
 * 2. Prompts the user if there are unsaved settings changes (Signed In mode only)
 * 3. Reverts to last saved state if user confirms leaving without saving
 */
export function SafeLink({ href, onClick, children, ...props }: ComponentProps<typeof Link>) {
  const pathname = usePathname();
  const setupComplete = useSettings((state) => state.setupComplete);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const state = useSettings.getState();
    const { hasUnsavedChanges, isGoogleSheetConnected, revertToLastSave } = state;

    // ---------------------------------------------------------------------------
    // STEP 1: Enforce validation when leaving settings or during initial setup
    // ---------------------------------------------------------------------------
    const isOnSettingsPage = pathname === '/settings';
    const isInSetupFlow = !setupComplete;

    if (isOnSettingsPage || isInSetupFlow) {
      const validation = validateSettings({
        symptoms: state.symptoms,
        periodTracking: state.periodTracking,
        medicineTracking: state.medicineTracking,
        stoolTracking: state.stoolTracking,
      });

      if (!validation.isValid) {
        e.preventDefault();
        e.stopPropagation();
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
      if (!confirmed) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      // Revert settings to last saved state
      revertToLastSave();
    }

    onClick?.(e);
  };

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}