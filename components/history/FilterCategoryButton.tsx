"use client";

import { forwardRef } from "react";

interface FilterCategoryButtonProps {
  label: string;
  icon: string;
  count: number;
  isOpen: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export const FilterCategoryButton = forwardRef<
  HTMLButtonElement,
  FilterCategoryButtonProps
>(function FilterCategoryButton(
  { label, icon, count, isOpen, onClick, disabled = false },
  ref
) {
  return (
    <button
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      className={`
        relative flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg
        transition-colors focus:outline-none focus:ring-2 focus:ring-app-teal focus:ring-offset-1
        ${
          isOpen
            ? "bg-app-teal text-white"
            : count > 0
            ? "bg-app-teal/10 text-app-teal border border-app-teal/30"
            : "bg-app-cream text-app-charcoal hover:bg-app-border"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
      aria-expanded={isOpen}
      aria-haspopup="listbox"
    >
      <span>{icon}</span>
      <span>{label}</span>
      
      {/* Badge count */}
      {count > 0 && (
        <span
          className={`
            min-w-[18px] h-[18px] flex items-center justify-center
            text-xs font-medium rounded-full
            ${isOpen ? "bg-white/20 text-white" : "bg-app-teal text-white"}
          `}
        >
          {count}
        </span>
      )}
      
      {/* Dropdown chevron */}
      <svg
        className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>
  );
});