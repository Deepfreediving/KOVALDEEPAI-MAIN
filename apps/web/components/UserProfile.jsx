import { useState } from 'react';
import { useAuth } from '@/src/providers/AuthProvider';
import { useRouter } from 'next/router';

export default function UserProfile({ user: propUser, adminMode, demoMode }) {
  const { user: authUser, signOut } = useAuth();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Use prop user (for admin/demo) or authenticated user
  const user = propUser || authUser;

  if (!user) return null;

  const handleSignOut = async () => {
    if (adminMode || demoMode) {
      // For admin/demo mode, just redirect to login
      router.push('/auth/login');
    } else {
      // For authenticated users, use proper sign out
      await signOut();
      router.push('/auth/login');
    }
  };

  const handleSubscription = () => {
    router.push('/auth/subscription');
  };

  const getUserDisplayName = () => {
    if (adminMode) return 'Daniel Koval (Admin)';
    if (demoMode) return 'Demo User';
    return user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
  };

  const getSubscriptionTier = () => {
    if (adminMode) return 'Admin';
    if (demoMode) return 'Demo';
    return user.subscription_tier || 'Free';
  };

  const getSubscriptionColor = () => {
    const tier = getSubscriptionTier().toLowerCase();
    if (tier === 'admin') return 'bg-red-100 text-red-800';
    if (tier === 'premium') return 'bg-yellow-100 text-yellow-800';
    if (tier === 'pro') return 'bg-purple-100 text-purple-800';
    if (tier === 'demo') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 w-full text-left"
      >
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
          {getUserDisplayName().charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {getUserDisplayName()}
          </p>
          <p className={`text-xs px-2 py-1 rounded-full ${getSubscriptionColor()}`}>
            {getSubscriptionTier()}
          </p>
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {dropdownOpen && (
        <div className="absolute bottom-full mb-2 left-0 w-full bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {!adminMode && !demoMode && (
            <button
              onClick={handleSubscription}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                Manage Subscription
              </span>
            </button>
          )}
          <button
            onClick={handleSignOut}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
          >
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
