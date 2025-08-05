import React, { useEffect, useState, useRef } from "react";
import ChatMessages from "../components/ChatMessages";
import ChatInput from "../components/ChatInput";

export default function Embed() {
  // ✅ Core state
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

  // ✅ SSR Safety
  useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ Initialize from URL and parent messages
  useEffect(() => {
    if (!mounted) return;

    // Get URL params
    const params = new URLSearchParams(window.location.search);
    const urlUserId = params.get('userId') || 'wix-guest-' + Date.now();
    const userName = params.get('userName') || 'Guest User';
    
    setUserId(urlUserId);
    setProfile({ nickname: userName });

    // Detect dark mode
    if (window.matchMedia) {
      setDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }

    // Notify parent we're ready
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'embed_ready' }, '*');
    }

    // Listen for parent messages
    const handleMessage = (event) => {
      if (!event.data?.type) return;

      switch (event.data.type) {
        case 'USER_AUTH':
          if (event.data.userId) setUserId(event.data.userId);
          if (event.data.userName) setProfile({ nickname: event.data.userName });
          break;
        case 'THEME_CHANGE':
          setDarkMode(event.data.dark || false);
          break;
        case 'LOAD_SAVED_SESSION':
          if (event.data.messages) setMessages(event.data.messages);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [mounted]);

  // ✅ Auto-scroll
  useEffect(() => {
    if (bottomRef.current && mounted) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, mounted]);

  // ✅ Simple file handler
  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 3) {
      alert("Max 3 images allowed");
      return;
    }
    setFiles(selected);
  };

  // ✅ Simplified submit handler
  const handleSubmit = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput && files.length === 0) return;
    if (loading) return;

    setLoading(true);

    try {
      // Handle file uploads
      if (files.length > 0) {
        for (const file of files) {
          const formData = new FormData();
          formData.append("image", file);

          const uploadRes = await fetch("/api/openai/upload-dive-image", {
            method: "POST",
            body: formData,
          });

          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            setMessages(prev => [
              ...prev,
              { role: "user", content: `📤 Uploaded: ${file.name}` },
              { role: "assistant", content: uploadData.answer || "Image uploaded successfully" }
            ]);
          }
        }
        setFiles([]);
      }

      // Handle chat message
      if (trimmedInput) {
        setMessages(prev => [...prev, { role: "user", content: trimmedInput }]);
        setInput("");

        const chatRes = await fetch("/api/openai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmedInput,
            userId,
            profile,
            embedMode: true
          })
        });

        if (chatRes.ok) {
          const chatData = await chatRes.json();
          
          if (chatData.assistantMessage?.content) {
            setMessages(prev => [...prev, chatData.assistantMessage]);
          } else {
            setMessages(prev => [...prev, {
              role: "assistant",
              content: "I'm here to help with your freediving questions!"
            }]);
          }

          // Notify parent of new message
          if (window.parent !== window) {
            window.parent.postMessage({ type: 'new_message' }, '*');
          }
        } else {
          throw new Error('Chat failed');
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I'm having trouble responding. Please try again."
      }]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle Enter key
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !loading) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // ✅ SSR guard
  if (!mounted) return null;

  return (
    <div className={`h-screen flex ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}`}>
      
      {/* ✅ ADD SIDEBAR */}
      <div className={`w-64 border-r flex-shrink-0 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
        <div className="p-4">
          <h3 className="font-semibold mb-4">Chat History</h3>
          <div className="space-y-2">
            <div className="text-sm text-gray-500">Current session</div>
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
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
              🤿
            </div>
            <div>
              <h1 className="text-lg font-semibold">Koval AI</h1>
              <p className="text-xs text-gray-500">
                {profile.nickname}
              </p>
            </div>
          </div>
          
          {/* Close button for embeds */}
          {window.parent !== window && (
            <button
              onClick={() => window.parent.postMessage({ type: 'close_chat' }, '*')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              ✕
            </button>
          )}
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
