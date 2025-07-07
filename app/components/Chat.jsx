'use client';

import { useState } from 'react';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    const res = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: input }),
    });

    const data = await res.json();
    const reply = data?.choices?.[0]?.message || {
      role: 'assistant',
      content: 'No response received.',
    };

    setMessages((prev) => [...prev, reply]);
    setLoading(false);
  };

  return (
    <div className="bg-white p-4 rounded-xl max-w-2xl w-full mx-auto">
      <div className="h-80 overflow-y-auto space-y-2 mb-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`text-${msg.role === 'user' ? 'right' : 'left'}`}>
            <span className="block p-2 rounded bg-gray-100">{msg.content}</span>
          </div>
        ))}
        {loading && <p className="text-gray-400 italic">Koval Deep AI is thinking...</p>}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 border border-gray-300 rounded px-3 py-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Koval Deep AI..."
        />
        <button
          onClick={sendMessage}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
}
