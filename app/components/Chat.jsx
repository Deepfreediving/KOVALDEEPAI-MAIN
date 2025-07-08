'use client';

import { useEffect, useState, useRef } from 'react';

export default function Chat() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [threadId, setThreadId] = useState(null);
  const [error, setError] = useState(null);
  const chatBoxRef = useRef(null);

  useEffect(() => {
    const createThread = async () => {
      try {
        const res = await fetch('/api/create-thread', { method: 'POST' });
        const data = await res.json();
        setThreadId(data.thread_id);
      } catch {
        setError('❌ Failed to create thread.');
      }
    };
    createThread();
  }, []);

  const sendMessage = async () => {
  if (!input.trim() || !threadId) {
    setError('Assistant is still loading...');
    return;
  }

  const userMsg = { role: 'user', content: input };
  setMessages([...messages, userMsg]);
  setInput('');
  setError(null); // clear previous errors

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
    <div className="bg-black bg-opacity-90 min-h-screen text-white p-4">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-center text-2xl font-bold mb-4">Koval Deep AI</h2>

        <div
          ref={chatBoxRef}
          className="border border-gray-700 rounded-lg p-4 h-96 overflow-y-auto bg-gray-800"
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`mb-3 p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white text-right'
                  : 'bg-green-700 text-white text-left'
              }`}
            >
              <strong>{msg.role === 'user' ? 'You' : 'Assistant'}:</strong> {msg.content}
            </div>
          ))}
          {error && <p className="text-red-500">{error}</p>}
        </div>

        <div className="mt-4 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your question..."
            className="flex-1 p-3 rounded-md text-black text-lg"
          />
          <button
            onClick={sendMessage}
            className="bg-white text-black px-4 py-2 rounded-md"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
