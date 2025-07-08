'use client';

import { useEffect, useState } from 'react';

export default function Chat() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [threadId, setThreadId] = useState(null);
  const [error, setError] = useState(null);

  // ✅ Create thread on mount
  useEffect(() => {
    const createThread = async () => {
      try {
        const res = await fetch('/api/create-thread', { method: 'POST' });
        const data = await res.json();
        setThreadId(data.thread_id);
      } catch (err) {
        setError('Failed to create thread.');
      }
    };

    createThread();
  }, []);

  // ✅ Send message
  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { role: 'user', content: input };
    setMessages([...messages, userMsg]);
    setInput('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, thread_id: threadId }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      const assistantMsg = {
        role: 'assistant',
        content: data.assistantResponse,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError('Error sending message.');
    }
  };

  return (
    <div className="text-white bg-opacity-70">
      <div style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
        <h2>Koval Deep AI</h2>

        <div
          style={{
            border: '1px solid #ccc',
            minHeight: '200px',
            padding: '1rem',
            marginBottom: '1rem',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '10px',
          }}
        >
          {messages.map((msg, i) => (
            <p
              key={i}
              className={msg.role === 'user' ? 'text-blue-300' : 'text-green-300'}
            >
              <strong>{msg.role}:</strong> {msg.content}
            </p>
          ))}
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') sendMessage();
          }}
          placeholder="Type your question..."
          className="w-full p-2 mb-2 text-black rounded"
        />
        <button
          onClick={sendMessage}
          className="bg-white text-black px-4 py-2 rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
}
