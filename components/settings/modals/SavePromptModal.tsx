"use client";

interface SavePromptModalProps {
  onSave: () => void;
  onContinueWithoutSaving: () => void;
  onCancel: () => void;
}

export function SavePromptModal({ onSave, onContinueWithoutSaving, onCancel }: SavePromptModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-app-white p-6 rounded-lg shadow-xl max-w-md w-full space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">💾</span>
          <h3 className="text-xl font-bold text-app-charcoal">Save Your Settings?</h3>
        </div>
        <p className="text-sm text-app-gray">
          You have a Google Sheet connected. Would you like to save your settings before continuing?
        </p>
        <div className="p-3 bg-app-red/10 rounded-lg border border-app-red/20">
          <p className="text-xs text-app-red">
            ⚠️ <strong>Warning:</strong> If you continue without saving, your current settings
            will only be stored locally on this device and may be lost if you clear your browser data.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={onSave}
            className="w-full py-3 px-4 rounded-lg bg-app-teal text-white font-semibold hover:opacity-90 transition-opacity"
          >
            Save Settings & Continue
          </button>
          <button
            onClick={onContinueWithoutSaving}
            className="w-full py-3 px-4 rounded-lg bg-app-cream text-app-charcoal font-medium border border-app-border hover:bg-app-border transition-colors"
          >
            Continue Without Saving
          </button>
          <button
            onClick={onCancel}
            className="w-full py-2 px-4 text-sm text-app-gray hover:text-app-charcoal transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}