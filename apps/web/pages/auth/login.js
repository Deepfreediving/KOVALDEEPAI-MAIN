import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Login() {
  const router = useRouter();

  useEffect(() => {
    // For now, redirect back to home with admin access
    // In a real app, you'd implement proper authentication here
    console.log('🔐 Login page accessed, redirecting to admin mode...');
    
    // Set admin mode and redirect
    router.push('/?userId=f47ac10b-58cc-4372-a567-0e02b2c3d479&userName=Admin');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            KovalAI Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Redirecting to admin access...
          </p>
        </div>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    </div>
  );
}
