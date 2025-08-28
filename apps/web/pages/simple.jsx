import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/src/providers/AuthProvider";

export default function SimpleIndex() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [adminMode, setAdminMode] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Check URL parameters for admin or demo mode
    const urlParams = new URLSearchParams(window.location.search);
    const isAdmin = urlParams.get('admin') === 'true';
    const isDemo = urlParams.get('demo') === 'true';
    const userName = urlParams.get('userName');
    const userId = urlParams.get('userId');

    if (isAdmin) {
      setAdminMode(true);
      setCurrentUser({
        id: userId || 'admin-daniel-koval',
        email: 'danielkoval@admin.com',
        user_metadata: { full_name: userName || 'Daniel Koval (Admin)' },
        subscription_tier: 'admin'
      });
    } else if (isDemo) {
      setDemoMode(true);
      setCurrentUser({
        id: userId,
        email: 'demo@example.com',
        user_metadata: { full_name: userName || 'Demo User' },
        subscription_tier: 'demo'
      });
    } else if (user) {
      setCurrentUser(user);
    }
  }, [user]);

  // Redirect to login if not authenticated and not in admin/demo mode
  useEffect(() => {
    if (!authLoading && !currentUser && !adminMode && !demoMode) {
      router.push('/auth/login');
    }
  }, [authLoading, currentUser, adminMode, demoMode, router]);

  // Show loading screen
  if (authLoading && !adminMode && !demoMode) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!currentUser && !adminMode && !demoMode) {
    return null;
  }

  const handleSignOut = () => {
    router.push('/auth/login');
  };

  const getUserDisplayName = () => {
    if (adminMode) return 'Daniel Koval (Admin)';
    if (demoMode) return 'Demo User';
    return currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || 'User';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">🤿 KovalAI</h1>
              <span className="ml-4 text-sm text-gray-500">
                Your AI-powered freediving coach
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* User Info */}
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {getUserDisplayName().charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {getUserDisplayName()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {adminMode ? 'Admin Access' : demoMode ? 'Demo Mode' : 'User'}
                  </p>
                </div>
              </div>

              {/* Sign Out Button */}
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm text-red-600 hover:text-red-500 border border-red-300 rounded hover:bg-red-50"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Welcome to KovalAI! 🤿
          </h2>
          
          {adminMode && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-red-800">Admin Mode Active</h3>
                  <p className="text-sm text-red-700">You have full access to all features and settings.</p>
                </div>
              </div>
            </div>
          )}

          {demoMode && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-blue-800">Demo Mode</h3>
                  <p className="text-sm text-blue-700">You&apos;re using demo mode with limited features. Sign up for full access!</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature Cards */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">🧠 AI Coaching</h3>
              <p className="text-blue-700 text-sm">
                Get personalized freediving advice and training plans from your AI coach.
              </p>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">📊 Dive Logs</h3>
              <p className="text-green-700 text-sm">
                Track your dives, analyze your progress, and improve your performance.
              </p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <h3 className="font-semibold text-purple-900 mb-2">💡 Insights</h3>
              <p className="text-purple-700 text-sm">
                Get detailed analytics and insights to optimize your freediving journey.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="flex space-x-4">
              <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Start Chat with AI Coach
              </button>
              <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                Log a New Dive
              </button>
              {!adminMode && !demoMode && (
                <button 
                  onClick={() => router.push('/auth/subscription')}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  Upgrade Plan
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
