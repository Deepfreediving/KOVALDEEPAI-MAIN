# Wix Page Error Fixes - Step by Step Guide

## The Problem

Your Wix page is showing "no-undef" errors because these functions are not defined:

- `loadUserData` (lines 696, 775)
- `getGuestUserData` (lines 715, 797)
- `showFallbackMessage` (lines 745, 754)
- `setupWidgetEventHandlers` (line 866)

## The Solution

### Step 1: Copy the Function Definitions

Copy the entire contents of `WIX_PAGE_ERROR_FIXES.js` and paste it **at the top** of your Wix page code, right after any import statements.

### Step 2: Verify Function Placement

Make sure the functions are defined **before** they are called. The order should be:

```javascript
// Imports (if any)
import wixUsers from "wix-users";
import wixData from "wix-data";

// PASTE THE FUNCTION DEFINITIONS HERE (from WIX_PAGE_ERROR_FIXES.js)

// Your existing page code below...
```

### Step 3: Test Each Function

After adding the functions, test that each one works:

1. **loadUserData()** - Should load user profile and dive logs
2. **getGuestUserData()** - Should create guest user data
3. **showFallbackMessage()** - Should show error messages
4. **setupWidgetEventHandlers()** - Should handle widget communication

### Step 4: Verify Widget Communication

The functions will automatically:

- ✅ Set up communication with your widget
- ✅ Load user data when the page loads
- ✅ Send user data to the widget
- ✅ Handle widget messages

## Function Details

### loadUserData()

- Checks if user is logged in
- Loads profile from 'memberProfiles' collection
- Loads dive logs from 'userMemory' collection
- Returns complete user data object

### getGuestUserData()

- Creates guest user with timestamp-based ID
- Provides default empty profile
- Used when user is not logged in

### showFallbackMessage()

- Shows error messages to users
- Handles service unavailable scenarios
- Logs messages for debugging

### setupWidgetEventHandlers()

- Sets up message listeners for widget communication
- Handles 'REQUEST_USER_DATA' messages
- Enables two-way communication with widget

## Expected Result

After implementing these fixes:

- ✅ All "no-undef" errors will be resolved
- ✅ Widget will receive user data properly
- ✅ User authentication will work seamlessly
- ✅ Dive logs will sync between Wix and widget

## Testing Checklist

1. [ ] Page loads without errors
2. [ ] Widget appears and loads correctly
3. [ ] User data is passed to widget
4. [ ] Chat functionality works
5. [ ] Dive logs are accessible

## Deployment Notes

- These functions are backward compatible
- No existing functionality will be broken
- Functions handle errors gracefully
- Guest users are supported

## Support

If you still see errors after implementing these fixes:

1. Check the browser console for specific error messages
2. Verify all function names match exactly
3. Ensure functions are placed before they are called
4. Test with both logged-in and guest users

---

**Status**: Ready to implement
**Risk**: Low (only adds missing functions)
**Time**: 5 minutes to copy/paste and test
