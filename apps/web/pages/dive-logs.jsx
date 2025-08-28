import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function DiveLogsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // Simulate loading dive logs data
    const timer = setTimeout(() => {
      // Mock dive logs data
      setLogs([
        {
          id: 1,
          user: "John Doe",
          date: "2024-01-15",
          location: "Great Barrier Reef",
          depth: "30m",
          duration: "45 min",
          conditions: "Excellent visibility"
        },
        {
          id: 2,
          user: "Jane Smith",
          date: "2024-01-14",
          location: "Red Sea",
          depth: "25m",
          duration: "50 min",
          conditions: "Strong current"
        },
        {
          id: 3,
          user: "Mike Johnson",
          date: "2024-01-13",
          location: "Maldives",
          depth: "18m",
          duration: "60 min",
          conditions: "Perfect conditions"
        }
      ]);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleBackToDashboard = () => {
    router.push('/admin');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Dive Logs...</p>
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
                Dive Log Manager
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
                📊 Dive Logs Management
              </h2>
              <div className="flex space-x-3">
                <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
                  Export CSV
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                  Add New Log
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">{logs.length}</div>
                <div className="text-sm text-blue-800">Total Logs</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">3</div>
                <div className="text-sm text-green-800">Active Divers</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-600">25m</div>
                <div className="text-sm text-purple-800">Avg Depth</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-orange-600">52min</div>
                <div className="text-sm text-orange-800">Avg Duration</div>
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Diver
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Depth
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Conditions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {log.user.charAt(0)}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {log.user}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.depth}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.duration}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.conditions}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 mr-3">
                        View
                      </button>
                      <button className="text-green-600 hover:text-green-900 mr-3">
                        Edit
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {logs.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📊</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No dive logs found</h3>
              <p className="text-gray-500 mb-4">Get started by adding your first dive log.</p>
              <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Add First Log
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
