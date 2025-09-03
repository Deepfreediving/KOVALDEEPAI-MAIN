import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getBrowserClient } from '@/lib/supabase';
import Link from 'next/link';

export default function Subscription() {
  const router = useRouter();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(null);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [adminMode, setAdminMode] = useState(false);

  useEffect(() => {
    // Check for admin mode from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const isAdmin = urlParams.get('admin') === 'true';
    
    if (isAdmin) {
      setAdminMode(true);
      setUser({
        id: urlParams.get('userId') || 'admin-daniel-koval',
        email: 'danielkoval@admin.com',
        user_metadata: {
          full_name: urlParams.get('userName') || 'Daniel Koval (Admin)',
        }
      });
      setUserProfile({
        id: urlParams.get('userId') || 'admin-daniel-koval',
        subscription_tier: urlParams.get('subscription') || 'premium',
        subscription_status: 'active'
      });
      setLoading(false);
      return;
    }

    // Check authentication (skip if in admin mode)
    const checkAuth = async () => {
      const supabase = getBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        // Get user profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setUserProfile(profile);
      }
    };

    // Get subscription plans
    const getPlans = async () => {
      const supabase = getBrowserClient();
      const { data: plansData, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('active', true)
        .order('price', { ascending: true });

      if (!error) {
        setPlans(plansData);
      }
      setLoading(false);
    };

    checkAuth();
    getPlans();
  }, []);

  const handleSelectPlan = async (plan) => {
    if (!user && !adminMode) {
      router.push('/auth/login');
      return;
    }

    if (adminMode) {
      // In admin mode, just show a demo message
      alert(`Admin Demo: Selected ${plan.name} plan (${plan.tier}). In production, this would process the payment.`);
      return;
    }

    if (plan.tier === 'free') {
      // Handle free plan
      try {
        const supabase = getBrowserClient();
        await supabase
          .from('user_profiles')
          .update({
            subscription_tier: 'free',
            subscription_status: 'active',
            dive_logs_limit: 10
          })
          .eq('id', user.id);
        
        router.push('/?upgraded=free');
      } catch (error) {
        console.error('Error updating to free plan:', error);
      }
      return;
    }

    setProcessingPayment(plan.id);
    
    try {
      // Initialize PayPal payment
      const response = await fetch('/api/payments/create-paypal-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: plan.id,
          userId: user.id,
        }),
      });

      const paymentData = await response.json();
      
      if (paymentData.approvalUrl) {
        // Redirect to PayPal
        window.location.href = paymentData.approvalUrl;
      } else {
        throw new Error('Failed to create PayPal payment');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setProcessingPayment(null);
    }
  };

  const getPlanFeatures = (features) => {
    try {
      return typeof features === 'string' ? JSON.parse(features) : features;
    } catch {
      return [];
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Choose Your Diving Plan
          </h1>
          <p className="mt-4 text-xl text-gray-600">
            Unlock your freediving potential with KovalAI
          </p>
          {userProfile && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg inline-block">
              <p className="text-sm text-blue-800">
                Current Plan: <span className="font-semibold capitalize">{userProfile.subscription_tier}</span>
                {userProfile.subscription_status === 'active' && (
                  <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Active</span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-4">
          {plans.map((plan) => {
            const features = getPlanFeatures(plan.features);
            const isCurrentPlan = userProfile?.subscription_tier === plan.tier;
            const isPopular = plan.tier === 'premium';

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border ${
                  isPopular 
                    ? 'border-blue-500 shadow-blue-500/25 shadow-2xl' 
                    : 'border-gray-200 shadow-lg'
                } bg-white p-8 ${isCurrentPlan ? 'ring-2 ring-blue-500' : ''}`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-1 text-sm font-semibold rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                
                {isCurrentPlan && (
                  <div className="absolute -top-4 right-4">
                    <span className="bg-green-500 text-white px-3 py-1 text-xs font-semibold rounded-full">
                      Current Plan
                    </span>
                  </div>
                )}

                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                    <span className="text-gray-600">/{plan.billing_period}</span>
                  </div>
                  {plan.billing_period === 'yearly' && plan.price > 0 && (
                    <p className="text-green-600 text-sm mt-1 font-semibold">Save 2 months!</p>
                  )}
                </div>

                <ul className="mt-8 space-y-4">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <svg className="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  <button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={processingPayment === plan.id || isCurrentPlan}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                      isCurrentPlan
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : plan.tier === 'free'
                        ? 'bg-gray-600 hover:bg-gray-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {processingPayment === plan.id ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : isCurrentPlan ? (
                      'Current Plan'
                    ) : plan.tier === 'free' ? (
                      'Select Free Plan'
                    ) : (
                      `Subscribe for $${plan.price}/${plan.billing_period}`
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Section */}
        <div className="mt-16 text-center">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to dive deeper?
            </h3>
            <p className="text-gray-600 mb-6">
              Join thousands of freedivers who are improving their performance with AI-powered coaching.
            </p>
            <div className="flex justify-center space-x-4">
              <Link
                href="/auth/login"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Get Started
              </Link>
              <Link
                href="/"
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Try Demo
              </Link>
            </div>
          </div>

          <div className="mt-8 text-sm text-gray-500">
            <p>All plans include 30-day money-back guarantee</p>
            <p className="mt-2">
              Questions? <a href="mailto:support@koval.ai" className="text-blue-600 hover:text-blue-500">Contact support</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Force server-side rendering to avoid SSG router issues
export async function getServerSideProps() {
  return {
    props: {}
  };
}
