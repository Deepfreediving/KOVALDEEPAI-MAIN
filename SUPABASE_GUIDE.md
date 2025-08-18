# 🚀 Supabase Development Guide for Koval AI

## Overview

This project uses **Local Supabase** for development, which means you run a complete Supabase stack locally using Docker. No need to copy/paste SQL - everything is managed through code and migrations!

## 🔧 Setup & Workflow

### 1. **Start Local Supabase** (First Time)

```bash
npm run supabase:start
```

This will:

- Download and start Docker containers for PostgreSQL, PostgREST, Auth, Storage, etc.
- Apply all migrations from `supabase/migrations/`
- Give you local URLs to access everything

### 2. **Check Status**

```bash
npm run supabase:status
```

Shows you all the local URLs and ports:

- **API URL**: http://localhost:54321
- **DB URL**: postgresql://postgres:postgres@localhost:54322/postgres
- **Studio URL**: http://localhost:54323 (like Supabase Dashboard)

### 3. **Reset Database** (Clean slate)

```bash
npm run supabase:reset
```

This wipes everything and reapplies all migrations.

### 4. **Setup Storage Buckets**

```bash
npm run supabase:setup
```

Creates the required storage buckets (dive-images, user-docs, etc.)

## 📁 File Structure

```
supabase/
├── config.toml              # Supabase configuration
├── migrations/              # Database migrations (version controlled)
│   ├── 2025-08-17_01_core_schema_and_rls.sql
│   ├── 2025-08-17_02_storage_buckets_and_policies.sql
│   └── 2025-08-17_03_onboarding_legal_userdocs.sql
└── seed.sql                 # Optional seed data

scripts/
└── setup-storage.js         # Programmatic storage setup
```

## 🗄️ Database Management

### Adding New Tables/Changes

1. Create a new migration file: `supabase/migrations/YYYY-MM-DD_description.sql`
2. Write your SQL changes
3. Run `npm run supabase:reset` to apply

### Pushing to Remote (Later)

```bash
supabase db push --linked
```

## 🌐 URLs You Need to Know

When running locally:

- **Supabase Studio**: http://localhost:54323 (Visual database admin)
- **API**: http://localhost:54321 (Your app connects here)
- **Database**: localhost:54322 (Direct PostgreSQL access)

## 🔐 Environment Variables

Already configured in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=...` (Default local key)
- `DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres`

## 🚨 Current Issue & Solution

The error you're seeing (`must be owner of table objects`) happens because:

1. Storage policies require special permissions
2. Local Supabase sometimes has permission issues with migrations

**Solution**: We handle storage buckets programmatically with `scripts/setup-storage.js` instead of in migrations.

## 🔄 Complete Development Workflow

1. **Start everything**:

   ```bash
   npm run supabase:start    # Start local Supabase
   npm run supabase:setup    # Create storage buckets
   npm run dev               # Start your apps
   ```

2. **Access your apps**:
   - Web app: http://localhost:3000
   - Supabase Studio: http://localhost:54323
   - Mobile app: Expo dev server

3. **Make database changes**:
   - Edit migration files in `supabase/migrations/`
   - Run `npm run supabase:reset` to apply changes

4. **View data**:
   - Use Supabase Studio (http://localhost:54323)
   - Or connect directly to PostgreSQL

## 🎯 Next Steps

Run these commands in order:

```bash
npm run supabase:start     # This might take a few minutes first time
npm run supabase:setup     # Setup storage buckets
npm run dev                # Start your development servers
```

Then visit http://localhost:54323 to see your local Supabase dashboard!

## 🆘 Troubleshooting

- **Docker not running**: Make sure Docker Desktop is installed and running
- **Port conflicts**: Check if ports 54321-54323 are available
- **Migration errors**: Check the migration files for syntax errors
- **Storage issues**: Run `npm run supabase:setup` after starting Supabase
