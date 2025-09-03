import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/src/providers/AuthProvider";

export default function IndexWorking() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [adminMode, setAdminMode] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true);

  // Check URL parameters for admin/demo mode
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const isAdmin = urlParams.get('admin') === 'true';
      const isDemo = urlParams.get('demo') === 'true';

      if (isAdmin) {
        setAdminMode(true);
        console.log('Admin mode detected');
      } else if (isDemo) {
        setDemoMode(true);
        console.log('Demo mode detected');
      }
      setIsAuthenticating(false);
    }
  }, []);

  // Redirect to login if not authenticated (unless admin/demo mode)
  useEffect(() => {
    if (!authLoading && !user && !adminMode && !demoMode && !isAuthenticating) {
      console.log('Redirecting to login - no auth detected');
      router.push('/auth/login');
    }
  }, [authLoading, user, adminMode, demoMode, isAuthenticating, router]);

  // Show loading screen while checking authentication
  if ((authLoading || isAuthenticating) && !adminMode && !demoMode) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <div className="text-xl font-semibold text-gray-900 mt-4">Loading KovalAI...</div>
          <div className="text-sm text-gray-600 mt-2">Initializing your freediving coach</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🤿 KovalAI - Freediving Coach
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {adminMode ? '👑 Admin Mode Active' : demoMode ? '🎯 Demo Mode' : '🏠 Welcome to KovalAI'}
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/admin')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                🔧 Admin
              </button>
              <button
                onClick={() => router.push('/auth/login')}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                🔐 Login
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            🎯 Your Freediving Journey Starts Here
          </h2>
          
          {adminMode && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    ✅ Admin Mode Active!
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>You have full access to all KovalAI features and admin functions.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg p-6 border border-teal-200">
              <div className="text-teal-600 text-2xl mb-3">💬</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Freediving Coach</h3>
              <p className="text-gray-600 text-sm mb-4">
                Chat with your personal AI coach for training advice, technique tips, and safety guidance.
              </p>
              <button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md text-sm font-medium w-full">
                Start Coaching Session
              </button>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
              <div className="text-blue-600 text-2xl mb-3">📊</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Dive Journal & Analysis</h3>
              <p className="text-gray-600 text-sm mb-4">
                Log your dives, track progress, and get AI-powered insights on your performance.
              </p>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium w-full">
                View Dive Journal
              </button>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg p-6 border border-emerald-200">
              <div className="text-emerald-600 text-2xl mb-3">📤</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Dive Images</h3>
              <p className="text-gray-600 text-sm mb-4">
                Upload photos of your dive watch or equipment for automatic analysis and logging.
              </p>
              <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium w-full">
                Upload Images
              </button>
            </div>
          </div>

          {/* User Status */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">🔍 App Status</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div>• Authentication: {user ? '✅ Logged in' : adminMode ? '✅ Admin mode' : demoMode ? '✅ Demo mode' : '❌ Not authenticated'}</div>
              <div>• Mode: {adminMode ? 'Admin' : demoMode ? 'Demo' : 'Regular'}</div>
              <div>• User ID: {user?.id || 'admin-daniel-koval'}</div>
            </div>
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
