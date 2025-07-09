'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

export default function Chat() {
  const [username, setUsername] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState(null); // Store thread ID
  const [error, setError] = useState(null);
  const chatBoxRef = useRef(null);

  // Use useEffect to handle client-side localStorage operations
  useEffect(() => {
    const storedUser = localStorage.getItem('kovalUser');
    if (storedUser) setUsername(storedUser);

    const savedMessages = localStorage.getItem('kovalChatHistory');
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }

    // Fetch or generate thread ID
    const storedThreadId = localStorage.getItem('kovalThreadId');
    if (!storedThreadId) {
      const newThreadId = 'thread-' + Date.now();
      setThreadId(newThreadId);
      localStorage.setItem('kovalThreadId', newThreadId);
    } else {
      setThreadId(storedThreadId);
    }
  }, []);

  // Auto-scroll and store messages in localStorage
  useEffect(() => {
    chatBoxRef.current?.scrollIntoView({ behavior: 'smooth' });
    localStorage.setItem('kovalChatHistory', JSON.stringify(messages));
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !threadId) {
      setError('Assistant is still loading...');
      return;
    }

    const userMessage = { role: 'user', content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, thread_id: threadId }),
      });

      const data = await response.json();
      const assistantMessage = data?.assistantMessage ?? {
        role: 'assistant',
        content: 'Hmm, something went wrong. Try again.'
      };

      setMessages([...updatedMessages, assistantMessage]);
    } catch (error) {
      console.error('API call failed:', error);
      setMessages([
        ...updatedMessages,
        { role: 'assistant', content: 'Sorry, an error occurred.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Ask for username if missing
  if (!username) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial' }}>
        <h2>Welcome to Koval Deep AI</h2>
        <p>Please enter your name or email to begin:</p>
        <input
          style={{ padding: '10px', width: '300px', fontSize: '16px' }}
          placeholder="Your name or email"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
              localStorage.setItem('kovalUser', e.target.value.trim());
              setUsername(e.target.value.trim());
            }
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-cover bg-center text-white p-6"
      style={{
        backgroundImage: `url('/background.jpg')`,
        backgroundSize: 'cover',  // Ensures the background image covers the screen without stretching
        backgroundPosition: 'center',
        backgroundColor: '#000000',
      }}
    >
      {/* Logo Section */}
      <div className="absolute top-4 left-4 z-10">
        <img src="/logo.png" alt="Logo" className="w-16 h-auto" />
      </div>

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
                msg.role === 'user' ? 'bg-blue-700 text-right' : 'bg-green-800 text-left'
              }`}
            >
              <strong>{msg.role === 'user' ? 'You' : 'Assistant'}:</strong>
              <div className="mt-1">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          ))}
          {loading && (
            <div className="bg-green-800 text-left p-3 rounded-lg">
              <strong>Assistant:</strong> <em>Typing...</em>
            </div>
          )}
          {error && <p className="text-red-400">{error}</p>}
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Type your question..."
            className="flex-1 p-3 rounded-md text-black text-lg resize-none h-20"
          />
          <button
            onClick={handleSend}
            className="bg-white text-black px-6 py-2 rounded-md font-semibold"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
