import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Simple admin authentication - in production, use proper JWT/Supabase auth
  const ADMIN_ACCESS_CODE = 'koval2024admin'; // Change this in production!

  useEffect(() => {
    // Check if already authenticated in session
    const adminAuth = sessionStorage.getItem('koval-admin-auth');
    if (adminAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleAdminLogin = () => {
    setIsVerifying(true);
    
    setTimeout(() => {
      if (adminPassword === ADMIN_ACCESS_CODE) {
        setIsAuthenticated(true);
        sessionStorage.setItem('koval-admin-auth', 'true');
        setAdminPassword('');
      } else {
        alert('Incorrect access code. Please contact administrator.');
        setAdminPassword('');
      }
      setIsVerifying(false);
    }, 500);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('koval-admin-auth');
  };

  // Show admin login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              🔐 KovalAI Admin Access
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Enter admin access code to continue
            </p>
          </div>
          <div className="bg-white py-8 px-6 shadow rounded-lg">
            <div className="space-y-6">
              <div>
                <label htmlFor="admin-password" className="sr-only">
                  Admin Access Code
                </label>
                <input
                  id="admin-password"
                  name="admin-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm"
                  placeholder="Admin Access Code"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
                />
              </div>

              <div>
                <button
                  onClick={handleAdminLogin}
                  disabled={isVerifying || !adminPassword}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50"
                >
                  {isVerifying ? 'Verifying...' : 'Access Admin Dashboard'}
                </button>
              </div>

              <div className="text-center">
                <button
                  onClick={() => router.push('/')}
                  className="text-teal-600 hover:text-teal-500 text-sm"
                >
                  ← Back to Main App
                </button>
              </div>
            </div>
          </div>
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
              <h1 className="text-2xl font-bold text-gray-900">KovalAI Control Panel</h1>
              <p className="text-sm text-gray-600 mt-1">Main App Access + Admin Dashboard</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/?admin=true&userName=Daniel%20Koval%20(Admin)&userId=admin-daniel-koval&subscription=premium')}
                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                🏠 Main App
              </button>
              <button
                onClick={() => router.push('/auth/login')}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                🔐 Login
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-bold">U</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                    <dd className="text-lg font-medium text-gray-900">Loading...</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-bold">D</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Dive Logs</dt>
                    <dd className="text-lg font-medium text-gray-900">Loading...</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-bold">S</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Subscriptions</dt>
                    <dd className="text-lg font-medium text-gray-900">Coming Soon</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">🚀 KovalAI Main App Access</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => router.push('/?admin=true&userName=Daniel%20Koval%20(Admin)&userId=admin-daniel-koval&subscription=premium')}
                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-3 rounded-md text-sm font-medium flex items-center justify-center"
              >
                <span className="mr-2">🏠</span>
                Main App Dashboard
              </button>
              <button
                onClick={() => router.push('/?admin=true&mode=chat&userName=Daniel%20Koval%20(Admin)&userId=admin-daniel-koval&subscription=premium')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-md text-sm font-medium flex items-center justify-center"
              >
                <span className="mr-2">💬</span>
                AI Freediving Coach
              </button>
              <button
                onClick={() => router.push('/?admin=true&mode=dive-journal&userName=Daniel%20Koval%20(Admin)&userId=admin-daniel-koval&subscription=premium')}
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-3 rounded-md text-sm font-medium flex items-center justify-center"
              >
                <span className="mr-2">📊</span>
                Dive Journal & Analysis
              </button>
              <button
                onClick={() => router.push('/?admin=true&upload=true&userName=Daniel%20Koval%20(Admin)&userId=admin-daniel-koval&subscription=premium')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-md text-sm font-medium flex items-center justify-center"
              >
                <span className="mr-2">📤</span>
                Upload Dive Images
              </button>
              <button
                onClick={() => router.push('/auth/subscription?admin=true&userName=Daniel%20Koval%20(Admin)&userId=admin-daniel-koval&subscription=premium')}
                className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-3 rounded-md text-sm font-medium flex items-center justify-center"
              >
                <span className="mr-2">💳</span>
                Subscription & Billing
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">⚙️ Admin Functions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => router.push('/dive-logs')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Manage Dive Logs
              </button>
              <button
                onClick={() => router.push('/users')}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Manage Users
              </button>
              <button
                onClick={() => router.push('/payments')}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Payment Management
              </button>
              <button
                onClick={() => router.push('/chat')}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Chat Analytics
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
