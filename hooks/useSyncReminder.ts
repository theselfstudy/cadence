"use client";

import { useState, useEffect } from "react";
import { useSyncTracker } from "@/stores/useSyncTracker";
import { useSettings } from "@/stores/useSettings";

/**
 * Hook to manage the 48-hour sync reminder modal
 *
 * This hook:
 * - Checks if the modal should be shown on page load
 * - Resets the dismissal flag each time the page loads
 * - Only shows the modal if a Google Sheet is connected
 *
 * @returns {Object} - showModal state and closeModal function
 */
export function useSyncReminder() {
  const [showModal, setShowModal] = useState(false);
  const { shouldShowModal, resetDismissal } = useSyncTracker();
  const { isGoogleSheetConnected } = useSettings();

  useEffect(() => {
    // Reset dismissal flag on page load
    resetDismissal();

    // Check if modal should appear
    // Only show if:
    // 1. Google Sheet is connected
    // 2. 48 hours have passed since last sync (or never synced)
    if (isGoogleSheetConnected && shouldShowModal()) {
      setShowModal(true);
    }
  }, [isGoogleSheetConnected, shouldShowModal, resetDismissal]);

  const closeModal = () => {
    setShowModal(false);
  };

  return {
    showModal,
    closeModal,
  };
}
