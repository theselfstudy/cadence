import { BASE_PATH } from '@/lib/constants';

const GOOGLE_CLIENT_ID =
  "7354676422-96g78e6tdfb2jp1akigsb80j9696339c.apps.googleusercontent.com";

/**
 * Detect if the current device is mobile
 */
export function isMobileDevice(): boolean {
  return (
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    window.matchMedia("(max-width: 768px)").matches
  );
}

/**
 * Build Google OAuth redirect URL for mobile flow
 */
export function buildGoogleOAuthRedirectUrl(returnUrl: string): string {
  const redirectUri = `${window.location.origin}${BASE_PATH}/oauth/callback`;
  const state = btoa(JSON.stringify({ returnUrl }));

  return (
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=token&` +
    `scope=${encodeURIComponent('https://www.googleapis.com/auth/spreadsheets')}&` +
    `state=${state}`
  );
}

/**
 * Retrieve OAuth token from sessionStorage, checking expiry
 * Returns null if token doesn't exist or has expired
 */
export function getOAuthToken(): string | null {
  const token = sessionStorage.getItem('google_oauth_token');
  const timestamp = sessionStorage.getItem('google_oauth_timestamp');

  if (!token || !timestamp) return null;

  // Token expires after 1 hour, but we'll be conservative and expire after 50 minutes
  const now = Date.now();
  const tokenAge = now - parseInt(timestamp);
  const fiftyMinutes = 50 * 60 * 1000;

  if (tokenAge > fiftyMinutes) {
    clearOAuthToken();
    return null;
  }

  return token;
}

/**
 * Clear OAuth token from sessionStorage
 */
export function clearOAuthToken(): void {
  sessionStorage.removeItem('google_oauth_token');
  sessionStorage.removeItem('google_oauth_timestamp');
}

// ============================================
// Mobile Sync State Helpers
// These use localStorage directly to avoid Zustand hydration race conditions
// ============================================

const MOBILE_SYNC_PENDING_KEY = 'mobile_sync_pending';

export interface MobileSyncPendingState {
  returnUrl: string;
  mode: 'sync' | 'restore';
  timestamp: number;
}

/**
 * Store mobile sync pending state before OAuth redirect
 * Uses localStorage directly to avoid Zustand hydration issues
 */
export function setMobileSyncPending(returnUrl: string, mode: 'sync' | 'restore' = 'sync'): void {
  const state: MobileSyncPendingState = {
    returnUrl,
    mode,
    timestamp: Date.now(),
  };
  localStorage.setItem(MOBILE_SYNC_PENDING_KEY, JSON.stringify(state));
}

/**
 * Get mobile sync pending state
 * Returns null if no pending state or if it's expired (10 min max)
 */
export function getMobileSyncPending(): MobileSyncPendingState | null {
  const stored = localStorage.getItem(MOBILE_SYNC_PENDING_KEY);
  if (!stored) return null;

  try {
    const state: MobileSyncPendingState = JSON.parse(stored);

    // Expire after 10 minutes (OAuth tokens last longer, but user shouldn't be stuck)
    const tenMinutes = 10 * 60 * 1000;
    if (Date.now() - state.timestamp > tenMinutes) {
      clearMobileSyncPending();
      return null;
    }

    return state;
  } catch {
    clearMobileSyncPending();
    return null;
  }
}

/**
 * Clear mobile sync pending state
 */
export function clearMobileSyncPending(): void {
  localStorage.removeItem(MOBILE_SYNC_PENDING_KEY);
}

/**
 * Check if a mobile sync is pending (after OAuth return)
 */
export function hasMobileSyncPending(): boolean {
  return getMobileSyncPending() !== null;
}

/**
 * Trigger OAuth flow (redirect on mobile, popup on desktop handled by caller)
 */
export function triggerOAuthRedirect(returnUrl: string): void {
  window.location.href = buildGoogleOAuthRedirectUrl(returnUrl);
}
