"use client";

interface SavePromptModalProps {
  onSave: () => void;
  onContinueWithoutSaving: () => void;
  onCancel: () => void;
  isGoogleSheetConnected?: boolean;
}

export function SavePromptModal({
  onSave,
  onContinueWithoutSaving,
  onCancel,
  isGoogleSheetConnected = false
}: SavePromptModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-app-white p-6 rounded-lg shadow-xl max-w-md w-full space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">💾</span>
          <h3 className="text-xl font-bold text-app-charcoal">
            {isGoogleSheetConnected ? "Sync Your Changes?" : "Your Data is Saved"}
          </h3>
        </div>
        <p className="text-sm text-app-gray">
          Your data is saved locally on this device.
        </p>
        {isGoogleSheetConnected ? (
          <div className="p-3 bg-app-teal/10 rounded-lg border border-app-teal/20">
            <p className="text-xs text-app-teal">
              Sync with Google Sheets to back up and protect your data.
            </p>
          </div>
        ) : (
          <div className="p-3 bg-app-cream rounded-lg border border-app-border">
            <p className="text-xs text-app-gray">
              Connect a Google Sheet in Settings to back up and protect your data.
            </p>
          </div>
        )}
        <div className="flex flex-col gap-2">
          {isGoogleSheetConnected && (
            <button
              onClick={onSave}
              className="w-full py-3 px-4 rounded-lg bg-app-teal text-white font-semibold hover:opacity-90 transition-opacity"
            >
              Sign in to Sync & Continue
            </button>
          )}
          <button
            onClick={onContinueWithoutSaving}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
              isGoogleSheetConnected
                ? "bg-app-cream text-app-charcoal border border-app-border hover:bg-app-border"
                : "bg-app-green text-white hover:opacity-90"
            }`}
          >
            {isGoogleSheetConnected ? "Continue Without Syncing" : "Continue"}
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
