// 🔥 WIX BLOCKS PAGE CODE - KOVAL AI INTEGRATION
// For use with <koval-ai> custom element in Wix Blocks
// This handles Wix Storage, Collections, and Member authentication

import wixData from 'wix-data';
import wixStorage from 'wix-storage-frontend';
import { currentMember } from 'wix-members-frontend';

// ===== CONFIGURATION =====
const CONFIG = {
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
  console.log('🚀 Wix Blocks - Koval AI Integration V6.0');
  
  // Initialize member session
  initializeMemberSession();
  
  // Setup message handling with widget
  setupWidgetMessageHandling();
});

// ===== MEMBER SESSION INITIALIZATION =====
async function initializeMemberSession() {
  try {
    console.log('🔍 Initializing member session...');
    
    const member = await currentMember.getMember();
    
    if (member && member.loggedIn && member._id) {
      console.log('✅ Authenticated member found');
      
      sessionData = {
        userId: member._id,
        memberId: member._id,
        userEmail: member.loginEmail,
        userName: member.profile?.nickname || member.profile?.firstName || member.loginEmail,
        nickname: member.profile?.nickname || 'Freediver',
        firstName: member.profile?.firstName || '',
        lastName: member.profile?.lastName || '',
        isAuthenticated: true,
        source: 'wix-blocks-authenticated',
        version: '6.0.0'
      };
      
      console.log('👤 Member session initialized:', {
        userId: sessionData.userId,
        userName: sessionData.userName,
        nickname: sessionData.nickname
      });
      
    } else {
      console.log('ℹ️ No authenticated member');
      sessionData = {
        userId: null,
        userName: 'Login Required',
        nickname: 'Login Required',
        isAuthenticated: false,
        source: 'wix-blocks-unauthenticated',
        requiresLogin: true,
        version: '6.0.0'
      };
    }
    
  } catch (error) {
    console.error('❌ Member session initialization failed:', error);
    sessionData.isAuthenticated = false;
  }
}

// ===== MESSAGE HANDLING WITH WIDGET =====
function setupWidgetMessageHandling() {
  console.log('📡 Setting up widget message handling...');
  
  window.addEventListener('message', async (event) => {
    // Security check
    const allowedOrigins = [
      'https://kovaldeepai-main.vercel.app',
      'http://localhost:3000'
    ];
    
    if (!allowedOrigins.includes(event.origin) && 
        !event.data?.source?.includes('koval-ai')) {
      return;
    }
    
    const { type, data } = event.data || {};
    
    console.log('📨 Received message from widget:', type);
    
    switch (type) {
      case 'REQUEST_USER_DATA':
        await handleUserDataRequest(event);
        break;
        
      case 'SAVE_DIVE_LOG':
        await handleSaveDiveLog(data);
        break;
        
      case 'GET_MEMBER_PROFILE':
        await handleGetMemberProfile(event);
        break;
        
      case 'SAVE_SESSION':
        handleSaveSession(data);
        break;
        
      default:
        console.log('ℹ️ Unknown message type:', type);
    }
  });
}

// ===== HANDLE USER DATA REQUEST =====
async function handleUserDataRequest(event) {
  console.log('👤 Widget requesting user data...');
  
  try {
    // Get fresh member data
    await initializeMemberSession();
    
    // Send response to widget
    const response = {
      type: 'USER_DATA_RESPONSE',
      userData: sessionData
    };
    
    console.log('📤 Sending user data to widget:', {
      userId: sessionData.userId,
      isAuthenticated: sessionData.isAuthenticated,
      source: sessionData.source
    });
    
    // Send to widget
    event.source.postMessage(response, event.origin);
    
  } catch (error) {
    console.error('❌ Failed to handle user data request:', error);
    
    // Send error response
    event.source.postMessage({
      type: 'USER_DATA_ERROR',
      error: error.message
    }, event.origin);
  }
}

// ===== HANDLE DIVE LOG SAVE =====
async function handleSaveDiveLog(diveLogData) {
  console.log('💾 Saving dive log to Wix collection...');
  
  if (!sessionData.isAuthenticated || !sessionData.userId) {
    console.error('❌ Cannot save dive log: User not authenticated');
    return;
  }
  
  try {
    const diveLogEntry = {
      userId: sessionData.userId,
      memberId: sessionData.memberId,
      diveLogId: diveLogData.diveLogId || `dive-${Date.now()}`,
      logEntry: JSON.stringify(diveLogData.logEntry || diveLogData),
      diveDate: diveLogData.diveDate || new Date().toISOString().split('T')[0],
      diveTime: diveLogData.diveTime || new Date().toTimeString().split(' ')[0],
      watchedPhoto: diveLogData.watchedPhoto || null,
      timestamp: new Date(),
      source: 'wix-blocks-v6.0'
    };
    
    console.log('📋 Dive log entry prepared:', {
      userId: diveLogEntry.userId,
      diveLogId: diveLogEntry.diveLogId,
      hasLogEntry: !!diveLogEntry.logEntry
    });
    
    // Save to Wix collection
    const result = await wixData.save(CONFIG.COLLECTIONS.DIVE_LOGS, diveLogEntry);
    
    console.log('✅ Dive log saved successfully:', result._id);
    
    // Update user data counts (optional)
    await updateUserDataCounts();
    
    return result;
    
  } catch (error) {
    console.error('❌ Failed to save dive log:', error);
    throw error;
  }
}

// ===== HANDLE GET MEMBER PROFILE =====
async function handleGetMemberProfile(event) {
  console.log('👤 Widget requesting member profile...');
  
  try {
    if (!sessionData.isAuthenticated) {
      event.source.postMessage({
        type: 'MEMBER_PROFILE_RESPONSE',
        profile: null,
        error: 'Not authenticated'
      }, event.origin);
      return;
    }
    
    // Get full member data from collection
    const memberResults = await wixData.query(CONFIG.COLLECTIONS.MEMBERS)
      .eq('_id', sessionData.userId)
      .find();
    
    let fullProfile = sessionData;
    
    if (memberResults.items.length > 0) {
      const memberData = memberResults.items[0];
      fullProfile = {
        ...sessionData,
        firstName: memberData.firstName || sessionData.firstName,
        lastName: memberData.lastName || sessionData.lastName,
        nickname: memberData.nickname || sessionData.nickname,
        profilePicture: memberData.profilePicture || '',
        bio: memberData.bio || '',
        experience: memberData.experience || '',
        source: 'wix-blocks-members-collection'
      };
    }
    
    event.source.postMessage({
      type: 'MEMBER_PROFILE_RESPONSE',
      profile: fullProfile
    }, event.origin);
    
    console.log('📤 Sent member profile to widget');
    
  } catch (error) {
    console.error('❌ Failed to get member profile:', error);
    
    event.source.postMessage({
      type: 'MEMBER_PROFILE_RESPONSE',
      profile: null,
      error: error.message
    }, event.origin);
  }
}

// ===== HANDLE SAVE SESSION =====
function handleSaveSession(sessionData) {
  console.log('💾 Saving session data...');
  
  try {
    // Save to Wix storage
    wixStorage.setItem('koval_ai_session', JSON.stringify(sessionData));
    console.log('✅ Session saved to Wix storage');
    
  } catch (error) {
    console.warn('⚠️ Failed to save session:', error);
  }
}

// ===== UPDATE USER DATA COUNTS =====
async function updateUserDataCounts() {
  if (!sessionData.userId) return;
  
  try {
    // Count dive logs for this user
    const diveLogResults = await wixData.query(CONFIG.COLLECTIONS.DIVE_LOGS)
      .eq('userId', sessionData.userId)
      .find();
    
    const diveLogsCount = diveLogResults.totalCount || 0;
    
    console.log(`📊 User has ${diveLogsCount} dive logs`);
    
    // Send update to widget
    const updateMessage = {
      type: 'USER_DATA_UPDATE',
      userData: {
        ...sessionData,
        diveLogsCount: diveLogsCount,
        lastUpdated: new Date().toISOString()
      }
    };
    
    // Broadcast to all potential widget instances
    window.postMessage(updateMessage, '*');
    
  } catch (error) {
    console.warn('⚠️ Failed to update user data counts:', error);
  }
}

// ===== DIAGNOSTIC FUNCTIONS =====
window.runWixBlocksDiagnostics = function() {
  console.log('🔍 Wix Blocks Diagnostics');
  console.log('========================');
  
  console.log('🌐 Environment:');
  console.log('   • wixData:', typeof wixData !== 'undefined' ? '✅' : '❌');
  console.log('   • wixStorage:', typeof wixStorage !== 'undefined' ? '✅' : '❌');
  console.log('   • currentMember:', typeof currentMember !== 'undefined' ? '✅' : '❌');
  
  console.log('\n🔐 Session Data:');
  console.log('   • User ID:', sessionData.userId);
  console.log('   • Authenticated:', sessionData.isAuthenticated);
  console.log('   • Source:', sessionData.source);
  
  console.log('\n🎛️ Widget:');
  const widget = document.querySelector('koval-ai');
  console.log('   • Widget Element:', !!widget ? '✅' : '❌');
  
  if (widget) {
    console.log('   • Widget Ready:', widget.isReady || false);
  }
  
  console.log('\n📊 Collections:');
  console.log('   • DiveLogs:', CONFIG.COLLECTIONS.DIVE_LOGS);
  console.log('   • Members:', CONFIG.COLLECTIONS.MEMBERS);
};

console.log('✅ Wix Blocks Koval AI Integration V6.0 loaded');
console.log('📞 Run runWixBlocksDiagnostics() in console for debugging');
