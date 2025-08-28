-- ================================================================
-- User Subscriptions and Payment Infrastructure
-- ================================================================

-- User profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email text UNIQUE NOT NULL,
    full_name text,
    avatar_url text,
    subscription_tier text DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'premium', 'pro')),
    subscription_status text DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'past_due')),
    subscription_start_date timestamptz,
    subscription_end_date timestamptz,
    trial_ends_at timestamptz,
    dive_logs_limit integer DEFAULT 10, -- Free tier limit
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Payment transactions table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    paypal_transaction_id text UNIQUE,
    amount decimal(10,2) NOT NULL,
    currency text DEFAULT 'USD',
    subscription_tier text NOT NULL,
    transaction_type text DEFAULT 'subscription' CHECK (transaction_type IN ('subscription', 'one_time', 'upgrade', 'refund')),
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    paypal_data jsonb, -- Store full PayPal response
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Subscription plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text UNIQUE NOT NULL,
    tier text UNIQUE NOT NULL CHECK (tier IN ('free', 'basic', 'premium', 'pro')),
    price decimal(10,2) NOT NULL,
    currency text DEFAULT 'USD',
    billing_period text DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'yearly')),
    dive_logs_limit integer,
    features jsonb, -- JSON array of features
    paypal_plan_id text, -- PayPal subscription plan ID
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, tier, price, billing_period, dive_logs_limit, features, active) VALUES
('Free Diver', 'free', 0.00, 'monthly', 10, '["Basic dive log tracking", "10 dive logs per month", "Basic analytics"]', true),
('Recreational Diver', 'basic', 9.99, 'monthly', 50, '["Unlimited dive logs", "Image analysis", "Basic coaching", "Export data"]', true),
('Advanced Diver', 'premium', 19.99, 'monthly', -1, '["Everything in Basic", "Advanced AI coaching", "Performance analytics", "Goal tracking", "Priority support"]', true),
('Professional Diver', 'pro', 39.99, 'monthly', -1, '["Everything in Premium", "Team management", "Custom coaching plans", "API access", "White-label options"]', true),
('Recreational Diver Annual', 'basic', 99.99, 'yearly', 50, '["Unlimited dive logs", "Image analysis", "Basic coaching", "Export data", "2 months free"]', true),
('Advanced Diver Annual', 'premium', 199.99, 'yearly', -1, '["Everything in Basic", "Advanced AI coaching", "Performance analytics", "Goal tracking", "Priority support", "2 months free"]', true),
('Professional Diver Annual', 'pro', 399.99, 'yearly', -1, '["Everything in Premium", "Team management", "Custom coaching plans", "API access", "White-label options", "2 months free"]', true)
ON CONFLICT (tier) DO NOTHING;

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- User profiles: users can only see and edit their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Payment transactions: users can only see their own transactions
CREATE POLICY "Users can view own transactions" ON public.payment_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage transactions" ON public.payment_transactions
    FOR ALL USING (auth.role() = 'service_role');

-- Subscription plans: readable by all authenticated users
CREATE POLICY "Subscription plans are viewable by authenticated users" ON public.subscription_plans
    FOR SELECT USING (auth.role() = 'authenticated');

-- Functions
CREATE OR REPLACE FUNCTION public.get_user_subscription_status(user_uuid uuid)
RETURNS table(
    subscription_tier text,
    subscription_status text,
    dive_logs_used bigint,
    dive_logs_limit integer,
    subscription_end_date timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.subscription_tier,
        up.subscription_status,
        COALESCE(dl_count.count, 0) as dive_logs_used,
        up.dive_logs_limit,
        up.subscription_end_date
    FROM public.user_profiles up
    LEFT JOIN (
        SELECT user_id, COUNT(*) as count
        FROM public.dive_logs 
        WHERE user_id = user_uuid 
        AND created_at >= date_trunc('month', now())
        GROUP BY user_id
    ) dl_count ON up.id = dl_count.user_id
    WHERE up.id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can create more dive logs
CREATE OR REPLACE FUNCTION public.can_create_dive_log(user_uuid uuid)
RETURNS boolean AS $$
DECLARE
    user_status record;
BEGIN
    SELECT * FROM public.get_user_subscription_status(user_uuid) INTO user_status;
    
    -- Unlimited for premium/pro or if limit is -1
    IF user_status.dive_logs_limit = -1 OR user_status.subscription_tier IN ('premium', 'pro') THEN
        RETURN true;
    END IF;
    
    -- Check if under limit
    RETURN user_status.dive_logs_used < user_status.dive_logs_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle user signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON public.payment_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription ON public.user_profiles(subscription_tier, subscription_status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON public.payment_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_paypal ON public.payment_transactions(paypal_transaction_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_tier ON public.subscription_plans(tier, active);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON public.user_profiles TO authenticated;
GRANT SELECT ON public.subscription_plans TO authenticated, anon;
GRANT SELECT ON public.payment_transactions TO authenticated;
