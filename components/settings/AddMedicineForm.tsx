"use client";

import { useState } from "react";
import type { Medicine, MedicineCategory } from "@/types";
import { existsCaseInsensitive, findSimilarItems, isSimilar } from "@/lib/stringUtils";

interface AddMedicineFormProps {
  onAdd: (medicine: Medicine) => void;
  availableCategories: { value: MedicineCategory; label: string; icon: string }[];
  currentMedicineCount: number;
  maxMedicines: number;
  existingMedicines: Medicine[];
  showValidationError?: boolean;
}

export function AddMedicineForm({
  onAdd,
  availableCategories,
  currentMedicineCount,
  maxMedicines,
  existingMedicines,
  showValidationError = false,
}: AddMedicineFormProps) {
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [categories, setCategories] = useState<MedicineCategory[]>([]);
  const [timeSensitive, setTimeSensitive] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [showDuplicatePrompt, setShowDuplicatePrompt] = useState(false);
  const [duplicateMatch, setDuplicateMatch] = useState<Medicine | null>(null);

  const canAddMore = currentMedicineCount < maxMedicines;
  const existingNames = existingMedicines.map((m) => m.name);

  const handleNameChange = (value: string) => {
    setName(value);
    setWarning(null);
    setShowDuplicatePrompt(false);
    setDuplicateMatch(null);

    if (value.trim()) {
      // Check for similar existing items (fuzzy match)
      const similar = findSimilarItems(value.trim(), existingNames);
      if (similar.length > 0 && !existsCaseInsensitive(value.trim(), existingNames)) {
        setWarning(`Did you mean "${similar[0]}"?`);
      }
    }
  };

  const handleSubmit = () => {
    if (!name.trim() || categories.length === 0 || !canAddMore) return;

    const trimmedName = name.trim();
    const trimmedDosage = dosage.trim();

    // Find any medicine with similar name (case-insensitive + fuzzy)
    const matchingMedicine = existingMedicines.find((m) => 
      isSimilar(m.name, trimmedName)
    );

    if (matchingMedicine) {
      // Check if exact same medicine (same name AND same dosage)
      const exactDosageMatch = (matchingMedicine.dosage || "").toLowerCase() === trimmedDosage.toLowerCase();

      if (exactDosageMatch) {
        // Same name + same dosage: just merge categories
        const mergedCategories = Array.from(
          new Set([...matchingMedicine.categories, ...categories])
        ) as MedicineCategory[];

        onAdd({
          ...matchingMedicine,
          categories: mergedCategories,
          timeSensitive: matchingMedicine.timeSensitive || timeSensitive,
        });

        // Reset form
        resetForm();
        return;
      } else {
        // Same name but different dosage: prompt user
        setDuplicateMatch(matchingMedicine);
        setShowDuplicatePrompt(true);
        return;
      }
    }

    // No match found, add as new
    addNewMedicine();
  };

  const addNewMedicine = () => {
    onAdd({
      id: Date.now().toString(),
      name: name.trim(),
      dosage: dosage.trim() || undefined,
      categories,
      timeSensitive,
    });
    resetForm();
  };

  const resetForm = () => {
    setName("");
    setDosage("");
    setCategories([]);
    setTimeSensitive(false);
    setWarning(null);
    setShowDuplicatePrompt(false);
    setDuplicateMatch(null);
  };

  const handleAddAsSeparate = () => {
    addNewMedicine();
  };

  const handleCancel = () => {
    setShowDuplicatePrompt(false);
    setDuplicateMatch(null);
  };

  const toggleCategory = (cat: MedicineCategory) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  if (!canAddMore) {
    return (
      <p className="text-sm text-app-gray italic">
        Maximum of {maxMedicines} medicines reached.
      </p>
    );
  }

  // Show duplicate prompt dialog
  if (showDuplicatePrompt && duplicateMatch) {
    return (
      <div className="p-4 bg-app-taupe/10 rounded-lg border border-app-taupe/30 space-y-4">
        <div>
          <p className="font-medium text-app-charcoal">Similar medicine found</p>
          <p className="text-sm text-app-gray mt-1">
            You already have <strong>"{duplicateMatch.name}"</strong>
            {duplicateMatch.dosage && <span> ({duplicateMatch.dosage})</span>}.
          </p>
          <p className="text-sm text-app-gray mt-1">
            You're trying to add <strong>"{name.trim()}"</strong>
            {dosage.trim() && <span> ({dosage.trim()})</span>}.
          </p>
        </div>
        <p className="text-sm text-app-charcoal">
          Would you like to add this as a separate medicine?
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleAddAsSeparate}
            className="flex-1 px-4 py-2 rounded-lg bg-app-taupe text-white font-medium hover:opacity-90"
          >
            Yes, Add Separately
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 px-4 py-2 rounded-lg bg-app-cream text-app-charcoal border border-app-border hover:bg-app-border"
          >
            No
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Medicine Name */}
      <div>
        <label className={`block text-sm mb-1 ${
          showValidationError ? "text-app-red font-medium" : "text-app-gray"
        }`}>
          Medicine Name * {showValidationError}
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="e.g., Ibuprofen, Metamucil..."
          className="w-full px-4 py-2 rounded-lg border border-app-border bg-app-white focus:outline-none focus:ring-2 focus:ring-app-taupe"
        />
        {warning && (
          <p className="text-xs text-app-taupe mt-1">{warning}</p>
        )}
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

      {/* Tags */}
      <div>
        <label className={`block text-sm mb-2 ${
          showValidationError ? "text-app-red font-medium" : "text-app-gray"
        }`}>
          Add at least one tag to the medicine {showValidationError && "*"}
        </label>        
        {availableCategories.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {availableCategories.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => toggleCategory(cat.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  categories.includes(cat.value)
                    ? "bg-app-green/70 text-white"
                    : "bg-app-cream text-app-charcoal border border-app-border hover:border-app-green/40"
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
            timeSensitive ? "bg-app-green/60" : "bg-app-border"
          }`}
        >
          <span
            className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
              timeSensitive ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
        <div>
          <p className="text-sm font-medium text-app-charcoal">Time-sensitive Medication</p>
          <p className="text-xs text-app-gray">Toggle option to log the time the medicine was taken</p>
        </div>
      </div>

      {/* Add Button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!name.trim() || categories.length === 0}
        className="w-full px-6 py-2 rounded-lg bg-app-green/60 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        + Add Medicine ({currentMedicineCount}/{maxMedicines})
      </button>
    </div>
  );
}