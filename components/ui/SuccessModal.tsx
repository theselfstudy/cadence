"use client";

import { useEffect } from "react";

// ============================================
// Success Modal
// Reusable modal for successful actions
// ============================================

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Main title */
  title: string;
  /** Description text */
  description: string;
  /** Optional secondary description */
  secondaryText?: string;
  /** Button text (defaults to "Continue") */
  buttonText?: string;
  /** Optional auto-close after X milliseconds */
  autoCloseMs?: number;
}

export function SuccessModal({
  isOpen,
  onClose,
  title,
  description,
  secondaryText,
  buttonText = "Continue",
  autoCloseMs,
}: SuccessModalProps) {
  // Auto-close functionality
  useEffect(() => {
    if (isOpen && autoCloseMs) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseMs);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoCloseMs, onClose]);

  if (!isOpen) return null;

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
        aria-labelledby="success-modal-title"
      >
        <div
          className="bg-white rounded-2xl shadow-xl max-w-md w-full animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Success Icon */}
          <div className="pt-8 pb-4 flex justify-center">
            <div className="w-16 h-16 rounded-full bg-[#3F592E]/10 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-[#3F592E] flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-4 text-center">
            <h2
              id="success-modal-title"
              className="text-xl font-semibold text-app-charcoal mb-2"
            >
              {title}
            </h2>
            <p className="text-app-gray">
              {description}
            </p>
            {secondaryText && (
              <p className="text-sm text-app-gray mt-2">
                {secondaryText}
              </p>
            )}
          </div>

          {/* Button */}
          <div className="px-6 pb-6">
            <button
              type="button"
              onClick={onClose}
              className="w-full px-4 py-3 rounded-xl bg-[#3F592E] text-white 
                       font-medium hover:bg-[#3F592E]/90 transition-colors"
            >
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}