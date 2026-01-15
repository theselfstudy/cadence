"use client";

import { useEffect, useState } from "react";

// ============================================
// Warning Modal
// Reusable modal for warnings and confirmations
// ============================================

interface WarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** Main title */
  title: string;
  /** Description text */
  description: string;
  /** Primary button text (defaults to "Continue") */
  confirmButtonText?: string;
  /** Cancel button text (defaults to "Go Back") */
  cancelButtonText?: string;
}

export function WarningModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmButtonText = "Continue",
  cancelButtonText = "Go Back",
}: WarningModalProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || !isOpen) return null;

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
        aria-labelledby="warning-modal-title"
      >
        <div
          className="bg-white rounded-2xl shadow-xl max-w-md w-full animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Warning Icon */}
          <div className="pt-8 pb-4 flex justify-center">
            <div className="w-16 h-16 rounded-full bg-app-red/10 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center">
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
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-4 text-center">
            <h2
              id="warning-modal-title"
              className="text-xl font-semibold text-app-charcoal mb-2"
            >
              {title}
            </h2>
            <p className="text-app-gray">
              {description}
            </p>
          </div>

          {/* Buttons */}
          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-app-border
                         text-app-charcoal font-medium hover:bg-app-cream
                         transition-colors order-2 sm:order-1"
              >
                {cancelButtonText}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 px-4 py-3 rounded-xl bg-app-plumb text-white
                         font-medium hover:bg-app-red transition-colors
                         order-1 sm:order-2"
              >
                {confirmButtonText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
