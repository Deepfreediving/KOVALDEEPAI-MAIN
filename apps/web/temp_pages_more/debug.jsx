import { useState } from "react";

export default function TestPage() {
  const [message, setMessage] = useState("");

  const testAPI = async () => {
    try {
      const response = await fetch('/api/debug/env-check');
      const data = await response.json();
      setMessage(JSON.stringify(data, null, 2));
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          KovalDeepAI - Debug Page
        </h1>
        
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">System Status</h2>
          <button
            onClick={testAPI}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mb-4"
          >
            Check Environment Variables
          </button>
          
          {message && (
            <pre className="bg-gray-800 text-green-400 p-4 rounded text-sm overflow-x-auto">
              {message}
            </pre>
          )}
        </div>

        <div className="bg-blue-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
          <ul className="space-y-2">
            <li><a href="/" className="text-blue-600 hover:underline">Main Application</a></li>
            <li><a href="/test-minimal" className="text-blue-600 hover:underline">Minimal Test Page</a></li>
            <li><a href="/auth/login" className="text-blue-600 hover:underline">Login Page</a></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
