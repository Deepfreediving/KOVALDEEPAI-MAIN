// 🔥 WIX FRONTEND PAGE - CLEAN FINAL VERSION
// Version: 6.0 - Clean implementation based on official Wix documentation
// Last Updated: August 15, 2025
// Status: Production Ready ✅

// ===== REQUIRED WIX IMPORTS =====
import wixData from 'wix-data';
import wixStorage from 'wix-storage-frontend';
import { currentMember } from 'wix-members-frontend';

// ===== CONFIGURATION =====
const CONFIG = {
  VERCEL_URL: 'https://kovaldeepai-main.vercel.app',
  WIX_SITE_URL: 'https://www.deepfreediving.com',
  WIDGET_ID: 'aiWidget',
  IFRAME_SRC: 'https://kovaldeepai-main.vercel.app/embed',
  
  COLLECTIONS: {
    DIVE_LOGS: 'DiveLogs',
    MEMBERS: 'Members/FullData'
  }
};

// ===== GLOBAL STATE =====
let sessionData = {
  userId: null,
  memberId: null,
  isAuthenticated: false,
  widgetReady: false
};

// ===== PAGE INITIALIZATION =====
$w.onReady(function () {
  console.log('🚀 Koval AI Widget V6.0 initialization starting...');
  
  // Prevent duplicate initialization
  if (window.KOVAL_WIDGET_INITIALIZED) {
    console.log('⚠️ Widget already initialized');
    return;
  }
  window.KOVAL_WIDGET_INITIALIZED = true;
  
  // Find and initialize widget
  const widget = findWidget();
  if (!widget) {
    console.error('❌ Widget element not found');
    return;
  }
  
  // Initialize session and widget
  initializeSession()
    .then(sessionData => {
      if (sessionData.isAuthenticated) {
        console.log('✅ Session initialized:', sessionData);
        initializeWidget(widget, sessionData);
      } else {
        console.log('🔒 Authentication required - not initializing widget');
        showAuthenticationRequired(widget);
      }
    })
    .catch(error => {
      console.error('❌ Session initialization failed:', error);
      showAuthenticationRequired(widget);
    });
});

// ===== SESSION MANAGEMENT =====
async function initializeSession() {
  try {
    console.log('🔍 Initializing user session...');
    
    // Try to get current member using Wix API
    const member = await currentMember.getMember();
    
    console.log('🔍 Member object received:', member);
    console.log('🔍 Member keys:', Object.keys(member || {}));
    
    if (member && member.loggedIn && member._id) {
      // ✅ FIXED: Use member._id as the unique identifier and capture all profile fields
      sessionData = {
        userId: member._id,  // This is the real Wix member ID
        memberId: member._id,
        userEmail: member.loginEmail,
        userName: member.profile?.nickname || member.profile?.firstName || member.loginEmail,
        firstName: member.profile?.firstName || '',
        lastName: member.profile?.lastName || '',
        nickname: member.profile?.nickname || '',
        isAuthenticated: true,
        source: 'wix-authenticated',
        memberObject: member  // Keep full member object for debugging
      };
      
      console.log('✅ Authenticated user session created');
      console.log('📋 Session data:', sessionData);
    } else {
      console.log('🔒 User not authenticated - authentication required');
      return {
        userId: null,
        memberId: null,
        userEmail: '',
        userName: '',
        firstName: '',
        lastName: '',
        nickname: '',
        isAuthenticated: false,
        source: 'wix-unauthenticated',
        requiresLogin: true
      };
    }
    
    return sessionData;
    
  } catch (error) {
    console.error('❌ Session initialization error:', error);
    return {
      userId: null,
      memberId: null,
      userEmail: '',
      userName: '',
      firstName: '',
      lastName: '',
      nickname: '',
      isAuthenticated: false,
      source: 'wix-error',
      requiresLogin: true,
      error: error.message
    };
  }
}

function createGuestSession() {
  // ✅ V6.0 STRICT AUTH - NO GUEST SESSIONS
  console.log('🔒 V6.0: No guest sessions allowed - authentication required');
  return {
    userId: null,
    memberId: null,
    userEmail: '',
    userName: 'Login Required',
    isAuthenticated: false,
    authState: 'UNAUTHENTICATED',
    source: 'authentication-required-v6.0',
    requiresLogin: true
  };
}

// ===== WIDGET MANAGEMENT =====
function findWidget() {
  const widgetIds = ['#aiWidget', '#KovalAiWidget', '#htmlComponent1', '#html1'];
  
  for (const widgetId of widgetIds) {
    try {
      const widget = $w(widgetId);
      if (widget && typeof widget.html !== 'undefined') {
        console.log('✅ Found widget:', widgetId);
        return widget;
      }
    } catch (e) {
      // Continue to next ID
    }
  }
  
  console.error('❌ No widget found. Tried:', widgetIds);
  return null;
}

function initializeWidget(widget, sessionData) {
  console.log('🖼️ Initializing widget with session data...');
  
  // Build widget URL with session parameters
  const params = new URLSearchParams({
    userId: sessionData.userId,
    memberId: sessionData.memberId || '',
    userEmail: sessionData.userEmail || '',
    userName: sessionData.userName || '',
    isAuthenticated: sessionData.isAuthenticated.toString(),
    source: 'wix-page-v6',
    embedded: 'true',
    theme: 'auto',
    v: Date.now() // Cache busting
  });
  
  const widgetUrl = `${CONFIG.IFRAME_SRC}?${params.toString()}`;
  
  // Create iframe
  const iframeHtml = `
    <iframe 
      src="${widgetUrl}"
      style="width: 100%; height: 1200px; border: none; border-radius: 12px;"
      allow="camera; microphone; clipboard-write"
      sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-popups"
      title="Koval Deep AI Assistant">
    </iframe>
  `;
  
  try {
    widget.html = iframeHtml;
    sessionData.widgetReady = true;
    
    // Setup message handling
    setupMessageHandling();
    
    console.log('✅ Widget initialized successfully');
    console.log('🔗 Widget URL:', widgetUrl);
    
  } catch (error) {
    console.error('❌ Widget initialization failed:', error);
  }
}

// ===== MESSAGE HANDLING =====
function setupMessageHandling() {
  try {
    if (typeof window !== 'undefined' && window && window.addEventListener) {
      window.addEventListener('message', handleWidgetMessage);
      console.log('✅ Message handling setup complete');
    } else {
      console.warn('⚠️ Window not available for message handling');
    }
  } catch (error) {
    console.error('❌ Failed to setup message handling:', error);
  }
}

async function handleWidgetMessage(event) {
  // Verify origin
  const allowedOrigins = [
    'https://kovaldeepai-main.vercel.app',
    'http://localhost:3000'
  ];
  
  if (!allowedOrigins.includes(event.origin)) {
    return;
  }
  
  console.log('📨 Received message from widget:', event.data.type);
  
  switch (event.data.type) {
    case 'EMBED_READY':
      console.log('🚀 Widget ready - sending user data immediately');
      sendUserDataToWidget();
      break;
      
    case 'REQUEST_USER_DATA':
      sendUserDataToWidget();
      break;
      
    case 'SAVE_DIVE_LOG':
      await handleSaveDiveLog(event.data.data);
      break;
      
    case 'AUTHENTICATION_REQUIRED':
      console.log('🔒 Widget requires authentication:', event.data.message);
      // Could show a login prompt or redirect to login
      break;
      
    default:
      console.log('ℹ️ Unknown message type:', event.data.type);
  }
}

function sendUserDataToWidget() {
  const userData = {
    userId: sessionData.userId,
    memberId: sessionData.memberId,
    userEmail: sessionData.userEmail,
    userName: sessionData.userName,
    firstName: sessionData.firstName,
    lastName: sessionData.lastName,
    nickname: sessionData.nickname,
    isAuthenticated: sessionData.isAuthenticated,
    isGuest: !sessionData.isAuthenticated,
    source: sessionData.source,
    memberDetectionMethod: 'wix-frontend-v6.0',
    version: '6.0'
  };
  
  const message = {
    type: 'USER_DATA_RESPONSE',
    userData: userData,
    timestamp: Date.now(),
    source: 'wix-page'
  };
  
  // Send to iframe
  try {
    if (typeof document !== 'undefined') {
      const iframe = document.querySelector('iframe[src*="kovaldeepai-main.vercel.app"]');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(message, CONFIG.VERCEL_URL);
        console.log('📤 Sent user data to widget:', {
          userId: userData.userId,
          isAuthenticated: userData.isAuthenticated,
          source: userData.source
        });
      } else {
        console.warn('⚠️ Iframe not found for messaging');
      }
    }
  } catch (error) {
    console.error('❌ Failed to send user data to widget:', error);
  }
}

// ===== DIVE LOG HANDLING =====
async function handleSaveDiveLog(diveLogData) {
  try {
    console.log('💾 Saving dive log via Wix backend...');
    
    // ✅ FIXED: Use nickname for Wix collection, userId for localStorage
    const saveData = {
      // Use nickname for Wix DiveLogs collection (connected to Members/FullData)
      nickname: sessionData.userName || sessionData.userEmail || 'Unknown User',
      firstName: sessionData.memberObject?.profile?.firstName || '',
      lastName: sessionData.memberObject?.profile?.lastName || '',
      
      // Keep userId for dive log ID generation and localStorage
      diveLogId: diveLogData.id || `dive_${sessionData.userId}_${Date.now()}`,
      logEntry: JSON.stringify(diveLogData),
      diveDate: diveLogData.date || new Date().toISOString(),
      diveTime: diveLogData.totalDiveTime || new Date().toLocaleTimeString(),
      watchedPhoto: diveLogData.imageFile || diveLogData.watchedPhoto || null // ✅ FIXED: Use correct field name
    };
    
    console.log('📝 Prepared data for Wix:', saveData);
    
    // Save via Wix backend function
    const response = await fetch(`${CONFIG.WIX_SITE_URL}/_functions/saveDiveLog`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(saveData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Dive log saved to Wix:', result);
      
      // Also save to localStorage for immediate UI updates
      saveDiveLogToLocalStorage(diveLogData);
      
      // Notify widget of success
      sendMessageToWidget('SAVE_DIVE_LOG_RESPONSE', {
        success: true,
        wixId: result.data?.wixId,
        message: 'Dive log saved successfully'
      });
      
    } else {
      throw new Error(`Wix save failed: ${response.status}`);
    }
    
  } catch (error) {
    console.error('❌ Error saving dive log:', error);
    
    // Fallback: save to localStorage only
    saveDiveLogToLocalStorage(diveLogData);
    
    // Notify widget of fallback save
    sendMessageToWidget('SAVE_DIVE_LOG_RESPONSE', {
      success: true,
      fallback: true,
      message: 'Saved to local storage (Wix backend unavailable)'
    });
  }
}

function saveDiveLogToLocalStorage(diveLogData) {
  try {
    const storageKey = `diveLogs_${sessionData.userId}`; // ✅ FIXED: Use underscore consistently
    const existingLogs = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    const logForStorage = {
      id: diveLogData.id || `dive_${sessionData.userId}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: sessionData.userId,
      ...diveLogData,
      source: 'wix-frontend'
    };
    
    // Check for duplicates
    const existingIndex = existingLogs.findIndex(log => log.id === logForStorage.id);
    if (existingIndex >= 0) {
      existingLogs[existingIndex] = logForStorage;
    } else {
      existingLogs.push(logForStorage);
    }
    
    // Sort by date (newest first)
    existingLogs.sort((a, b) => new Date(b.date || b.timestamp) - new Date(a.date || a.timestamp));
    
    localStorage.setItem(storageKey, JSON.stringify(existingLogs));
    console.log('✅ Dive log saved to localStorage');
    
    // 🚀 ADDED: Dispatch storage event to trigger sidebar refresh
    try {
      window.dispatchEvent(new StorageEvent('storage', {
        key: storageKey,
        newValue: JSON.stringify(existingLogs),
        storageArea: localStorage
      }));
      console.log('📡 Wix Frontend: Dispatched storage event for sidebar refresh');
    } catch (eventError) {
      console.warn('⚠️ Wix Frontend: Could not dispatch storage event:', eventError);
    }
    
  } catch (error) {
    console.error('❌ Error saving to localStorage:', error);
  }
}

function sendMessageToWidget(type, data) {
  const message = {
    type: type,
    data: data,
    timestamp: Date.now(),
    source: 'wix-page'
  };
  
  const iframe = document.querySelector('iframe');
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage(message, CONFIG.VERCEL_URL);
  }
}

// ===== AUTHENTICATION REQUIRED HANDLER =====
function showAuthenticationRequired(widget) {
  console.log('🔒 Showing authentication required message');
  
  const authRequiredHtml = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 400px;
      padding: 40px;
      text-align: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      color: white;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    ">
      <div style="font-size: 48px; margin-bottom: 20px;">🔒</div>
      <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600;">Authentication Required</h2>
      <p style="margin: 0 0 24px 0; font-size: 16px; opacity: 0.9; max-width: 400px; line-height: 1.5;">
        Please log into your Wix account to access the AI coaching system and your personalized dive training.
      </p>
      <button 
        onclick="window.location.reload()" 
        style="
          background: rgba(255,255,255,0.2);
          border: 2px solid rgba(255,255,255,0.3);
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        "
        onmouseover="this.style.background='rgba(255,255,255,0.3)'"
        onmouseout="this.style.background='rgba(255,255,255,0.2)'"
      >
        Sign In to Continue
      </button>
    </div>
  `;
  
  try {
    widget.html = authRequiredHtml;
    console.log('✅ Authentication required message displayed');
  } catch (error) {
    console.error('❌ Failed to show authentication required message:', error);
  }
}

// ===== DEBUGGING FUNCTIONS =====
function runDiagnostics() {
  console.log('🔍 Running Koval AI System Diagnostics...');
  console.log('================================================');
  
  console.log('🌐 Environment Check:');
  console.log('   • URL:', window.location.href);
  console.log('   • Timestamp:', new Date().toISOString());
  
  console.log('\n📚 Wix APIs:');
  console.log('   • wixData:', typeof wixData !== 'undefined' ? '✅ Available' : '❌ Not Available');
  console.log('   • wixStorage:', typeof wixStorage !== 'undefined' ? '✅ Available' : '❌ Not Available');
  console.log('   • currentMember:', typeof currentMember !== 'undefined' ? '✅ Available' : '❌ Not Available');
  
  console.log('\n🔐 Session State:');
  console.log('   • User ID:', sessionData.userId || 'Not set');
  console.log('   • Member ID:', sessionData.memberId || 'Guest');
  console.log('   • Authenticated:', sessionData.isAuthenticated ? '✅ Yes' : '❌ No');
  console.log('   • Widget Ready:', sessionData.widgetReady ? '✅ Yes' : '❌ No');
  
  console.log('\n🖼️ Widget Status:');
  const iframe = document.querySelector('iframe[src*="kovaldeepai-main.vercel.app"]');
  console.log('   • Iframe found:', iframe ? '✅ Yes' : '❌ No');
  if (iframe) {
    console.log('   • Iframe src:', iframe.src);
  }
  
  console.log('================================================');
}

// Make diagnostics globally available - with proper window check
try {
  if (typeof window !== 'undefined' && window) {
    window.runDiagnostics = runDiagnostics;
    window.sessionData = sessionData;
  }
} catch (error) {
  console.warn('⚠️ Could not attach diagnostics to window:', error.message);
}

console.log('✅ Koval AI Widget V6.0 - Clean Implementation Loaded Successfully!');
