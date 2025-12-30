"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface FilterOption {
  value: string;
  label: string;
  selected: boolean;
}

interface FilterSection {
  title: string;
  options: FilterOption[];
  onToggle: (value: string) => void;
}

interface FilterBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon: string;
  sections: FilterSection[];
  onClearCategory: () => void;
  onSelectAll: () => void;
  categoryCount: number;
}

export function FilterBottomSheet({
  isOpen,
  onClose,
  title,
  icon,
  sections,
  onClearCategory,
  onSelectAll,
  categoryCount,
}: FilterBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const currentY = useRef<number | null>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Handle touch drag to dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return;
    currentY.current = e.touches[0].clientY;
    
    const delta = currentY.current - startY.current;
    
    // Only allow dragging down
    if (delta > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${delta}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (startY.current === null || currentY.current === null) {
      startY.current = null;
      currentY.current = null;
      return;
    }

    const delta = currentY.current - startY.current;
    
    // If dragged more than 100px down, close the sheet
    if (delta > 100) {
      onClose();
    }
    
    // Reset transform
    if (sheetRef.current) {
      sheetRef.current.style.transform = "";
    }

    startY.current = null;
    currentY.current = null;
  };

  // Check if there are any options
  const hasAnyOptions = sections.some(section => section.options.length > 0);
  const hasSelections = categoryCount > 0;

  if (!isOpen) return null;

  // Use portal to render at document root
  return createPortal(
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl 
                   max-h-[70vh] flex flex-col animate-slide-in-bottom"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-app-border rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-app-border">
          <div className="flex items-center gap-2">
            <span className="text-xl">{icon}</span>
            <h2 id="sheet-title" className="text-lg font-semibold text-app-charcoal">
              {title}
            </h2>
            {categoryCount > 0 && (
              <span className="px-2 py-0.5 text-xs bg-app-teal text-white rounded-full">
                {categoryCount}
              </span>
            )}
          </div>
          
          <button
            onClick={onClose}
            className="p-1 text-app-gray hover:text-app-charcoal rounded-full 
                       hover:bg-app-cream transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Select All / Clear All Bar */}
        {hasAnyOptions && (
          <div className="flex items-center justify-between px-4 py-2 bg-app-cream/50 border-b border-app-border">
            <span className="text-sm text-app-gray">
              {categoryCount} selected
            </span>
            <button
              onClick={hasSelections ? onClearCategory : onSelectAll}
              className={`text-sm font-medium px-3 py-1 rounded-lg transition-colors ${
                hasSelections 
                  ? "text-app-red bg-app-red/10 hover:bg-app-red/20" 
                  : "text-app-teal bg-app-teal/10 hover:bg-app-teal/20"
              }`}
            >
              {hasSelections ? "Clear All" : "Select All"}
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!hasAnyOptions ? (
            <div className="py-8 text-center">
              <span className="text-3xl block mb-2">📭</span>
              <p className="text-app-gray">
                No options available in the selected date range
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {sections.map((section) => {
                if (section.options.length === 0) return null;

                return (
                  <div key={section.title}>
                    {/* Section Title (if multiple sections) */}
                    {sections.filter(s => s.options.length > 0).length > 1 && (
                      <h3 className="text-sm font-medium text-app-gray uppercase tracking-wide mb-3">
                        {section.title}
                      </h3>
                    )}

                    {/* Options Grid */}
                    <div className="space-y-2">
                      {section.options.map((option) => (
                        <label
                          key={option.value}
                          className={`
                            flex items-center gap-3 p-3 rounded-lg cursor-pointer
                            transition-colors border
                            ${option.selected 
                              ? "bg-app-teal/10 border-app-teal/30" 
                              : "bg-white border-app-border hover:bg-app-cream"
                            }
                          `}
                        >
                          <input
                            type="checkbox"
                            checked={option.selected}
                            onChange={() => section.onToggle(option.value)}
                            className="w-5 h-5 rounded border-app-border text-app-teal 
                                       focus:ring-app-teal focus:ring-offset-0"
                          />
                          <span
                            className={`text-base ${
                              option.selected ? "text-app-teal font-medium" : "text-app-charcoal"
                            }`}
                          >
                            {option.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with Done button */}
        <div className="p-4 border-t border-app-border bg-app-cream/50">
          <button
            onClick={onClose}
            className="w-full py-3 bg-app-teal text-white font-medium rounded-lg
                       hover:bg-app-teal/90 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}