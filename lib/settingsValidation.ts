// /lib/settingsValidation.ts
import { PRODUCT_OPTIONS } from "@/lib/constants";
import type { PeriodTrackingConfig, MedicineTracking } from "@/types";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Product types that require at least one custom product name */
const PRODUCTS_REQUIRING_CUSTOM_ITEMS = ["cup", "disc", "other"];

// =============================================================================
// TYPES
// =============================================================================

export interface SettingsValidation {
  /** Overall settings validity */
  isValid: boolean;
  /** Whether product tracking has at least one product selected (if enabled) */
  productTrackingValid: boolean;
  /** Whether cup/disc/other products have custom items added */
  customProductsValid: boolean;
  /** Whether medicine tracking has at least one medicine (if enabled) */
  medicineTrackingValid: boolean;
  /** List of product type labels missing custom items */
  productsMissingCustomItems: string[];
  /** Human-readable error message, null if valid */
  validationMessage: string | null;
}

interface ValidationInput {
  periodTracking?: PeriodTrackingConfig | null;
  medicineTracking?: MedicineTracking | null;
}

// =============================================================================
// VALIDATION FUNCTION
// =============================================================================

/**
 * Validates settings configuration for required fields.
 * Used to enforce mandatory custom products for Cup, Disc, and Other product types,
 * and to ensure medicine tracking has at least one medicine when enabled.
 */
export function validateSettings(state: ValidationInput): SettingsValidation {
  // Safe defaults for nullable state
  const periodTracking = state.periodTracking ?? {
    enabled: false,
    productTracking: { enabled: false, selectedProducts: [], customProducts: {} },
    periodSymptoms: [],
    customPeriodSymptoms: [],
    trackFlow: false,
  };

  const medicineTracking = state.medicineTracking ?? { enabled: false, medicines: [] };

  // ---------------------------------------------------------------------------
  // Product Tracking Validation
  // ---------------------------------------------------------------------------
  
  // At least one product must be selected when product tracking is enabled
  const productTrackingValid =
    !periodTracking.productTracking?.enabled ||
    (periodTracking.productTracking?.selectedProducts?.length ?? 0) > 0;

  // Cup, Disc, and Other products require at least one custom product name
  const customProductsValid = (() => {
    if (!periodTracking.productTracking?.enabled) return true;

    const selectedProducts = periodTracking.productTracking.selectedProducts ?? [];
    const customProducts = periodTracking.productTracking.customProducts ?? {};

    for (const productType of PRODUCTS_REQUIRING_CUSTOM_ITEMS) {
      if (selectedProducts.includes(productType)) {
        const items = customProducts[productType] ?? [];
        if (items.length === 0) return false;
      }
    }
    return true;
  })();

  // Get list of product labels missing custom items (for error messages)
  const productsMissingCustomItems = (() => {
    if (!periodTracking.productTracking?.enabled) return [];

    const selectedProducts = periodTracking.productTracking.selectedProducts ?? [];
    const customProducts = periodTracking.productTracking.customProducts ?? {};

    return PRODUCTS_REQUIRING_CUSTOM_ITEMS
      .filter((productType) => {
        if (!selectedProducts.includes(productType)) return false;
        const items = customProducts[productType] ?? [];
        return items.length === 0;
      })
      .map((type) => {
        const product = PRODUCT_OPTIONS.find((p) => p.type === type);
        return product?.label ?? type;
      });
  })();

  // ---------------------------------------------------------------------------
  // Medicine Tracking Validation
  // ---------------------------------------------------------------------------
  
  const medicineTrackingValid =
    !medicineTracking.enabled || medicineTracking.medicines.length > 0;

  // ---------------------------------------------------------------------------
  // Overall Validation
  // ---------------------------------------------------------------------------
  
  const isValid = productTrackingValid && customProductsValid && medicineTrackingValid;

  // Build human-readable validation message
  let validationMessage: string | null = null;
  if (!productTrackingValid) {
    validationMessage = "Please select at least one product for Product Usage tracking, or disable it.";
  } else if (!customProductsValid) {
    validationMessage = `Please add at least one product name for: ${productsMissingCustomItems.join(", ")}`;
  } else if (!medicineTrackingValid) {
    validationMessage = "Please add at least one medicine for Medicine Tracking, or disable it.";
  }

  return {
    isValid,
    productTrackingValid,
    customProductsValid,
    medicineTrackingValid,
    productsMissingCustomItems,
    validationMessage,
  };
}