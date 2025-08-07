// ===== 📄 wix-user-debug.js =====
// Add this to your Wix page to debug user authentication issues

import wixUsers from 'wix-users';

// ✅ Add this to your Wix page's onReady function
export function debugUserAuthentication() {
    console.log("🔍 === USER AUTHENTICATION DEBUG ===");
    
    // Check current user status
    const currentUser = wixUsers.currentUser;
    console.log("👤 Current User Object:", currentUser);
    console.log("🔐 Is Logged In:", currentUser.loggedIn);
    console.log("🆔 User ID:", currentUser.id);
    console.log("📧 Login Email:", currentUser.loginEmail);
    console.log("👥 Display Name:", currentUser.displayName);
    
    // Check if user ID is valid format
    const userId = currentUser.id;
    const isValidUUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(userId || '');
    console.log("✅ Valid UUID Format:", isValidUUID);
    
    // Check for guest patterns
    const isGuest = userId && (userId.startsWith('guest-') || userId.startsWith('wix-guest-'));
    console.log("👻 Is Guest User:", isGuest);
    
    // Summary
    console.log("📋 SUMMARY:", {
        authenticated: currentUser.loggedIn,
        validUserId: userId && isValidUUID && !isGuest,
        userId: userId,
        displayName: currentUser.displayName || 'Unknown'
    });
    
    console.log("🔍 === END DEBUG ===");
    
    return {
        authenticated: currentUser.loggedIn,
        validUserId: userId && isValidUUID && !isGuest,
        userId: userId,
        displayName: currentUser.displayName || 'Unknown'
    };
}

// ✅ Usage in your Wix page:
// $w.onReady(() => {
//     debugUserAuthentication();
// });
