// Wix Page Utility Functions - Missing Function Definitions
// Place this code at the top of your Wix page after imports

// ✅ LOAD USER DATA FUNCTION
async function loadUserData() {
  try {
    console.log('🔍 Loading user data...');
    
    // Check if user is logged in
    const user = await wixUsers.currentUser;
    
    if (user.loggedIn) {
      console.log('✅ User is logged in:', user.id);
      
      // Get user profile from collections
      const userProfile = await wixData.query('memberProfiles')
        .eq('userId', user.id)
        .find();
      
      // Get user dive logs and memories
      const userMemory = await wixData.query('userMemory')
        .eq('userId', user.id)
        .find();
      
      const userData = {
        userId: user.id,
        profile: {
          displayName: user.nickname || user.displayName || userProfile.items[0]?.firstName || 'User',
          nickname: user.nickname || userProfile.items[0]?.firstName || 'User',
          loginEmail: user.loginEmail || '',
          firstName: userProfile.items[0]?.firstName || '',
          lastName: userProfile.items[0]?.lastName || '',
          profilePhoto: user.picture || userProfile.items[0]?.profilePicture || '',
          phone: userProfile.items[0]?.phone || '',
          bio: userProfile.items[0]?.bio || '',
          location: userProfile.items[0]?.location || ''
        },
        userDiveLogs: userMemory.items[0]?.diveLogs || [],
        userMemories: userMemory.items[0]?.memories || []
      };
      
      console.log('✅ User data loaded:', userData);
      return userData;
    } else {
      console.log('ℹ️ User not logged in');
      return getGuestUserData();
    }
  } catch (error) {
    console.error('❌ Error loading user data:', error);
    return getGuestUserData();
  }
}

// ✅ GET GUEST USER DATA FUNCTION
function getGuestUserData() {
  console.log('👤 Creating guest user data');
  
  return {
    userId: `guest-${Date.now()}`,
    profile: {
      displayName: 'Guest User',
      nickname: 'Guest User',
      loginEmail: '',
      firstName: '',
      lastName: '',
      profilePhoto: '',
      phone: '',
      bio: '',
      location: ''
    },
    userDiveLogs: [],
    userMemories: [],
    isGuest: true
  };
}

// ✅ SHOW FALLBACK MESSAGE FUNCTION
function showFallbackMessage(message = "Service temporarily unavailable") {
  console.log('⚠️ Showing fallback message:', message);
  
  // Show user-friendly message
  wixWindow.openLightbox('errorLightbox', {
    title: 'Connection Issue',
    message: message,
    buttonText: 'Try Again'
  }).catch(() => {
    // If lightbox fails, show simple alert
    console.log('📢 Fallback message:', message);
  });
}

// ✅ SETUP WIDGET EVENT HANDLERS FUNCTION
function setupWidgetEventHandlers() {
  console.log('🔧 Setting up widget event handlers...');
  
  // Listen for messages from the widget
  $w.onMessage((type, data) => {
    console.log('📨 Received message from widget:', type, data);
    
    switch (type) {
      case 'WIDGET_READY':
        console.log('✅ Widget is ready');
        sendUserDataToWidget();
        break;
        
      case 'REQUEST_USER_DATA':
        console.log('🔍 Widget requesting user data');
        sendUserDataToWidget();
        break;
        
      case 'SAVE_DIVE_LOG':
        console.log('💾 Widget wants to save dive log:', data);
        handleDiveLogSave(data);
        break;
        
      case 'WIDGET_ERROR':
        console.error('🚨 Widget error:', data);
        showFallbackMessage('Widget encountered an error. Please refresh the page.');
        break;
        
      default:
        console.log('📝 Unknown message type:', type);
    }
  });
  
  // Also listen for postMessage events (for iframe communication)
  if (typeof window !== 'undefined') {
    window.addEventListener('message', (event) => {
      // Security check
      if (!event.origin.includes('kovaldeepai') && !event.origin.includes('localhost')) {
        return;
      }
      
      console.log('📨 PostMessage from widget:', event.data);
      
      switch (event.data?.type) {
        case 'REQUEST_USER_DATA':
          sendUserDataToWidget();
          break;
          
        case 'SAVE_DIVE_LOG':
          handleDiveLogSave(event.data.diveLog);
          break;
      }
    });
  }
}

// ✅ SEND USER DATA TO WIDGET FUNCTION
async function sendUserDataToWidget() {
  try {
    console.log('📤 Sending user data to widget...');
    
    const userData = await loadUserData();
    
    // Send via Wix messaging API
    $w('#kovalWidget').postMessage({
      type: 'USER_DATA_RESPONSE',
      userData: userData,
      timestamp: Date.now()
    });
    
    // Also send via postMessage for iframe
    const widget = $w('#kovalWidget');
    if (widget && widget.src) {
      widget.postMessage({
        type: 'USER_AUTH',
        data: userData,
        timestamp: Date.now()
      });
    }
    
    console.log('✅ User data sent to widget');
  } catch (error) {
    console.error('❌ Error sending user data to widget:', error);
    showFallbackMessage('Could not load user data');
  }
}

// ✅ HANDLE DIVE LOG SAVE FUNCTION
async function handleDiveLogSave(diveLogData) {
  try {
    console.log('💾 Saving dive log to Wix:', diveLogData);
    
    const user = await wixUsers.currentUser;
    if (!user.loggedIn) {
      console.warn('⚠️ Cannot save dive log - user not logged in');
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
    
    console.log('✅ Dive log saved to Wix successfully');
    
  } catch (error) {
    console.error('❌ Error saving dive log to Wix:', error);
  }
}

// ✅ INITIALIZE WIDGET FUNCTION
async function initializeWidget() {
  try {
    console.log('🚀 Initializing Koval AI widget...');
    
    // Setup event handlers
    setupWidgetEventHandlers();
    
    // Load and send user data
    setTimeout(async () => {
      await sendUserDataToWidget();
    }, 1000);
    
    // Check widget status periodically
    setInterval(() => {
      const widget = $w('#kovalWidget');
      if (widget) {
        widget.postMessage({
          type: 'HEALTH_CHECK',
          timestamp: Date.now()
        });
      }
    }, 30000); // Every 30 seconds
    
    console.log('✅ Widget initialization complete');
    
  } catch (error) {
    console.error('❌ Widget initialization failed:', error);
    showFallbackMessage('Could not initialize AI assistant');
  }
}

// ✅ AUTO-INITIALIZE ON PAGE READY
$w.onReady(() => {
  console.log('📄 Wix page ready, initializing widget...');
  initializeWidget();
});

// ✅ EXPORT FUNCTIONS FOR GLOBAL ACCESS
if (typeof window !== 'undefined') {
  window.loadUserData = loadUserData;
  window.getGuestUserData = getGuestUserData;
  window.showFallbackMessage = showFallbackMessage;
  window.setupWidgetEventHandlers = setupWidgetEventHandlers;
  window.sendUserDataToWidget = sendUserDataToWidget;
  window.handleDiveLogSave = handleDiveLogSave;
  window.initializeWidget = initializeWidget;
}
