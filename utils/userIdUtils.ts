// utils/userIdUtils.ts
// Utility to ensure consistent user ID generation across widget and chat

export function generateConsistentUserId(): string {
  // Use a consistent seed based on session or browser
  if (typeof window !== 'undefined') {
    // Client-side: use sessionStorage for session consistency
    let sessionUserId = sessionStorage.getItem('koval-ai-user-id');
    if (!sessionUserId) {
      sessionUserId = `wix-guest-${Date.now()}`;
      sessionStorage.setItem('koval-ai-user-id', sessionUserId);
    }
    return sessionUserId;
  }
  
  // Server-side fallback
  return `server-user-${Date.now()}`;
}

export function getOrCreateUserId(providedUserId?: string): string {
  // If a user ID is provided (e.g., from Wix), use it
  if (providedUserId && providedUserId !== 'guest' && !providedUserId.startsWith('wix-guest-')) {
    return providedUserId;
  }
  
  // Otherwise generate a consistent session-based ID
  return generateConsistentUserId();
}

export function extractUserIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('userId');
}

export function normalizeUserId(userId: string): string {
  // Clean and normalize user ID
  if (!userId || userId === 'guest' || userId === 'undefined') {
    return generateConsistentUserId();
  }
  
  // If it's already a proper ID, return it
  if (userId.match(/^[a-zA-Z0-9-]+$/)) {
    return userId;
  }
  
  // Generate fallback
  return generateConsistentUserId();
}
