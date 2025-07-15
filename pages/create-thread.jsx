"use client"; // Ensure this is at the top of the file for proper client-side behavior in Next.js

import { useState } from 'react';

export default function CreateThread() {
  const [threadId, setThreadId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCreateThreadSubmit = async () => {
    setLoading(true);
    setError(null);  // Reset error before making a request

    try {
      const response = await fetch('/api/create-thread', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create thread');
      }

      const data = await response.json();
      if (data.threadId) {
        setThreadId(data.threadId);  // Corrected the field name to threadId
      } else {
        throw new Error('Thread ID is missing from the response');
      }
    } catch (err) {
      setError('Error: ' + (err.message || 'An unknown error occurred'));  // Display a more user-friendly error message
    } finally {
      setLoading(false);  // Reset loading state after the request is finished
    }
  };

  return (
    <div className="container">
      <h1>Create a New Thread</h1>
      <button onClick={handleCreateThreadSubmit} disabled={loading}>
        {loading ? 'Creating Thread...' : 'Create Thread'}
      </button>

      {threadId && <p>Thread created! Thread ID: {threadId}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
