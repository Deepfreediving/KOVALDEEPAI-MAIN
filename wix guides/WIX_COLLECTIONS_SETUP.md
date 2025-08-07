# Wix Collections/Members Integration Setup Guide

## Overview

This update enables the Koval AI widget to pull rich user profile data from Wix Collections/Members database instead of just basic user info, showing real names instead of "Guest User".

## Files Created/Updated

### 1. Backend Function: `http-getUserProfile.jsw`

- **Purpose**: Fetches user profile data from Wix Collections/Members
- **Location**: Upload this to your Wix site's Backend code section
- **Features**:
  - Queries the Members collection for rich profile data
  - Falls back to basic Wix Users API if collection is unavailable
  - Returns structured user profile with name, email, profile picture, etc.

### 2. Updated Widget Loader: `wix-widget-loader-v3.js`

- **Purpose**: Enhanced Wix Blocks integration that uses the backend function
- **Location**: Use this in your Wix Blocks Custom Element
- **Features**:
  - Calls the backend function to get rich user profile data
  - Sends complete profile information to the embed
  - Better error handling and fallbacks

### 3. Updated Embed Page: `pages/embed.jsx`

- **Purpose**: Improved handling of rich profile data from Wix Collections
- **Features**:
  - Processes rich profile data from Collections/Members
  - Displays actual user names instead of "Guest User"
  - Stores complete profile information locally

## Setup Instructions

### Step 1: Upload Backend Function

1. Go to your Wix site's **Developer Tools** > **Backend Code**
2. Create a new file named `http-getUserProfile.jsw`
3. Copy the entire content from the `http-getUserProfile.jsw` file
4. Save and publish your site

### Step 2: Update Widget Loader

1. Go to your **Wix Blocks** element in the editor
2. Replace your current Custom Element code with the updated `wix-widget-loader-v3.js`
3. Make sure the iframe element ID is still `#KovalAIFrame`
4. Save your Blocks element

### Step 3: Test the Integration

1. Publish your Wix site
2. Log in as a user with a profile in your Members collection
3. Load the page with the Koval AI widget
4. Check the browser console for logs showing user profile detection
5. Verify that the widget shows the real user name instead of "Guest User"

## Expected Console Logs

When working correctly, you should see logs like:

```
🔍 Fetching user profile from Wix Collections/Members...
✅ User profile data received: {user: {displayName: "John Smith", ...}}
👤 Rich user profile data sent to embed: {userName: "John Smith", ...}
✅ Rich profile updated with Collections/Members data
```

## Troubleshooting

### If still showing "Guest User":

1. **Check backend function**: Ensure `http-getUserProfile.jsw` is properly uploaded
2. **Verify collection access**: Make sure your Members collection has proper permissions
3. **Check user login**: Ensure the user is actually logged into your Wix site
4. **Console logs**: Look for error messages in the browser console

### Common Issues:

- **Members collection not found**: The backend will fall back to basic Wix Users API
- **Permission errors**: Ensure your app has access to read from the Members collection
- **Network errors**: Check that the `/_functions/getUserProfile` endpoint is accessible

## Data Flow

1. User loads page with Koval AI widget
2. Widget loader calls `/_functions/getUserProfile` backend function
3. Backend queries Wix Collections/Members for user data
4. Rich profile data is sent to the embed iframe
5. Embed displays actual user name instead of "Guest User"

## Supported Profile Fields

- Display Name / Full Name
- First Name / Last Name
- Email Address
- Profile Picture
- Phone Number
- Bio/Description
- Location/City
- Custom Fields (if any)

The system intelligently combines available data to create the best possible display name for each user.
