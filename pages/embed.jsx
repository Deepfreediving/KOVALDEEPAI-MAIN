import React, { useEffect, useState, useRef } from "react";
import ChatMessages from "../components/ChatMessages";
import ChatInput from "../components/ChatInput";

export default function Embed() {
  // ✅ Core state for embed-only functionality
  const [messages, setMessages] = useState([
    { role: "assistant", content: "🤿 Hi! I'm Koval AI, your freediving coach. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("wix-guest");
  const [profile, setProfile] = useState({});
  const [eqState, setEqState] = useState({});
  const [darkMode, setDarkMode] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [mounted, setMounted] = useState(false); // ✅ SSR safety
  
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  const [logs, setLogs] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [botIframe, setBotIframe] = useState(null);

  // ✅ SSR Safety - Mount detection
  useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ Initialize from URL parameters and notify parent
  useEffect(() => {
    if (!mounted) return; // ✅ Prevent SSR issues

    try {
      // ✅ Safe window access
      if (typeof window === "undefined") return;
      
      const params = new URLSearchParams(window.location.search);
      
      // Extract user info from URL
      const wixUserId = params.get('userId') || 'wix-guest-' + Date.now();
      const wixUserName = params.get('userName') || 'Guest';
      const wixUserEmail = params.get('userEmail') || '';
      const source = params.get('source') || 'embed';
      
      setUserId(wixUserId);
      setProfile({
        nickname: wixUserName,
        loginEmail: wixUserEmail,
        source: source
      });

      // ✅ Safe dark mode detection
      try {
        if (window.matchMedia) {
          setDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
        }
      } catch (mediaError) {
        console.warn('⚠️ Media query not supported:', mediaError);
        setDarkMode(false);
      }

      // ✅ Safe parent notification
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({
            type: 'embed_ready',
            data: { userId: wixUserId, userName: wixUserName }
          }, '*');
        }
      } catch (postMessageError) {
        console.warn('⚠️ PostMessage failed:', postMessageError);
      }

      setIsReady(true);
      console.log('✅ Embed initialized:', { wixUserId, wixUserName, source });
      
    } catch (error) {
      console.error('❌ Embed initialization error:', error);
      setIsReady(true); // ✅ Always show chat even if params fail
    }
  }, [mounted]);

  // ✅ Auto-scroll to bottom with error handling
  useEffect(() => {
    try {
      if (bottomRef.current && mounted) {
        bottomRef.current.scrollIntoView({ behavior: "smooth" });
      }
    } catch (error) {
      console.warn('⚠️ Auto-scroll error:', error);
    }
  }, [messages, loading, mounted]);

  // ✅ Listen for messages from parent with safe error handling
  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;

    const handleParentMessage = (event) => {
      try {
        if (!event.data?.type) return;

        console.log('📥 Received from parent:', event.data.type);

        switch (event.data.type) {
          case 'USER_AUTH':
            if (event.data.userId) setUserId(event.data.userId);
            if (event.data.profile) setProfile(prev => ({ ...prev, ...event.data.profile }));
            break;
            
          case 'THEME_CHANGE':
            setDarkMode(event.data.dark || false);
            break;
            
          case 'LOAD_SAVED_SESSION':
            if (event.data.messages && Array.isArray(event.data.messages)) {
              setMessages(event.data.messages);
            }
            break;
            
          default:
            console.log('🔄 Unhandled parent message:', event.data.type);
        }
      } catch (error) {
        console.warn('⚠️ Parent message handling error:', error);
      }
    };

    window.addEventListener('message', handleParentMessage);
    return () => window.removeEventListener('message', handleParentMessage);
  }, [mounted]);

  // ✅ File upload handler with validation
  const handleFileChange = (e) => {
    try {
      const selected = Array.from(e.target.files || []);
      if (selected.length > 3) {
        alert("⚠️ You can only upload up to 3 images.");
        return;
      }
      
      // ✅ Validate file types
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const validFiles = selected.filter(file => validTypes.includes(file.type));
      
      if (validFiles.length !== selected.length) {
        alert("⚠️ Only image files (JPG, PNG, GIF, WebP) are allowed.");
        return;
      }
      
      setFiles(validFiles);
    } catch (error) {
      console.error('❌ File selection error:', error);
      alert("⚠️ Error selecting files. Please try again.");
    }
  };

  // ✅ Send message handler with comprehensive error handling
  const handleSubmit = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput && files.length === 0) return;
    if (loading) return;

    setLoading(true);

    try {
      // ✅ Handle file uploads first with timeout
      if (files.length > 0) {
        for (const file of files) {
          try {
            const formData = new FormData();
            formData.append("image", file);

            // ✅ Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            const uploadRes = await fetch("/api/openai/upload-dive-image", {
              method: "POST",
              body: formData,
              signal: controller.signal
            });

            clearTimeout(timeoutId);

            let uploadData = {};
            try {
              const textResponse = await uploadRes.text();
              if (textResponse.trim()) {
                uploadData = JSON.parse(textResponse);
              }
            } catch (parseError) {
              console.warn('⚠️ Upload response parse error:', parseError);
            }

            if (uploadRes.ok) {
              setMessages(prev => [
                ...prev,
                { role: "user", content: `📤 Uploaded: ${file.name}` },
                { role: "assistant", content: uploadData.answer || "✅ Image uploaded successfully." }
              ]);
            } else {
              throw new Error(uploadData?.error || `Upload failed (${uploadRes.status})`);
            }
          } catch (uploadError) {
            console.error('❌ Upload error:', uploadError);
            const errorMessage = uploadError.name === 'AbortError' 
              ? 'Upload timeout - please try a smaller file'
              : uploadError.message;
            
            setMessages(prev => [
              ...prev,
              { role: "user", content: `📤 Failed: ${file.name}` },
              { role: "assistant", content: `⚠️ Upload failed: ${errorMessage}` }
            ]);
          }
        }
        setFiles([]);
      }

      // ✅ Handle chat message with timeout
      if (trimmedInput) {
        setMessages(prev => [...prev, { role: "user", content: trimmedInput }]);
        setInput("");

        // ✅ Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const chatRes = await fetch("/api/openai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmedInput,
            profile,
            eqState,
            userId,
            embedMode: true,
            timestamp: Date.now()
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // ✅ Safe JSON parsing with fallback
        let chatData = {};
        try {
          const textResponse = await chatRes.text();
          if (!textResponse.trim()) {
            throw new Error('Empty response from server');
          }
          chatData = JSON.parse(textResponse);
        } catch (parseError) {
          console.error('❌ Chat response parse error:', parseError);
          chatData = {
            assistantMessage: {
              role: 'assistant',
              content: '⚠️ I received an invalid response. Please try again.'
            }
          };
        }

        if (!chatRes.ok) {
          throw new Error(chatData?.error || `Chat API error (${chatRes.status})`);
        }

        // ✅ Handle different response types safely
        if (chatData.type === "eq-followup") {
          setEqState(prev => ({
            ...prev,
            answers: { ...prev.answers, [chatData.key]: trimmedInput }
          }));
          setMessages(prev => [...prev, { role: "assistant", content: `🔍 ${chatData.question}` }]);
        } else if (chatData.type === "eq-diagnosis") {
          setMessages(prev => [...prev, {
            role: "assistant",
            content: `🧠 Diagnosis: ${chatData.label}\n\nRecommended Drills:\n${chatData.drills?.join('\n') || 'No drills available'}`
          }]);
          setEqState({});
        } else if (chatData.assistantMessage?.content) {
          setMessages(prev => [...prev, chatData.assistantMessage]);
        } else {
          setMessages(prev => [...prev, {
            role: "assistant",
            content: "⚠️ I'm having trouble responding right now. Please try again."
          }]);
        }

        // ✅ Safe parent notification
        try {
          if (window.parent !== window && chatData.assistantMessage?.content) {
            window.parent.postMessage({
              type: 'new_message',
              data: { message: 'New message from Koval AI' }
            }, '*');
          }
        } catch (postMessageError) {
          console.warn('⚠️ Parent notification failed:', postMessageError);
        }
      }
    } catch (error) {
      console.error("❌ Chat error:", error);
      const errorMessage = error.name === 'AbortError' 
        ? 'Request timeout - please try again'
        : error.message || 'Unknown error';
      
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `⚠️ Unable to respond: ${errorMessage}`
      }]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle Enter key safely
  const handleKeyDown = (e) => {
    try {
      if ((e.key === "Enter" || e.key === "Return") && !e.shiftKey && !loading) {
        e.preventDefault();
        handleSubmit();
      }
    } catch (error) {
      console.warn('⚠️ Keydown handler error:', error);
    }
  };

  // ✅ Logs and bot iframe handling with comprehensive error handling
  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;

    const adjustHeight = () => {
      try {
        if (window.parent && document.body) {
          window.parent.postMessage(
            { type: "RESIZE_IFRAME", data: { height: document.body.scrollHeight } },
            "*"
          );
        }
      } catch (error) {
        console.warn('⚠️ Height adjustment failed:', error);
      }
    };

    let resizeObserver;
    try {
      if (window.ResizeObserver && document.body) {
        resizeObserver = new ResizeObserver(adjustHeight);
        resizeObserver.observe(document.body);
      }
    } catch (error) {
      console.warn('⚠️ ResizeObserver not available:', error);
    }

    const findBotIframe = () => {
      try {
        const botElement = document.getElementById("kovalAiElement");
        if (botElement && botElement.shadowRoot) {
          const iframe = botElement.shadowRoot.querySelector("iframe");
          if (iframe && iframe.contentWindow) {
            setBotIframe(iframe.contentWindow);
            if (window.parent) {
              window.parent.postMessage({ type: "BOT_READY" }, "*");
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Bot iframe detection failed:', error);
      }
    };

    const iframeInterval = setInterval(findBotIframe, 500);

    const handleMessage = async (event) => {
      try {
        const allowedOrigins = [
          window.location.origin,
          "https://koval-deep-ai.vercel.app",
          "https://kovaldeepai-main.vercel.app"
        ];
        if (!allowedOrigins.includes(event.origin)) return;

        if (event.data?.type === "AI_RESPONSE" && botIframe) {
          botIframe.postMessage(event.data, "*");
        }

        if (event.data?.type === "LOAD_LOGS" && event.data.data?.userId) {
          setLoading(true);
          setErrorMsg("");
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const res = await fetch(`/api/analyze/getDiveLogs?userId=${event.data.data.userId}`, {
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!res.ok) throw new Error(`API error: ${res.status}`);
            
            const data = await res.json();
            setLogs(Array.isArray(data.logs) ? data.logs : []);
          } catch (err) {
            console.error("❌ Failed to fetch dive logs:", err);
            const errorMessage = err.name === 'AbortError'
              ? "Request timeout - please try again"
              : "Failed to load dive logs. Please try again later.";
            setErrorMsg(errorMessage);
            setLogs([]);
          } finally {
            setLoading(false);
            adjustHeight();
          }
        }
      } catch (error) {
        console.warn('⚠️ Message handler error:', error);
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      try {
        window.removeEventListener("message", handleMessage);
        if (resizeObserver) resizeObserver.disconnect();
        clearInterval(iframeInterval);
      } catch (error) {
        console.warn('⚠️ Cleanup error:', error);
      }
    };
  }, [botIframe, mounted]);

  // ✅ Early return for SSR safety
  if (!mounted) {
    return null; // Prevent SSR hydration mismatch
  }

  // ✅ Loading state
  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-black">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading Koval AI...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen flex flex-col ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}`}>
      {/* ✅ Simplified Header with Safe Logo */}
      <div className={`px-4 py-3 border-b flex items-center justify-between shrink-0 ${
        darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
      }`}>
        <div className="flex items-center gap-3">
          {/* ✅ Safe logo with fallback */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
            🤿
          </div>
          <div>
            <h1 className="text-lg font-semibold">Koval AI</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {profile?.nickname || "Freediving Coach"}
            </p>
          </div>
        </div>
        
        {/* ✅ Safe close button */}
        {mounted && typeof window !== "undefined" && window.parent !== window && (
          <button
            onClick={() => {
              try {
                window.parent.postMessage({ type: 'close_chat' }, '*');
              } catch (error) {
                console.warn('⚠️ Close message failed:', error);
              }
            }}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            title="Close chat"
          >
            ✕
          </button>
        )}
      </div>

      {/* ✅ Messages Area */}
      <div ref={containerRef} className="flex-1 overflow-y-auto">
        <ChatMessages
          messages={messages}
          BOT_NAME="Koval AI"
          darkMode={darkMode}
          loading={loading}
          bottomRef={bottomRef}
        />
      </div>

      {/* ✅ Input Area */}
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

      {/* ✅ Safe logs display */}
      {loading && (
        <div style={{ padding: "10px", background: "#222", color: "#ccc" }}>
          Loading dive logs...
        </div>
      )}

      {!loading && errorMsg && (
        <div style={{ padding: "10px", background: "#300", color: "#fdd" }}>
          {errorMsg}
        </div>
      )}

      {!loading && logs.length > 0 && (
        <div
          style={{
            padding: "10px",
            background: "#111",
            color: "#fff",
            maxHeight: "220px",
            overflowY: "auto",
            borderTop: "2px solid #333",
          }}
        >
          <h3 style={{ margin: "0 0 8px" }}>Your Dive Logs</h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {logs.map((log, idx) => (
              <li
                key={idx}
                style={{
                  marginBottom: "8px",
                  borderBottom: "1px solid #333",
                  paddingBottom: "6px",
                }}
              >
                <strong>
                  {log.timestamp
                    ? new Date(log.timestamp).toLocaleString()
                    : "Unknown date"}
                  :
                </strong>
                <div>
                  {log.logEntry || log.memoryContent || "No details available"}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
