'use client';

import Link from 'next/link';
import { useSettings } from '@/stores/useSettings';
import { ComponentProps } from 'react';

/**
 * A Link component that prompts the user if there are unsaved settings changes.
 * Reverts to last saved state if user confirms leaving.
 */
export function SafeLink({ href, onClick, children, ...props }: ComponentProps<typeof Link>) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const { hasUnsavedChanges, revertToLastSave } = useSettings.getState();

    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Leave without saving to Google Sheet?'
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