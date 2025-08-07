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
  console.log('🔍 getOrCreateUserId called with:', providedUserId);
  
  // If a user ID is provided and it's not a guest, use it
  if (providedUserId && providedUserId !== 'guest' && !providedUserId.startsWith('wix-guest-')) {
    console.log('✅ Using provided user ID:', providedUserId);
    return providedUserId;
  }
  
  // For guest users or missing IDs, check if we have a persistent user ID
  if (typeof window !== 'undefined') {
    // Check localStorage for a more persistent user ID (survives browser restart)
    let persistentUserId = localStorage.getItem('koval-ai-persistent-user-id');
    if (!persistentUserId) {
      // Create a persistent ID that will be used for all dive logs and memory
      persistentUserId = `koval-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('koval-ai-persistent-user-id', persistentUserId);
      console.log('🆕 Created new persistent user ID:', persistentUserId);
    } else {
      console.log('♻️ Using existing persistent user ID:', persistentUserId);
    }
    return persistentUserId;
  }
  
  // Server-side fallback
  const fallbackId = generateConsistentUserId();
  console.log('🔄 Using fallback user ID:', fallbackId);
  return fallbackId;
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

export function migrateGuestDataToPersistent(): string | null {
  if (typeof window === 'undefined') return null;
  
  // Get the current persistent user ID
  const persistentUserId = getOrCreateUserId();
  
  // Check if there's any guest data that needs migration
  const guestKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes('wix-guest-') && key.includes('dive-logs')) {
      guestKeys.push(key);
    }
  }
  
  if (guestKeys.length > 0) {
    console.log(`🔄 Found ${guestKeys.length} guest dive log entries to migrate`);
    
    // Migrate the data
    guestKeys.forEach(guestKey => {
      const data = localStorage.getItem(guestKey);
      if (data) {
        const newKey = guestKey.replace(/wix-guest-\d+/, persistentUserId);
        localStorage.setItem(newKey, data);
        console.log(`✅ Migrated ${guestKey} → ${newKey}`);
      }
    });
    
    return persistentUserId;
  }
  
  return null;
}

export function debugUserIdSituation(): void {
  if (typeof window === 'undefined') return;
  
  console.log('🔍 User ID Debug Information:');
  console.log('  URL userId param:', extractUserIdFromUrl());
  console.log('  Session userId:', sessionStorage.getItem('koval-ai-user-id'));
  console.log('  Persistent userId:', localStorage.getItem('koval-ai-persistent-user-id'));
  
  // Check for any dive log data
  const diveLogKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes('dive-logs')) {
      diveLogKeys.push(key);
    }
  }
  
  console.log('  Dive log keys found:', diveLogKeys);
}
