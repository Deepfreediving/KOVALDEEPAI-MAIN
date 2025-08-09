// COPY THIS CODE TO YOUR WIX PAGE TO FIX ALL ERRORS
// Place this at the top of your page code, after the imports

import wixUsers from 'wix-users';
import wixData from 'wix-data';

// ✅ ALL MISSING FUNCTION DEFINITIONS FIXED

// Function: loadUserData (fixes lines 696, 775)
export async function loadUserData() {
  try {
    const user = await wixUsers.currentUser;
    
    if (user.loggedIn) {
      // Get user profile data
      const userProfile = await wixData.query('memberProfiles')
        .eq('userId', user.id)
        .find()
        .catch(() => ({ items: [] }));
      
      // Get user memory data  
      const userMemory = await wixData.query('userMemory')
        .eq('userId', user.id)
        .find()
        .catch(() => ({ items: [] }));
      
      return {
        userId: user.id,
        profile: {
          displayName: user.nickname || user.displayName || userProfile.items[0]?.firstName || 'User',
          nickname: user.nickname || userProfile.items[0]?.firstName || 'User',
          loginEmail: user.loginEmail || '',
          firstName: userProfile.items[0]?.firstName || '',
          lastName: userProfile.items[0]?.lastName || '',
          profilePhoto: user.picture || userProfile.items[0]?.profilePicture || ''
        },
        userDiveLogs: userMemory.items[0]?.diveLogs || [],
        userMemories: userMemory.items[0]?.memories || []
      };
    } else {
      return getGuestUserData();
    }
  } catch (error) {
    console.error('Error loading user data:', error);
    return getGuestUserData();
  }
}

// Function: getGuestUserData (fixes lines 715, 797)
export function getGuestUserData() {
  return {
    userId: `guest-${Date.now()}`,
    profile: {
      displayName: 'Guest User',
      nickname: 'Guest User',
      loginEmail: '',
      firstName: '',
      lastName: '',
      profilePhoto: ''
    },
    userDiveLogs: [],
    userMemories: [],
    isGuest: true
  };
}

// Function: showFallbackMessage (fixes lines 745, 754)
export function showFallbackMessage(message = "Service temporarily unavailable") {
  console.log('Fallback message:', message);
  
  // Try to show user notification
  try {
    if ($w('#errorText')) {
      $w('#errorText').text = message;
      $w('#errorText').show();
    }
  } catch (e) {
    console.warn('Koval AI:', message);
  }
}

// Function: setupWidgetEventHandlers (fixes line 866)
export function setupWidgetEventHandlers() {
  console.log('Setting up widget event handlers...');
  
  // Enhanced message handling for Wix
  const handleWidgetMessage = (event) => {
    if (!event.origin.includes('kovaldeepai') && !event.origin.includes('localhost')) {
      return;
    }
    
    console.log('Widget message:', event.data);
    
    switch (event.data?.type) {
      case 'REQUEST_USER_DATA':
        sendUserDataToWidget();
        break;
      case 'WIDGET_READY':
        sendUserDataToWidget();
        break;
      case 'SAVE_DIVE_LOG':
        handleDiveLogSave(event.data.diveLog);
        break;
    }
  };
  
  // Listen for widget messages
  if (typeof window !== 'undefined') {
    window.addEventListener('message', handleWidgetMessage);
  }
  
  // Also handle via Wix messaging if available
  try {
    if ($w('#kovalWidget')) {
      $w('#kovalWidget').onMessage((type, data) => {
        console.log('Wix widget message:', type, data);
        handleWidgetMessage({ data: { type, ...data } });
      });
    }
  } catch (e) {
    console.log('Wix messaging not available, using standard postMessage');
  }
}

// Helper function: sendUserDataToWidget
export async function sendUserDataToWidget() {
  try {
    const userData = await loadUserData();
    
    // Send via multiple methods for reliability
    
    // Method 1: Direct postMessage to widget iframe
    try {
      const widget = $w('#kovalWidget');
      if (widget && widget.postMessage) {
        widget.postMessage({
          type: 'USER_DATA_RESPONSE',
          userData: userData,
          timestamp: Date.now()
        });
      }
    } catch (e) {
      console.log('Wix postMessage failed, trying window postMessage');
    }
    
    // Method 2: Window postMessage
    try {
      if (typeof window !== 'undefined') {
        window.postMessage({
          type: 'USER_AUTH',
          data: userData,
          timestamp: Date.now()
        }, '*');
      }
    } catch (e) {
      console.log('Window postMessage failed');
    }
    
    console.log('User data sent to widget:', userData);
  } catch (error) {
    console.error('Error sending user data to widget:', error);
    showFallbackMessage('Could not load user profile');
  }
}

// Helper function: handleDiveLogSave
export async function handleDiveLogSave(diveLogData) {
  try {
    const user = await wixUsers.currentUser;
    if (!user.loggedIn) {
      console.warn('Cannot save dive log - user not logged in');
      return;
    }
    
    // Get or create user memory record
    let userMemory = await wixData.query('userMemory')
      .eq('userId', user.id)
      .find();
    
    if (userMemory.items.length === 0) {
      // Create new user memory record
      await wixData.insert('userMemory', {
        userId: user.id,
        diveLogs: [diveLogData],
        memories: [],
        createdAt: new Date()
      });
    } else {
      // Update existing record
      const existing = userMemory.items[0];
      const updatedDiveLogs = [diveLogData, ...(existing.diveLogs || [])];
      
      await wixData.update('userMemory', {
        _id: existing._id,
        diveLogs: updatedDiveLogs,
        updatedAt: new Date()
      });
    }
    
    console.log('Dive log saved successfully');
  } catch (error) {
    console.error('Error saving dive log:', error);
  }
}

// ✅ AUTO-INITIALIZE
$w.onReady(() => {
  console.log('Page ready, initializing widget handlers...');
  setupWidgetEventHandlers();
  
  // Send user data after a short delay
  setTimeout(() => {
    sendUserDataToWidget();
  }, 1000);
  
  // Set up periodic health check
  setInterval(() => {
    try {
      const widget = $w('#kovalWidget');
      if (widget) {
        widget.postMessage({
          type: 'HEALTH_CHECK',
          timestamp: Date.now()
        });
      }
    } catch (e) {
      // Ignore health check errors
    }
  }, 30000);
});

// ✅ GLOBAL ASSIGNMENTS FOR BACKWARD COMPATIBILITY
global.loadUserData = loadUserData;
global.getGuestUserData = getGuestUserData;
global.showFallbackMessage = showFallbackMessage;
global.setupWidgetEventHandlers = setupWidgetEventHandlers;
global.sendUserDataToWidget = sendUserDataToWidget;
global.handleDiveLogSave = handleDiveLogSave;
