'use client';

import { useEffect, useState, useRef } from 'react';

export default function Page() {
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
        if (data?.thread_id) {
          setThreadId(data.thread_id);
        } else {
          setError('❌ Failed to load thread ID.');
        }
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
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setError(null);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, thread_id: threadId }),
      });

      const data = await res.json();

      if (data?.assistantResponse) {
        const assistantMsg = {
          role: 'assistant',
          content: data.assistantResponse,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        setError('❌ Assistant returned no response.');
      }
    } catch (err) {
      setError('❌ Error sending message.');
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center text-white p-6"
      style={{
        backgroundImage: `url('/background.jpg')`,
        backgroundColor: '#000000',
      }}
    >
      <div className="max-w-2xl mx-auto bg-black bg-opacity-70 rounded-xl p-6 shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-6">Koval Deep AI</h1>

        <div
          ref={chatBoxRef}
          className="h-96 overflow-y-auto border border-gray-600 p-4 rounded-lg bg-gray-900"
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`mb-3 p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-700 text-right'
                  : 'bg-green-800 text-left'
              }`}
            >
              <strong>{msg.role === 'user' ? 'You' : 'Assistant'}:</strong>{' '}
              {msg.content}
            </div>
          ))}
          {error && <p className="text-red-400">{error}</p>}
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Type your question..."
            className="flex-1 p-3 rounded-md text-black text-lg resize-none h-20"
          />
          <button
            onClick={sendMessage}
            className="bg-white text-black px-6 py-2 rounded-md font-semibold"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
