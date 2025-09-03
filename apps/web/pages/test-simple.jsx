import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function TestSimple() {
  const router = useRouter();
  const [adminMode, setAdminMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check URL parameters for admin mode
    const urlParams = new URLSearchParams(window.location.search);
    const isAdmin = urlParams.get('admin') === 'true';
    
    if (isAdmin) {
      setAdminMode(true);
      console.log('Admin mode detected');
    }
    
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold text-gray-900">Loading...</div>
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
                🤿 KovalAI - Simple Test Page
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {adminMode ? '👑 Admin Mode Active' : '👤 Regular Mode'}
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/admin')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                🔧 Admin Panel
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
            🧪 App Status Test
          </h2>
          
          {adminMode ? (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    ✅ Admin Mode Working!
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>The admin URL parameters are being detected correctly.</p>
                    <p className="mt-1">URL Parameters detected:</p>
                    <ul className="list-disc list-inside mt-1">
                      <li>admin=true ✅</li>
                      <li>userName=Daniel Koval (Admin) ✅</li>
                      <li>userId=admin-daniel-koval ✅</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    ⚠️ Regular Mode
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>No admin parameters detected in URL.</p>
                    <p>Try accessing with admin parameters from the admin panel.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              🔗 Test Navigation
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => router.push('/?admin=true&userName=Daniel%20Koval%20(Admin)&userId=admin-daniel-koval&subscription=premium')}
                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                🏠 Test Main App (Admin Mode)
              </button>
              <button
                onClick={() => router.push('/test-simple?admin=true&userName=Daniel%20Koval%20(Admin)&userId=admin-daniel-koval&subscription=premium')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                🔄 Reload This Page (Admin Mode)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
