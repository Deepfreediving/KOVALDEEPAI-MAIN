import React from 'react';
import { useRouter } from 'next/router';

export default function ModernIndex() {
  const router = useRouter();

  React.useEffect(() => {
    // Redirect to the main index page
    router.replace('/');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}