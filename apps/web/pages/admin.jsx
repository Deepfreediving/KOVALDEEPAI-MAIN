import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simple loading delay
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleSignOut = () => {
    router.push('/auth/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <img 
                src="/koval-logo.png" 
                alt="KovalAI" 
                className="h-8 w-auto mr-3"
              />
              <h1 className="text-2xl font-bold text-blue-600">KovalAI</h1>
              <span className="ml-4 text-sm text-gray-500">
                Admin Dashboard
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Admin Info */}
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  D
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Daniel Koval (Admin)
                  </p>
                  <p className="text-xs text-red-600">
                    Full Access
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-red-800">Admin Mode Active</h3>
                <p className="text-sm text-red-700">You have full administrative access to all features.</p>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Welcome to KovalAI Admin Dashboard! 🤿
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Admin Features */}
            <div className="bg-blue-50 rounded-lg p-6 hover:bg-blue-100 transition-colors cursor-pointer">
              <h3 className="font-semibold text-blue-900 mb-2">🧠 AI Chat System</h3>
              <p className="text-blue-700 text-sm">
                Access the full AI coaching system with unlimited conversations.
              </p>
              <button 
                onClick={() => router.push('/chat')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                Launch Chat
              </button>
            </div>

            <div className="bg-green-50 rounded-lg p-6 hover:bg-green-100 transition-colors cursor-pointer">
              <h3 className="font-semibold text-green-900 mb-2">📊 Dive Log Manager</h3>
              <p className="text-green-700 text-sm">
                Manage and analyze dive logs across all user accounts.
              </p>
              <button 
                onClick={() => router.push('/dive-logs')}
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
              >
                View Logs
              </button>
            </div>

            <div className="bg-purple-50 rounded-lg p-6 hover:bg-purple-100 transition-colors cursor-pointer">
              <h3 className="font-semibold text-purple-900 mb-2">👥 User Management</h3>
              <p className="text-purple-700 text-sm">
                Monitor user accounts, subscriptions, and system usage.
              </p>
              <button 
                onClick={() => router.push('/users')}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
              >
                Manage Users
              </button>
            </div>

            <div className="bg-yellow-50 rounded-lg p-6 hover:bg-yellow-100 transition-colors cursor-pointer">
              <h3 className="font-semibold text-yellow-900 mb-2">💳 Payment System</h3>
              <p className="text-yellow-700 text-sm">
                Monitor PayPal transactions and subscription management.
              </p>
              <button 
                onClick={() => router.push('/payments')}
                className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
              >
                View Payments
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 hover:bg-gray-100 transition-colors cursor-pointer">
              <h3 className="font-semibold text-gray-900 mb-2">⚙️ System Settings</h3>
              <p className="text-gray-700 text-sm">
                Configure API keys, database settings, and system parameters.
              </p>
              <button className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm">
                Settings
              </button>
            </div>

            <div className="bg-indigo-50 rounded-lg p-6 hover:bg-indigo-100 transition-colors cursor-pointer">
              <h3 className="font-semibold text-indigo-900 mb-2">📈 Analytics</h3>
              <p className="text-indigo-700 text-sm">
                View system performance, user engagement, and usage statistics.
              </p>
              <button className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm">
                View Analytics
              </button>
            </div>
          </div>

          {/* System Status */}
          <div className="mt-8 bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">System Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">✅</div>
                <p className="text-sm text-gray-600">OpenAI API</p>
                <p className="text-xs text-green-600">Connected</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">✅</div>
                <p className="text-sm text-gray-600">Supabase</p>
                <p className="text-xs text-green-600">Connected</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">✅</div>
                <p className="text-sm text-gray-600">PayPal</p>
                <p className="text-xs text-green-600">Sandbox Mode</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => window.open('/', '_blank')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                🚀 Launch Full App
              </button>
              <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                📊 Export Data
              </button>
              <button className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
                🔧 System Maintenance
              </button>
              <button className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700">
                📧 Send Notifications
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
