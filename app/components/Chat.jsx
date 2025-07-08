'use client';

import { useEffect, useState, useRef } from 'react';

export default function Chat() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [threadId, setThreadId] = useState(null);
  const [error, setError] = useState(null);
  const chatBoxRef = useRef(null);

  // Create thread on mount
  useEffect(() => {
    const createThread = async () => {
      try {
        const res = await fetch('/api/create-thread', { method: 'POST' });
        const data = await res.json();
        setThreadId(data.thread_id);
      } catch {
        setError('❌ Failed to create assistant thread.');
      }
    };
    createThread();
  }, []);

  // Scroll to bottom when new message arrives
  useEffect(() => {
    chatBoxRef.current?.scrollTo({
      top: chatBoxRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

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

      if (data.error) {
        setError(data.error);
        return;
      }

      const assistantMsg = {
        role: 'assistant',
        content: data.assistantResponse,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setError('❌ Network error while sending message.');
    }
  };

  return (
    <div className="bg-black bg-opacity-90 min-h-screen text-white p-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-center text-3xl font-semibold mb-6">Koval Deep AI</h1>

        <div
          ref={chatBoxRef}
          className="border border-gray-700 rounded-xl p-4 h-[500px] overflow-y-auto bg-gray-800 shadow-inner"
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`mb-4 p-3 rounded-lg whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white text-right ml-auto max-w-[80%]'
                  : 'bg-green-700 text-white text-left mr-auto max-w-[80%]'
              }`}
            >
              <strong>{msg.role === 'user' ? 'You' : 'Assistant'}:</strong> {msg.content}
            </div>
          ))}
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        <div className="mt-6 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask a freediving question..."
            className="flex-1 p-4 rounded-lg text-black text-lg shadow-md focus:outline-none"
          />
          <button
            onClick={sendMessage}
            className="bg-white text-black px-6 py-2 rounded-lg font-semibold shadow-md hover:bg-gray-200"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
