import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

export default function ChatAnalytics() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleBackToAdmin = () => {
    if (isClient && router) {
      router.push('/admin');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-2xl font-bold text-gray-900">Chat Analytics</h1>
            <button
              onClick={handleBackToAdmin}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Back to Admin
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Chat Usage Statistics
              </h3>
              <p className="text-gray-600">
                Chat analytics and usage statistics will be displayed here.
              </p>
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
