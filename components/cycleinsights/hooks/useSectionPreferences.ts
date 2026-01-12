// /components/cycleinsights/hooks/useSectionPreferences.ts
"use client";

import { useState, useEffect, useCallback } from "react";

// ============================================
// TYPES
// ============================================

export interface SectionPreferences {
  /** Section IDs that are collapsed by default */
  collapsedSections: string[];
  /** Whether Reflect section is hidden by default */
  reflectSectionHidden: boolean;
  /** Individual prompt IDs user has dismissed */
  dismissedPromptIds: string[];
}

const DEFAULT_PREFERENCES: SectionPreferences = {
  collapsedSections: [],
  reflectSectionHidden: false,
  dismissedPromptIds: [],
};

// const STORAGE_KEY = "cadence-cycle-insights-prefs";

// ============================================
// HOOK
// ============================================

export function useSectionPreferences() {
  const [preferences, setPreferences] = useState<SectionPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences from localStorage on mount
  // useEffect(() => {
  //   try {
  //     const saved = localStorage.getItem(STORAGE_KEY);
  //     if (saved) {
  //       const parsed = JSON.parse(saved);
  //       setPreferences({
  //         collapsedSections: parsed.collapsedSections || [],
  //         reflectSectionHidden: parsed.reflectSectionHidden || false,
  //         dismissedPromptIds: parsed.dismissedPromptIds || [],
  //       });
  //     }
  //   } catch (e) {
  //     console.warn("Failed to parse cycle insights preferences", e);
  //   }
  //   setIsLoaded(true);
  // }, []);

  // // Save preferences to localStorage when they change
  // useEffect(() => {
  //   if (isLoaded) {
  //     localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  //   }
  // }, [preferences, isLoaded]);

  // ============================================
  // SECTION COLLAPSE HELPERS
  // ============================================

  const isSectionCollapsed = useCallback(
    (sectionId: string): boolean => {
      return preferences.collapsedSections.includes(sectionId);
    },
    [preferences.collapsedSections]
  );

  const toggleSectionCollapsed = useCallback((sectionId: string) => {
    setPreferences((prev) => {
      const isCurrentlyCollapsed = prev.collapsedSections.includes(sectionId);
      return {
        ...prev,
        collapsedSections: isCurrentlyCollapsed
          ? prev.collapsedSections.filter((id) => id !== sectionId)
          : [...prev.collapsedSections, sectionId],
      };
    });
  }, []);

  const setSectionCollapsed = useCallback((sectionId: string, collapsed: boolean) => {
    setPreferences((prev) => {
      const isCurrentlyCollapsed = prev.collapsedSections.includes(sectionId);
      
      if (collapsed && !isCurrentlyCollapsed) {
        return {
          ...prev,
          collapsedSections: [...prev.collapsedSections, sectionId],
        };
      } else if (!collapsed && isCurrentlyCollapsed) {
        return {
          ...prev,
          collapsedSections: prev.collapsedSections.filter((id) => id !== sectionId),
        };
      }
      return prev;
    });
  }, []);

  // ============================================
  // REFLECT SECTION HELPERS
  // ============================================

  const hideReflectSection = useCallback(() => {
    setPreferences((prev) => ({
      ...prev,
      reflectSectionHidden: true,
    }));
  }, []);

  const showReflectSection = useCallback(() => {
    setPreferences((prev) => ({
      ...prev,
      reflectSectionHidden: false,
    }));
  }, []);

  // ============================================
  // PROMPT DISMISS HELPERS
  // ============================================

  const dismissPrompt = useCallback((promptId: string) => {
    setPreferences((prev) => {
      if (prev.dismissedPromptIds.includes(promptId)) {
        return prev;
      }
      return {
        ...prev,
        dismissedPromptIds: [...prev.dismissedPromptIds, promptId],
      };
    });
  }, []);

  const isPromptDismissed = useCallback(
    (promptId: string): boolean => {
      return preferences.dismissedPromptIds.includes(promptId);
    },
    [preferences.dismissedPromptIds]
  );

  const resetDismissedPrompts = useCallback(() => {
    setPreferences((prev) => ({
      ...prev,
      dismissedPromptIds: [],
    }));
  }, []);

  return {
    preferences,
    isLoaded,
    // Section collapse
    isSectionCollapsed,
    toggleSectionCollapsed,
    setSectionCollapsed,
    // Reflect section
    hideReflectSection,
    showReflectSection,
    // Prompts
    dismissPrompt,
    isPromptDismissed,
    resetDismissedPrompts,
  };
}