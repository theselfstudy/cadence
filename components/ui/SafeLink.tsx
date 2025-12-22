'use client';

import Link from 'next/link';
import { useSettings } from '@/stores/useSettings';
import { ComponentProps } from 'react';

/**
 * A Link component that prompts the user if there are unsaved settings changes.
 * Only prompts in Signed In mode (when Google Sheet is connected).
 * Anonymous mode data is auto-persisted to localStorage, so no prompt needed.
 * Reverts to last saved state if user confirms leaving.
 */
export function SafeLink({ href, onClick, children, ...props }: ComponentProps<typeof Link>) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const { hasUnsavedChanges, isGoogleSheetConnected, revertToLastSave } = useSettings.getState();

    // Only prompt if: 1) there are unsaved changes AND 2) user is in Signed In mode
    // Anonymous mode auto-saves to localStorage, so no prompt needed
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