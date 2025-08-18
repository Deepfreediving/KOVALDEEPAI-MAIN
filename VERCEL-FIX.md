# Vercel Environment Variables Setup

## 🎯 CRITICAL: Add these to fix the app loading issue

### App Configuration (REQUIRED)
- `NEXT_PUBLIC_APP_URL=https://kovaldeepai-main.vercel.app`
- `ADMIN_USER_ID=daniel-koval-admin`

### OpenAI Configuration (if not already set)
- `OPENAI_API_KEY=[Copy from your .env.local]`
- `OPENAI_MODEL=gpt-4`

### Pinecone Configuration (if not already set)
- `PINECONE_API_KEY=[Copy from your .env.local]`
- `PINECONE_INDEX=[Copy from your .env.local]`

## Steps:
1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. Add the variables above (especially NEXT_PUBLIC_APP_URL)
3. Redeploy the application
4. The app should load at https://kovaldeepai-main.vercel.app
