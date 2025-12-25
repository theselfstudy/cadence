"use client";

interface AnonymousContinueModalProps {
  onContinue: () => void;
  onCancel: () => void;
  destination: "tutorial" | "entry";
}

export function AnonymousContinueModal({ 
  onContinue, 
  onCancel,
  destination 
}: AnonymousContinueModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-app-white p-6 rounded-lg shadow-xl max-w-md w-full space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">💾</span>
          <h3 className="text-xl font-bold text-app-charcoal">Settings Saved Locally</h3>
        </div>
        
        <p className="text-sm text-app-gray">
          Your settings have been automatically saved to this device.
        </p>
        
        <div className="p-3 bg-app-cream rounded-lg border border-app-border">
          <p className="text-xs text-app-gray">
            💡 <strong>Tip:</strong> To backup your settings and sync across devices, 
            you can connect a Google Sheet anytime from Settings.
          </p>
        </div>
        
        <div className="flex flex-col gap-2">
          <button
            onClick={onContinue}
            className="w-full py-3 px-4 rounded-lg bg-app-green text-white font-semibold hover:bg-app-green-dark transition-colors"
          >
            {destination === "tutorial" ? "Continue to Tutorial" : "Start Logging"}
          </button>
          <button
            onClick={onCancel}
            className="w-full py-2 px-4 text-sm text-app-gray hover:text-app-charcoal transition-colors"
          >
            Go Back to Settings
          </button>
        </div>
      </div>
    </div>
  );
}