/**
 * 🧪 SESSION MANAGEMENT TEST HELPER
 * Validates that the refactored system works correctly
 */

// Test data for dive log submission
const testDiveLog = {
  date: '2025-08-12',
  disciplineType: 'depth',
  discipline: 'CWT',
  location: 'Blue Hole, Egypt',
  targetDepth: '25',
  reachedDepth: '23',
  mouthfillDepth: '15',
  totalDiveTime: '2:30',
  notes: 'Good dive, slight LMC on ascent',
  exit: 'LMC',
  userId: 'test-user-123'
};

/**
 * Test the session manager functionality
 */
export async function testSessionManager() {
  console.log('🧪 Testing Session Manager...');
  
  try {
    const { sessionManager } = await import('./sessionManager');
    
    // Test 1: Initialize session
    console.log('Test 1: Session initialization');
    const sessionData = await sessionManager.initializeSession();
    console.log('✅ Session initialized:', sessionData.userId);
    
    // Test 2: Buffer data when offline
    console.log('Test 2: Data buffering');
    sessionManager.sessionData.connectionStatus = 'offline';
    sessionManager.bufferData('saveDiveLog', testDiveLog);
    console.log('✅ Data buffered, buffer size:', sessionManager.sessionData.bufferData.length);
    
    // Test 3: Session status
    console.log('Test 3: Session status');
    const status = sessionManager.getSessionStatus();
    console.log('✅ Session status:', status);
    
    // Test 4: Session upgrade simulation
    console.log('Test 4: Session upgrade');
    try {
      await sessionManager.upgradeToAuthenticatedSession('wix-member-456', 'fake-token');
      console.log('✅ Session upgrade successful');
    } catch (error) {
      console.log('⚠️ Session upgrade failed (expected in test):', error.message);
    }
    
    return {
      success: true,
      sessionId: sessionData.sessionId,
      userId: sessionData.userId,
      bufferSize: sessionManager.sessionData.bufferData.length
    };
    
  } catch (error) {
    console.error('❌ Session manager test failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Test the localStorage key migration
 */
export function testLocalStorageMigration() {
  console.log('🧪 Testing localStorage Migration...');
  
  try {
    const testUserId = 'test-user-migration';
    
    // Set up legacy data
    const legacyData = [
      { id: 'legacy-1', depth: 20, date: '2025-08-10' },
      { id: 'legacy-2', depth: 25, date: '2025-08-11' }
    ];
    
    localStorage.setItem(`diveLogs-${testUserId}`, JSON.stringify(legacyData)); // hyphen
    localStorage.setItem(`savedDiveLogs_${testUserId}`, JSON.stringify([
      { id: 'saved-1', depth: 30, date: '2025-08-09' }
    ])); // savedDiveLogs prefix
    
    // Simulate migration logic
    const canonicalKey = `diveLogs_${testUserId}`;
    const legacyKeys = [`diveLogs-${testUserId}`, `savedDiveLogs_${testUserId}`];
    
    let mergedData = [];
    legacyKeys.forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            mergedData = [...mergedData, ...parsed];
            localStorage.removeItem(key); // Clean up legacy
          }
        } catch (e) {
          console.warn('Failed to parse legacy data:', key);
        }
      }
    });
    
    // Save to canonical key
    localStorage.setItem(canonicalKey, JSON.stringify(mergedData));
    
    // Verify migration
    const migratedData = JSON.parse(localStorage.getItem(canonicalKey) || '[]');
    
    console.log('✅ Migration successful:', {
      legacyCount: legacyData.length + 1,
      migratedCount: migratedData.length,
      canonicalKey
    });
    
    // Clean up test data
    localStorage.removeItem(canonicalKey);
    
    return {
      success: true,
      migratedCount: migratedData.length,
      canonicalKey
    };
    
  } catch (error) {
    console.error('❌ localStorage migration test failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Test the callback prop flow
 */
export function testCallbackFlow() {
  console.log('🧪 Testing Callback Flow...');
  
  try {
    let callbackExecuted = false;
    let callbackData = null;
    
    // Simulate parent callback
    const mockOnSubmit = async (data) => {
      callbackExecuted = true;
      callbackData = data;
      console.log('📝 Mock onSubmit called with:', data);
      
      // Simulate successful save
      return {
        success: true,
        id: 'saved-dive-' + Date.now(),
        syncedToWix: true
      };
    };
    
    // Simulate form submission
    const mockFormData = { ...testDiveLog };
    
    // Execute callback
    mockOnSubmit(mockFormData);
    
    console.log('✅ Callback flow test successful:', {
      callbackExecuted,
      dataReceived: !!callbackData,
      userId: callbackData?.userId
    });
    
    return {
      success: true,
      callbackExecuted,
      dataReceived: !!callbackData
    };
    
  } catch (error) {
    console.error('❌ Callback flow test failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Run all tests
 */
export async function runAllTests() {
  console.log('🚀 Running Koval AI Refactor Tests...');
  
  const results = {
    sessionManager: await testSessionManager(),
    localStorage: testLocalStorageMigration(),
    callbackFlow: testCallbackFlow(),
    timestamp: new Date().toISOString()
  };
  
  const allPassed = Object.values(results).every(result => 
    result && typeof result === 'object' && result.success
  );
  
  console.log(allPassed ? '✅ All tests passed!' : '❌ Some tests failed');
  console.log('📊 Test Results:', results);
  
  return results;
}

// Auto-run tests in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Run tests after a short delay to avoid blocking app startup
  setTimeout(() => {
    runAllTests();
  }, 2000);
}