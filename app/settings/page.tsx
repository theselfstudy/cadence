"use client";

import { useGoogleLogin } from "@react-oauth/google";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { checkForExistingSettings, deleteSettingsSheet } from "@/lib/googleSheets";
import { useSettings } from "@/stores/useSettings";
import { validateSettings } from "@/lib/settingsValidation";

import {
  DEFAULT_SYMPTOMS,
  GOOGLE_SHEET_URL_PATTERN,
  PRODUCT_OPTIONS,
  MEDICINE_CATEGORIES,
} from "@/lib/constants";
import type { PainScaleType, Medicine, MedicineCategory } from "@/types";

import {
  SymptomChip,
  ToggleRow,
  PainScaleOption,
  CustomProductSection,
  MedicineItem,
  AddMedicineForm,
  RecoveryPromptModal,
  SavePromptModal,
  AnonymousContinueModal,
} from "@/components/settings";

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_CUSTOM_SYMPTOMS = 30;
const MAX_CUSTOM_PERIOD_SYMPTOMS = 30;
const MAX_MEDICINES = 15;

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function SettingsPage() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <SettingsPageSkeleton />;
  }

  return <SettingsPageContent />;
}

// =============================================================================
// SKELETON LOADER
// =============================================================================

function SettingsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-64 bg-app-border rounded animate-pulse" />
        <div className="h-4 w-48 bg-app-border rounded animate-pulse mt-2" />
      </div>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="card">
          <div className="h-6 w-40 bg-app-border rounded animate-pulse mb-4" />
          <div className="h-12 w-full bg-app-border rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// MAIN CONTENT
// =============================================================================

function SettingsPageContent() {
  const router = useRouter();

  // ---------------------------------------------------------------------------
  // STORE
  // ---------------------------------------------------------------------------
  const {
    setupComplete,
    tutorialComplete,
    timeFormat,
    symptoms,
    periodTracking,
    stoolTracking,
    googleSheet,
    medicineTracking,
    isSyncing,
    isGoogleSheetConnected,
    setTimeFormat,
    toggleSymptom,
    addCustomSymptom,
    removeCustomSymptom,
    setIntensityTracking,
    setPeriodTracking,
    togglePeriodSymptom,
    addCustomPeriodSymptom,
    removeCustomPeriodSymptom,
    setStoolTracking,
    setGoogleSheet,
    saveSettingsToSheet,
    loadSettingsFromSheet,
    clearGoogleSheet,
    completeSetup,
    resetSettings,
    setMedicineTracking,
  } = useSettings();

  const hasUnsavedChanges = useSettings((state) => state.hasUnsavedChanges);

  // ---------------------------------------------------------------------------
  // LOCAL STATE
  // ---------------------------------------------------------------------------

  // Get onboarding mode from URL params (set by welcome page)
  const searchParams = useSearchParams();
  const onboardingMode = searchParams.get("onboardingMode") as "google-sheet" | "anonymous" | null;
  
  // Track if Google Sheet section is expanded (for Anonymous mode accordion)
  const [isGoogleSheetExpanded, setIsGoogleSheetExpanded] = useState(
    // Start expanded if mode is google-sheet, or if user already has a sheet connected
    onboardingMode === "google-sheet" || isGoogleSheetConnected
  );

  const [newSymptom, setNewSymptom] = useState("");
  const [newPeriodSymptom, setNewPeriodSymptom] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [isEditingSheet, setIsEditingSheet] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [pendingSheetUrl, setPendingSheetUrl] = useState<string | null>(null);
  const [pendingSheetName, setPendingSheetName] = useState<string | null>(null);
  const [pendingAccessToken, setPendingAccessToken] = useState<string | null>(null);
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false);  
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<"tutorial" | "entry" | null>(null);
  const [showAnonymousContinueModal, setShowAnonymousContinueModal] = useState(false);
  const [showLocalSaveModal, setShowLocalSaveModal] = useState(false);

  
  // Validation error display - only show after user attempts to submit
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  // ---------------------------------------------------------------------------
  // SAFE ACCESS DEFAULTS
  // ---------------------------------------------------------------------------

  const safeGoogleSheet = googleSheet ?? { url: null, name: null, addedAt: null };

  const safePeriodTracking = periodTracking ?? {
    enabled: false,
    trackFlow: false,
    periodSymptoms: [],
    customPeriodSymptoms: [],
    productTracking: { enabled: false, selectedProducts: [], customProducts: {} },
  };

  const safeStoolTracking = stoolTracking ?? { enabled: false };

  const safeMedicineTracking = medicineTracking ?? { enabled: false, medicines: [] };

  const intensityTracking = symptoms?.intensityTracking ?? {
    enabled: false,
    scaleType: "simple" as PainScaleType,
  };

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES
  // ---------------------------------------------------------------------------

  const canAddMoreCustomSymptoms = (symptoms?.custom?.length ?? 0) < MAX_CUSTOM_SYMPTOMS;
  const canAddMorePeriodSymptoms =
    (safePeriodTracking.customPeriodSymptoms?.length ?? 0) < MAX_CUSTOM_PERIOD_SYMPTOMS;

  const allAvailableSymptoms = [...DEFAULT_SYMPTOMS, ...(symptoms?.custom ?? [])].filter(
    (s) => s !== "Pain"
  );

  const periodSelectableSymptoms = allAvailableSymptoms.filter(
    (s) => !safePeriodTracking.customPeriodSymptoms?.includes(s)
  );

  const availableMedicineCategories = MEDICINE_CATEGORIES.filter((cat) => {
    if (cat.value === "bowel") return safeStoolTracking.enabled;
    if (cat.value === "period") return safePeriodTracking.enabled;
    if (cat.value === "symptom") return true;
    if (cat.value === "other") return true;
    return false;
  });

  // ---------------------------------------------------------------------------
  // VALIDATION (using shared utility)
  // ---------------------------------------------------------------------------
  
  const settingsValidation = validateSettings({
    symptoms,
    periodTracking: safePeriodTracking,
    medicineTracking: safeMedicineTracking,
    stoolTracking: safeStoolTracking,
  });

  const {
    anySectionEnabled,
    symptomsValid,
    productTrackingValid,
    customProductsValid,
    medicineTrackingValid,
    productsMissingCustomItems,
  } = settingsValidation;

  const allOptionalFeaturesEnabled =
    (symptoms?.enabled ?? false) &&
    intensityTracking.enabled &&
    safeStoolTracking.enabled &&
    safePeriodTracking.enabled &&
    safePeriodTracking.trackFlow &&
    (safePeriodTracking.productTracking?.enabled ?? false) &&
    safeMedicineTracking.enabled;

  const allPeriodSymptomsSelected =
    periodSelectableSymptoms.length > 0 &&
    periodSelectableSymptoms.every((s) => safePeriodTracking.periodSymptoms?.includes(s));

  // Check if all default symptoms are selected (for Select All / Deselect All button)
    // Check if all default symptoms are selected (for Select All / Deselect All button)
  const allDefaultSymptomsSelected =
    DEFAULT_SYMPTOMS.length > 0 &&
    DEFAULT_SYMPTOMS.every((s) => symptoms?.selected?.includes(s));

  // Check if all custom general symptoms are selected
  const customGeneralSymptoms = symptoms?.custom ?? [];
  const allCustomSymptomsSelected =
    customGeneralSymptoms.length > 0 &&
    customGeneralSymptoms.every((s) => symptoms?.selected?.includes(s));

  // Check if all custom period symptoms are selected
  const customPeriodSymptomsList = safePeriodTracking.customPeriodSymptoms ?? [];
  const allCustomPeriodSymptomsSelected =
    customPeriodSymptomsList.length > 0 &&
    customPeriodSymptomsList.every((s) => safePeriodTracking.periodSymptoms?.includes(s));

  // ---------------------------------------------------------------------------
  // UNSAVED CHANGES WARNING
  // ---------------------------------------------------------------------------

  // Clear validation errors when the invalid sections become valid
  useEffect(() => {
    if (showValidationErrors && settingsValidation.isValid) {
      setShowValidationErrors(false);
    }
  }, [showValidationErrors, settingsValidation.isValid]);
  
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  const getSpreadsheetIdFromUrl = (url: string): string | null => {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  // ---------------------------------------------------------------------------
  // GOOGLE SHEET OAUTH HANDLERS
  // ---------------------------------------------------------------------------

  const connectSheetLogin = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/spreadsheets",
    onSuccess: async (tokenResponse) => {
      const spreadsheetId = getSpreadsheetIdFromUrl(sheetUrl);
      if (!spreadsheetId) {
        setSheetError("Could not parse spreadsheet ID from URL");
        return;
      }

      const existingSettings = await checkForExistingSettings(spreadsheetId, tokenResponse.access_token);

      if (existingSettings) {
        setPendingSheetUrl(sheetUrl);
        setPendingSheetName(sheetName);
        setPendingAccessToken(tokenResponse.access_token);
        setShowRecoveryPrompt(true);
      } else {
        setGoogleSheet(sheetUrl, sheetName);
        const success = await saveSettingsToSheet(tokenResponse.access_token);
        if (success) {
          alert("Google Sheet connected and settings saved!");
        } else {
          alert("Sheet connected but failed to save settings. Please try saving again.");
        }
        setSheetUrl("");
        setSheetName("");
        setIsEditingSheet(false);
      }
    },
    onError: () => {
      setSheetError("Google Authentication failed. Please try again.");
    },
  });

  const saveLogin = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/spreadsheets",
    onSuccess: async (tokenResponse) => {
      const success = await saveSettingsToSheet(tokenResponse.access_token);
      if (success) {
        alert("Settings saved to your Google Sheet successfully!");
      } else {
        alert("Failed to save settings. Please check console for errors.");
      }
    },
    onError: () => {
      alert("Google Authentication failed. Please try again.");
    },
  });

  const saveLoginThenNavigate = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/spreadsheets",
    onSuccess: async (tokenResponse) => {
      const destination = pendingNavigation;
      setPendingNavigation(null);
      
      // Set setupComplete BEFORE saving so the sheet has accurate data
      // Also set tutorialComplete if skipping tutorial
      completeSetup();
      if (destination === "entry") {
        // User is skipping tutorial, mark it complete
        useSettings.getState().completeTutorial();
      }
      
      // Now save with the correct flags
      const success = await saveSettingsToSheet(tokenResponse.access_token);

      if (success) {
        alert("Settings saved successfully!");
      } else {
        alert("Failed to save settings, but continuing anyway.");
      }

      router.push(destination === "tutorial" ? "/tutorial" : "/entry");
    },
    onError: () => {
      alert("Google Authentication failed. Please try again.");
    },
  });

  // OAuth hook for resetting settings with sheet deletion
  const resetWithSheetDelete = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/spreadsheets",
    onSuccess: async (tokenResponse) => {
      const spreadsheetId = getSpreadsheetIdFromUrl(googleSheet?.url || "");
      
      if (spreadsheetId) {
        const deleted = await deleteSettingsSheet(spreadsheetId, tokenResponse.access_token);
        if (deleted) {
          console.log("Settings sheet deleted from Google Sheet.");
        } else {
          console.warn("Failed to delete settings sheet, but proceeding with local reset.");
        }
      }
      
      // Reset local state
      resetSettings();
      alert("All settings have been reset. You'll need to set up again.");
      router.push("/settings");
    },
    onError: () => {
      alert("Google Authentication failed. Settings were not reset.");
    },
  });

  // ---------------------------------------------------------------------------
  // SHEET HANDLERS
  // ---------------------------------------------------------------------------

  const handleSaveGoogleSheet = () => {
    if (!sheetName.trim()) {
      setSheetError("Please enter a name for your sheet");
      return;
    }
    if (!sheetUrl.trim()) {
      setSheetError("Please enter a Google Sheet URL");
      return;
    }
    if (!GOOGLE_SHEET_URL_PATTERN.test(sheetUrl.trim())) {
      setSheetError("Please enter a valid Google Sheets URL");
      return;
    }
    setSheetError(null);
    connectSheetLogin();
  };

  const handleEditGoogleSheet = () => {
    setSheetUrl(safeGoogleSheet.url || "");
    setSheetName(safeGoogleSheet.name || "");
    setIsEditingSheet(true);
    setSheetError(null);
  };

  const handleCancelEdit = () => {
    setSheetUrl("");
    setSheetName("");
    setIsEditingSheet(false);
    setSheetError(null);
  };

  const handleRemoveGoogleSheet = () => {
    if (window.confirm("Are you sure you want to disconnect? You will switch to Anonymous Mode.")) {
      clearGoogleSheet();
      setSheetUrl("");
      setSheetName("");
      setIsEditingSheet(false);
      setSheetError(null);
    }
  };

  // ---------------------------------------------------------------------------
  // RECOVERY HANDLERS
  // ---------------------------------------------------------------------------

  const handleRestoreSettings = async () => {
    if (!pendingSheetUrl || !pendingAccessToken) return;

    const spreadsheetId = getSpreadsheetIdFromUrl(pendingSheetUrl);
    if (!spreadsheetId) return;

    const success = await loadSettingsFromSheet(spreadsheetId, pendingAccessToken);

    if (success) {
      alert("Settings restored successfully!");
    } else {
      alert("Failed to restore settings. Starting fresh.");
      setGoogleSheet(pendingSheetUrl, pendingSheetName || undefined);
    }

    setShowRecoveryPrompt(false);
    setPendingSheetUrl(null);
    setPendingSheetName(null);
    setPendingAccessToken(null);
    setSheetUrl("");
    setSheetName("");
    setIsEditingSheet(false);
  };

  const handleStartFresh = async () => {
    if (pendingSheetUrl && pendingAccessToken) {
      setGoogleSheet(pendingSheetUrl, pendingSheetName || undefined);
      const success = await saveSettingsToSheet(pendingAccessToken);
      if (success) {
        alert("Sheet connected and settings saved!");
      }
    }

    setShowRecoveryPrompt(false);
    setPendingSheetUrl(null);
    setPendingSheetName(null);
    setPendingAccessToken(null);
    setSheetUrl("");
    setSheetName("");
    setIsEditingSheet(false);
  };

    // ---------------------------------------------------------------------------
  // SAVE SETTINGS HANDLER
  // ---------------------------------------------------------------------------

  const handleSaveSettings = () => {
    // Validate before allowing save
    const validation = validateSettings({
      symptoms,
      stoolTracking: safeStoolTracking,
      periodTracking: safePeriodTracking,
      medicineTracking: safeMedicineTracking,
    });

    if (!validation.isValid) {
      setShowValidationErrors(true);
      return;
    }

    setShowValidationErrors(false);
    saveLogin();
  };

  // ---------------------------------------------------------------------------
  // NAVIGATION HANDLERS
  // ---------------------------------------------------------------------------

    const handleContinueToTutorial = () => {
    // Validate and block navigation if invalid
    if (!settingsValidation.isValid) {
      setShowValidationErrors(true);
      return;
    }

    setShowValidationErrors(false);

    if (isGoogleSheetConnected) {
      setPendingNavigation("tutorial");
      setShowSavePrompt(true);
    } else {
      // Anonymous mode - show confirmation modal
      setPendingNavigation("tutorial");
      setShowAnonymousContinueModal(true);
    }
  };

    const handleSkipTutorial = () => {
    // Validate and block navigation if invalid
    if (!settingsValidation.isValid) {
      setShowValidationErrors(true);
      return;
    }

    setShowValidationErrors(false);

    if (isGoogleSheetConnected) {
      setPendingNavigation("entry");
      setShowSavePrompt(true);
    } else {
      // Anonymous mode - show confirmation modal
      setPendingNavigation("entry");
      setShowAnonymousContinueModal(true);
    }
  };

  const handleSaveAndContinue = () => {
    setShowSavePrompt(false);
    saveLoginThenNavigate();
  };

  const handleContinueWithoutSaving = () => {
    const destination = pendingNavigation;
    setShowSavePrompt(false);
    setPendingNavigation(null);
    completeSetup();
    router.push(destination === "tutorial" ? "/tutorial" : "/entry");
  };

    const handleAnonymousContinue = () => {
    const destination = pendingNavigation;
    setShowAnonymousContinueModal(false);
    setPendingNavigation(null);
    completeSetup();
    if (destination === "entry") {
      useSettings.getState().completeTutorial();
    }
  router.push(destination === "tutorial" ? "/tutorial" : "/entry");
  };

  // ---------------------------------------------------------------------------
  // LOCAL SAVE CONTINUE HANDLER (for anonymous users post-tutorial)
  // ---------------------------------------------------------------------------
  
  const handleLocalContinue = () => {
    if (!settingsValidation.isValid) {
      setShowValidationErrors(true);
      return;
    }
    setShowValidationErrors(false);
    setShowLocalSaveModal(true);
  };

  const handleLocalSaveConfirm = () => {
    setShowLocalSaveModal(false);
    router.push("/dashboard");
  };

  // ---------------------------------------------------------------------------
  // SYMPTOM HANDLERS
  // ---------------------------------------------------------------------------

  const handleAddSymptom = () => {
    if (newSymptom.trim() && canAddMoreCustomSymptoms) {
      addCustomSymptom(newSymptom);
      setNewSymptom("");
    }
  };

  const handleAddPeriodSymptom = () => {
    if (newPeriodSymptom.trim() && canAddMorePeriodSymptoms) {
      addCustomPeriodSymptom(newPeriodSymptom);
      setNewPeriodSymptom("");
    }
  };


  // Toggle all period symptoms on/off
  const handleToggleAllPeriodSymptoms = (selectAll: boolean) => {
    if (selectAll) {
      const allSymptoms = [...new Set([...safePeriodTracking.periodSymptoms, ...periodSelectableSymptoms])];
      setPeriodTracking({ periodSymptoms: allSymptoms });
    } else {
      setPeriodTracking({ periodSymptoms: [...safePeriodTracking.customPeriodSymptoms] });
    }
  };

  // ---------------------------------------------------------------------------
  // MASTER TOGGLE HANDLERS
  // ---------------------------------------------------------------------------

    const handleToggleAllOptionalFeatures = (enabled: boolean) => {
    // Toggle symptoms section and intensity
    useSettings.setState((state) => ({
      symptoms: {
        ...state.symptoms,
        enabled,
        selected: enabled ? state.symptoms.selected : [],
        intensityTracking: {
          ...state.symptoms.intensityTracking,
          enabled, // Quick Setup turns on/off intensity too
        },
      },
      hasUnsavedChanges: true,
    }));
    
    setStoolTracking({ enabled });
    setPeriodTracking({
      enabled,
      trackFlow: enabled, // Quick Setup turns on/off flow too
      productTracking: {
        ...safePeriodTracking.productTracking,
        enabled, // Quick Setup turns on/off product usage too
        selectedProducts: safePeriodTracking.productTracking?.selectedProducts ?? [],
        customProducts: safePeriodTracking.productTracking?.customProducts ?? {},
      },
    });
    setMedicineTracking({ ...safeMedicineTracking, enabled });
  };

  
  // Toggle all default symptoms on/off
  const handleToggleAllDefaultSymptoms = (selectAll: boolean) => {
    const currentCustom = symptoms?.custom ?? [];
    const currentSelected = symptoms?.selected ?? [];
    
    if (selectAll) {
      // Select all defaults + keep any custom that were selected
      const customThatWereSelected = currentSelected.filter(s => currentCustom.includes(s));
      const newSelected = [...new Set([...DEFAULT_SYMPTOMS, ...customThatWereSelected])];
      
      // Use the store's internal method to set all at once
      useSettings.setState((state) => ({
        symptoms: {
          ...state.symptoms,
          selected: newSelected,
        },
        hasUnsavedChanges: true,
      }));
    } else {
      // Deselect all defaults, keep custom symptoms selected
      const customThatWereSelected = currentSelected.filter(s => currentCustom.includes(s));
      
      useSettings.setState((state) => ({
        symptoms: {
          ...state.symptoms,
          selected: customThatWereSelected,
        },
        hasUnsavedChanges: true,
      }));
    }
  };

    // Toggle all custom general symptoms on/off
  const handleToggleAllCustomSymptoms = (selectAll: boolean) => {
    const currentSelected = symptoms?.selected ?? [];
    const customSymptoms = symptoms?.custom ?? [];
    
    if (selectAll) {
      // Add all custom symptoms to selected
      const newSelected = [...new Set([...currentSelected, ...customSymptoms])];
      useSettings.setState((state) => ({
        symptoms: {
          ...state.symptoms,
          selected: newSelected,
        },
        hasUnsavedChanges: true,
      }));
    } else {
      // Remove all custom symptoms from selected (keep defaults)
      const newSelected = currentSelected.filter(s => !customSymptoms.includes(s));
      useSettings.setState((state) => ({
        symptoms: {
          ...state.symptoms,
          selected: newSelected,
        },
        hasUnsavedChanges: true,
      }));
    }
  };

  // Toggle all custom period symptoms on/off
  const handleToggleAllCustomPeriodSymptoms = (selectAll: boolean) => {
    const currentPeriodSymptoms = safePeriodTracking.periodSymptoms ?? [];
    const customPeriodSymptoms = safePeriodTracking.customPeriodSymptoms ?? [];
    
    if (selectAll) {
      // Add all custom period symptoms to periodSymptoms
      const newPeriodSymptoms = [...new Set([...currentPeriodSymptoms, ...customPeriodSymptoms])];
      setPeriodTracking({ periodSymptoms: newPeriodSymptoms });
    } else {
      // Remove all custom period symptoms from periodSymptoms
      const newPeriodSymptoms = currentPeriodSymptoms.filter(s => !customPeriodSymptoms.includes(s));
      setPeriodTracking({ periodSymptoms: newPeriodSymptoms });
    }
  };

  // ---------------------------------------------------------------------------
  // MEDICINE HANDLERS
  // ---------------------------------------------------------------------------

  const addMedicine = (medicine: Medicine) => {
  if (safeMedicineTracking.medicines.length >= MAX_MEDICINES) return;

  // Check if this is an update to an existing medicine (same ID means merge)
  const existingIndex = safeMedicineTracking.medicines.findIndex((m) => m.id === medicine.id);

  if (existingIndex >= 0) {
    // Update existing medicine (merge categories)
    setMedicineTracking({
      ...safeMedicineTracking,
      medicines: safeMedicineTracking.medicines.map((m) =>
        m.id === medicine.id ? medicine : m
      ),
    });
  } else {
    // Add as new medicine
    setMedicineTracking({
      ...safeMedicineTracking,
      medicines: [...safeMedicineTracking.medicines, medicine],
    });
  }
};

  const removeMedicine = (id: string) => {
    setMedicineTracking({
      ...safeMedicineTracking,
      medicines: safeMedicineTracking.medicines.filter((m) => m.id !== id),
    });
  };

  const updateMedicine = (id: string, updates: Partial<Medicine>) => {
    setMedicineTracking({
      ...safeMedicineTracking,
      medicines: safeMedicineTracking.medicines.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    });
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* Modals */}
      {showRecoveryPrompt && (
        <RecoveryPromptModal
          onRestore={handleRestoreSettings}
          onStartFresh={handleStartFresh}
          onCancel={() => {
            setShowRecoveryPrompt(false);
            setPendingSheetUrl(null);
            setPendingSheetName(null);
            setPendingAccessToken(null);
          }}
        />
      )}

      {showSavePrompt && (
        <SavePromptModal
          onSave={handleSaveAndContinue}
          onContinueWithoutSaving={handleContinueWithoutSaving}
          onCancel={() => {
            setShowSavePrompt(false);
            setPendingNavigation(null);
          }}
        />
      )}

            {showAnonymousContinueModal && pendingNavigation && (
        <AnonymousContinueModal
          destination={pendingNavigation}
          onContinue={handleAnonymousContinue}
          onCancel={() => {
            setShowAnonymousContinueModal(false);
            setPendingNavigation(null);
          }}
        />
      )}

      {showLocalSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">💾</span>
              <h2 className="text-xl font-bold text-app-charcoal">Settings Saved Locally</h2>
            </div>
            <div className="space-y-3 mb-6">
              <p className="text-app-gray">Your settings have been saved to this device.</p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>⚠️ Important:</strong> Clearing your browser data will delete your settings and entries.
                </p>
              </div>
              <p className="text-sm text-app-gray">
                For automatic cloud backup, you can connect a Google Sheet in settings anytime.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleLocalSaveConfirm}
                className="flex-1 py-3 px-4 rounded-lg bg-app-green text-white font-semibold hover:bg-app-green-dark transition-colors"
              >
                Got it, Continue
              </button>
              <button
                onClick={() => setShowLocalSaveModal(false)}
                className="py-3 px-4 rounded-lg bg-app-cream text-app-charcoal border border-app-border hover:bg-app-border transition-colors"
              >
                Back to Settings
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-app-charcoal">
            {setupComplete ? "Settings" : "Let's Set Up Your Preferences"}
          </h1>
          <p className="text-app-gray">
            {setupComplete
              ? "Customize your TrackWell experience"
              : "Configure how you want to keep a log of your health"}
          </p>
        </div>

        {/* Welcome Banner */}
        {!setupComplete && (
          <div className="p-4 bg-app-green/10 border border-app-green/20 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-2xl">👋</span>
              <div>
                <p className="font-medium text-app-charcoal">Welcome to TrackWell!</p>
                <p className="text-sm text-app-gray mt-1">
                  Take a moment to customize your tracking preferences below. You can always change
                  these settings later.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Mode Indicator - Larger for returning users, compact for new users */}
        {setupComplete ? (
          <div className={`p-4 rounded-lg border-2 ${
            isGoogleSheetConnected 
              ? "bg-app-green/5 border-app-green/30" 
              : "bg-app-gray/5 border-app-gray/30"
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isGoogleSheetConnected ? "bg-app-green" : "bg-app-gray"
              }`}>
                {isGoogleSheetConnected ? (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>
              <div>
                <p className={`font-semibold text-lg ${
                  isGoogleSheetConnected ? "text-app-green" : "text-app-gray"
                }`}>
                  {isGoogleSheetConnected ? "Signed In & Synced Mode" : "Anonymous Mode"}
                </p>
                <p className="text-sm text-app-gray">
                  {isGoogleSheetConnected
                    ? "Data syncs to your Google Sheet"
                    : "Data stored locally on this device only"}
                </p>
              </div>
            </div>
            {!isGoogleSheetConnected && (
              <p className="text-xs text-app-gray mt-3 pl-13">
                Want to backup your data? Connect a Google Sheet in the section below.
              </p>
            )}
          </div>
        ) : (
          <div className="p-3 bg-app-cream rounded-lg border border-app-border">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isGoogleSheetConnected ? "bg-app-teal" : "bg-app-gray"}`} />
              <span className="text-sm font-medium text-app-charcoal">
                {isGoogleSheetConnected ? "Signed In Mode" : "Anonymous Mode"}
              </span>
              <span className="text-xs text-app-gray">
                {isGoogleSheetConnected
                  ? "— Data syncs to your Google Sheet"
                  : "— Data stored locally on this device only"}
              </span>
            </div>
          </div>
        )}

                {/* Google Sheet Integration */}
        <section className={`card border-2 transition-colors ${
          onboardingMode === "google-sheet" && !setupComplete
            ? "border-app-green bg-app-green/5"
            : "border-app-taupe/50"
        }`}>
          {/* Collapsible header for Anonymous mode during onboarding */}
          {onboardingMode === "anonymous" && !setupComplete && !isGoogleSheetConnected ? (
            <button
              onClick={() => setIsGoogleSheetExpanded(!isGoogleSheetExpanded)}
              className="w-full flex justify-between items-center"
            >
              <div>
                <h2 className="text-lg font-semibold text-app-charcoal text-left">
                  📊 Google Sheet Integration
                </h2>
                <p className="text-sm text-app-gray text-left">
                  Optional: Connect later to backup and sync your data
                </p>
              </div>
              <span className="text-app-gray text-xl ml-4">
                {isGoogleSheetExpanded ? "−" : "+"}
              </span>
            </button>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-app-charcoal mb-1">
                📊 Google Sheet Integration
              </h2>
              <p className="text-sm text-app-gray mb-4">
                {onboardingMode === "google-sheet" && !setupComplete
                  ? "✨ Connect your Google Sheet to get started with Signed In & Synced Mode"
                  : "Link a sheet to sync your data across devices (Signed In Mode)"}
              </p>
            </>
          )}

          {/* Content - conditionally rendered based on collapsed state */}
          {(isGoogleSheetExpanded || setupComplete || onboardingMode !== "anonymous") && (
            <div className={onboardingMode === "anonymous" && !setupComplete && !isGoogleSheetConnected ? "mt-4" : ""}>
              {safeGoogleSheet.url && !isEditingSheet ? (
                // Connected state - show sheet info
                <div>
                  <div className="p-4 bg-app-cream rounded-lg border border-app-border">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-app-charcoal truncate">
                          {safeGoogleSheet.name || "Connected Sheet"}
                        </p>
                        <a
                          href={safeGoogleSheet.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-app-green hover:text-app-green-dark underline underline-offset-2 break-all"
                        >
                          {safeGoogleSheet.url}
                        </a>
                        {safeGoogleSheet.addedAt && (
                          <p className="text-xs text-app-gray mt-1">
                            Added {new Date(safeGoogleSheet.addedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <span className="w-2 h-2 bg-app-teal rounded-full flex-shrink-0" title="Connected" />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 items-center">
                    <button
                      type="button"
                      onClick={handleEditGoogleSheet}
                      className="px-4 py-2 rounded-lg bg-app-cream text-app-charcoal border border-app-border hover:bg-app-border transition-colors font-medium text-sm"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveGoogleSheet}
                      className="px-4 py-2 rounded-lg bg-app-red/10 text-app-red border border-app-red/20 hover:bg-app-red/20 transition-colors font-medium text-sm"
                    >
                      Disconnect
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveSettings}
                      disabled={isSyncing || !hasUnsavedChanges}
                      className="px-4 py-2 rounded-lg bg-app-teal text-white font-medium hover:opacity-90 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSyncing ? "Saving..." : !hasUnsavedChanges ? "Saved ✓" : "Save Settings"}
                    </button>
                  </div>
                </div>
              ) : (
                // Not connected or editing - show form
                <div className="space-y-4">
                  <div>
                    <label htmlFor="sheetUrl" className="block text-sm font-medium text-app-charcoal mb-1">
                      Google Sheet URL <span className="text-app-red">*</span>
                    </label>
                    <input
                      id="sheetUrl"
                      type="url"
                      value={sheetUrl}
                      onChange={(e) => {
                        setSheetUrl(e.target.value);
                        setSheetError(null);
                      }}
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      className={`w-full px-4 py-2 rounded-lg border bg-app-white focus:outline-none focus:ring-2 focus:ring-app-green ${
                        sheetError ? "border-app-red" : "border-app-border"
                      }`}
                    />
                    {sheetError && <p className="text-sm text-app-red mt-1">{sheetError}</p>}
                  </div>
                  <div>
                    <label htmlFor="sheetName" className="block text-sm font-medium text-app-charcoal mb-1">
                      Sheet Name <span className="text-app-red">*</span>
                    </label>
                    <input
                      id="sheetName"
                      type="text"
                      value={sheetName}
                      onChange={(e) => setSheetName(e.target.value)}
                      placeholder="e.g., My Health Tracker"
                      className="w-full px-4 py-2 rounded-lg border border-app-border bg-app-white focus:outline-none focus:ring-2 focus:ring-app-green"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={handleSaveGoogleSheet} className="btn-primary">
                      {isEditingSheet ? "Update & Save" : "Connect & Sign In"}
                    </button>
                    {isEditingSheet && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-4 py-2 rounded-lg bg-app-cream text-app-charcoal border border-app-border hover:bg-app-border transition-colors font-medium"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                  <div className="p-3 bg-app-cream rounded-lg border border-app-border">
                    <p className="text-xs text-app-gray">
                      💡 <strong>Tip:</strong> You&apos;ll be asked to sign in with Google to authorize
                      TrackWell to read/write to your sheet.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Time Format */}
        <section className="card border-2 border-app-taupe/50">
          <h2 className="text-lg font-semibold text-app-charcoal mb-4">🕐 Time Format</h2>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setTimeFormat("12h")}
              className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                timeFormat === "12h"
                  ? "bg-app-green text-white"
                  : "bg-app-cream text-app-charcoal border border-app-border hover:border-app-green hover:bg-app-green/10"
              }`}
            >
              12-hour (AM/PM)
            </button>
            <button
              type="button"
              onClick={() => setTimeFormat("24h")}
              className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                timeFormat === "24h"
                  ? "bg-app-green text-white"
                  : "bg-app-cream text-app-charcoal border border-app-border hover:border-app-green hover:bg-app-green/10"
              }`}
            >
              24-hour
            </button>
          </div>
        </section>

        {/* Master Toggle */}
        <section className="card border-2 border-app-green/30">
          <h2 className="text-lg font-semibold text-app-charcoal mb-4">⚡ Quick Setup</h2>
          <ToggleRow
            label="Enable All Optional Features Below"
            description="Turns on all sections below: General Symptoms, Bowel Movement, Cycle Log, and Medicine Log"
            checked={allOptionalFeaturesEnabled}
            onChange={handleToggleAllOptionalFeatures}
            activeColor="bg-app-green"
          />
        </section>

        {/* General Symptoms */}
        <section className={`card transition-colors ${
          showValidationErrors && (symptoms?.enabled ?? false) && (symptoms?.selected?.length ?? 0) === 0
            ? "border-2 border-app-teal bg-app-teal/5"
            : "border-2 border-app-taupe/50"
        }`}>
          <h2 className="text-lg font-semibold text-app-charcoal mb-4">🏷️ General Symptoms</h2>
          <div className="space-y-4">
              <ToggleRow
              label="Enable Symptom Logging"
              description="Log symptoms you experience with each entry"
              checked={symptoms?.enabled ?? false}
              onChange={(enabled) => {
                useSettings.setState((state) => ({
                  symptoms: {
                    ...state.symptoms,
                    enabled,
                    // Clear selections and disable intensity when disabling
                    selected: enabled ? state.symptoms.selected : [],
                    intensityTracking: enabled 
                      ? state.symptoms.intensityTracking 
                      : { ...state.symptoms.intensityTracking, enabled: false },
                  },
                  hasUnsavedChanges: true,
                }));
              }}
              activeColor="bg-app-teal"
            />

            {(symptoms?.enabled ?? false) && (              
              <>
                {/* Symptom Selection */}
                <div className="pt-4 border-t border-app-border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-app-charcoal">Symptoms to track</p>
                    {DEFAULT_SYMPTOMS.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleToggleAllDefaultSymptoms(!allDefaultSymptomsSelected)}
                        className="text-xs text-app-teal hover:text-app-teal/70 font-medium"
                      >
                        {allDefaultSymptomsSelected ? "Deselect All" : "Select All"}
                      </button>
                    )}
                  </div>
                  <p className={`text-sm mb-3 ${
                    showValidationErrors && (symptoms?.selected?.length ?? 0) === 0
                      ? "text-app-red font-medium"
                      : "text-app-gray"
                  }`}>
                    Select or add at least one symptom to log with your entries *
                    {showValidationErrors && (symptoms?.selected?.length ?? 0) === 0}
                  </p>

                  {/* Default symptoms */}
                  <div className="mb-4">
                    <p className="text-sm text-app-gray mb-2">Default symptoms:</p>
                    <div className="flex flex-wrap gap-2">
                      {DEFAULT_SYMPTOMS.map((symptom) => (
                        <SymptomChip
                          key={symptom}
                          label={symptom}
                          selected={symptoms?.selected?.includes(symptom) ?? false}
                          onToggle={() => toggleSymptom(symptom)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Custom symptoms */}
                  {(symptoms?.custom?.length ?? 0) > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-app-gray">
                          Your custom symptoms ({symptoms.custom.length}/{MAX_CUSTOM_SYMPTOMS}):
                        </p>
                        <button
                          type="button"
                          onClick={() => handleToggleAllCustomSymptoms(!allCustomSymptomsSelected)}
                          className="text-xs text-app-teal hover:text-app-teal/70 font-medium"
                        >
                          {allCustomSymptomsSelected ? "Deselect All" : "Select All"}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {symptoms.custom.map((symptom) => (
                          <SymptomChip
                            key={symptom}
                            label={symptom}
                            selected={symptoms.selected.includes(symptom)}
                            onToggle={() => toggleSymptom(symptom)}
                            onRemove={() => removeCustomSymptom(symptom)}
                            removable
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add custom symptom */}
                  {canAddMoreCustomSymptoms ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSymptom}
                        onChange={(e) => setNewSymptom(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddSymptom()}
                        placeholder="Add custom symptom..."
                        className="flex-1 px-4 py-2 rounded-lg border border-app-border bg-app-white focus:outline-none focus:ring-2 focus:ring-app-teal"
                      />
                      <button
                        type="button"
                        onClick={handleAddSymptom}
                        className="px-6 py-2 rounded-lg bg-app-teal text-app-cream font-medium hover:opacity-90 transition-colors"
                      >
                        + Add
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-app-gray italic">
                      Maximum of {MAX_CUSTOM_SYMPTOMS} custom symptoms reached
                    </p>
                  )}
                </div>

                {/* Symptom Intensity */}
                <div className="pt-4 border-t border-app-border">
                  <ToggleRow
                    label="Symptom Intensity"
                    description="Choose a scale to record how severe each symptom feels"
                    checked={intensityTracking.enabled}
                    onChange={(enabled) => setIntensityTracking({ enabled })}
                    activeColor="bg-app-teal"
                  />
                  {intensityTracking.enabled && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-app-charcoal mb-3">Choose your preferred intensity scale:</p>
                      <div className="space-y-3">
                        <PainScaleOption
                          type="simple"
                          selected={intensityTracking.scaleType === "simple"}
                          onSelect={() => setIntensityTracking({ scaleType: "simple" })}
                          activeColor="app-teal"
                        />
                        <PainScaleOption
                          type="mankoski"
                          selected={intensityTracking.scaleType === "mankoski"}
                          onSelect={() => setIntensityTracking({ scaleType: "mankoski" })}
                          activeColor="app-teal"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </section>

        {/* Bowel Movement */}
        <section className="card border-2 border-app-taupe/50">
          <h2 className="text-lg font-semibold text-app-charcoal mb-4">🧻 Bowel Movement</h2>
          <ToggleRow
            label="Enable Bowel Movement Logging"
            description="Log bowel movements using the Bristol Stool Scale"
            checked={safeStoolTracking.enabled}
            onChange={(enabled) => setStoolTracking({ enabled })}
            activeColor="bg-app-green-dark"
          />
        </section>

        {/* Period Tracking */}
        <section className="card border-2 border-app-taupe/50">
          <h2 className="text-lg font-semibold text-app-charcoal mb-4">🌸 Cycle Log</h2>
          <div className="space-y-4">
              <ToggleRow
              label="Enable Period & Cycle Logging"
              description="Log your menstrual period or cycle"
              checked={safePeriodTracking.enabled}
              onChange={(enabled) => {
                if (enabled) {
                  setPeriodTracking({ enabled });
                } else {
                  // Disable all sub-sections when main toggle is turned off
                  setPeriodTracking({
                    enabled: false,
                    trackFlow: false,
                    productTracking: {
                      ...safePeriodTracking.productTracking,
                      enabled: false,
                      selectedProducts: safePeriodTracking.productTracking?.selectedProducts ?? [],
                      customProducts: safePeriodTracking.productTracking?.customProducts ?? {},
                    },
                  });
                }
              }}
              activeColor="bg-app-red"
            />

            {safePeriodTracking.enabled && (
              <>
                {/* Period Symptoms */}
                <div className="pt-4 border-t border-app-border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-app-charcoal">Period and cycle-related symptoms</p>
                    {periodSelectableSymptoms.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleToggleAllPeriodSymptoms(!allPeriodSymptomsSelected)}
                        className="text-xs text-app-red hover:text-app-red/70 font-medium"
                      >
                        {allPeriodSymptomsSelected ? "Deselect All" : "Select All"}
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-app-gray mb-3">
                    Select or add symptoms typically related to your period or cycle
                  </p>

                  {periodSelectableSymptoms.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {periodSelectableSymptoms.map((symptom) => (
                        <button
                          key={`period-${symptom}`}
                          type="button"
                          onClick={() => togglePeriodSymptom(symptom)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            safePeriodTracking.periodSymptoms?.includes(symptom)
                              ? "bg-app-red text-white hover:opacity-70"
                              : "bg-app-red/15 text-app-gray/50 hover:bg-app-red hover:opacity-50 hover:text-white"
                          }`}
                        >
                          {symptom}
                        </button>
                      ))}
                    </div>
                  )}

                                      {(safePeriodTracking.customPeriodSymptoms?.length ?? 0) > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-app-gray">
                          Your custom period or cycle symptoms ({safePeriodTracking.customPeriodSymptoms.length}/{MAX_CUSTOM_PERIOD_SYMPTOMS}):
                        </p>
                        <button
                          type="button"
                          onClick={() => handleToggleAllCustomPeriodSymptoms(!allCustomPeriodSymptomsSelected)}
                          className="text-xs text-app-red hover:text-app-red/70 font-medium"
                        >
                          {allCustomPeriodSymptomsSelected ? "Deselect All" : "Select All"}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {safePeriodTracking.customPeriodSymptoms.map((symptom) => {
                          const isSelected = safePeriodTracking.periodSymptoms?.includes(symptom) ?? false;
                          
                          return (
                            <button
                              key={`custom-period-${symptom}`}
                              type="button"
                              onClick={() => togglePeriodSymptom(symptom)}
                              className={`group inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                isSelected
                                  ? "bg-app-red text-white hover:bg-app-red/80"
                                  : "bg-app-red/15 text-app-gray/50 hover:bg-app-red/30"
                              }`}
                            >
                              {symptom}
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeCustomPeriodSymptom(symptom);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.stopPropagation();
                                    removeCustomPeriodSymptom(symptom);
                                  }
                                }}
                                className={`ml-1 hover:scale-110 transition-transform ${
                                  isSelected 
                                    ? "text-white/70 hover:text-white" 
                                    : "text-app-gray/40 hover:text-app-gray"
                                }`}
                                title={`Remove "${symptom}"`}
                              >
                                ×
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {canAddMorePeriodSymptoms ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newPeriodSymptom}
                        onChange={(e) => setNewPeriodSymptom(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddPeriodSymptom()}
                        placeholder="Add custom period or cycle symptom..."
                        className="flex-1 px-4 py-2 rounded-lg border border-app-border bg-app-white focus:outline-none focus:ring-2 focus:ring-app-red"
                      />
                      <button
                        onClick={handleAddPeriodSymptom}
                        className="px-6 py-2 rounded-lg bg-app-red text-white font-medium hover:opacity-90"
                      >
                        + Add
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-app-gray italic">Maximum reached</p>
                  )}
                </div>

                {/* Track Flow */}
                <div className="pt-4 border-t border-app-border">
                  <ToggleRow
                    label="Flow Log"
                    description="Log flow during period"
                    checked={safePeriodTracking.trackFlow ?? false}
                    onChange={(trackFlow) => setPeriodTracking({ trackFlow })}
                    activeColor="bg-app-red"
                  />
                </div>

                {/* Product Usage */}
                <div className={`pt-4 border-t border-app-border transition-colors ${
                  showValidationErrors && !productTrackingValid
                    ? "bg-app-red/10 border-2 border-app-red rounded-lg p-4 -mx-4 mt-4"
                    : ""
                }`}>
                  <ToggleRow
                    label="Product Usage"
                    description="Log which period products you use"
                    checked={safePeriodTracking.productTracking?.enabled ?? false}
                    onChange={(enabled) =>
                      setPeriodTracking({
                        productTracking: {
                          ...safePeriodTracking.productTracking,
                          enabled,
                          selectedProducts: safePeriodTracking.productTracking?.selectedProducts ?? [],
                          customProducts: safePeriodTracking.productTracking?.customProducts ?? {},
                        },
                      })
                    }
                    activeColor="bg-app-red"
                  />

                  {safePeriodTracking.productTracking?.enabled && (
                    <div className="mt-4 space-y-6">
                      <div>
                        <p className={`text-sm mb-3 ${
                          showValidationErrors && !productTrackingValid
                            ? "text-app-red font-medium"
                            : "text-app-gray"
                        }`}>
                          Select at least one product you use *
                          {showValidationErrors && !productTrackingValid}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {PRODUCT_OPTIONS.map((product) => {
                            const isSelected =
                              safePeriodTracking.productTracking?.selectedProducts?.includes(product.type) ?? false;
                            return (
                              <button
                                key={product.type}
                                type="button"
                                onClick={() => {
                                  const current = safePeriodTracking.productTracking?.selectedProducts ?? [];
                                  const productType = product.type as string;
                                  const updated = isSelected
                                    ? current.filter((p) => p !== productType)
                                    : [...current, productType];
                                  setPeriodTracking({
                                    productTracking: {
                                      ...safePeriodTracking.productTracking,
                                      enabled: true,
                                      selectedProducts: updated,
                                      customProducts: safePeriodTracking.productTracking?.customProducts ?? {},
                                    },
                                  });
                                }}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                  isSelected
                                    ? "bg-app-red text-white hover:opacity-70"
                                    : "bg-app-red/15 text-app-gray/50 hover:bg-app-red hover:opacity-50 hover:text-white"
                                }`}
                              >
                                {product.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {PRODUCT_OPTIONS.filter(
                        (p) =>
                          p.allowCustomProducts &&
                          safePeriodTracking.productTracking?.selectedProducts?.includes(p.type)
                      ).map((product) => (
                        <CustomProductSection
                          key={product.type}
                          product={product}
                          customProducts={safePeriodTracking.productTracking?.customProducts?.[product.type] ?? []}
                          hasError={showValidationErrors && productsMissingCustomItems.includes(product.label)}
                          onUpdate={(updated) => {
                            setPeriodTracking({
                              productTracking: {
                                ...safePeriodTracking.productTracking,
                                enabled: true,
                                selectedProducts: safePeriodTracking.productTracking?.selectedProducts ?? [],
                                customProducts: {
                                  ...safePeriodTracking.productTracking?.customProducts,
                                  [product.type]: updated,
                                },
                              },
                            });
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </section>

        {/* Medicine Tracking */}
        <section className="card border-2 border-app-taupe/50">
          <h2 className="text-lg font-semibold text-app-charcoal mb-4">💊 Medicine Log</h2>
          <div className="space-y-4">
            <ToggleRow
              label="Enable Medicine Logging"
              description="Log medications related to your health"
              checked={safeMedicineTracking.enabled}
              onChange={(enabled) => setMedicineTracking({ ...safeMedicineTracking, enabled })}
              activeColor="bg-app-green/60"
            />

            {safeMedicineTracking.enabled && (
              <div className={`transition-colors rounded-lg ${
                showValidationErrors && !medicineTrackingValid 
                  ? "bg-app-green/10 border-2 border-app-green p-4 -mx-4" 
                  : ""
              }`}>

                {safeMedicineTracking.medicines.length > 0 && (
                  <div className="pt-4 border-t border-app-border">
                    <p className="text-sm font-medium text-app-charcoal mb-3">
                      Your Medicines ({safeMedicineTracking.medicines.length}/{MAX_MEDICINES}):
                    </p>
                    <div className="space-y-2">
                      {safeMedicineTracking.medicines.map((medicine) => (
                        <MedicineItem
                          key={medicine.id}
                          medicine={medicine}
                          onRemove={() => removeMedicine(medicine.id)}
                          onUpdate={(updated) => updateMedicine(medicine.id, updated)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-app-border">
                  <p className="text-sm font-medium text-app-charcoal mb-3">Add New Medicine:</p>
                  <AddMedicineForm
                    onAdd={addMedicine}
                    availableCategories={availableMedicineCategories}
                    currentMedicineCount={safeMedicineTracking.medicines.length}
                    maxMedicines={MAX_MEDICINES}
                    existingMedicines={safeMedicineTracking.medicines}
                    showValidationError={showValidationErrors && !medicineTrackingValid}
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Continue Button - Anonymous users who completed setup AND tutorial */}
        {!isGoogleSheetConnected && setupComplete && tutorialComplete && (
          <section className="card border-2 border-app-green bg-app-green/5">
            <h2 className="text-lg font-semibold text-app-charcoal mb-2">💾 Save & Continue</h2>
            <p className="text-sm text-app-gray mb-4">
              Your settings are saved automatically to this device.
            </p>
            
            {showValidationErrors && !settingsValidation.isValid && (
              <div className="p-3 mb-4 bg-app-red/10 rounded-lg border border-app-red/30">
                <p className="text-sm text-app-red font-medium">
                  ⚠️ {settingsValidation.validationMessage}
                </p>
              </div>
            )}
            
            <button
              type="button"
              onClick={handleLocalContinue}
              disabled={!hasUnsavedChanges}
              className="w-full py-3 px-6 rounded-lg bg-app-green text-white font-semibold hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {!hasUnsavedChanges ? "No Changes to Save" : "Continue"}
            </button>
          </section>
        )}

        {/* Save Settings - Only show for users who have completed setup */}
        {isGoogleSheetConnected && setupComplete && (
          <section className="card border-2 border-app-teal bg-app-teal/5">
            <h2 className="text-lg font-semibold text-app-charcoal mb-2">💾 Save Settings</h2>
            <p className="text-sm text-app-gray mb-4">
              Save your current settings to your connected Google Sheet.
            </p>
            
            {/* Validation warning */}
            {showValidationErrors && !settingsValidation.isValid && (
              <div className="p-3 mb-4 bg-app-red/10 rounded-lg border border-app-red/30">
                <p className="text-sm text-app-red font-medium">
                  ⚠️ {settingsValidation.validationMessage}
                </p>
              </div>
            )}
            
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={isSyncing || !hasUnsavedChanges}
              className="w-full py-3 px-6 rounded-lg bg-app-teal text-white font-semibold hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSyncing ? "Saving..." : !hasUnsavedChanges ? "No Changes to Save" : "Save Settings to Google Sheet"}
            </button>
          </section>
        )}

        {/* Reset - Advanced Options */}
        {setupComplete && (
          <section className="pt-6 border-t border-app-border">
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer text-sm text-app-gray hover:text-app-charcoal">
                <span>Advanced Options</span>
                <svg
                  className="w-4 h-4 transition-transform group-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="mt-4 p-4 bg-app-cream rounded-lg space-y-4">
                <div>
                  <p className="text-sm font-medium text-app-charcoal mb-1">Reset All Settings</p>
                  <p className="text-sm text-app-gray mb-3">
                    ⚠️ This will reset all settings to their default values. This action cannot be undone.
                  </p>
                  
                  {isGoogleSheetConnected ? (
                    <div className="space-y-3">
                      {/* Option 2: Local Only */}
                      <div className="p-3 border border-app-border rounded-lg">
                        <p className="text-sm font-medium text-app-charcoal">Reset This Device Only</p>
                        <p className="text-xs text-app-gray mt-1 mb-2">
                          Clears settings on this device but keeps your Google Sheet backup intact. 
                          You can reconnect the same sheet later to restore your settings.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(
                              "This will reset settings on this device. Your Google Sheet backup will remain and can be used to recover later. Continue?"
                            )) {
                              resetSettings();
                              router.push("/settings");
                            }
                          }}
                          className="px-4 py-2 rounded-lg text-sm text-app-gray border border-app-border hover:bg-app-border"
                        >
                          Reset This Device
                        </button>
                      </div>
                      {/* Option 1: Full Reset */}
                      <div className="p-3 border border-app-border rounded-lg">
                        <p className="text-sm font-medium text-app-charcoal">Full Reset</p>
                        <p className="text-xs text-app-gray mt-1 mb-2">
                          Clears settings on this device AND removes saved settings from your Google Sheet. 
                          You won't be able to recover your current configuration.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(
                              "This will permanently delete your settings everywhere, including your Google Sheet. This cannot be undone. Continue?"
                            )) {
                              resetWithSheetDelete();
                            }
                          }}
                          className="px-4 py-2 rounded-lg text-sm text-app-red border border-app-red/30 hover:bg-app-red/10"
                        >
                          Reset Everything
                        </button>
                      </div>

                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("Are you sure you want to reset all settings? This cannot be undone.")) {
                          resetSettings();
                          router.push("/settings");
                        }
                      }}
                      className="px-4 py-2 rounded-lg text-sm text-app-red border border-app-red/30 hover:bg-app-red/10"
                    >
                      Reset All Settings
                    </button>
                  )}
                </div>
              </div>
            </details>
          </section>
        )}

                {/* Continue / Tutorial */}
        {!setupComplete && (
          <section className="card border-2 border-app-green bg-app-green/5">
            <h2 className="text-lg font-semibold text-app-charcoal mb-2">▶️ Ready to Start?</h2>
            
            {/* Context-aware description */}
            {isGoogleSheetConnected ? (
              <p className="text-sm text-app-gray mb-4">
                Your settings will be saved to your Google Sheet when you continue.
              </p>
            ) : (
              <p className="text-sm text-app-gray mb-4">
                Your preferences are saved automatically to this device.
              </p>
            )}
            
            {/* Validation warning */}
            {showValidationErrors && !settingsValidation.isValid && (
              <div className="p-3 mb-4 bg-app-red/10 rounded-lg border border-app-red/30">
                <p className="text-sm text-app-red font-medium">
                  ⚠️ {settingsValidation.validationMessage}
                </p>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleContinueToTutorial}
                className="flex-1 py-3 px-6 rounded-lg bg-app-green text-white font-semibold hover:bg-app-green-dark flex items-center justify-center gap-2"
              >
                {isGoogleSheetConnected ? "Save & Continue to Tutorial" : "Continue to Tutorial"}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleSkipTutorial}
                className="py-3 px-6 rounded-lg bg-app-cream text-app-charcoal font-medium border border-app-border hover:bg-app-border"
              >
                {isGoogleSheetConnected ? "Save & Skip Tutorial" : "Skip Tutorial"}
              </button>
            </div>
          </section>
        )}
      </div>
    </>
  );
}