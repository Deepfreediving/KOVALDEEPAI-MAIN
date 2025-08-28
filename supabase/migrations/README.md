# Database Migrations

All SQL files for database schema, RLS policies, and data migrations.

## Naming Convention
- Format: `YYYY-MM-DD_NN_description.sql`
- Run in chronological order
- Each migration should be idempotent

## Apply Migrations
```bash
supabase db reset
# or
supabase migration up
```
