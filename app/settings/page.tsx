"use client";

import { useGoogleLogin } from '@react-oauth/google'; 
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/stores/useSettings";

import { DEFAULT_SYMPTOMS, 
  PAIN_SCALE_INFO, 
  GOOGLE_SHEET_URL_PATTERN, 
  PRODUCT_OPTIONS,
  MEDICINE_CATEGORIES } 
  from "@/lib/constants";
import type { 
  PainScaleType, 
  ProductOption, 
  CustomProduct,
  Medicine,
  MedicineCategory } from "@/types";

const MAX_CUSTOM_SYMPTOMS = 30;
const MAX_CUSTOM_PERIOD_SYMPTOMS = 30;

export default function SettingsPage() {
  const [isClient, setIsClient] = useState(false);
    const {
    isGoogleSheetConnected,
    signIn,
    signOut,
    // connectGoogleSheet,
    disconnectGoogleSheet,
  } = useSettings();
  // Enforcing the rule: Sign-in is only possible if a sheet is connected.
  const canSignIn = isGoogleSheetConnected;

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <SettingsPageSkeleton />;
  }

  return <SettingsPageContent />;
}

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

function SettingsPageContent() {
  const {
    setupComplete,
    timeFormat,
    symptoms,
    periodTracking,
    stoolTracking,
    googleSheet,
    medicineTracking, 
    isSyncing,
    isAuthenticated,
    isGoogleSheetConnected,
    userEmail,
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
    clearGoogleSheet,
    completeSetup,
    resetSettings,
    setMedicineTracking,
    signIn,
    signOut,
  } = useSettings();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  const [newSymptom, setNewSymptom] = useState("");
  const [newPeriodSymptom, setNewPeriodSymptom] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [isEditingSheet, setIsEditingSheet] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  const hasUnsavedChanges = useSettings((state) => state.hasUnsavedChanges);
  const router = useRouter();

  const canSignIn = isGoogleSheetConnected;

  useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [hasUnsavedChanges]);

useEffect(() => {
  console.log("hasUnsavedChanges:", hasUnsavedChanges);
}, [hasUnsavedChanges]);

  // handler function for the "Save Settings" button
  const handleSaveSettings = async () => {
  // MOCK token.
    const mockAccessToken = "mock_google_auth_token";
    await saveSettingsToSheet(mockAccessToken);
  };

  const intensityTracking = symptoms?.intensityTracking ?? {
    enabled: false,
    scaleType: "simple" as PainScaleType,
  };

  const safeGoogleSheet = googleSheet ?? {
    url: null,
    name: null,
    addedAt: null,
  };

  const safePeriodTracking = periodTracking ?? {
    enabled: false,
    personalQuestions: false,
    periodSymptoms: [],
    customPeriodSymptoms: [],
  };

  const safeStoolTracking = stoolTracking ?? {
    enabled: false,
  };

  // Check if can add more custom symptoms
  const canAddMoreCustomSymptoms = (symptoms?.custom?.length ?? 0) < MAX_CUSTOM_SYMPTOMS;
  const canAddMorePeriodSymptoms = (safePeriodTracking.customPeriodSymptoms?.length ?? 0) < MAX_CUSTOM_PERIOD_SYMPTOMS;

  const allAvailableSymptoms = [
    ...DEFAULT_SYMPTOMS,
    ...(symptoms?.custom ?? []),
  ].filter((s) => s !== "Pain");

  const periodSelectableSymptoms = allAvailableSymptoms.filter(
    (s) => !safePeriodTracking.customPeriodSymptoms?.includes(s)
  );

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

  const handleSaveGoogleSheet = () => {
    if (!sheetUrl.trim()) {
      setSheetError("Please enter a Google Sheet URL");
      return;
    }
    if (!GOOGLE_SHEET_URL_PATTERN.test(sheetUrl.trim())) {
      setSheetError("Please enter a valid Google Sheets URL");
      return;
    }
    setGoogleSheet(sheetUrl, sheetName);
    setSheetUrl("");
    setSheetName("");
    setIsEditingSheet(false);
    setSheetError(null);
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
    clearGoogleSheet();
    setSheetUrl("");
    setSheetName("");
    setIsEditingSheet(false);
    setSheetError(null);
  };

  // Safe access to medicine tracking
  const safeMedicineTracking = medicineTracking ?? {
    enabled: false,
    medicines: [],
  };

  // Filter available medicine categories based on enabled features
  const availableMedicineCategories = MEDICINE_CATEGORIES.filter((cat) => {
    if (cat.value === "bowel") return safeStoolTracking.enabled;
    if (cat.value === "period") return safePeriodTracking.enabled;
    if (cat.value === "symptom") return true; // Always available
    return false;
  });

  // Medicine functions
  const addMedicine = (medicine: Medicine) => {
    // Check for duplicate (same name and dosage)
    const existingMedicine = safeMedicineTracking.medicines.find(
      (m) => 
        m.name.toLowerCase() === medicine.name.toLowerCase() && 
        (m.dosage || "").toLowerCase() === (medicine.dosage || "").toLowerCase()
    );

    if (existingMedicine) {
      // Merge categories instead of adding duplicate
      const mergedCategories = Array.from(
        new Set([...existingMedicine.categories, ...medicine.categories])
      ) as MedicineCategory[];
      
      setMedicineTracking({
        ...safeMedicineTracking,
        medicines: safeMedicineTracking.medicines.map((m) =>
          m.id === existingMedicine.id 
            ? { ...m, categories: mergedCategories, timeSensitive: m.timeSensitive || medicine.timeSensitive }
            : m
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

  // Navigate to tutorial page
  const handleContinueToTutorial = () => {
    completeSetup();
    router.push("/tutorial");
  };

  // Skip tutorial and go directly to entry
  const handleSkipTutorial = () => {
    completeSetup();
    router.push("/entry");
  };

  const saveLogin = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/spreadsheets', // The permission we need
    onSuccess: async (tokenResponse) => {
      // This function is called AFTER the user successfully logs in via the Google popup
      console.log("Token response:", tokenResponse);
      console.log("Granted scopes:", tokenResponse.scope);
      console.log("Google Auth Success! Saving settings...");
      const success = await saveSettingsToSheet(tokenResponse.access_token);
      if (success) {
        alert('Settings saved to your Google Sheet successfully!');
      } else {
        alert('Failed to save settings. Please check console for errors.');
      }
    },
    onError: () => {
      alert('Google Authentication failed. Please try again.');
    },
  });

  return (
    <>
      {isAuthModalOpen && (
        <AuthModal
          email={emailInput}
          setEmail={setEmailInput}
          onClose={() => setIsAuthModalOpen(false)}
          onSubmit={() => {
            signIn(emailInput);
            setIsAuthModalOpen(false);
            setEmailInput("");
          }}
        />
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
              : "Configure how you want to track your health"}
          </p>
        </div>

        {/* First-time user welcome banner */}
        {!setupComplete && (
          <div className="p-4 bg-app-green/10 border border-app-green/20 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-2xl">👋</span>
              <div>
                <p className="font-medium text-app-charcoal">Welcome to TrackWell!</p>
                <p className="text-sm text-app-gray mt-1">
                  Take a moment to customize your tracking preferences below. You can always
                  change these settings later.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Time Format */}
        <section className="card">
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

        {/* Google Sheet Integration */}
        <section className="card">
          <h2 className="text-lg font-semibold text-app-charcoal mb-1">
            📊 Google Sheet Integration
          </h2>
          <p className="text-sm text-app-gray mb-4">Optional — Connect a sheet to sync your data</p>

          {safeGoogleSheet.url && !isEditingSheet ? (
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
                  Remove
                </button>
                <button
                  type="button"
                  onClick={() => saveLogin()}
                  disabled={isSyncing}
                  className="px-4 py-2 rounded-lg bg-app-teal text-white font-medium hover:opacity-90 transition-colors text-sm disabled:bg-app-gray disabled:cursor-wait"
                >
                  {isSyncing ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label htmlFor="sheetName" className="block text-sm font-medium text-app-charcoal mb-1">
                  Sheet Name <span className="text-app-gray font-normal">(optional)</span>
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
              <div>
                <label htmlFor="sheetUrl" className="block text-sm font-medium text-app-charcoal mb-1">
                  Google Sheet URL
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
              <div className="flex gap-2">
                <button type="button" onClick={handleSaveGoogleSheet} className="btn-primary">
                  {isEditingSheet ? "Save Changes" : "Connect Sheet"}
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
                  💡 <strong>Tip:</strong> Make sure your Google Sheet is set to &quot;Anyone with the
                  link can view&quot; for full functionality.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Account Sign In */}
        <section className="card">
        <h2 className="text-lg font-semibold text-app-charcoal mb-4">
          🔐 Account & Sign-In
        </h2>
        <p className="text-sm text-app-gray mb-1">
          Status: {isAuthenticated ? "Signed In" : "Not Signed In"}
        </p>
        <p className="text-sm text-app-gray mb-4">
          Sign in to sync settings across devices (coming soon).
        </p>
        
        <div className="mt-4">
          {isAuthenticated ? (
            <button 
              onClick={signOut} 
              className="px-4 py-2 rounded-lg bg-app-red/10 text-app-red border border-app-red/20 hover:bg-app-red/20 transition-colors font-medium text-sm"
            >
              Sign Out
            </button>
          ) : (
            <div className="relative">
              <button
                onClick={() => setIsAuthModalOpen(true)}
                disabled={!canSignIn}
                className="btn-primary peer disabled:bg-app-gray/50 disabled:cursor-not-allowed"
              >
                Sign In
              </button>
              
              {/* Tooltip for disabled button */}
              {!canSignIn && (
                <div className="absolute -top-14 left-0 w-max max-w-xs bg-app-charcoal text-white text-xs rounded py-2 px-3 opacity-0 peer-hover:opacity-100 transition-opacity pointer-events-none">
                  You must connect a Google Sheet before you can sign in.
                </div>
              )}
            </div>
          )}
        </div>
      </section>

        {/* Symptoms to Track */}
        <section className="card">
          <h2 className="text-lg font-semibold text-app-charcoal mb-4">📋 Symptoms to Track</h2>
          <p className="text-sm text-app-gray mb-4">
            Select the symptoms you want to track with each entry.
          </p>
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
          {(symptoms?.custom?.length ?? 0) > 0 && (
            <div className="mb-4">
              <p className="text-sm text-app-gray mb-2">
                Your custom symptoms ({symptoms.custom.length}/{MAX_CUSTOM_SYMPTOMS}):
              </p>
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
          {canAddMoreCustomSymptoms ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newSymptom}
                onChange={(e) => setNewSymptom(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddSymptom()}
                placeholder="Add custom symptom..."
                className="flex-1 px-4 py-2 rounded-lg border border-app-border bg-app-white focus:outline-none focus:ring-2 focus:ring-app-green"
              />
              <button 
                type="button" 
                onClick={handleAddSymptom} 
                className="px-6 py-2 rounded-lg bg-app-teal text-app-cream font-medium hover:bg-app-green-dark transition-colors duration-200"
              >
                Add
              </button>
            </div>
          ) : (
            <p className="text-xs text-app-gray italic">
              Maximum of {MAX_CUSTOM_SYMPTOMS} custom symptoms reached
            </p>
          )}
        </section>

        {/* Symptom Intensity Tracking */}
        <section className="card">
          <h2 className="text-lg font-semibold text-app-charcoal mb-4">
            📊 Symptom Intensity Tracking
          </h2>
          <div className="mb-4">
            <ToggleRow
              label="Track Symptom Intensity"
              description="Record how severe each symptom feels using a pain scale"
              checked={intensityTracking.enabled}
              onChange={(enabled) => setIntensityTracking({ enabled })}
              activeColor="bg-app-teal"
            />
          </div>
          {intensityTracking.enabled && (
            <div className="mt-6">
              <p className="text-sm font-medium text-app-charcoal mb-3">Choose your pain scale:</p>
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
              <div className="mt-4 p-4 bg-app-cream rounded-lg border border-app-border">
                <h3 className="text-sm font-semibold text-app-charcoal mb-2">
                  💡 Which scale should I choose?
                </h3>
                <div className="space-y-3 text-sm text-app-gray">
                  <div>
                    <span className="font-medium text-app-charcoal">Simple 1-10 Scale: </span>
                    Best for beginners and occasional tracking. Quick and intuitive.
                  </div>
                  <div>
                    <span className="font-medium text-app-charcoal">Mankoski Pain Scale: </span>
                    Designed for chronic pain sufferers with specific functional descriptions.
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Bowel Movement Tracking */}
        <section className="card">
          <h2 className="text-lg font-semibold text-app-charcoal mb-4">🚽 Bowel Movement Tracking</h2>
          <ToggleRow
            label="Track Bowel Movements"
            description="Log bowel movements using the Bristol Stool Scale"
            checked={safeStoolTracking.enabled}
            onChange={(enabled) => setStoolTracking({ enabled })}
            activeColor="bg-app-green-dark"
          />
        </section>

        {/* Period Tracking */}
        <section className="card">
          <h2 className="text-lg font-semibold text-app-charcoal mb-4">🌸 Period Tracking</h2>
          <div className="space-y-4">
            <ToggleRow
              label="Enable Period Tracking"
              description="Track your menstrual cycle"
              checked={safePeriodTracking.enabled}
              onChange={(enabled) => setPeriodTracking({ enabled })}
              activeColor="bg-app-red"
            />
            
            {safePeriodTracking.enabled && (
              <>
                {/* Period Symptoms */}
                <div className="pt-4 border-t border-app-border">
                  <p className="text-sm font-medium text-app-charcoal mb-2">Period-related symptoms</p>
                  <p className="text-sm text-app-gray mb-3">
                    Select symptoms that are typically related to your period.
                  </p>

                  {/* All available symptoms for period selection */}
                  {periodSelectableSymptoms.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {periodSelectableSymptoms.map((symptom) => (
                        <button
                          key={`period-${symptom}`}
                          type="button"
                          onClick={() => togglePeriodSymptom(symptom)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            safePeriodTracking.periodSymptoms?.includes(symptom)
                              ? "bg-app-red text-white opacity-100 hover:bg-app-red hover:opacity-70 hover:text-white hover:text-opacity-50 hover:transition-colors duration-1200"
                              : "bg-app-red/15 text-app-gray/30 hover:bg-app-red hover:opacity-50 hover:text-white hover:text-opacity-50 hover:transition-colors duration-1200"
                          }`}
                        >
                          {symptom}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Custom period symptoms */}
                  {(safePeriodTracking.customPeriodSymptoms?.length ?? 0) > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-app-gray mb-2">
                        Your custom period symptoms ({safePeriodTracking.customPeriodSymptoms.length}/{MAX_CUSTOM_PERIOD_SYMPTOMS}):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {safePeriodTracking.customPeriodSymptoms.map((symptom) => (
                          <div
                            key={`custom-period-${symptom}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-app-red text-white"
                          >
                            {symptom}
                            <button
                              onClick={() => removeCustomPeriodSymptom(symptom)}
                              className="ml-1 hover:text-app-cream"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add custom period symptom */}
                  {canAddMorePeriodSymptoms ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newPeriodSymptom}
                        onChange={(e) => setNewPeriodSymptom(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddPeriodSymptom()}
                        placeholder="Add custom period symptom..."
                        className="flex-1 px-4 py-2 rounded-lg border border-app-border bg-app-white focus:outline-none focus:ring-2 focus:ring-app-red"
                      />
                      <button
                        onClick={handleAddPeriodSymptom}
                        className="px-6 py-2 rounded-lg bg-app-red text-white font-medium hover:opacity-90 transition-opacity"
                      >
                        + Add
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-app-gray italic">
                      Maximum of {MAX_CUSTOM_PERIOD_SYMPTOMS} custom period symptoms reached
                    </p>
                  )}
                </div>

                {/* Track Flow */}
                <div className="pt-4 border-t border-app-border">
                  <ToggleRow
                    label="Track Flow"
                    description="Log flow during menstruation"
                    checked={safePeriodTracking.trackFlow}
                    onChange={(trackFlow) => setPeriodTracking({ trackFlow })}
                    activeColor="bg-app-red opacity-85"
                  />
                </div>

                {/* Product Usage Tracking */}
                <div className="pt-4 border-t border-app-border">
                  <ToggleRow
                    label="Track Product Usage"
                    description="Log which menstrual products you use"
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
                    activeColor="bg-app-red opacity-85"
                  />

                  {safePeriodTracking.productTracking?.enabled && (
                    <div className="mt-4 space-y-6">
                      {/* Product Selection */}
                      <div>
                        <p className="text-sm text-app-gray mb-3">
                          Select products you use:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {PRODUCT_OPTIONS.map((product) => {
                            const isSelected = safePeriodTracking.productTracking?.selectedProducts?.includes(product.type) ?? false;
                            return (
                              <button
                                key={product.type}
                                type="button"
                                onClick={() => {
                                  const current = safePeriodTracking.productTracking?.selectedProducts ?? [];
                                  const updated = isSelected
                                    ? current.filter((p) => p !== product.type)
                                    : [...current, product.type];
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
                                  ? "bg-app-red text-white opacity-85 hover:bg-app-red hover:opacity-70 hover:text-white hover:text-opacity-50 hover:transition-colors duration-1200"
                                  : "bg-app-red/15 text-app-gray/30 hover:bg-app-red hover:opacity-50 hover:text-white hover:text-opacity-50 hover:transition-colors duration-1200"
                                }`}
                              >
                                {product.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Custom Products for Selected Types */}
                      {PRODUCT_OPTIONS.filter(
                        (p) =>
                          p.allowCustomProducts &&
                          safePeriodTracking.productTracking?.selectedProducts?.includes(p.type)
                      ).map((product) => (
                        <CustomProductSection
                          key={product.type}
                          product={product}
                          customProducts={
                            safePeriodTracking.productTracking?.customProducts?.[product.type] ?? []
                          }
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
        <section className="card">
          <h2 className="text-lg font-semibold text-app-charcoal mb-4">💊 Medicine Tracking</h2>
          <div className="space-y-4">
            <ToggleRow
              label="Enable Medicine Tracking"
              description="Track medications related to your health entries"
              checked={safeMedicineTracking.enabled}
              onChange={(enabled) => setMedicineTracking({ ...safeMedicineTracking, enabled })}
              activeColor="bg-app-taupe"
            />

            {safeMedicineTracking.enabled && (
              <>
                {/* Existing Medicines */}
                {safeMedicineTracking.medicines.length > 0 && (
                  <div className="pt-4 border-t border-app-border">
                    <p className="text-sm font-medium text-app-charcoal mb-3">Your Medicines:</p>
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

                {/* Add New Medicine */}
                <div className="pt-4 border-t border-app-border">
                  <p className="text-sm font-medium text-app-charcoal mb-3">Add New Medicine:</p>
                  <AddMedicineForm 
                    onAdd={addMedicine} 
                    availableCategories={availableMedicineCategories}
                  />
                </div>
              </>
            )}
          </div>
        </section>

        {/* Reset - Only show if setup is complete */}
        {setupComplete && (
          <section className="card border-app-green-dark">
            <h2 className="text-lg font-semibold text-app-charcoal mb-4">⚠️ Reset</h2>
            <p className="text-sm text-app-gray mb-4">
              This will reset all settings to their default values.
            </p>
            <button
              type="button"
              onClick={resetSettings}
              className="px-4 py-2 rounded-lg bg-app-green-dark text-white font-medium hover:bg-app-green transition-colors duration-200"
            >
              Reset All Settings
            </button>
          </section>
        )}

        {/* Continue to Tutorial / Complete Setup */}
        {!setupComplete && (
          <section className="card border-2 border-app-green bg-app-green/5">
            <h2 className="text-lg font-semibold text-app-charcoal mb-2">🎉 Ready to Start!</h2>
            <p className="text-sm text-app-gray mb-6">
              Your preferences are saved automatically. Would you like to take a quick tour of how to
              create your first entry?
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleContinueToTutorial}
                className="flex-1 py-3 px-6 rounded-lg bg-app-green text-white font-semibold hover:bg-app-green-dark transition-colors flex items-center justify-center gap-2"
              >
                Continue to Tutorial
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleSkipTutorial}
                className="py-3 px-6 rounded-lg bg-app-cream text-app-charcoal font-medium border border-app-border hover:bg-app-border transition-colors"
              >
                Skip Tutorial
              </button>
            </div>
          </section>
        )}
      </div>
    </>
  );
}

// ============================================
// Helper Components
// ============================================

interface SymptomChipProps {
  label: string;
  selected: boolean;
  onToggle: () => void;
  onRemove?: () => void;
  removable?: boolean;
}

function SymptomChip({ label, selected, onToggle, onRemove, removable }: SymptomChipProps) {
  return (
    <div
      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
        selected
            ? "bg-app-teal text-white opacity-100 hover:bg-app-teal hover:opacity-70 hover:text-white hover:text-opacity-50 hover:transition-colors duration-1200"
            : "bg-app-teal/15 text-app-gray/30 hover:bg-app-teal hover:opacity-50 hover:text-white hover:text-opacity-50 hover:transition-colors duration-1200"
      }`}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onToggle()}
    >
      {label}
      {removable && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:text-app-red"
        >
          ×
        </button>
      )}
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  activeColor?: string;
  simpleText?: string;
}

function ToggleRow({ 
  label, 
  description, 
  checked, 
  onChange,
  activeColor = "bg-app-green" // Default color
}: ToggleRowProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex-1">
        <p className="font-medium text-app-charcoal">{label}</p>
        <p className="text-sm text-app-gray">{description}</p>
      </div>
      <div className="w-12 flex-none">
        <button
          type="button"
          onClick={() => onChange(!checked)}
          className={`relative w-12 h-7 rounded-full transition-colors ${
            checked ? activeColor : "bg-app-border"
          }`}
          role="switch"
          aria-checked={checked}
        >
          <span
            className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
              checked ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

interface PainScaleOptionProps {
  type: PainScaleType;
  selected: boolean;
  onSelect: () => void;
  activeColor?: string; // e.g., "app-green", "app-red", "app-purple"
}

function PainScaleOption({ 
  type, 
  selected, 
  onSelect,
  activeColor = "app-green" // Default color
}: PainScaleOptionProps) {
  const info = PAIN_SCALE_INFO[type];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full p-4 rounded-lg text-left transition-all ${
        selected
          ? `bg-${activeColor}/10 border-2 border-${activeColor}`
          : `bg-app-white border border-app-border hover:border-${activeColor}/50`
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-none ${
            selected ? `border-${activeColor}` : "border-app-gray"
          }`}
        >
          {selected && <div className={`w-2.5 h-2.5 rounded-full bg-${activeColor}`} />}
        </div>
        <div>
          <p className={`font-medium ${selected ? `text-${activeColor}` : "text-app-charcoal"}`}>
            {info.name}
          </p>
          <p className="text-sm text-app-gray mt-0.5">{info.shortDescription}</p>
        </div>
      </div>
    </button>
  );
}

interface CustomProductSectionProps {
  product: ProductOption;
  customProducts: CustomProduct[];
  onUpdate: (products: CustomProduct[]) => void;
}

function CustomProductSection({ product, customProducts, onUpdate }: CustomProductSectionProps) {
  const [newProductName, setNewProductName] = useState("");
  const maxProducts = product.maxCustomProducts ?? 5;
  const canAddMore = customProducts.length < maxProducts;

  const handleAdd = () => {
    if (!newProductName.trim() || !canAddMore) return;
    
    const newProduct: CustomProduct = {
      id: Date.now().toString(),
      name: newProductName.trim(),
    };
    onUpdate([...customProducts, newProduct]);
    setNewProductName("");
  };

  const handleRemove = (id: string) => {
    onUpdate(customProducts.filter((p) => p.id !== id));
  };

  return (
    <div className="p-4 bg-app-cream rounded-lg">
      <p className="text-sm font-medium text-app-charcoal mb-2">
        Your {product.label} products:
      </p>
      <p className="text-xs text-app-gray mb-3">
        Add specific products you use (up to {maxProducts})
      </p>

      {/* Existing Custom Products */}
      {customProducts.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {customProducts.map((cp) => (
            <div
              key={cp.id}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-app-red opacity-85 text-white"
            >
              {cp.name}
              <button
                type="button"
                onClick={() => handleRemove(cp.id)}
                className="ml-1 hover:text-app-cream"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Product */}
      {canAddMore && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newProductName}
            onChange={(e) => setNewProductName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder={`e.g., ${
              product.type === "cup" ? "Saalt Soft, Lena Cup, MeLuna Shorty" : 
              product.type === "disc" ? "Hello Disc, Flex Disposable Disc, Cora Small" : 
              product.type === "other" ? "Thinx Reusable Underwear":
              "Brand name..."
            }`}
            className="flex-1 px-4 py-2 rounded-lg border border-app-border bg-app-white focus:outline-none focus:ring-2 focus:ring-app-red"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="px-6 py-2 rounded-lg bg-app-red opacity-85 text-white font-medium hover:opacity-75 transition-opacity"
          >
            + Add
          </button>
        </div>
      )}

      {!canAddMore && (
        <p className="text-xs text-app-gray italic">
          Maximum of {maxProducts} products reached
        </p>
      )}
    </div>
  );
}

interface MedicineItemProps {
  medicine: Medicine;
  onRemove: () => void;
  onUpdate: (updated: Partial<Medicine>) => void;
}

function MedicineItem({ medicine, onRemove, onUpdate }: MedicineItemProps) {
  const categoryColors: Record<MedicineCategory, string> = {
    bowel: "bg-app-plumb/20 text-app-plumb",
    symptom: "bg-app-teal/20 text-app-teal",
    period: "bg-app-red/20 text-app-red",
  };

  return (
    <div className="p-3 bg-app-cream rounded-lg border border-app-border">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-app-charcoal">{medicine.name}</span>
            {medicine.dosage && (
              <span className="text-sm text-app-gray">({medicine.dosage})</span>
            )}
            {medicine.timeSensitive && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-app-taupe/20 text-app-taupe">
                ⏰ Time-sensitive
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {medicine.categories.map((cat) => (
              <span
                key={cat}
                className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[cat]}`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-app-gray hover:text-app-red transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

interface AddMedicineFormProps {
  onAdd: (medicine: Medicine) => void;
  availableCategories: { value: MedicineCategory; label: string; icon: string }[];
}

function AddMedicineForm({ onAdd, availableCategories }: AddMedicineFormProps) {
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [categories, setCategories] = useState<MedicineCategory[]>([]);
  const [timeSensitive, setTimeSensitive] = useState(false);

  const handleSubmit = () => {
    if (!name.trim() || categories.length === 0) return;

    onAdd({
      id: Date.now().toString(),
      name: name.trim(),
      dosage: dosage.trim() || undefined,
      categories,
      timeSensitive,
    });

    // Reset form
    setName("");
    setDosage("");
    setCategories([]);
    setTimeSensitive(false);
  };

  const toggleCategory = (cat: MedicineCategory) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  return (
    <div className="space-y-4">
      {/* Medicine Name */}
      <div>
        <label className="block text-sm text-app-gray mb-1">Medicine Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Ibuprofen, Metamucil..."
          className="w-full px-4 py-2 rounded-lg border border-app-border bg-app-white focus:outline-none focus:ring-2 focus:ring-app-taupe"
        />
      </div>

      {/* Default Dosage */}
      <div>
        <label className="block text-sm text-app-gray mb-1">Default Dosage (optional)</label>
        <input
          type="text"
          value={dosage}
          onChange={(e) => setDosage(e.target.value)}
          placeholder="e.g., 200mg, 2 pills..."
          className="w-full px-4 py-2 rounded-lg border border-app-border bg-app-white focus:outline-none focus:ring-2 focus:ring-app-taupe"
        />
      </div>

      {/* Categories - Only show enabled ones */}
      <div>
        <label className="block text-sm text-app-gray mb-2">Relevant to: *</label>
        {availableCategories.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {availableCategories.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => toggleCategory(cat.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  categories.includes(cat.value)
                    ? "bg-app-taupe text-white"
                    : "bg-app-cream text-app-charcoal border border-app-border hover:border-app-taupe"
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-app-gray italic">
            Enable Bowel Tracking or Period Tracking to add category-specific medicines, 
            or medicines will be linked to Symptoms only.
          </p>
        )}
      </div>

      {/* Time Sensitive Toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setTimeSensitive(!timeSensitive)}
          className={`relative w-12 h-7 rounded-full transition-colors ${
            timeSensitive ? "bg-app-taupe" : "bg-app-border"
          }`}
        >
          <span
            className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
              timeSensitive ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
        <div>
          <p className="text-sm font-medium text-app-charcoal">Time-sensitive</p>
          <p className="text-xs text-app-gray">Require logging the time taken</p>
        </div>
      </div>

      {/* Add Button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!name.trim() || categories.length === 0}
        className="w-full px-6 py-2 rounded-lg bg-app-taupe text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        + Add Medicine
      </button>
    </div>
  );
}

// 5. AuthModal component
interface AuthModalProps {
  email: string;
  setEmail: (email: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

function AuthModal({ email, setEmail, onClose, onSubmit }: AuthModalProps) {
  const isEmailValid = email.includes('@') && email.includes('.');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-app-white p-6 rounded-lg shadow-xl max-w-sm w-full space-y-4">
        <h3 className="text-xl font-bold text-app-charcoal">Sign In</h3>
        <p className="text-sm text-app-gray">
          Enter your email below. We'll send you a secure link to sign in instantly (no password needed).
        </p>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-app-charcoal mb-1">Email Address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-2 rounded-lg border border-app-border bg-app-white focus:outline-none focus:ring-2 focus:ring-app-green"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={onSubmit}
            disabled={!isEmailValid}
            className="flex-1 btn-primary disabled:bg-app-gray/50 disabled:cursor-not-allowed"
          >
            Send Sign-In Link
          </button>
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg bg-app-cream text-app-charcoal border border-app-border hover:bg-app-border"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}