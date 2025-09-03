import { useRouter } from 'next/router';

export default function PaymentsAdmin() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-2xl font-bold text-gray-900">Payments Management</h1>
            <button
              onClick={() => router.push('/admin')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Back to Admin
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Management</h3>
            <p className="text-gray-600">Payment and subscription management functionality will be implemented here.</p>
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
