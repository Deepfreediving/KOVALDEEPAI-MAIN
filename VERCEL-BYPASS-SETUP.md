/**
 * 🛡️ VERCEL DEPLOYMENT PROTECTION SETUP GUIDE
 * 
 * ISSUE: API endpoints are being blocked by Vercel's deployment protection
 * SOLUTION: Add VERCEL_AUTOMATION_BYPASS_SECRET to environment variables
 */

## 🔧 HOW TO GET VERCEL_AUTOMATION_BYPASS_SECRET

### Step 1: Go to Vercel Dashboard
1. Visit: https://vercel.com/dashboard
2. Select your project: `kovaldeepai-main`

### Step 2: Configure Deployment Protection
1. Go to **Settings** → **General**
2. Scroll to **"Deployment Protection"**
3. Ensure **"Standard Protection"** is enabled
4. Find **"Automation Bypass Secret"** section
5. Click **"Generate Secret"** or copy existing one

### Step 3: Add to Environment Variables
1. Go to **Settings** → **Environment Variables**
2. Add new variable:
   - **Name**: `VERCEL_AUTOMATION_BYPASS_SECRET`
   - **Value**: `bypas_xxxxxxxxxxxxxxxxxx` (your generated secret)
   - **Environment**: All (Production, Preview, Development)

### Step 4: Redeploy
After adding the environment variable, redeploy your project.

## 🚀 ALTERNATIVE: Disable Protection for API Routes Only

If you prefer to keep protection on the main site but allow API access:

1. Go to **Settings** → **General** → **Deployment Protection**
2. Under **"Protection Bypass for Automation"**
3. Add these paths to bypass protection:
   ```
   /api/*
   /api/supabase/*
   /api/chat/*
   /api/debug/*
   ```

## 🔍 TESTING

After setup, test with:
```bash
curl -X GET "https://kovaldeepai-main.vercel.app/api/debug/save-debug"
```

Should return JSON instead of HTML authentication page.
