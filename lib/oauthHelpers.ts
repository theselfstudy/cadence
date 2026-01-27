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
  const redirectUri = `${window.location.origin}/oauth/callback`;
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

/**
 * Trigger OAuth flow (redirect on mobile, popup on desktop handled by caller)
 */
export function triggerOAuthRedirect(returnUrl: string): void {
  window.location.href = buildGoogleOAuthRedirectUrl(returnUrl);
}
