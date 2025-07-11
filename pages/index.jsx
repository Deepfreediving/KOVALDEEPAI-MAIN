'use client';

import { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown'; // Keep this if you need to render markdown content

export default function Index() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '👋 Hi! How can I assist you on your freediving journey today?',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const [threadId, setThreadId] = useState('');
  const [username, setUsername] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('kovalUser');
      if (storedUser) {
        setUsername(storedUser);
      } else {
        const newUser = 'Guest' + Math.floor(Math.random() * 1000);
        localStorage.setItem('kovalUser', newUser);
        setUsername(newUser);
      }

      const storedThreadId = localStorage.getItem('kovalThreadId');
      if (storedThreadId) {
        setThreadId(storedThreadId);
      } else {
        const newThreadId = 'thread-' + Date.now();
        localStorage.setItem('kovalThreadId', newThreadId);
        setThreadId(newThreadId);
      }
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    const userMessage = { role: 'user', content: trimmedInput };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmedInput,
          thread_id: threadId,
          username: username,
        }),
      });

      const data = await res.json();
      const assistantMessage = data?.assistantMessage ?? {
        role: 'assistant',
        content: '⚠️ Something went wrong. Please try again.',
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `❌ Error: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bg-gradient-to-b from-teal-500 to-blue-700 min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-3xl h-screen flex flex-col border border-gray-700 rounded-xl overflow-hidden shadow-lg bg-white">
        <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-700 bg-[#121212] rounded-t-xl">
          <img
            src="/deeplogo.jpg"
            alt="Deep Freediving Logo"
            className="w-12 h-12 rounded-full shadow-md"
          />
          <h1 className="text-2xl font-bold text-white">Koval Deep AI</h1>
          {username && <span className="text-white text-sm">Hello, {username}!</span>}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-xl px-4 py-3 rounded-xl whitespace-pre-wrap transition-all duration-300 ease-in-out ${
                m.role === 'assistant'
                  ? 'bg-teal-800 text-white self-start shadow-md'
                  : 'bg-blue-600 text-white self-end shadow-lg'
              }`}
            >
              <strong>{m.role === 'user' ? 'You' : 'Assistant'}:</strong>
              <div>
                {m.role === 'assistant' ? (
                  <ReactMarkdown>{m.content}</ReactMarkdown> // Use for markdown content
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))}
          {loading && <div className="text-gray-400 italic">Koval Deep AI is thinking...</div>}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSubmit} className="w-full bg-[#121212] border-t border-gray-700 flex gap-2 p-4 shadow-xl rounded-b-xl">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message here (e.g., I'm Kai, Level 2 diver training for 60m)..."
            className="flex-1 resize-none rounded-md p-3 bg-white text-black text-sm h-20 shadow-md"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-md font-semibold disabled:opacity-50" disabled={loading}>
            {loading ? 'Thinking...' : 'Send'}
          </button>
        </form>
      </div>
    </main>
  );
}
