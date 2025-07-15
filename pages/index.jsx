import { useEffect, useState, useRef } from 'react';

export default function Chat() {
  const [username, setUsername] = useState('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [threadId, setThreadId] = useState(null);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null); // For auto-scrolling

  // Retrieve or create threadId on mount
  useEffect(() => {
    // Get the stored username or prompt for input if it's the first time
    const storedUsername = localStorage.getItem('kovalUser');
    if (!storedUsername) {
      const name = prompt("Please enter your name for a personalized experience:");
      if (name) {
        localStorage.setItem('kovalUser', name);
        setUsername(name);
      }
    } else {
      setUsername(storedUsername);
    }

    // Retrieve threadId from localStorage or create a new one if not present
    const storedThreadId = localStorage.getItem('kovalThreadId');
    if (!storedThreadId) {
      const createThread = async () => {
        try {
          const response = await fetch('/api/create-thread', { method: 'POST' });
          const data = await response.json();
          if (data.thread_id) {
            setThreadId(data.thread_id); // Save thread_id to state and localStorage
            localStorage.setItem('kovalThreadId', data.thread_id);
          } else {
            console.error('Thread creation failed: No thread_id returned.');
          }
        } catch (err) {
          console.error('Error creating thread:', err);
        }
      };
      createThread();
    } else {
      setThreadId(storedThreadId);
    }
  }, []);

  // Scroll to bottom of chat when new message is added
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle message submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput) return; // Don't send empty messages

    const userMessage = { role: 'user', content: trimmedInput };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages); // Add the user message to the state
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
      console.error('Error fetching assistant response:', err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '⚠️ Error: Unable to get response. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Handle Enter key press for submitting the message
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <main className="bg-gradient-to-b from-teal-500 to-blue-700 min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-3xl h-screen flex flex-col border border-gray-700 rounded-xl overflow-hidden shadow-lg bg-white">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-700 bg-[#121212] rounded-t-xl">
          <img src="/deeplogo.jpg" alt="Deep Freediving Logo" className="w-12 h-12 rounded-full shadow-md" />
          <h1 className="text-2xl font-bold text-white">Koval Deep AI</h1>
          {username && <span className="text-white text-sm">Hello, {username}!</span>}
        </div>

        {/* Messages Section */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-400">
              <p>Welcome to Koval Deep AI! How can I assist you today?</p>
            </div>
          )}
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
              <div>{m.content}</div>
            </div>
          ))}
          {loading && <div className="text-gray-400 italic">Koval Deep AI is thinking...</div>}
          <div ref={bottomRef} />
        </div>

        {/* Input Section */}
        <form onSubmit={handleSubmit} className="w-full bg-[#121212] border-t border-gray-700 flex gap-2 p-4 shadow-xl rounded-b-xl">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message here (e.g., Tell me how deep you dove today, how was your mouthfill)..."
            className="flex-1 resize-none rounded-md p-3 bg-white text-black text-sm h-20 shadow-md"
            onKeyDown={handleKeyDown}
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-md font-semibold disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Thinking...' : 'Send'}
          </button>
        </form>
      </div>
    </main>
  );
}
