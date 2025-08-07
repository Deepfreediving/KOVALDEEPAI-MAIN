# Koval Deep AI - Deployment Guide

## 🚀 Quick Deployment Steps

### 1. Wix Page Setup

- Copy the entire contents of `wix page/wix-frontend-page-code.js` into your Wix Page Code section
- This single file contains all the necessary code for:
  - User authentication and ID handling
  - Widget communication
  - Dataset integration
  - AI chat functionality

### 2. Wix Dataset Configuration

- Add a UserMemory dataset to your page
- Set filter: `userId equals Current User > ID`
- Reference the helper in `wix page/dataset-integration.js` if needed

### 3. Backend Functions

- Deploy all files from `Wix App/` folder (`http-*.jsw` files) as Wix backend functions
- Test connectivity with `test-backend-connection.js`

### 4. Widget Integration

- The widget (`public/bot-widget.js`) will automatically communicate with your Wix page
- The embed page (`pages/embed.jsx`) handles the AI interface

## 🔧 Key Files

- `wix page/wix-frontend-page-code.js` - **MAIN WIX PAGE CODE** (copy this entire file into your Wix Page Code section!)
- `wix page/dataset-integration.js` - Dataset helper functions (reference only, functionality is included in main page code)
- `wix page/data.js` - Your existing data hooks
- `Wix App/` - Backend functions (`http-*.jsw` files)
- `public/bot-widget.js` - Widget code
- `pages/embed.jsx` - Embed interface

## ✅ What's Fixed

- User/member ID logic and authentication
- Widget-to-page communication
- Dive log retrieval for AI context
- Dataset filtering for user-specific data
- All deployment and import errors

## 🎯 Result

Your AI will now have access to user-specific dive logs and memories for personalized coaching!
