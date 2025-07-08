'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown'; // Ensure this is correctly installed

export default function Chat() {
  const [username, setUsername] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Hi! How can I assist you today? Let me know your certification level, PBs, warm-up routine, and training frequency so I can help you best.',
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Load and save messages and username in localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('kovalUser');
    if (storedUser) setUsername(storedUser);

    const savedMessages = localStorage.getItem('kovalChatHistory');
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    localStorage.setItem('kovalChatHistory', JSON.stringify(messages));
  }, [messages]);

  // Handle sending messages
  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const data = await response.json();
      const assistantMessage = data?.assistantMessage || {
        role: 'assistant',
        content: 'Oops, something went wrong. Try again.',
      };

      setMessages([...updatedMessages, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      setMessages([
        ...updatedMessages,
        { role: 'assistant', content: 'Sorry, an error occurred.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Render the chat UI
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <div
          style={{
            border: '1px solid #ccc',
            borderRadius: '8px',
            padding: '15px',
            height: '500px',
            overflowY: 'scroll',
            backgroundColor: '#f9f9f9',
            marginBottom: '10px',
          }}
        >
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                textAlign: msg.role === 'user' ? 'right' : 'left',
                backgroundColor: msg.role === 'user' ? '#d9f2ff' : '#eaeaea',
                padding: '8px 12px',
                borderRadius: '10px',
                marginBottom: '10px',
              }}
            >
              <strong>{msg.role === 'user' ? 'You' : 'Assistant'}:</strong>
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          ))}

          {loading && (
            <div style={{ textAlign: 'left', backgroundColor: '#eaeaea', padding: '8px 12px', borderRadius: '10px' }}>
              <strong>Assistant:</strong> <em>Typing...</em>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask something..."
            style={{
              flexGrow: 1,
              padding: '10px',
              fontSize: '16px',
              borderRadius: '8px',
              border: '1px solid #ccc',
              resize: 'none',
              height: '60px',
            }}
          />
          <button
            onClick={handleSend}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
