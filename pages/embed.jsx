import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import ChatMessages from "../components/ChatMessages";
import ChatInput from "../components/ChatInput";

export default function Embed() {
  const router = useRouter();
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
  const [conversationHistory, setConversationHistory] = useState([]);
  const [diveLogs, setDiveLogs] = useState([]);
  const [isWixConnected, setIsWixConnected] = useState(false);
  
  const bottomRef = useRef(null);
  const containerRef = useRef(null);

  // ✅ STEP 1: Initialize from URL and setup widget communication
  useEffect(() => {
    setMounted(true);
    
    // Get parameters from URL
    const { userId: urlUserId, source } = router.query;
    console.log('🤿 Embed initializing with:', { urlUserId, source });
    
    if (urlUserId) {
      setUserId(urlUserId);
      setProfile(prev => ({ 
        ...prev, 
        userId: urlUserId,
        source: source || 'wix-widget'
      }));
    }
  }, [router.query]);

  // ✅ STEP 2: Setup widget communication
  useEffect(() => {
    console.log('📡 Setting up widget communication...');
    
    // Notify parent widget that embed is ready
    const notifyParent = () => {
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'embed_ready',
          userId,
          source: 'koval-ai-embed'
        }, '*');
        console.log('✅ Notified parent widget that embed is ready');
      }
    };

    // Listen for messages from parent widget
    const handleMessage = (event) => {
      const { type, data } = event.data || {};
      console.log('📨 Received message from widget:', type, data);
      
      switch (type) {
        case 'USER_DATA':
          console.log('👤 Received user data from Wix:', data);
          setProfile(data);
          if (data.userId) {
            setUserId(data.userId);
            setIsWixConnected(true);
            // Load user's dive logs and conversation history
            loadUserDiveHistory(data.userId);
          }
          break;
          
        case 'LOAD_SESSION':
          console.log('💾 Loading session data:', data);
          if (data.messages) {
            setMessages(prev => [...prev, ...data.messages]);
            setConversationHistory(data.messages);
          }
          break;
          
        case 'THEME_CHANGE':
          setDarkMode(data.darkMode);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Notify parent after short delay
    setTimeout(notifyParent, 500);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [userId]);

  // ✅ STEP 3: Load user dive history from Wix
  const loadUserDiveHistory = async (userId) => {
    try {
      console.log('🔄 Loading dive history for user:', userId);
      
      // Call Wix backend through your API
      const response = await fetch('/api/wix/query-wix-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionId: 'userMemory',
          filter: { userId: { $eq: userId } },
          limit: 50
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setDiveLogs(data.items || []);
        console.log(`✅ Loaded ${data.items?.length || 0} dive logs from Wix`);
        
        // Send confirmation to parent
        if (window.parent !== window) {
          window.parent.postMessage({
            type: 'dive_logs_loaded',
            data: { count: data.items?.length || 0 }
          }, '*');
        }
      }
    } catch (error) {
      console.error('❌ Failed to load dive history:', error);
    }
  };

  // ✅ STEP 4: Auto-scroll to bottom
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // ✅ STEP 5: Enhanced chat submission with Wix backend integration
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // ✅ Use your existing chat.ts - it's perfect!
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

      if (response.ok) {
        const data = await response.json();
        const assistantMessage = data.assistantMessage || { 
          role: "assistant", 
          content: data.answer || "I received your message!"
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
      
    } catch (error) {
      console.error("Chat error:", error);
      // Handle error...
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
      
      {/* ✅ ENHANCED SIDEBAR with Wix integration */}
      <div className={`w-64 border-r flex-shrink-0 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
        <div className="p-4">
          <h3 className="font-semibold mb-4">🤿 Koval AI Coach</h3>
          
          {/* ✅ Wix connection status */}
          <div className={`mb-4 p-2 rounded text-xs ${
            isWixConnected 
              ? (darkMode ? 'bg-green-900 text-green-300' : 'bg-green-50 text-green-700')
              : (darkMode ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-50 text-yellow-700')
          }`}>
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${isWixConnected ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <span>{isWixConnected ? '✅ Connected to Wix' : '⚠️ Guest Mode'}</span>
            </div>
          </div>
          
          {/* ✅ User info if available */}
          {profile.userName && (
            <div className={`mb-4 p-2 rounded text-sm ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
              <div className="font-medium">👤 {profile.userName}</div>
              <div className="text-xs opacity-75">
                {diveLogs.length > 0 ? `${diveLogs.length} dive logs` : 'No dive logs yet'}
              </div>
            </div>
          )}
          
          {/* ✅ Quick Actions */}
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
            {diveLogs.length > 0 && (
              <button
                onClick={() => setInput("Analyze my recent dive performance")}
                className={`w-full p-2 text-sm rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                🔍 Analyze Performance
              </button>
            )}
          </div>
          
          {/* ✅ Chat History */}
          <div>
            <h4 className="font-semibold mb-2">Session Info</h4>
            <div className={`p-2 rounded text-xs space-y-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <div>{messages.length} messages</div>
              <div>Backend: {isWixConnected ? 'Wix' : 'Next.js'}</div>
              <div>User: {profile.source || 'Unknown'}</div>
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
              <p className="text-xs text-gray-500">
                {profile.userName ? `Hey ${profile.userName}!` : 'Your freediving coach'}
              </p>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex items-center space-x-2">
            <div className={`text-xs px-2 py-1 rounded ${
              isWixConnected 
                ? 'bg-green-100 text-green-700' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {isWixConnected ? 'Wix Connected' : 'Guest Mode'}
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
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
