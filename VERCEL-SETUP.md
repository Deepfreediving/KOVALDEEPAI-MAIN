# 🔧 Vercel Deployment Protection Setup Guide

## Get Your VERCEL_AUTOMATION_BYPASS_SECRET

### Step 1: Go to Vercel Dashboard
1. Visit [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your `kovaldeepai-main` project

### Step 2: Enable Automation Bypass
1. Go to **Settings** → **Deployment Protection**
2. Find **"Standard Protection"** section
3. Click **"Configure Automation Bypass"**
4. Enable **"Automation Bypass"**
5. Copy the generated **Secret**

### Step 3: Add to Environment Variables
1. In Vercel Dashboard: **Settings** → **Environment Variables**
2. Add: `VERCEL_AUTOMATION_BYPASS_SECRET` = `your_copied_secret`
3. Set for: **Production**, **Preview**, **Development**
4. Click **Save**

### Step 4: Redeploy
1. Go to **Deployments** tab
2. Click **"Redeploy"** on latest deployment
3. Or push new commit to trigger deployment

## Alternative: Use Vercel CLI
```bash
# Set environment variable via CLI
vercel env add VERCEL_AUTOMATION_BYPASS_SECRET

# Redeploy
vercel --prod
```

## What This Fixes
- ✅ Resolves 401 "Authentication Required" errors on API endpoints
- ✅ Allows server-to-server API calls to work properly
- ✅ Maintains security while enabling automation

## Important Notes
- This secret is **project-specific**
- Keep it **private** (don't commit to git)
- Only needed for **production** deployments
- Local development works without it
