-- Add missing tables for legal documents and payments
-- This extends the existing schema with required tables

-- Legal documents table for storing waivers and medical forms
CREATE TABLE IF NOT EXISTS public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('liability_waiver', 'medical_clearance')),
  accepted boolean DEFAULT false,
  accepted_at timestamptz,
  ip_address inet,
  user_agent text,
  document_version text DEFAULT '1.0',
  form_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Payment transactions table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  payment_id text UNIQUE NOT NULL,
  plan_type text NOT NULL CHECK (plan_type IN ('basic', 'premium', 'coach')),
  amount decimal(10,2) NOT NULL DEFAULT 0.00,
  currency text DEFAULT 'USD',
  status text NOT NULL CHECK (status IN ('created', 'pending', 'completed', 'failed', 'refunded')),
  paypal_data jsonb DEFAULT '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Add missing fields to user_profiles table
DO $$ 
BEGIN
  -- Add legal and medical fields if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'legal_waiver_accepted') THEN
    ALTER TABLE public.user_profiles ADD COLUMN legal_waiver_accepted boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'legal_waiver_date') THEN
    ALTER TABLE public.user_profiles ADD COLUMN legal_waiver_date timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'medical_clearance_accepted') THEN
    ALTER TABLE public.user_profiles ADD COLUMN medical_clearance_accepted boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'medical_clearance_date') THEN
    ALTER TABLE public.user_profiles ADD COLUMN medical_clearance_date timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'medical_cleared') THEN
    ALTER TABLE public.user_profiles ADD COLUMN medical_cleared boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'emergency_contact') THEN
    ALTER TABLE public.user_profiles ADD COLUMN emergency_contact text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'physician_contact') THEN
    ALTER TABLE public.user_profiles ADD COLUMN physician_contact text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'subscription_start_date') THEN
    ALTER TABLE public.user_profiles ADD COLUMN subscription_start_date timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'subscription_end_date') THEN
    ALTER TABLE public.user_profiles ADD COLUMN subscription_end_date timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'trial_expires_at') THEN
    ALTER TABLE public.user_profiles ADD COLUMN trial_expires_at timestamptz;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own legal documents" ON legal_documents
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own payment transactions" ON payment_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can create payment transactions" ON payment_transactions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service can update payment transactions" ON payment_transactions
  FOR UPDATE USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_legal_documents_user_id ON legal_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_legal_documents_type ON legal_documents(user_id, document_type);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_id ON payment_transactions(payment_id);

-- Create triggers for updated_at
CREATE OR REPLACE TRIGGER legal_documents_updated_at
  BEFORE UPDATE ON legal_documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER payment_transactions_updated_at
  BEFORE UPDATE ON payment_transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
