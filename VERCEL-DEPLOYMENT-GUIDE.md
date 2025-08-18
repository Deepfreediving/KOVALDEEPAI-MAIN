# Vercel Environment Variables Setup

## Required Environment Variables for Production

Add these to your Vercel project settings (Settings > Environment Variables):

### Supabase Configuration

```
NEXT_PUBLIC_SUPABASE_URL=https://zhlacqhzhwkmyxsxevv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### OpenAI Configuration

```
OPENAI_API_KEY=sk-...
```

### Pinecone Configuration

```
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=...
PINECONE_INDEX_NAME=...
```

### App Configuration

```
NEXT_PUBLIC_APP_URL=https://kovaldeepai-main.vercel.app
ADMIN_USER_ID=daniel-koval-admin
```

## Steps to Configure Vercel

1. Go to https://vercel.com/dashboard
2. Select your project: kovaldeepai-main
3. Go to Settings > Environment Variables
4. Add all the environment variables above
5. Redeploy the application

## Verify Deployment

After adding environment variables:

1. Go to Deployments tab
2. Click "Redeploy" on the latest deployment
3. Check the deployment logs for any errors
4. Visit https://kovaldeepai-main.vercel.app/

## Troubleshooting

If the app still doesn't load:

1. Check Vercel deployment logs for errors
2. Verify all environment variables are set correctly
3. Make sure Supabase RLS policies allow admin access
4. Check that the build completes successfully in Vercel logs
