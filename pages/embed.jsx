import React, { useEffect, useState, useRef } from "react";
import ChatMessages from "../components/ChatMessages";
import ChatInput from "../components/ChatInput";

export default function Embed() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "🤿 Hi! I'm Koval AI, your freediving coach. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("wix-guest");
  const [profile, setProfile] = useState({ nickname: "Guest User" });
  const [darkMode, setDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const bottomRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/openai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          userId,
          profile,
          embedMode: true
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setMessages(prev => [...prev, data.assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I'm having trouble responding right now. Please try again."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
  };

  if (!mounted) return null;

  return (
    <div className={`h-screen flex ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}`}>
      
      {/* ✅ SIMPLIFIED SIDEBAR */}
      <div className={`w-64 border-r flex-shrink-0 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
        <div className="p-4">
          <h3 className="font-semibold mb-4">🤿 Koval AI Coach</h3>
          
          {/* Quick Actions */}
          <div className="space-y-2 mb-4">
            <button
              onClick={() => setInput("What's my current PB?")}
              className={`w-full p-2 text-sm rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              📈 Check PB
            </button>
            <button
              onClick={() => setInput("Give me training advice")}
              className={`w-full p-2 text-sm rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              🏊 Training Tips
            </button>
            <button
              onClick={() => setInput("Help with equalization")}
              className={`w-full p-2 text-sm rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              🫁 Equalization
            </button>
            <button
              onClick={() => setInput("Analyze my dive technique")}
              className={`w-full p-2 text-sm rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              🔍 Technique Analysis
            </button>
          </div>
          
          {/* Chat History */}
          <div>
            <h4 className="font-semibold mb-2">Chat History</h4>
            <div className={`p-2 rounded text-xs ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              {messages.length} messages
            </div>
          </div>
        </div>
      </div>

      {/* ✅ MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className={`px-4 py-3 border-b flex items-center justify-between shrink-0 ${
          darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">K</span>
            </div>
            <div>
              <h2 className="font-semibold">Koval AI</h2>
              <p className="text-xs text-gray-500">Your freediving coach</p>
            </div>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>

        {/* Messages */}
        <div ref={containerRef} className="flex-1 overflow-y-auto">
          <ChatMessages
            messages={messages}
            BOT_NAME="Koval AI"
            darkMode={darkMode}
            loading={loading}
            bottomRef={bottomRef}
          />
        </div>

        {/* Input */}
        <div className="shrink-0">
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
      </div>
    </div>
  );
}
