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

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
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

      const assistantReply = data?.assistantResponse || data?.choices?.[0]?.message?.content;

      if (!assistantReply) {
        setError('⚠️ Assistant did not return a message.');
        return;
      }

      const assistantMsg = { role: 'assistant', content: assistantReply };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError('❌ Error sending message.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-black bg-opacity-90 text-white flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-3xl flex flex-col gap-4">
        <h2 className="text-center text-3xl font-bold mb-2">Koval Deep AI</h2>

        <div
          ref={chatBoxRef}
          className="bg-gray-800 border border-gray-600 rounded-lg p-4 h-[500px] overflow-y-auto shadow-inner"
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`mb-3 p-3 rounded-lg whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white text-right'
                  : 'bg-green-700 text-white text-left'
              }`}
            >
              <strong>{msg.role === 'user' ? 'You' : 'Assistant'}:</strong> {msg.content}
            </div>
          ))}
          {error && <p className="text-red-400">{error}</p>}
        </div>

        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your question..."
            className="flex-1 p-3 rounded-md text-black text-lg"
          />
          <button
            onClick={sendMessage}
            className="bg-white text-black px-4 py-2 rounded-md font-semibold"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
