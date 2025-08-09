// 🔍 WIX APP DIAGNOSTIC TOOL
// Use this to debug Wix App backend connection issues

import wixUsers from 'wix-users';
import { fetch } from 'wix-fetch';

$w.onReady(function () {
  
  // Add diagnostic button to page
  if ($w('#diagnosticButton')) {
    $w('#diagnosticButton').onClick(runDiagnostics);
  } else {
    console.log('Add a button with ID "diagnosticButton" to run diagnostics');
  }
  
  // Auto-run diagnostics
  setTimeout(runDiagnostics, 2000);
  
});

async function runDiagnostics() {
  console.log('🔍 === WIX APP DIAGNOSTICS STARTING ===');
  
  // 1. Check current user
  try {
    const currentUser = wixUsers.currentUser;
    console.log('👤 Current User:', {
      id: currentUser?.id,
      loggedIn: currentUser?.loggedIn,
      hasUser: !!currentUser
    });
  } catch (error) {
    console.error('❌ User check failed:', error);
  }
  
  // 2. Test different endpoint patterns
  const endpointsToTest = [
    '/chat',
    '/_functions/chat', 
    '/http-chat',
    '/_functions/http-chat',
    './chat',
    '../backend/chat'
  ];
  
  for (const endpoint of endpointsToTest) {
    console.log(`🔍 Testing endpoint: ${endpoint}`);
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      console.log(`✅ ${endpoint} - Status: ${response.status}`);
      
      if (response.ok) {
        try {
          const data = await response.json();
          console.log(`✅ ${endpoint} - JSON Response:`, data);
        } catch (jsonError) {
          const text = await response.text();
          console.log(`⚠️ ${endpoint} - Text Response (first 200 chars):`, text.substring(0, 200));
        }
      }
      
    } catch (error) {
      console.log(`❌ ${endpoint} - Error:`, error.message);
    }
  }
  
  // 3. Check Wix environment
  console.log('🌐 Wix Environment Check:', {
    hasWixUsers: typeof wixUsers !== 'undefined',
    hasWixFetch: typeof fetch !== 'undefined',
    hasDollarW: typeof $w !== 'undefined',
    location: window.location.href,
    domain: window.location.hostname
  });
  
  // 4. Check for backend module
  try {
    const backend = await import('wix-backend');
    console.log('✅ wix-backend module available:', !!backend);
    
    // Try to call backend functions directly
    const backendFunctions = ['chat', 'test', 'memberProfile'];
    for (const func of backendFunctions) {
      try {
        const result = await backend[func]({ test: true });
        console.log(`✅ Backend function ${func} works:`, result);
      } catch (error) {
        console.log(`❌ Backend function ${func} failed:`, error.message);
      }
    }
    
  } catch (backendError) {
    console.log('⚠️ wix-backend not available:', backendError.message);
  }
  
  console.log('🔍 === WIX APP DIAGNOSTICS COMPLETE ===');
}

// Export for manual testing
export { runDiagnostics };
