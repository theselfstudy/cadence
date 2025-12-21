// ============================================
// TrackWell Type Definitions
// ============================================

import { useState } from 'react';

/**
 * Time format preference for displaying times throughout the app
 */
export type TimeFormat = "12h" | "24h";

/**
 * Pain scale type options
 */
export type PainScaleType = "simple" | "mankoski";

/**
 * Symptom intensity tracking configuration
 */
export interface IntensityTrackingConfig {
  /** Whether intensity tracking is enabled */
  enabled: boolean;
  /** Which pain scale to use */
  scaleType: PainScaleType;
}

export type ProductType = "pad" | "tampon" | "cup" | "disc" | "liner" | "period-underwear" | "other";

export interface ProductOption {
  type: ProductType;
  label: string;
  hasSizes: boolean;
  sizes?: string[];
  allowCustomProducts: boolean;
  maxCustomProducts?: number;
}

export interface CustomProduct {
  id: string;
  name: string;
}

export interface ProductTracking {
  enabled: boolean;
  selectedProducts: ProductType[];
  customProducts: Partial<Record<ProductType, CustomProduct[]>>; // Add Partial<>
}

/**
 * Symptom tracking configuration
 */
export interface SymptomsConfig {
  /** Currently selected symptoms to track */
  selected: string[];
  /** User-added custom symptoms */
  custom: string[];
  /** Intensity/pain scale tracking settings */
  intensityTracking: IntensityTrackingConfig;
}

/**
 * Period tracking configuration
 */
export interface PeriodTrackingConfig {
  /** Whether period tracking is enabled */
  enabled: boolean;
  /** Whether to show personal/detailed questions */
  trackFlow: boolean;
  /** Symptoms specifically related to period (from main symptoms list) */
  periodSymptoms: string[];
  /** Custom period-specific symptoms added by user */
  customPeriodSymptoms: string[];

  /** Period product-specific symptoms added by user */
  productTracking?:ProductTracking;

  /** Custom period. product-specific symptoms added by user */
  customProducts?: CustomProduct[];
}

export interface MedicineTracking {
  enabled: boolean;
  medicines: Medicine[];  // Array of medicines
}

export interface MedicineLogEntry {
  medicineId: string;
  medicineName: string;
  dosage: string;
  time?: TimeValue;
}

/**
 * Stool/bowel tracking configuration
 */
export interface StoolTrackingConfig {
  /** Whether stool/bowel tracking is enabled */
  enabled: boolean;
}

/**
 * Google Sheet integration configuration
 */
export interface GoogleSheetConfig {
  /** The Google Sheet URL */
  url: string | null;
  /** Optional display name for the sheet */
  name: string | null;
  /** When the URL was added */
  addedAt: string | null;
}

export interface MedicineSection {
  category: MedicineCategory;
  medicines: Medicine[];
  loggedMedicines: MedicineLogEntry[];
  onChange: (entries: MedicineLogEntry[]) => void;
  is24Hour: boolean;
}

/**
 * User settings stored in Zustand with localStorage persistence
 */
export interface UserSettings {
  /** Time display format preference */
  timeFormat: TimeFormat;
  
  /** Symptoms tracking configuration */
  symptoms: SymptomsConfig;
  
  /** Period tracking configuration */
  periodTracking: PeriodTrackingConfig;
  
  /** Stool/bowel tracking configuration */
  stoolTracking: StoolTrackingConfig;
  
  /** Google Sheet integration */
  googleSheet: GoogleSheetConfig;

  /** Medicine tracking integration */
  medicineTracking: MedicineTracking;
  
  /** Whether initial setup wizard is complete */
  setupComplete: boolean;
  
  /** Whether user has completed the app tutorial */
  tutorialComplete: boolean;

  /** Whether there are unsaved changes (for alert) */
  hasUnsavedChanges: boolean;

  lastSavedSnapshot: string | null;
}

/**
 * Actions available on the settings store
 */
export interface SettingsActions {
  /** Update time format preference */
  setTimeFormat: (format: TimeFormat) => void;
  
  /** Toggle a symptom selection on/off */
  toggleSymptom: (symptom: string) => void;
  
  /** Add a custom symptom */
  addCustomSymptom: (symptom: string) => void;
  
  /** Remove a custom symptom */
  removeCustomSymptom: (symptom: string) => void;
  
  /** Update intensity tracking settings */
  setIntensityTracking: (config: Partial<IntensityTrackingConfig>) => void;
  
  /** Update period tracking settings */
  setPeriodTracking: (config: Partial<Omit<PeriodTrackingConfig, 'periodSymptoms' | 'customPeriodSymptoms'>>) => void;
  
  /** Toggle a period-related symptom */
  togglePeriodSymptom: (symptom: string) => void;
  
  /** Add a custom period-specific symptom */
  addCustomPeriodSymptom: (symptom: string) => void;
  
  /** Remove a custom period-specific symptom */
  removeCustomPeriodSymptom: (symptom: string) => void;
  
  /** Update stool tracking settings */
  setStoolTracking: (config: Partial<StoolTrackingConfig>) => void;
  
  /** Set Google Sheet URL and optional name */
  setGoogleSheet: (url: string, name?: string) => void;
  
  /** Remove Google Sheet URL */
  clearGoogleSheet: () => void;

  setMedicineTracking: (config: Partial<MedicineTracking>) => void;
  
  /** Mark setup as complete */
  completeSetup: () => void;
  
  /** Mark tutorial as complete */
  completeTutorial: () => void;
  
  /** Reset all settings to defaults */
  resetSettings: () => void;

  /** Unchanged Setting defaults */
  setHasUnsavedChanges: (value: boolean) => void;

  /** Reverting to last save if left unsaved */
  revertToLastSave: () => void;
}

/**
 * Combined settings store type
 */
export type SettingsStore = UserSettings & SettingsActions & GoogleSettings;

// ============================================
// Entry Types
// ============================================

/**
 * Time value for entry form
 */
export interface TimeValue {
  hour: number;
  minute: number;
  period: "AM" | "PM";
}

/**
 * Bristol stool type (1-7)
 */
export type BristolScaleType = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * Feeling after bowel movement
 */
export type PostBowelFeeling = 
  | "complete_relief"
  | "partial_relief"
  | "incomplete"
  | "discomfort"
  | "pain"
  | "urgency_remains";

/**
 * Menstrual cycle phase
 */
export type CyclePhase = "menstrual" | "follicular" | "ovulation" | "luteal" | "not_sure";

/**
 * Symptom with optional intensity
 */
export interface SymptomEntry {
  name: string;
  intensity?: number;
  isPeriodRelated?: boolean;
}

/**
 * Personal period questions data
 */
export interface PersonalPeriodData {
  flowLevel?: "light" | "medium" | "heavy" | "spotting";
  painLevel?: number;
  notes?: string;
}

/**
 * Complete entry form data
 */
export interface EntryFormData {
  /** Date of the entry */
  date: string;
  
  /** Start time */
  startTime: TimeValue;
  
  /** End time */
  endTime: TimeValue;
  
  /** Bristol stool type */
  bristolType: BristolScaleType | null;
  
  /** How user feels after */
  postFeeling: PostBowelFeeling | null;
  
  /** Selected symptoms with optional intensity */
  symptoms: SymptomEntry[];
  
  /** Period tracking data (if enabled) */
  periodData?: {
    cyclePhase: CyclePhase | null;
    productUsage?: ProductUsageEntry[]; 
    personalData?: PersonalPeriodData;
  };
  
  /** Additional notes */
  notes?: string;
}

/**
 * Saved entry with metadata
 */
export interface SavedEntry extends EntryFormData {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Navigation Types
// ============================================

/**
 * Navigation item for app routing
 */
export interface NavItem {
  label: string;
  href: string;
  icon?: string;
}

// ============================================
// Bristol Stool Scale Types
// ============================================

/**
 * Bristol Stool Scale type definition
 */
export interface BristolType {
  type: number;
  name: string;
  description: string;
}

/**
 * Product usage entry definition
 */
export interface ProductUsageEntry {
  productType: ProductType;
  customProductId?: string; // For cups/discs with custom products
  size?: string;
}

export type MedicineCategory = "bowel" | "symptom" | "period";

export interface Medicine {
  id: string;
  name: string;
  categories: MedicineCategory[];
  dosage?: string; // Default dosage, e.g., "500mg"
  timeSensitive: boolean; // Requires time logging
}

export interface MedicineTracking {
  enabled: boolean;
  medicines: Medicine[];
}

export interface MedicineLogEntry {
  medicineId: string;
  medicineName: string;
  dosage: string; // What they actually took
  time?: TimeValue; // Required if medicine is time-sensitive
}

export interface GoogleSettings {
  userEmail: string | null;
  isAuthenticated: boolean;
  isGoogleSheetConnected: boolean;
  isSyncing: boolean;
  signIn: (email:string) => void;
  signOut: () => void;
  // connectGoogleSheet: () => void;
  disconnectGoogleSheet: () => void;
  saveSettingsToSheet: (accessToken: string) => Promise<boolean>;
  loadSettingsFromSheet: (spreadsheetId: string, accessToken: string) => Promise<boolean>;
}
