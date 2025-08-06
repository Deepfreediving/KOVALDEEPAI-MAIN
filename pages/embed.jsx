import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";

export default function Embed({ userData = {}, aiResponse }) {
  const router = useRouter();
  const [isEmbedMode, setIsEmbedMode] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUserName, setCurrentUserName] = useState("Guest User");
  
  const [messages, setMessages] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("koval_ai_messages")) || [
        { role: "assistant", content: "🤿 Hi! I'm Koval AI, your freediving coach. How can I help you today?" }
      ];
    } catch {
      return [{ role: "assistant", content: "🤿 Hi! I'm Koval AI, your freediving coach. How can I help you today?" }];
    }
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [diveLogs, setDiveLogs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("koval_ai_logs")) || [];
    } catch {
      return [];
    }
  });

  const [newLog, setNewLog] = useState({ date: "", location: "", depth: "", notes: "", image: "" });
  const bottomRef = useRef(null);

  // Initialize from URL parameters on component mount
  useEffect(() => {
    if (router.isReady) {
      console.log("🚀 Embed initializing with URL params:", router.query);
      
      // Check if we're in an iframe (embed mode)
      setIsEmbedMode(window.parent !== window);
      
      // Get URL parameters
      const { theme, userId, userName } = router.query;
      
      if (theme === 'dark') {
        setDarkMode(true);
      }
      
      if (userId) {
        setCurrentUserId(String(userId));
      }
      
      if (userName) {
        setCurrentUserName(decodeURIComponent(String(userName)));
      }
      
      console.log("✅ Embed initialized with:", { theme, userId, userName, isEmbedMode: window.parent !== window });
    }
  }, [router.isReady, router.query]);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Listen for messages from parent (Wix)
  useEffect(() => {
    const handleParentMessages = (event) => {
      console.log('📨 Embed received message:', event.data);
      
      // Security check - only accept messages from known origins
      const allowedOrigins = [
        'https://kovaldeepai-main.vercel.app',
        'https://www.wix.com',
        'https://static.wixstatic.com',
        'https://editor.wix.com'
      ];
      
      if (event.origin && !allowedOrigins.some(origin => event.origin.includes('wix') || event.origin === 'https://kovaldeepai-main.vercel.app')) {
        console.log('🚫 Ignoring message from untrusted origin:', event.origin);
        return;
      }
      
      switch (event.data?.type) {
        case 'THEME_CHANGE':
          console.log('🎨 Theme change received:', event.data.data);
          setDarkMode(Boolean(event.data.data?.dark));
          break;
          
        case 'USER_AUTH':
          console.log('👤 User auth received:', event.data.data);
          // Handle user authentication data from Wix
          if (event.data.data?.userId) {
            setCurrentUserId(event.data.data.userId);
          }
          if (event.data.data?.profile?.userName) {
            setCurrentUserName(event.data.data.profile.userName);
          }
          if (event.data.data?.diveLogs) {
            setDiveLogs(event.data.data.diveLogs);
            localStorage.setItem("koval_ai_logs", JSON.stringify(event.data.data.diveLogs));
          }
          break;
          
        case 'AI_RESPONSE':
          console.log('🤖 AI response received:', event.data.data);
          // Handle AI response from Wix backend
          if (event.data.data?.aiResponse) {
            setMessages(prev => {
              const updated = [...prev, { role: "assistant", content: event.data.data.aiResponse }];
              localStorage.setItem("koval_ai_messages", JSON.stringify(updated));
              return updated;
            });
            setLoading(false);
          }
          if (event.data.data?.success === false) {
            setLoading(false);
            console.error('❌ AI response failed:', event.data.data.error);
          }
          break;
          
        case 'DATA_UPDATE':
          console.log('💾 Data update received:', event.data.data);
          // Handle updated user data from Wix
          if (event.data.data?.userDiveLogs) {
            setDiveLogs(event.data.data.userDiveLogs);
            localStorage.setItem("koval_ai_logs", JSON.stringify(event.data.data.userDiveLogs));
          }
          break;
          
        default:
          console.log('🔄 Unhandled message type:', event.data?.type);
      }
    };
    
    window.addEventListener('message', handleParentMessages);
    
    // Notify parent that embed is ready (with retry mechanism)
    const notifyParent = () => {
      if (window.parent && window.parent !== window) {
        console.log('📡 Notifying parent that embed is ready...');
        window.parent.postMessage({ 
          type: 'EMBED_READY', 
          source: 'koval-ai-embed',
          timestamp: Date.now()
        }, "*");
      }
    };
    
    // Notify immediately and then again after a short delay to ensure it's received
    notifyParent();
    const timeoutId = setTimeout(notifyParent, 1000);
    
    return () => {
      window.removeEventListener('message', handleParentMessages);
      clearTimeout(timeoutId);
    };
  }, []);

  // Load updated dive logs from parent
  useEffect(() => {
    if (userData?.userDiveLogs?.length) {
      setDiveLogs(userData.userDiveLogs);
      localStorage.setItem("koval_ai_logs", JSON.stringify(userData.userDiveLogs));
    }
  }, [userData]);

  // Handle new AI responses
  useEffect(() => {
    if (aiResponse?.answer) {
      setMessages(prev => {
        const updated = [...prev, { role: "assistant", content: aiResponse.answer }];
        localStorage.setItem("koval_ai_messages", JSON.stringify(updated));
        return updated;
      });
    }
  }, [aiResponse]);

  // Persist messages to cache
  useEffect(() => {
    localStorage.setItem("koval_ai_messages", JSON.stringify(messages));
  }, [messages]);

  const sendMessage = (text) => {
    if (!text.trim()) return;

    console.log('📤 Sending message:', text);
    
    setMessages(prev => {
      const updated = [...prev, { role: "user", content: text }];
      localStorage.setItem("koval_ai_messages", JSON.stringify(updated));
      return updated;
    });

    setInput("");
    setLoading(true);

    if (isEmbedMode && window.parent !== window) {
      console.log('🔗 Sending message to parent Wix page...');
      // Send message to parent Wix page for AI processing
      window.parent.postMessage({ 
        type: "CHAT_MESSAGE", 
        message: text,
        source: 'koval-ai-embed',
        userId: currentUserId || userData?.userId || 'guest-' + Date.now(),
        timestamp: Date.now()
      }, "*");
    } else {
      console.log('🤖 Processing message directly (not in embed mode)...');
      // Direct API call when not in embed mode (for testing)
      handleDirectMessage(text);
    }
  };

  // Handle direct API calls when not in embed mode
  const handleDirectMessage = async (text) => {
    try {
      const response = await fetch("/api/chat-embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          userId: currentUserId || 'guest-' + Date.now(),
          profile: { userName: currentUserName }
        })
      });

      const data = await response.json();
      
      setMessages(prev => {
        const updated = [...prev, { 
          role: "assistant", 
          content: data.assistantMessage?.content || data.aiResponse || "I received your message!" 
        }];
        localStorage.setItem("koval_ai_messages", JSON.stringify(updated));
        return updated;
      });
      
      setLoading(false);
      console.log("✅ Direct API response received");
      
    } catch (error) {
      console.error("❌ Direct API error:", error);
      setMessages(prev => {
        const updated = [...prev, { 
          role: "assistant", 
          content: "I'm having trouble responding right now. Please try again in a moment." 
        }];
        localStorage.setItem("koval_ai_messages", JSON.stringify(updated));
        return updated;
      });
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Save dive log
  const saveDiveLog = () => {
    if (!newLog.date || !newLog.depth) return;

    const logWithId = { ...newLog, id: Date.now(), timestamp: new Date().toISOString() };
    const updatedLogs = [logWithId, ...diveLogs];

    setDiveLogs(updatedLogs);
    localStorage.setItem("koval_ai_logs", JSON.stringify(updatedLogs));

    // Reset form
    setNewLog({ date: "", location: "", depth: "", notes: "", image: "" });

    if (isEmbedMode && window.parent !== window) {
      console.log('💾 Sending dive log to parent Wix page...');
      // Send to parent Wix page for backend saving
      window.parent.postMessage({ 
        type: "SAVE_DIVE_LOG", 
        diveLog: logWithId,
        source: 'koval-ai-embed',
        userId: currentUserId,
        timestamp: Date.now()
      }, "*");
    }
  };

  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setNewLog(prev => ({ ...prev, image: reader.result }));
    reader.readAsDataURL(file);
  };

  const quickActions = ["📈 Learn more about freediving physiology", "🌊 Training Tips", "🤿 Equalization", "🔍 Technique Analysis"];

  return (
    <div className={`koval-ai-container ${darkMode ? "dark" : "light"}`} 
      style={{ display: "flex", flexDirection: "column", height: "500px", fontFamily: "Arial, sans-serif", border: "1px solid #ccc", borderRadius: "8px", overflow: "hidden" }}>
      
      {/* Header */}
      <div style={{ 
        padding: "8px 12px", 
        backgroundColor: darkMode ? "#333" : "#f8f9fa", 
        borderBottom: "1px solid #ccc",
        fontSize: "12px",
        color: darkMode ? "#ccc" : "#666"
      }}>
        👤 {currentUserName} {isEmbedMode ? "• Embedded in Wix" : "• Standalone Mode"} {loading && "• Processing..."}
      </div>
      
      {/* Main Content */}
      <div style={{ display: "flex", flex: 1 }}>
      
      {/* Sidebar */}
      <div style={{ width: "250px", backgroundColor: darkMode ? "#222" : "#f3f3f3", padding: "10px", borderRight: "1px solid #ccc", overflowY: "auto" }}>
        <h4>Koval AI Coach</h4>
        {quickActions.map((q, i) => (
          <button key={i} onClick={() => sendMessage(q)}
            style={{ display: "block", width: "100%", marginBottom: "6px", padding: "6px", cursor: "pointer", backgroundColor: "#fff", border: "1px solid #ccc", borderRadius: "4px", textAlign: "left" }}>
            {q}
          </button>
        ))}

        <h4 style={{ marginTop: "10px" }}>Dive Journal</h4>
        <input placeholder="Date" value={newLog.date} onChange={(e) => setNewLog({ ...newLog, date: e.target.value })} style={{ width: "100%", marginBottom: "4px" }}/>
        <input placeholder="Location" value={newLog.location} onChange={(e) => setNewLog({ ...newLog, location: e.target.value })} style={{ width: "100%", marginBottom: "4px" }}/>
        <input placeholder="Depth (m)" value={newLog.depth} onChange={(e) => setNewLog({ ...newLog, depth: e.target.value })} style={{ width: "100%", marginBottom: "4px" }}/>
        <textarea placeholder="Notes" value={newLog.notes} onChange={(e) => setNewLog({ ...newLog, notes: e.target.value })} style={{ width: "100%", marginBottom: "4px" }}/>
        <input type="file" onChange={handleImageUpload} style={{ marginBottom: "6px" }} />
        <button onClick={saveDiveLog} style={{ width: "100%", marginBottom: "10px" }}>Save Dive Log</button>

        <h4>Saved Logs</h4>
        {diveLogs.length === 0 && <div>No logs yet.</div>}
        {diveLogs.map((log, i) => (
          <div key={i} style={{ padding: "5px", marginBottom: "5px", background: "#fff", borderRadius: "4px", border: "1px solid #ccc" }}>
            <strong>{log.date}</strong> - {log.location || "Unknown"} ({log.depth}m)
            {log.image && <img src={log.image} alt="Dive Log" style={{ width: "100%", marginTop: "4px" }} />}
            <div style={{ fontSize: "12px", color: "#555" }}>{log.notes}</div>
          </div>
        ))}
      </div>

      {/* Chat window */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, overflowY: "auto", padding: "10px", backgroundColor: darkMode ? "#111" : "#fff" }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              margin: "6px 0",
              padding: "8px",
              borderRadius: "6px",
              backgroundColor: msg.role === "assistant" ? "#d4f5d4" : "#e6e6e6",
              maxWidth: "80%"
            }}>
              <strong>{msg.role === "user" ? "You" : "Koval AI"}:</strong> {msg.content}
            </div>
          ))}
          <div ref={bottomRef}></div>
        </div>
        <div style={{ display: "flex", padding: "8px", borderTop: "1px solid #ccc" }}>
          <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type your message..." rows={2} style={{ flex: 1, marginRight: "6px", resize: "none" }}/>
          <button onClick={() => sendMessage(input)} disabled={loading}>{loading ? "..." : "Send"}</button>
        </div>
      </div>
      </div>
    </div>
  );
}
