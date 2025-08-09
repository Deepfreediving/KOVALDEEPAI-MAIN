// 🔥 KOVAL DEEP AI - WIX PAGE CODE (ERROR-FREE VERSION)
// Copy this entire code into your Wix page editor to replace existing code
// Version: 4.0.0 - Null-safe Master Edition
// Date: August 9, 2025

import wixData from 'wix-data';
import wixUsers from 'wix-users';
import wixWindow from 'wix-window';
import { currentMember } from 'wix-members';

// 🛡️ BULLETPROOF ERROR HANDLERS
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.error('🚨 Page error caught:', event?.error || event);
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 Unhandled rejection:', event?.reason || event);
  });
}

// 🎯 SAFE CONFIGURATION
const PAGE_CONFIG = {
  WIDGET_IDS: ['#koval-ai', '#KovalAIFrame', '#kovalAIFrame', '#KovalAiWidget', '#kovalAIWidget'],
  DEBUG: true
};

// 🔥 BULLETPROOF USER DATA LOADER
async function loadUserDataSafely() {
  try {
    const currentUser = await wixUsers.getCurrentUser();
    
    if (currentUser && currentUser.loggedIn) {
      return {
        userId: currentUser.id,
        displayName: currentUser.nickname || currentUser.displayName || 'User',
        loginEmail: currentUser.loginEmail || '',
        isAuthenticated: true,
        isGuest: false
      };
    } else {
      return {
        userId: `guest-${Date.now()}`,
        displayName: 'Guest User',
        loginEmail: '',
        isAuthenticated: false,
        isGuest: true
      };
    }
  } catch (error) {
    console.error('❌ Error loading user data:', error);
    return {
      userId: `guest-${Date.now()}`,
      displayName: 'Guest User',
      loginEmail: '',
      isAuthenticated: false,
      isGuest: true
    };
  }
}

// 🔥 BULLETPROOF WIDGET FINDER
function findWidgetSafely() {
  for (const id of PAGE_CONFIG.WIDGET_IDS) {
    try {
      const widget = $w(id);
      if (widget) {
        console.log(`✅ Found widget: ${id}`);
        return widget;
      }
    } catch (e) {
      // Continue searching
    }
  }
  console.warn('⚠️ No widget found');
  return null;
}

// 🔥 BULLETPROOF MESSAGE HANDLER
function handleWidgetMessage(event) {
  try {
    // ✅ COMPREHENSIVE NULL SAFETY CHECKS
    if (!event) {
      console.warn('⚠️ Null event received');
      return;
    }
    
    if (!event.data) {
      console.warn('⚠️ Event missing data');
      return;
    }
    
    if (typeof event.data !== 'object') {
      console.warn('⚠️ Event data is not an object:', typeof event.data);
      return;
    }
    
    if (!event.data.hasOwnProperty('type')) {
      console.warn('⚠️ Event data missing type property');
      return;
    }
    
    if (!event.data.type || typeof event.data.type !== 'string') {
      console.warn('⚠️ Invalid type in message:', event.data.type);
      return;
    }
    
    // ✅ SAFE TYPE ACCESS
    const messageType = event.data?.type;
    const messageData = event.data?.data;
    
    console.log('📨 Widget message received:', messageType);
    
    // Handle different message types safely
    switch (messageType) {
      case 'REQUEST_USER_DATA':
        handleUserDataRequest(event);
        break;
        
      case 'WIDGET_READY':
        handleWidgetReady(event);
        break;
        
      case 'SAVE_DIVE_LOG':
        if (messageData) {
          handleDiveLogSave(messageData);
        }
        break;
        
      default:
        console.log('❓ Unknown message type:', messageType);
    }
    
  } catch (error) {
    console.error('❌ Error handling widget message:', error);
  }
}

// 🔥 SAFE USER DATA REQUEST HANDLER
async function handleUserDataRequest(event) {
  try {
    const userData = await loadUserDataSafely();
    
    if (event && event.source && event.source.postMessage) {
      event.source.postMessage({
        type: 'USER_DATA_RESPONSE',
        userData: userData
      }, event.origin);
      
      console.log('📤 Sent user data to widget');
    }
  } catch (error) {
    console.error('❌ Error handling user data request:', error);
  }
}

// 🔥 SAFE WIDGET READY HANDLER
async function handleWidgetReady(event) {
  try {
    console.log('🎉 Widget ready');
    // Send initial user data
    await handleUserDataRequest(event);
  } catch (error) {
    console.error('❌ Error handling widget ready:', error);
  }
}

// 🔥 SAFE DIVE LOG SAVE HANDLER
async function handleDiveLogSave(diveLogData) {
  try {
    console.log('💾 Saving dive log:', diveLogData);
    
    const currentUser = await wixUsers.getCurrentUser();
    if (!currentUser || !currentUser.loggedIn) {
      console.warn('⚠️ User not logged in, cannot save dive log');
      return;
    }
    
    // Prepare dive log data safely
    const safeData = {
      userId: currentUser.id,
      diveDate: diveLogData?.diveDate || new Date(),
      location: diveLogData?.location || '',
      depth: diveLogData?.depth || 0,
      time: diveLogData?.time || 0,
      notes: diveLogData?.notes || '',
      timestamp: new Date()
    };
    
    // Save to database safely
    try {
      const result = await wixData.insert('userMemory', safeData);
      console.log('✅ Dive log saved:', result._id);
    } catch (dbError) {
      console.error('❌ Database save failed:', dbError);
    }
    
  } catch (error) {
    console.error('❌ Error saving dive log:', error);
  }
}

// 🔥 SAFE PAGE INITIALIZATION
$w.onReady(async function () {
  try {
    console.log('🚀 Koval AI page initializing...');
    
    // Setup global message listener with bulletproof error handling
    if (typeof window !== 'undefined') {
      window.addEventListener('message', (event) => {
        try {
          handleWidgetMessage(event);
        } catch (error) {
          console.error('❌ Global message handler error:', error);
        }
      });
      console.log('👂 Message listener active');
    }
    
    // Find widget safely
    const widget = findWidgetSafely();
    if (widget) {
      console.log('✅ Widget found and ready');
      
      // Load and send user data
      try {
        const userData = await loadUserDataSafely();
        
        // Send data to widget if possible
        if (widget.postMessage && typeof widget.postMessage === 'function') {
          widget.postMessage({
            type: 'USER_AUTH',
            data: userData
          });
          console.log('📤 Initial user data sent to widget');
        }
      } catch (userError) {
        console.error('❌ Error loading initial user data:', userError);
      }
    }
    
    console.log('✅ Page initialization complete');
    
  } catch (error) {
    console.error('❌ Critical page initialization error:', error);
  }
});

// 🔥 SAFE EDIT MODE HANDLER
if (typeof wixWindow !== 'undefined' && wixWindow.onEditModeChange) {
  wixWindow.onEditModeChange((isEditMode) => {
    try {
      console.log(`🎛️ Edit mode: ${isEditMode ? 'EDIT' : 'PREVIEW'}`);
      
      // Send edit mode change to widget
      const widget = findWidgetSafely();
      if (widget && widget.postMessage && typeof widget.postMessage === 'function') {
        widget.postMessage({
          type: 'EDIT_MODE_CHANGE',
          data: { editMode: isEditMode }
        });
      }
    } catch (error) {
      console.error('❌ Edit mode handler error:', error);
    }
  });
}

console.log('🔥 Koval AI Page Code v4.0.0 - Bulletproof Edition Loaded');
