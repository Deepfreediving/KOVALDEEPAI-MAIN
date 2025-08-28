import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function UserManagementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    // Simulate loading users data
    const timer = setTimeout(() => {
      // Mock users data
      setUsers([
        {
          id: 1,
          name: "Daniel Koval",
          email: "daniel@kovalai.com",
          role: "admin",
          subscription: "Lifetime",
          status: "active",
          joinDate: "2023-01-01",
          lastLogin: "2024-01-15"
        },
        {
          id: 2,
          name: "John Doe",
          email: "john@example.com",
          role: "user",
          subscription: "Pro",
          status: "active",
          joinDate: "2024-01-10",
          lastLogin: "2024-01-14"
        },
        {
          id: 3,
          name: "Jane Smith",
          email: "jane@example.com",
          role: "user",
          subscription: "Basic",
          status: "inactive",
          joinDate: "2024-01-05",
          lastLogin: "2024-01-12"
        },
        {
          id: 4,
          name: "Mike Johnson",
          email: "mike@example.com",
          role: "user",
          subscription: "Free",
          status: "active",
          joinDate: "2024-01-03",
          lastLogin: "2024-01-13"
        }
      ]);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleBackToDashboard = () => {
    router.push('/admin');
  };

  const getStatusBadge = (status) => {
    const baseClasses = "px-2 py-1 text-xs rounded-full";
    if (status === 'active') {
      return `${baseClasses} bg-green-100 text-green-800`;
    } else {
      return `${baseClasses} bg-red-100 text-red-800`;
    }
  };

  const getRoleBadge = (role) => {
    const baseClasses = "px-2 py-1 text-xs rounded-full";
    if (role === 'admin') {
      return `${baseClasses} bg-red-100 text-red-800`;
    } else {
      return `${baseClasses} bg-blue-100 text-blue-800`;
    }
  };

  const getSubscriptionBadge = (subscription) => {
    const baseClasses = "px-2 py-1 text-xs rounded-full";
    switch (subscription) {
      case 'Lifetime':
        return `${baseClasses} bg-purple-100 text-purple-800`;
      case 'Pro':
        return `${baseClasses} bg-gold-100 text-yellow-800`;
      case 'Basic':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading User Management...</p>
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
              <button
                onClick={handleBackToDashboard}
                className="mr-4 px-3 py-2 text-sm text-gray-600 hover:text-gray-500 border border-gray-300 rounded hover:bg-gray-50"
              >
                ← Back to Dashboard
              </button>
              <img 
                src="/koval-logo.png" 
                alt="KovalAI" 
                className="h-8 w-auto mr-3"
              />
              <h1 className="text-2xl font-bold text-blue-600">KovalAI</h1>
              <span className="ml-4 text-sm text-gray-500">
                User Management
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
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                👥 User Management
              </h2>
              <div className="flex space-x-3">
                <button className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm">
                  Export Users
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                  Add New User
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">{users.length}</div>
                <div className="text-sm text-blue-800">Total Users</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">
                  {users.filter(u => u.status === 'active').length}
                </div>
                <div className="text-sm text-green-800">Active Users</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-600">
                  {users.filter(u => u.subscription !== 'Free').length}
                </div>
                <div className="text-sm text-purple-800">Paid Subscribers</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-orange-600">
                  {users.filter(u => u.role === 'admin').length}
                </div>
                <div className="text-sm text-orange-800">Admins</div>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subscription
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Join Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                          user.role === 'admin' ? 'bg-red-600' : 'bg-blue-600'
                        }`}>
                          {user.name.charAt(0)}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {user.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getRoleBadge(user.role)}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getSubscriptionBadge(user.subscription)}>
                        {user.subscription}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadge(user.status)}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.joinDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.lastLogin}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 mr-3">
                        View
                      </button>
                      <button className="text-green-600 hover:text-green-900 mr-3">
                        Edit
                      </button>
                      {user.role !== 'admin' && (
                        <button className="text-red-600 hover:text-red-900">
                          Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
