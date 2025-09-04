-- Add OpenAI Assistant ID to user profiles for personalized AI coaching
-- This allows each user to have their own trained AI assistant

DO $$ 
BEGIN
  -- Add openai_assistant_id field if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'openai_assistant_id') THEN
    ALTER TABLE public.user_profiles ADD COLUMN openai_assistant_id text;
    RAISE NOTICE 'Added openai_assistant_id column to user_profiles';
  ELSE
    RAISE NOTICE 'openai_assistant_id column already exists in user_profiles';
  END IF;
  
  -- Add ai_training_status field to track training progress
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'ai_training_status') THEN
    ALTER TABLE public.user_profiles ADD COLUMN ai_training_status jsonb DEFAULT '{
      "assistant_created": false,
      "dive_logs_trained": 0,
      "last_training": null,
      "total_training_files": 0
    }'::jsonb;
    RAISE NOTICE 'Added ai_training_status column to user_profiles';
  ELSE
    RAISE NOTICE 'ai_training_status column already exists in user_profiles';
  END IF;
  
  -- Add ai_insights field to store generated insights
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'ai_insights') THEN
    ALTER TABLE public.user_profiles ADD COLUMN ai_insights jsonb DEFAULT '{
      "latest_analysis": null,
      "safety_warnings": [],
      "performance_trends": {},
      "recommendations": []
    }'::jsonb;
    RAISE NOTICE 'Added ai_insights column to user_profiles';
  ELSE
    RAISE NOTICE 'ai_insights column already exists in user_profiles';
  END IF;
  
END $$;
