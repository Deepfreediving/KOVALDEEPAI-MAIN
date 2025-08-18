# Supabase Cloud Storage Setup Guide

Since you're using Supabase Cloud (not local), follow these steps to set up storage buckets and policies:

## Step 1: Create Storage Buckets in Supabase Studio

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **Create bucket** and create the following buckets (all **Private**):
   - `dive-images` - For original dive computer images
   - `dive-images-compressed` - For compressed versions
   - `user-docs` - For user documents and files

## Step 2: Apply Storage Policies

1. In Supabase Studio, go to **SQL Editor**
2. Copy and paste the contents of `supabase/storage-policies-only.sql`
3. Click **Run** to execute the policies

## Step 3: Verify Setup

1. Go back to **Storage** → **Buckets**
2. You should see all three buckets listed
3. Click on each bucket to verify they're set to **Private**
4. Go to **Storage** → **Policies** to see the RLS policies applied

## Environment Variables

Make sure your `.env.local` and Vercel environment variables are pointing to your cloud project:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Testing

After setup, test image upload in your app to ensure:

- Images are uploaded to the correct bucket
- Only authenticated users can access their own files
- RLS policies are working correctly

## Migration Status

✅ Database schema applied via migration `2025-08-17_01_core_schema_and_rls.sql`
✅ Storage buckets created manually in Studio
✅ Storage policies applied via `storage-policies-only.sql`

Your cloud setup is now ready for production use!
