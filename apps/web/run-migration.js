const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Running user profile trigger migration...');
  
  try {
    // Create the function
    const { error: functionError } = await supabase.rpc('exec', {
      sql: `
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS TRIGGER
        LANGUAGE plpgsql
        SECURITY DEFINER SET search_path = public
        AS $$
        BEGIN
          INSERT INTO public.user_profiles (
            user_id,
            email,
            full_name,
            nickname,
            subscription_status,
            subscription_plan,
            dive_logs_limit
          )
          VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
            COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
            'trial',
            'basic',
            10
          );
          RETURN NEW;
        END;
        $$;
      `
    });

    if (functionError) {
      console.error('❌ Function creation error:', functionError);
      return;
    }

    console.log('✅ Function created successfully');

    // Create the trigger
    const { error: triggerError } = await supabase.rpc('exec', {
      sql: `
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
      `
    });

    if (triggerError) {
      console.error('❌ Trigger creation error:', triggerError);
      return;
    }

    console.log('✅ Trigger created successfully');
    console.log('🎉 Migration completed! User profiles will now be auto-created.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

runMigration();
