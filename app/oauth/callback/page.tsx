"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSyncState } from '@/stores/useSyncState';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { oauthReturnUrl, setPendingOAuthRedirect } = useSyncState();

  useEffect(() => {
    // Parse access token from URL fragment
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const errorParam = params.get('error');

    if (errorParam) {
      setError(`OAuth failed: ${errorParam}`);
      return;
    }

    if (accessToken) {
      // Store token temporarily in sessionStorage (not localStorage!)
      sessionStorage.setItem('google_oauth_token', accessToken);
      sessionStorage.setItem('google_oauth_timestamp', Date.now().toString());

      // Clear OAuth redirect flag
      setPendingOAuthRedirect(false);

      // Redirect back to where sync was initiated
      const returnUrl = oauthReturnUrl || '/settings';
      router.replace(returnUrl);
    } else {
      setError('OAuth failed. No access token received.');
    }
  }, [router, oauthReturnUrl, setPendingOAuthRedirect]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-app-cream">
        <div className="text-center bg-white rounded-2xl shadow-lg p-8 max-w-md">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">OAuth Error</h1>
          <p className="text-app-gray mb-6">{error}</p>
          <button
            onClick={() => router.push('/settings')}
            className="px-6 py-3 bg-app-green text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Return to Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-app-cream">
      <div className="text-center">
        <svg
          className="animate-spin h-12 w-12 text-app-green mx-auto mb-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <p className="text-app-gray text-lg">Completing authentication...</p>
      </div>
    </div>
  );
}
