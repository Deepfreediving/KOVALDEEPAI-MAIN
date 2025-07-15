import { useEffect, useState, useRef } from 'react';
console.log("Thread ID:", threadId);
console.log("Username:", username);

export default function Chat() {
  const [username, setUsername] = useState('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [threadId, setThreadId] = useState(null);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null); // For auto-scrolling

  // State to track initialization
  const [isInitialized, setIsInitialized] = useState(false);

  // Retrieve or create threadId on mount
  useEffect(() => {
    const storedUsername = localStorage.getItem('kovalUser');
    const storedThreadId = localStorage.getItem('kovalThreadId');
    
    if (storedUsername) setUsername(storedUsername);
    if (storedThreadId) setThreadId(storedThreadId);

    setIsInitialized(true); // Set initialization state
  }, []);

  // Create thread if not available
  useEffect(() => {
    if (!isInitialized || threadId) return;
    
    const createThread = async () => {
      try {
        const response = await fetch('/api/create-thread', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        if (!response.ok) {
          throw new Error('Failed to create thread');
        }

        const data = await response.json();
        if (data.threadId) {
          setThreadId(data.threadId);
          localStorage.setItem('kovalThreadId', data.threadId);
        } else {
          console.warn('Thread creation failed: No threadId returned.');
        }
      } catch (err) {
        console.error('Error creating thread:', err);
      }
    };

    createThread();
  }, [isInitialized, threadId]);

  // Scroll to bottom of chat when new message is added
  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle message submission when Enter or Return is pressed
  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === 'Return') && !e.shiftKey) {
      e.preventDefault(); // Prevent default behavior (new line in text area)
      handleSubmit(); // Trigger form submission
    }
  };

  // Handle message submission
  const handleSubmit = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    const userMessage = { role: 'user', content: trimmedInput };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    const threadId = localStorage.getItem('kovalThreadId');
    const username = localStorage.getItem('kovalUser') || 'Guest';

    if (!threadId || !username) {
      console.warn('Missing threadId or username');
      return;
    }

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
        content: '⚠️ Something went wrong. Please try again later.',
      };

      setMessages((prev) => [...prev, assistantMessage]);

    } catch (err) {
      console.error('Error fetching assistant response:', err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '⚠️ Error: Unable to get response. Please try again later.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const isThreadReady = threadId && username;

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
            <div key={i} className={`max-w-xl px-4 py-3 rounded-xl whitespace-pre-wrap transition-all duration-300 ease-in-out ${m.role === 'assistant' ? 'bg-teal-800 text-white self-start shadow-md' : 'bg-blue-600 text-white self-end shadow-lg'}`}>
              <strong>{m.role === 'user' ? 'You' : 'Assistant'}:</strong>
              <div>{m.content}</div>
            </div>
          ))}
          {loading && <div className="text-gray-400 italic">Koval Deep AI is thinking...</div>}
          <div ref={bottomRef} />
        </div>

        {/* Input Section */}
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="w-full bg-[#121212] border-t border-gray-700 flex gap-2 p-4 shadow-xl rounded-b-xl">
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
            disabled={loading || !isThreadReady || input.trim() === ""}
          >
            {loading ? 'Thinking...' : 'Send'}
          </button>
        </form>
      </div>
    </main>
  );
}
