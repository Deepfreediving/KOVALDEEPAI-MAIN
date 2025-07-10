// app/chat/page.jsx
"use client";

import { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessage = { role: "user", content: input };
    const updatedMessages = [...messages, newMessage];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!res.ok) throw new Error("Request failed");

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.text }]);
    } catch (err) {
      console.error("❌ API Error:", err);
      setMessages((prev) => [...prev, { role: "assistant", content: "❌ Error getting response from AI." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Koval Deep AI 🐬</h1>

      <div className="space-y-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`whitespace-pre-wrap p-3 rounded-md ${
              m.role === "user" ? "bg-blue-100" : "bg-gray-100"
            }`}
          >
            <ReactMarkdown>{m.content}</ReactMarkdown>
          </div>
        ))}

        {loading && <div className="italic text-gray-500">Koval Deep AI is thinking...</div>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border border-gray-300 rounded-l-md p-2"
          placeholder="Ask something..."
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700"
          disabled={loading}
        >
          Send
        </button>
      </form>
    </main>
  );
}
