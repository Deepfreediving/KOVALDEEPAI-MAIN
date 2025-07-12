import { useState } from 'react';

export default function CreateThread() {
  const [threadId, setThreadId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCreateThread = async () => {
    setLoading(true);
    setError(null); // Reset any previous errors

    try {
      const response = await fetch('/api/create-thread', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create thread'); // Error if response is not ok
      }

      const data = await response.json();
      if (data?.threadId) {
        setThreadId(data.threadId); // Store thread ID upon success
      } else {
        throw new Error('No thread ID returned'); // Handle if no thread ID is returned
      }
    } catch (err) {
      setError(err.message); // Set the error message in case of failure
    } finally {
      setLoading(false); // Set loading to false when finished
    }
  };

  return (
    <div>
      <h1>Create a New Thread</h1>
      <button onClick={handleCreateThread} disabled={loading}>
        {loading ? 'Creating...' : 'Create Thread'}
      </button>

      {/* Display success message with thread ID */}
      {threadId && (
        <p>Thread created! Thread ID: <strong>{threadId}</strong></p>
      )}

      {/* Display error message if any */}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
