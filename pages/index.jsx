import { useEffect, useState, useRef } from "react";

export default function Chat() {
  const BOT_NAME = "Koval AI";

  const [input, setInput] = useState("");
  const [files, setFiles] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files).slice(0, 3); // max 3
    setFiles(selected);
  };

  const handleSubmit = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput && files.length === 0) return;

    setLoading(true);
    const storedUsername =
      localStorage.getItem("kovalUser") ||
      (() => {
        const newUser = "Guest" + Math.floor(Math.random() * 1000);
        localStorage.setItem("kovalUser", newUser);
        return newUser;
      })();

    let threadId = localStorage.getItem("kovalThreadId");
    if (!threadId) {
      try {
        const threadRes = await fetch("/api/create-thread", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: storedUsername }),
        });
        const threadData = await threadRes.json();
        threadId = threadData.threadId;
        localStorage.setItem("kovalThreadId", threadId);
      } catch (err) {
        console.error("Thread creation failed:", err);
        setLoading(false);
        return;
      }
    }

    // Handle file uploads first
    if (files.length > 0) {
      try {
        const formData = new FormData();
        files.forEach((file) => formData.append("files", file));

        const uploadRes = await fetch("/api/upload-dive-image", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (uploadData.analysis && Array.isArray(uploadData.analysis)) {
          uploadData.analysis.forEach((msg) =>
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: msg },
            ])
          );
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "⚠️ Something went wrong analyzing your image(s).",
            },
          ]);
        }
      } catch (err) {
        console.error("Upload error:", err);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "⚠️ Upload failed. Please try again.",
          },
        ]);
      } finally {
        setFiles([]); // Clear input
      }
    }

    // Handle chat message
    if (trimmedInput) {
      const userMessage = { role: "user", content: trimmedInput };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");

      try {
        const chatRes = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmedInput,
            thread_id: threadId,
            username: storedUsername,
          }),
        });
        const chatData = await chatRes.json();
        const assistantMessage = {
          role: "assistant",
          content:
            chatData?.assistantMessage?.content ||
            "⚠️ Something went wrong. Please try again.",
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        console.error("Chat error:", err);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "⚠️ Unable to respond. Please try again.",
          },
        ]);
      }
    }

    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if ((e.key === "Enter" || e.key === "Return") && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <main
      className={`min-h-screen flex items-center justify-center px-4 transition-colors duration-300 ${
        darkMode ? "bg-black text-white" : "bg-white text-gray-900"
      }`}
    >
      <div
        className={`w-full max-w-3xl h-screen flex flex-col rounded-xl overflow-hidden shadow-lg border ${
          darkMode ? "border-gray-700 bg-[#121212]" : "border-gray-300 bg-white"
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            darkMode ? "border-gray-700 bg-[#1a1a1a]" : "border-gray-200 bg-gray-100"
          }`}
        >
          <div className="flex items-center gap-4">
            <img src="/deeplogo.jpg" alt="Logo" className="w-10 h-10 rounded-full" />
            <h1 className="text-xl font-semibold">Koval Deep AI</h1>
          </div>
          <button
            onClick={toggleDarkMode}
            className={`px-4 py-1 rounded-md border text-sm transition-colors ${
              darkMode
                ? "bg-white text-black hover:bg-gray-200"
                : "bg-black text-white hover:bg-gray-800"
            }`}
          >
            {darkMode ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-400">
              Welcome to {BOT_NAME}! How can I assist you today?
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-xl px-4 py-3 rounded-xl whitespace-pre-wrap transition-all duration-300 ease-in-out ${
                m.role === "assistant"
                  ? darkMode
                    ? "bg-gray-800 text-white self-start shadow"
                    : "bg-teal-100 text-black self-start shadow"
                  : darkMode
                    ? "bg-blue-700 text-white self-end shadow"
                    : "bg-blue-600 text-white self-end shadow"
              }`}
            >
              <strong>{m.role === "user" ? "You" : BOT_NAME}:</strong>
              <div>{m.content}</div>
            </div>
          ))}
          {loading && (
            <div className="text-gray-400 italic">{BOT_NAME} is thinking...</div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Section */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className={`w-full flex flex-col gap-3 p-4 border-t ${
            darkMode ? "border-gray-700 bg-[#1a1a1a]" : "border-gray-200 bg-gray-100"
          }`}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message or upload dive profiles..."
            className={`resize-none rounded-md p-3 text-sm h-20 shadow-md focus:outline-none ${
              darkMode
                ? "bg-gray-900 text-white placeholder-gray-500"
                : "bg-white text-black placeholder-gray-400"
            }`}
            onKeyDown={handleKeyDown}
          />

          <input
            type="file"
            accept="image/png, image/jpeg"
            multiple
            onChange={handleFileChange}
            className="text-sm"
          />

          <button
            type="submit"
            className={`mt-1 px-5 py-3 rounded-md font-semibold transition-all ${
              loading
                ? "opacity-50 cursor-not-allowed"
                : darkMode
                ? "bg-blue-500 hover:bg-blue-600 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
            disabled={loading || (!input.trim() && files.length === 0)}
          >
            {loading ? "Thinking..." : "Send"}
          </button>
        </form>
      </div>
    </main>
  );
}
