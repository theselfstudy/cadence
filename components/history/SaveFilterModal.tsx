"use client";

import { useState, useEffect, useRef } from "react";
import { MAX_FILTER_NAME_LENGTH } from "@/stores/useSavedFilters";

// ============================================
// TYPES
// ============================================

interface SaveFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  currentSlot: number; // 1, 2, or 3
  totalSlots: number;  // Always 3
}

// ============================================
// COMPONENT
// ============================================

export function SaveFilterModal({
  isOpen,
  onClose,
  onSave,
  currentSlot,
  totalSlots,
}: SaveFilterModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setName("");
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      setError("Please enter a name for this filter");
      return;
    }
    
    if (trimmedName.length > MAX_FILTER_NAME_LENGTH) {
      setError(`⚠️ Name must be ${MAX_FILTER_NAME_LENGTH} characters or less`);
      return;
    }

    onSave(trimmedName);
    onClose();
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    
    // Clear error when user starts typing
    if (error) setError(null);
    
    // Show warning if approaching limit
    if (value.length > MAX_FILTER_NAME_LENGTH) {
      setError(`⚠️ Name must be ${MAX_FILTER_NAME_LENGTH} characters or less`);
    }
  };

  if (!isOpen) return null;

  const remainingChars = MAX_FILTER_NAME_LENGTH - name.length;
  const isOverLimit = remainingChars < 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-filter-title"
      >
        <div
          className="bg-white rounded-2xl shadow-xl max-w-md w-full animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-app-border">
            <div className="flex items-center justify-between">
              <h2
                id="save-filter-title"
                className="text-xl font-semibold text-DEFAULT"
              >
                Save Filter
              </h2>
              <span className="text-sm text-app-gray bg-app-cream px-2 py-1 rounded-full">
                {currentSlot}/{totalSlots}
              </span>
            </div>
            <p className="text-sm text-app-gray mt-1">
              Save your current filter configuration for quick access later.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-4">
              <label
                htmlFor="filter-name"
                className="block text-sm font-medium text-DEFAULT mb-2"
              >
                Filter Name
              </label>
              <input
                ref={inputRef}
                id="filter-name"
                type="text"
                value={name}
                onChange={handleNameChange}
                placeholder="e.g., Work Week Symptoms"
                maxLength={MAX_FILTER_NAME_LENGTH + 5} // Allow typing over to show error
                className={`
                  w-full px-4 py-3 rounded-xl border-2 transition-colors
                  focus:outline-none focus:ring-0
                  ${isOverLimit || error
                    ? "border-app-red focus:border-app-red"
                    : "border-app-border focus:border-app-green"
                  }
                `}
              />
              
              {/* Character count & error */}
              <div className="flex justify-between items-center mt-2">
                <div className="min-h-[20px]">
                  {error && (
                    <p className="text-sm text-app-red">{error}</p>
                  )}
                </div>
                <span
                  className={`text-xs ${
                    isOverLimit ? "text-app-red" : "text-app-gray"
                  }`}
                >
                  {remainingChars} characters left
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-app-border 
                         text-DEFAULT font-medium hover:bg-app-cream transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || isOverLimit}
                className="flex-1 px-4 py-3 rounded-xl bg-app-green text-white 
                         font-medium hover:bg-app-plumb/90
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Filter
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}