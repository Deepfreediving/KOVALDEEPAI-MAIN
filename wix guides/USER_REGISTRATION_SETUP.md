# 🔐 Koval AI User Registration & Access Control Setup

## Overview

This setup handles user registration and access control for your Koval AI widget in Wix, ensuring only registered/paying users can access the full functionality.

## 🏗️ Architecture

```
Wix Site (Live Mode) → User Registration Check → Koval AI Widget Access
     ↓                        ↓                        ↓
User logs in → Check payment/registration → Grant/Deny widget access
```

## 📋 Setup Steps

### 1. **Database Setup (Wix Collections)**

Create a collection called `KovalAIRegistrations` with these fields:

```javascript
{
  "_id": "string",           // Auto-generated
  "userId": "string",        // Wix member ID
  "email": "string",         // User email
  "displayName": "string",   // User display name
  "plan": "string",          // basic, premium, etc.
  "status": "string",        // active, inactive, expired
  "isPaid": "boolean",       // Payment status
  "hasAccess": "boolean",    // Access granted
  "accessLevel": "string",   // standard, premium, admin
  "registrationSource": "string", // wix-widget, manual, etc.
  "expiryDate": "date",      // Access expiry (optional)
  "_createdDate": "date",    // Auto-generated
  "_updatedDate": "date"     // Auto-generated
}
```

### 2. **Backend Functions**

Upload `checkUserAccess.jsw` to your Wix backend (`/backend/checkUserAccess.jsw`)

### 3. **Page Code**

Add the page code to your Wix page where the widget is embedded:

1. Go to your Wix page in the Editor
2. Add the code from `koval-ai-page.js` to your page code
3. Update the widget element ID (`#kovalAiWidget` → your actual widget ID)

### 4. **Widget Integration**

The updated `bot-widget.js` now includes:

- Edit mode detection
- User registration verification
- Access control logic
- Better error handling

## 🎛️ How Edit Mode Works

### Edit Mode (Site Owner Editing)

- Widget shows with dashed border
- Limited functionality
- Displays "Edit Mode" indicator
- Useful for design/layout purposes

### Live Mode (Visitors Viewing)

- Full functionality for registered users
- Registration prompt for unregistered users
- Normal widget appearance

## 🔄 User Flow

### For Registered Users:

1. User visits your Wix site
2. Widget detects they're logged in
3. Backend verifies their registration/payment
4. Widget grants full access ✅

### For Unregistered Users:

1. User visits your Wix site
2. Widget detects no registration
3. Shows registration prompt
4. Redirects to registration/payment page ❌

### For Guest Users:

1. User visits your Wix site
2. Widget shows limited guest interface
3. Prompts to log in and register 👤

## 📝 Registration Options

### Option 1: Wix Pricing Plans

```javascript
// In your checkUserAccess.jsw
import { currentMember } from "wix-pricing-plans";

const memberOrders = await currentMember.getCurrentMemberOrders();
const hasActivePlan = memberOrders.some((order) => order.status === "ACTIVE");
```

### Option 2: Custom Database

```javascript
// Check your KovalAIRegistrations collection
const registration = await wixData
  .query("KovalAIRegistrations")
  .eq("userId", member._id)
  .eq("status", "active")
  .find();
```

### Option 3: Wix Members Groups

```javascript
// Check if user is in specific member group
const memberGroups = member.profile.members.groups || [];
const hasKovalAccess = memberGroups.includes("KovalAI-Premium");
```

## 🔧 Customization

### Change Access Levels

```javascript
// In handleRegisteredUser()
accessLevel: accessData.accessLevel || "standard";
// Options: 'basic', 'standard', 'premium', 'admin'
```

### Customize Registration URL

```javascript
// In handleUnregisteredUser()
registrationUrl: "/your-custom-registration-page";
```

### Modify Error Behavior

```javascript
// In verifyUserAccess() catch block
// Set to false to deny access on errors, true to allow
hasAccess: false; // or true for permissive
```

## 🐛 Troubleshooting

### Widget Shows "Guest User" for Logged-in Users

- Check if `currentMember` API is working
- Verify user is actually logged in to Wix
- Check console for authentication errors

### Access Check Fails

- Verify backend function is published
- Check collection permissions
- Ensure user has proper member status

### Edit Mode Issues

- Check if `wixWindow.onEditModeChange` is available
- Verify widget is properly embedded (not just HTML iframe)

### Communication Issues

- Check browser console for postMessage errors
- Verify widget element ID matches page code
- Ensure CORS settings allow cross-origin communication

## 📊 Monitoring

Add these to track user access:

```javascript
// In checkUserAccess.jsw
console.log("🔍 Access attempt:", {
  userId,
  hasAccess: result.hasAccess,
  timestamp: new Date(),
});

// Optional: Save access logs to database
await wixData.insert("AccessLogs", {
  userId,
  hasAccess: result.hasAccess,
  accessLevel: result.accessLevel,
  timestamp: new Date(),
});
```

## 🚀 Deployment

1. **Test in Preview Mode:**
   - Test with logged-in users
   - Test with guest users
   - Verify registration flow

2. **Publish Backend Functions:**
   - Ensure `checkUserAccess.jsw` is published
   - Test API endpoints

3. **Publish Site:**
   - Publish your Wix site
   - Test live functionality
   - Monitor console for errors

## 🎯 Next Steps

1. Set up your registration/payment flow
2. Configure user groups or pricing plans
3. Test the complete user journey
4. Monitor access logs and user behavior
5. Adjust access levels as needed

This setup gives you complete control over who can access your Koval AI widget while maintaining a smooth user experience!
