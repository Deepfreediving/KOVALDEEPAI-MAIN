import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

export default function Chat() {
  const [username, setUsername] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Hi! How can I assist you on your freediving journey today? Let me know your certification level, PBs, warm-up routine, and training frequency so I can help you best.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);

  // Use useEffect to handle client-side localStorage operations
  useEffect(() => {
    const storedUser = localStorage.getItem('kovalUser');
    if (storedUser) setUsername(storedUser);

    const savedMessages = localStorage.getItem('kovalChatHistory');
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }
  }, []);

  // Auto-scroll and store messages in localStorage
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    localStorage.setItem('kovalChatHistory', JSON.stringify(messages));
  }, [messages]);

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
        body: JSON.stringify({ messages: updatedMessages })
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

  return (
    <div style={styles.container}>
      <div style={styles.chatBox}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={msg.role === 'user' ? styles.userMsg : styles.assistantMsg}
          >
            <strong>{msg.role}:</strong>
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        ))}

        {loading && (
          <div style={styles.assistantMsg}>
            <strong>assistant:</strong> <em>Typing...</em>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div style={styles.inputContainer}>
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
          style={styles.textArea}
        />
        <button onClick={handleSend} style={styles.sendButton}>
          Send
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    fontFamily: 'Arial, sans-serif',
    padding: '20px',
    maxWidth: '700px',
    margin: '0 auto'
  },
  chatBox: {
    border: '1px solid #ccc',
    borderRadius: '8px',
    padding: '15px',
    height: '500px',
    overflowY: 'scroll',
    backgroundColor: '#f9f9f9',
    marginBottom: '10px'
  },
  userMsg: {
    textAlign: 'right',
    margin: '10px 0',
    backgroundColor: '#d9f2ff',
    padding: '8px 12px',
    borderRadius: '10px',
    display: 'inline-block',
    maxWidth: '80%'
  },
  assistantMsg: {
    textAlign: 'left',
    margin: '10px 0',
    backgroundColor: '#eaeaea',
    padding: '8px 12px',
    borderRadius: '10px',
    display: 'inline-block',
    maxWidth: '80%'
  },
  inputContainer: {
    display: 'flex',
    gap: '10px'
  },
  textArea: {
    flexGrow: 1,
    padding: '10px',
    fontSize: '16px',
    borderRadius: '8px',
    border: '1px solid #ccc',
    resize: 'none',
    height: '60px'
  },
  sendButton: {
    padding: '10px 20px',
    fontSize: '16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer'
  }
};