import { useEffect, useState, useRef } from "react";

export default function Chat() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    const userMessage = { role: "user", content: trimmedInput };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    // ✅ Fix: Define threadId and username before use
    let storedThreadId = localStorage.getItem("kovalThreadId");
    let storedUsername = localStorage.getItem("kovalUser");

    if (!storedUsername) {
      const newUser = "Guest" + Math.floor(Math.random() * 1000);
      localStorage.setItem("kovalUser", newUser);
      storedUsername = newUser;
    }

    if (!storedThreadId) {
      try {
        const res = await fetch("/api/create-thread", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: storedUsername }),
        });
        const data = await res.json();
        if (data.threadId) {
          storedThreadId = data.threadId;
          localStorage.setItem("kovalThreadId", data.threadId);
        } else {
          throw new Error("Thread creation failed");
        }
      } catch (err) {
        console.error("Error creating thread:", err);
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmedInput,
          thread_id: storedThreadId,
          username: storedUsername,
        }),
      });

      const data = await res.json();

      const assistantMessage = {
        role: "assistant",
        content: data?.assistantMessage?.content || "⚠️ Something went wrong. Please try again.",
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("API error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ Unable to get response. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.key === "Enter" || e.key === "Return") && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <main className="bg-gradient-to-b from-teal-500 to-blue-700 min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-3xl h-screen flex flex-col border border-gray-700 rounded-xl overflow-hidden shadow-lg bg-white">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-700 bg-[#121212] rounded-t-xl">
          <img src="/deeplogo.jpg" alt="Deep Freediving Logo" className="w-12 h-12 rounded-full" />
          <h1 className="text-2xl font-bold text-white">Koval Deep AI</h1>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-400">
              Welcome to Koval Deep AI! How can I assist you today?
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-xl px-4 py-3 rounded-xl whitespace-pre-wrap transition-all duration-300 ease-in-out ${
                m.role === "assistant"
                  ? "bg-teal-800 text-white self-start shadow-md"
                  : "bg-blue-600 text-white self-end shadow-lg"
              }`}
            >
              <strong>{m.role === "user" ? "You" : "Assistant"}:</strong>
              <div>{m.content}</div>
            </div>
          ))}
          {loading && (
            <div className="text-gray-400 italic">Koval Deep AI is thinking...</div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="w-full bg-[#121212] border-t border-gray-700 flex gap-2 p-4 shadow-xl rounded-b-xl"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message here..."
            className="flex-1 resize-none rounded-md p-3 bg-white text-black text-sm h-20 shadow-md"
            onKeyDown={handleKeyDown}
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-md font-semibold disabled:opacity-50"
            disabled={loading || input.trim() === ""}
          >
            {loading ? "Thinking..." : "Send"}
          </button>
        </form>
      </div>
    </main>
  );
}
