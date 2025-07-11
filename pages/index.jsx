'use client';

import { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "👋 Hi! How can I assist you on your freediving journey today?",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const [threadId, setThreadId] = useState("");
  const [username, setUsername] = useState("");

  // Initialize username and thread ID only on the client-side
  useEffect(() => {
    if (typeof window !== 'undefined') { // Ensure we're on the client-side
      const storedUser = localStorage.getItem("kovalUser");
      if (storedUser) {
        setUsername(storedUser);
      } else {
        const newUser = 'Guest' + Math.floor(Math.random() * 1000); // Generate a random guest name
        localStorage.setItem('kovalUser', newUser);
        setUsername(newUser);
      }

      const storedThreadId = localStorage.getItem("kovalThreadId");
      if (storedThreadId) {
        setThreadId(storedThreadId);
      } else {
        const newThreadId = "thread-" + Date.now(); // Generate a new thread ID
        localStorage.setItem("kovalThreadId", newThreadId);
        setThreadId(newThreadId);
      }
    }
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    const userMessage = { role: "user", content: trimmedInput };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmedInput, thread_id: threadId }),
      });

      const data = await res.json();
      const assistantMessage = data?.assistantMessage ?? {
        role: "assistant",
        content: "⚠️ Something went wrong. Please try again.",
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `❌ Error: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bg-[#0f0f0f] min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-3xl h-screen flex flex-col border border-gray-700 rounded-lg overflow-hidden shadow-lg">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-700 bg-[#121212]">
          <img src="/deeplogo.jpg" alt="Deep Freediving Logo" className="w-12 h-12 rounded-full" />
          <h1 className="text-2xl font-bold text-white">Koval Deep AI</h1>
        </div>

        {/* Messages Section */}
        <div className="flex-1 overflow-y-auto bg-[#181818] px-4 py-6 space-y-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-xl px-4 py-3 rounded-xl whitespace-pre-wrap ${
                m.role === "assistant"
                  ? "bg-white text-black self-start"
                  : "bg-blue-600 text-white self-end"
              }`}
            >
              <strong>{m.role === "user" ? "You" : "Assistant"}:</strong>
              <ReactMarkdown>{m.content}</ReactMarkdown>
            </div>
          ))}
          {loading && (
            <div className="text-gray-400 italic">Koval Deep AI is thinking...</div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Section */}
        <form
          onSubmit={handleSubmit}
          className="w-full bg-[#121212] border-t border-gray-700 flex gap-2 p-4"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message here (e.g., I'm Kai, Level 2 diver training for 60m)..."
            className="flex-1 resize-none rounded-md p-3 bg-white text-black text-sm h-20"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-md font-semibold disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Thinking..." : "Send"}
          </button>
        </form>
      </div>
    </main>
  );
}
