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
      className="min-h-screen w-full bg-black text-white bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: `url('/background.jpg')`,
      }}
    >
      <div className="max-w-3xl mx-auto p-6 bg-black bg-opacity-80 rounded-lg shadow-lg min-h-screen flex flex-col justify-between">
        <h1 className="text-4xl font-bold text-center mb-6">Koval Deep AI</h1>

        <div
          ref={chatBoxRef}
          className="flex-1 overflow-y-auto border border-gray-700 rounded-md p-4 bg-gray-900"
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`mb-4 p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-right'
                  : 'bg-green-700 text-left'
              }`}
            >
              <strong>{msg.role === 'user' ? 'You' : 'Assistant'}:</strong> {msg.content}
            </div>
          ))}
          {error && <p className="text-red-400 mt-2">{error}</p>}
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Type your question..."
            className="flex-1 p-4 rounded-md text-black text-lg resize-none h-28"
          />
          <button
            onClick={sendMessage}
            className="bg-white text-black px-6 py-3 rounded-md font-semibold"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
