'use client';

import React, { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

export default function Chat() {
  const [username, setUsername] = useState('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [threadId, setThreadId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null); // For auto-scrolling

  // Retrieve or create threadId on mount
  useEffect(() => {
    const storedThreadId = localStorage.getItem('kovalThreadId');
    if (!storedThreadId) {
      // Create new thread on server-side if not found in localStorage
      const createThread = async () => {
        try {
          const response = await fetch('/api/create-thread', { method: 'POST' });
          const data = await response.json();
          if (data.thread_id) {
            setThreadId(data.thread_id); // Save the new thread_id in state and localStorage
            localStorage.setItem('kovalThreadId', data.thread_id);
          } else {
            console.error("Thread creation failed: No thread_id returned.");
            setError("Failed to create thread.");
          }
        } catch (err) {
          console.error('[Thread Creation Error]', err);
          setError('Failed to create thread.');
        }
      };

      createThread();
    } else {
      setThreadId(storedThreadId);
    }
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('kovalUser');
    if (storedUser) setUsername(storedUser);

    const savedMessages = localStorage.getItem('kovalChatHistory');
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    localStorage.setItem('kovalChatHistory', JSON.stringify(messages));
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
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,  // User input
          thread_id: threadId  // Valid thread ID
        }),
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
      console.error('Error sending message:', err);  // Log error to console
      setError('❌ Error sending message.');
    } finally {
      setLoading(false);
    }
  };

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
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div className="max-w-2xl mx-auto bg-black bg-opacity-70 rounded-xl p-6 shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-6">Koval Deep AI</h1>

        <div className="h-[500px] overflow-y-auto p-4 rounded-lg bg-gray-100 text-black mb-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`mb-3 p-3 rounded-lg max-w-[80%] ${
                msg.role === 'user'
                  ? 'bg-blue-100 ml-auto text-right'
                  : 'bg-gray-200 mr-auto text-left'
              }`}
            >
              <strong>{msg.role === 'user' ? 'You' : 'Assistant'}:</strong>
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          ))}

          {loading && (
            <div className="text-gray-500 italic">Assistant is typing<span className="animate-pulse">...</span></div>
          )}

          {error && (
            <div className="text-red-500 mt-2">
              <strong>{error}</strong>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Ask something..."
            className="flex-1 p-3 rounded-md text-black text-lg resize-none h-20"
          />
          <button
            onClick={sendMessage}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-semibold"
            disabled={!threadId || loading}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
