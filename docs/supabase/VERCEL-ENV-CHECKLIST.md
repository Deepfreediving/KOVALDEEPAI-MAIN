# Vercel Environment Variables Setup

## 🔑 Required Variables

### OpenAI Configuration

- OPENAI_API_KEY=[Copy from your .env.local]
- OPENAI_MODEL=gpt-4
- OPENAI_ORG=[Copy from your .env.local]
- OPENAI_ASSISTANT_ID=[Copy from your .env.local]
- OPENAI_PROJECT_ID=[Copy from your .env.local]
- OPENAI_API_URL=https://api.openai.com/v1

### Pinecone Configuration

- PINECONE_API_KEY=[Copy from your .env.local]
- PINECONE_HOST=[Copy from your .env.local]
- PINECONE_INDEX=[Copy from your .env.local]
- PINECONE_ENVIRONMENT=[Copy from your .env.local]

### App Configuration (CRITICAL FOR PRODUCTION)

- NEXT_PUBLIC_APP_URL=https://kovaldeepai-main.vercel.app
- ADMIN_USER_ID=daniel-koval-admin

## ✅ Already Set in Vercel

- NEXT_PUBLIC_SUPABASE_URL ✅
- NEXT_PUBLIC_SUPABASE_ANON_KEY ✅
- SUPABASE_SERVICE_ROLE_KEY ✅
- SUPABASE_URL ✅
- SUPABASE_ANON_KEY ✅
- SUPABASE_JWT_SECRET ✅
- POSTGRES_PASSWORD ✅
- POSTGRES_URL ✅

## 🎯 Action Items:

1. Add NEXT_PUBLIC_APP_URL=https://kovaldeepai-main.vercel.app to Vercel
2. Add ADMIN_USER_ID=daniel-koval-admin to Vercel
3. Verify OpenAI and Pinecone variables are set (copy values from .env.local)
4. Redeploy the application
