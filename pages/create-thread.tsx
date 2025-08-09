import { useState, FormEvent, useRef } from 'react';

export default function CreateThread() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!username.trim() || !displayName.trim()) {
      setStatus('❌ Please fill in both fields');
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
    setStatus('⏳ Creating thread...');
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/openai/create-thread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          displayName: displayName.trim(),
          timestamp: Date.now(),
        }),
        signal: abortControllerRef.current.signal,
      });

      // ✅ Handle non-JSON safely
      let data: { threadId?: string; error?: string } = {};
      try {
        const text = await response.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        console.warn('⚠️ Non-JSON response received');
      }

      if (response.ok && data.threadId) {
        setStatus(`✅ Success! Thread ID: ${data.threadId}`);
      } else {
        setStatus(`❌ Error: ${data.error || 'Failed to create thread'}`);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setStatus('⚠️ Request canceled');
      } else {
        setStatus(`❌ Error: ${err.message || 'Network request failed'}`);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setStatus('⚠️ Request aborted');
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
      <h1>🤿 Create AI Thread</h1>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label>
            Username:
            <input
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              style={{ width: '100%', padding: '8px', marginTop: '4px' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>
            Display Name:
            <input
              type="text"
              placeholder="Enter display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isLoading}
              style={{ width: '100%', padding: '8px', marginTop: '4px' }}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: isLoading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? 'Creating...' : 'Create Thread'}
        </button>

        {isLoading && (
          <button
            type="button"
            onClick={handleCancel}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              marginTop: '8px',
            }}
          >
            Cancel
          </button>
        )}
      </form>

      {status && <p style={{ marginTop: '10px' }}>{status}</p>}
    </div>
  );
}
