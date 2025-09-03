# KovalAI Supabase Migrations

This directory contains the database migrations for the KovalAI freediving coaching platform.

## Migration Files (In Order)

### 1. Core Schema Migration

**File:** `20250828210000_final_kovalai_schema.sql`
**Purpose:** Complete consolidated schema for KovalAI platform
**Contains:**

- User profiles and authentication
- Legal documents and signatures
- Dive logs with comprehensive metrics
- Dive images and AI analysis
- E.N.C.L.O.S.E. framework audit system
- User memory for chat context
- All RLS policies and permissions
- Performance indexes
- AI-ready views and utility functions

### 2. Storage Setup (Manual)

**Files:**

- `20250817020000_storage_buckets_and_policies.sql` (Instructions only)
- `20250817040000_storage_policies.sql` (RLS policies)

**Purpose:** Supabase Storage configuration for dive images and user documents
**Note:** Storage buckets must be created manually in Supabase Dashboard, then run the policies script.

## Deployment Instructions

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the content of `20250828210000_final_kovalai_schema.sql`
4. Run the migration
5. Manually create storage buckets as described in storage files
6. Run storage policies script in SQL Editor

### Option 2: Command Line (Requires PostgreSQL client)

```bash
# Connect to your Supabase database
psql "postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres"

# Run the migration
\i 20250828210000_final_kovalai_schema.sql
```

## Schema Overview

### Core Tables

- `user_profiles` - User information, certifications, subscriptions
- `legal_documents` - Terms, privacy policy, waivers
- `user_legal_signatures` - User agreement tracking
- `dive_logs` - Complete dive log entries with AI analysis
- `dive_images` - Image uploads for dive analysis
- `dive_image_analysis` - OpenAI Vision API results
- `dive_log_audit` - E.N.C.L.O.S.E. framework scoring
- `user_memory` - Chat context for AI coaching

### AI Integration

- `v_user_ai_context` - Complete user context view
- `v_recent_dives_analysis` - Recent dives with analysis
- `get_user_ai_readiness()` - Function to check AI coaching eligibility

### Storage Buckets (Manual Setup Required)

- `dive-images` - Original dive images (private)
- `dive-images-compressed` - Compressed images (private)
- `user-docs` - User documents like certifications (private)

## Notes

- All tables have Row Level Security (RLS) enabled
- Users can only access their own data
- Legal documents are publicly readable when active
- Storage policies ensure users only access their own files
- Schema is optimized for AI coaching with comprehensive user context
