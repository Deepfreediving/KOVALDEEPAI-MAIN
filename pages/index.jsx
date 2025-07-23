import { useEffect, useState, useRef } from "react";
import ChatInput from "../components/ChatInput";
import ChatMessages from "../components/ChatMessages";

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
    const selected = Array.from(e.target.files).slice(0, 3);
    setFiles(selected);
  };

  const handleSubmit = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput && files.length === 0) return;
    setLoading(true);

    // User and thread ID logic
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
        console.log("🧵 Thread created:", threadId);
      } catch (err) {
        console.error("❌ Thread creation failed:", err);
        setLoading(false);
        return;
      }
    }

    // Image upload and OCR logic
    if (files.length > 0) {
      try {
        const formData = new FormData();
        formData.append("image", files[0]);

        const uploadRes = await fetch("/api/upload-dive-image", {
          method: "POST",
          body: formData,
        });

        const contentType = uploadRes.headers.get("content-type");
        const uploadData = contentType?.includes("application/json")
          ? await uploadRes.json()
          : { error: "Server returned non-JSON." };

        if (uploadRes.ok && uploadData.answer) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: uploadData.answer },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: uploadData?.error || "⚠️ Image processing failed.",
            },
          ]);
        }
      } catch (err) {
        console.error("❌ Upload error:", err);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "⚠️ Upload failed. Check your image or try again.",
          },
        ]);
      } finally {
        setFiles([]);
      }
    }

    // Text message logic
    if (trimmedInput) {
      setMessages((prev) => [...prev, { role: "user", content: trimmedInput }]);
      setInput("");

      try {
        // 1. Talk to your OpenAI chatbot API
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
        const assistantContent =
          chatData?.assistantMessage?.content ||
          chatData?.error ||
          "⚠️ No response generated.";

        // 2. Show assistant response in chat
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: assistantContent },
        ]);

        // 3. Sync with Wix memory store (optional, but recommended)
        await fetch("https://www.deepfreediving.com/_functions/aiRequest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: storedUsername,
            userInput: trimmedInput,
          }),
        });
      } catch (err) {
        console.error("❌ Chat error:", err);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "⚠️ Network error. Please try again.",
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

        {/* Messages */}
        <ChatMessages
          messages={messages}
          BOT_NAME={BOT_NAME}
          darkMode={darkMode}
          loading={loading}
          bottomRef={bottomRef}
        />

        {/* Input */}
        <ChatInput
          input={input}
          setInput={setInput}
          handleSubmit={handleSubmit}
          handleKeyDown={handleKeyDown}
          handleFileChange={handleFileChange}
          files={files}
          setFiles={setFiles}
          loading={loading}
          darkMode={darkMode}
        />
      </div>
    </main>
  );
}
