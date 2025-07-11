import { useState } from 'react';

export default function CreateThread() {
  const [threadId, setThreadId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCreateThread = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/create-thread', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create thread');
      }

      const data = await response.json();
      setThreadId(data.threadId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Create a New Thread</h1>
      <button onClick={handleCreateThread} disabled={loading}>
        {loading ? 'Creating...' : 'Create Thread'}
      </button>

      {threadId && <p>Thread created! Thread ID: {threadId}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
