import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function PaymentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    // Simulate loading payments data
    const timer = setTimeout(() => {
      // Mock payments data
      setPayments([
        {
          id: 1,
          user: "John Doe",
          email: "john@example.com",
          amount: "$29.99",
          plan: "Pro Monthly",
          status: "completed",
          date: "2024-01-15",
          paypalId: "PAYPAL123456789"
        },
        {
          id: 2,
          user: "Jane Smith",
          email: "jane@example.com",
          amount: "$9.99",
          plan: "Basic Monthly",
          status: "completed",
          date: "2024-01-14",
          paypalId: "PAYPAL987654321"
        },
        {
          id: 3,
          user: "Mike Johnson",
          email: "mike@example.com",
          amount: "$299.99",
          plan: "Pro Yearly",
          status: "pending",
          date: "2024-01-13",
          paypalId: "PAYPAL456789123"
        },
        {
          id: 4,
          user: "Sarah Wilson",
          email: "sarah@example.com",
          amount: "$19.99",
          plan: "Basic Monthly",
          status: "failed",
          date: "2024-01-12",
          paypalId: "PAYPAL789123456"
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
    switch (status) {
      case 'completed':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'failed':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const totalRevenue = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + parseFloat(p.amount.replace('$', '')), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Payment Data...</p>
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
                Payment Management
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
                💳 Payment System
              </h2>
              <div className="flex space-x-3">
                <button className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm">
                  Export Report
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                  PayPal Dashboard
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">${totalRevenue.toFixed(2)}</div>
                <div className="text-sm text-green-800">Total Revenue</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">{payments.length}</div>
                <div className="text-sm text-blue-800">Total Transactions</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-600">
                  {payments.filter(p => p.status === 'pending').length}
                </div>
                <div className="text-sm text-yellow-800">Pending</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-600">
                  {payments.filter(p => p.status === 'failed').length}
                </div>
                <div className="text-sm text-red-800">Failed</div>
              </div>
            </div>
          </div>

          {/* PayPal Integration Status */}
          <div className="p-6 border-b border-gray-200">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-blue-600 mr-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.1-.26c-.543-1.455-1.942-2.11-4.56-2.11H9.98a.9.9 0 0 0-.897.817l-.668 4.23h2.804c3.64 0 6.066-1.474 6.807-4.677z"/>
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-blue-800">PayPal Integration Status</h3>
                  <p className="text-sm text-blue-700">
                    ✅ Connected to PayPal Sandbox | 
                    <span className="ml-2 text-xs bg-blue-100 px-2 py-1 rounded">Test Mode</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Payments Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PayPal ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {payment.user.charAt(0)}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {payment.user}
                          </div>
                          <div className="text-sm text-gray-500">
                            {payment.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.plan}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {payment.amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadge(payment.status)}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {payment.paypalId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 mr-3">
                        View
                      </button>
                      <button className="text-green-600 hover:text-green-900 mr-3">
                        Refund
                      </button>
                      {payment.status === 'pending' && (
                        <button className="text-orange-600 hover:text-orange-900">
                          Process
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {payments.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">💳</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
              <p className="text-gray-500 mb-4">Payments will appear here once customers start subscribing.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
