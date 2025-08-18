#!/usr/bin/env node

/**
 * Setup script for Supabase storage buckets
 * Run this after migrations to create required storage buckets
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createBucketIfNotExists(bucketId, isPublic = false) {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error(`❌ Error listing buckets:`, listError);
      return false;
    }

    const existingBucket = buckets.find(bucket => bucket.id === bucketId);
    
    if (existingBucket) {
      console.log(`✅ Bucket '${bucketId}' already exists`);
      return true;
    }

    // Create bucket
    const { error } = await supabase.storage.createBucket(bucketId, { 
      public: isPublic,
      allowedMimeTypes: bucketId.includes('image') ? ['image/*'] : undefined,
      fileSizeLimit: bucketId.includes('image') ? 10 * 1024 * 1024 : 5 * 1024 * 1024 // 10MB for images, 5MB for docs
    });

    if (error) {
      console.error(`❌ Error creating bucket '${bucketId}':`, error);
      return false;
    }

    console.log(`✅ Created bucket '${bucketId}'`);
    return true;
  } catch (err) {
    console.error(`❌ Unexpected error creating bucket '${bucketId}':`, err);
    return false;
  }
}

async function setupStorage() {
  console.log('🚀 Setting up Supabase storage buckets...');
  
  const buckets = [
    { id: 'dive-images', public: false },
    { id: 'dive-images-compressed', public: false },
    { id: 'user-docs', public: false }
  ];

  let success = true;
  
  for (const bucket of buckets) {
    const result = await createBucketIfNotExists(bucket.id, bucket.public);
    if (!result) success = false;
  }

  if (success) {
    console.log('\n✅ All storage buckets set up successfully!');
    console.log('\n📝 Next steps:');
    console.log('  1. Run your migrations: npx supabase db reset');
    console.log('  2. Start your development server: npm run dev');
  } else {
    console.log('\n❌ Some buckets failed to create. Check the errors above.');
    process.exit(1);
  }
}

setupStorage().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
