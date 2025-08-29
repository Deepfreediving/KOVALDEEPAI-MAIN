# 🚀 Vercel Environment Variables Setup

⚠️ **SECURITY WARNING**: Never commit actual API keys to Git! This file contains only placeholders.

## Required Environment Variables for Production

**Copy the actual values from your local `.env.local` file to Vercel manually.**

### **Supabase Configuration**

```
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_[YOUR_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=sb_secret_[YOUR_SERVICE_ROLE_KEY]
```

### **Legacy Compatibility** (Optional but recommended)

```
SUPABASE_URL=https://[YOUR_PROJECT_ID].supabase.co
SUPABASE_ANON_KEY=sb_publishable_[YOUR_ANON_KEY]
```

### **OpenAI Configuration**

```
OPENAI_API_KEY=sk-proj-[YOUR_OPENAI_API_KEY_HERE]
OPENAI_MODEL=gpt-4
OPENAI_API_URL=https://api.openai.com/v1
OPENAI_ORG=org-[YOUR_ORG_ID]
OPENAI_ASSISTANT_ID=asst_[YOUR_ASSISTANT_ID]
OPENAI_PROJECT_ID=proj_[YOUR_PROJECT_ID]
```

### **Pinecone Configuration**

```
PINECONE_API_KEY=pcsk_[YOUR_PINECONE_API_KEY]
PINECONE_HOST=https://[YOUR_INDEX_NAME].svc.[REGION].pinecone.io
PINECONE_INDEX=[YOUR_INDEX_NAME]
PINECONE_ENVIRONMENT=[YOUR_ENVIRONMENT]
```

### **App Configuration**

```
BASE_URL=https://kovaldeepai-main.vercel.app
NODE_ENV=production
```

## 📝 How to Add to Vercel:

1. Go to your Vercel dashboard
2. Select your `kovaldeepai-main` project
3. Go to **Settings** → **Environment Variables**
4. Add each variable above with its exact value
5. Set **Environment** to "Production" (and optionally Preview/Development)
6. Save and redeploy

## ⚠️ Important Notes:

- **NEXT*PUBLIC*\*** variables are exposed to the browser (safe)
- **SUPABASE_SERVICE_ROLE_KEY** is server-side only (secure)
- **OPENAI_API_KEY** is server-side only (secure)
- These are the **production** Supabase keys, not legacy/demo keys

## ⚠️ **IMPORTANT: Replace Placeholder Values**

The values above with `[YOUR_*]` are placeholders. Use the actual values from your `.env.local` file:

- Copy the real OpenAI API keys from your OpenAI dashboard
- Copy the real Pinecone API keys from your Pinecone dashboard
- The Supabase keys above are already the correct values

## 🔄 After Setting Up:

1. Trigger a new deployment (push to main branch)
2. Test the image upload functionality
3. Test proper authentication flow
