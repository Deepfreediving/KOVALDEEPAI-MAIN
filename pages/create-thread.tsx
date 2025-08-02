import { useState, FormEvent } from 'react';

export default function CreateThread() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [status, setStatus] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const [threadId, setThreadId] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('⏳ Creating AI thread...');

    try {
      const response = await fetch('/api/openai/create-thread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, displayName }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('✅ Thread created successfully!');
        setThreadId(data.threadId || '');
        setInitialMessage(data.initialMessage || '');
      } else {
        setStatus(`❌ Error: ${data.error || 'Failed to create thread.'}`);
      }
    } catch (err) {
      console.error('Error creating thread:', err);
      setStatus('❌ Server error, please try again later.');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Start a New AI Freediving Coaching Thread</h1>
      <form
        onSubmit={handleSubmit}
        style={{
          maxWidth: '500px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <input
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          style={{ padding: '10px', fontSize: '1rem' }}
        />
        <input
          type="text"
          placeholder="Display name (e.g., Daniel)"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          style={{ padding: '10px', fontSize: '1rem' }}
        />
        <button
          type="submit"
          style={{ padding: '10px', fontSize: '1rem', cursor: 'pointer' }}
        >
          Create AI Thread
        </button>
      </form>

      {status && <p style={{ marginTop: '1rem' }}>{status}</p>}

      {threadId && (
        <div style={{ marginTop: '1.5rem' }}>
          <p><strong>Thread ID:</strong> {threadId}</p>
          <p><strong>AI says:</strong> {initialMessage}</p>
        </div>
      )}
    </div>
  );
}
