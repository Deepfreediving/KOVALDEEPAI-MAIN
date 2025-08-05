import { useState, FormEvent, useRef } from 'react';

export default function CreateThread() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // ✅ Basic validation
    if (!username.trim() || !displayName.trim()) {
      setStatus('❌ Please fill in both fields');
      return;
    }

    // ✅ Prevent double submission
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
          timestamp: Date.now()
        }),
        signal: abortControllerRef.current.signal
      });

      // Check if request was aborted
      if (abortControllerRef.current.signal.aborted) {
        return;
      }

      // ✅ Safe JSON parsing
      let data: { threadId?: string; error?: string } = {};
      try {
        const text = await response.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error('Invalid server response');
      }

      if (response.ok) {
        setStatus(`✅ Success! Thread ID: ${data.threadId}`);
      } else {
        setStatus(`❌ Error: ${data.error || 'Failed to create thread'}`);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setStatus(`❌ Error: ${err.message}`);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
      <h1>🤿 Create AI Thread</h1>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoading}
            style={{ width: '100%', padding: '8px', marginBottom: '5px' }}
          />
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <input
            type="text"
            placeholder="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={isLoading}
            style={{ width: '100%', padding: '8px' }}
          />
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
            borderRadius: '4px'
          }}
        >
          {isLoading ? 'Creating...' : 'Create Thread'}
        </button>
      </form>
      
      {status && <p style={{ marginTop: '10px' }}>{status}</p>}
    </div>
  );
}
