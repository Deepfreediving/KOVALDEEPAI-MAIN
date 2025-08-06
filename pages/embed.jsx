import { useEffect, useState, useRef } from "react";

export default function Embed({ userData = {}, aiResponse }) {
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

  // Scroll chat to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Listen for messages from parent (Wix)
  useEffect(() => {
    const handleParentMessages = (event) => {
      console.log('📨 Embed received message:', event.data);
      
      switch (event.data?.type) {
        case 'THEME_CHANGE':
          setDarkMode(Boolean(event.data.data?.dark));
          break;
          
        case 'USER_AUTH':
          // Handle user authentication data from Wix
          if (event.data.data?.diveLogs) {
            setDiveLogs(event.data.data.diveLogs);
            localStorage.setItem("koval_ai_logs", JSON.stringify(event.data.data.diveLogs));
          }
          break;
          
        case 'AI_RESPONSE':
          // Handle AI response from Wix backend
          if (event.data.data?.aiResponse) {
            setMessages(prev => {
              const updated = [...prev, { role: "assistant", content: event.data.data.aiResponse }];
              localStorage.setItem("koval_ai_messages", JSON.stringify(updated));
              return updated;
            });
            setLoading(false);
          }
          break;
          
        case 'DATA_UPDATE':
          // Handle updated user data from Wix
          if (event.data.data?.userDiveLogs) {
            setDiveLogs(event.data.data.userDiveLogs);
            localStorage.setItem("koval_ai_logs", JSON.stringify(event.data.data.userDiveLogs));
          }
          break;
      }
    };
    
    window.addEventListener('message', handleParentMessages);
    
    // Notify parent that embed is ready
    window.parent?.postMessage({ 
      type: 'EMBED_READY', 
      source: 'koval-ai-embed'
    }, "*");
    
    return () => window.removeEventListener('message', handleParentMessages);
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

    setMessages(prev => {
      const updated = [...prev, { role: "user", content: text }];
      localStorage.setItem("koval_ai_messages", JSON.stringify(updated));
      return updated;
    });

    setInput("");
    setLoading(true);

    // Send message to parent Wix page for AI processing
    window.parent?.postMessage({ 
      type: "CHAT_MESSAGE", 
      message: text,
      source: 'koval-ai-embed',
      userId: userData?.userId || 'guest-' + Date.now()
    }, "*");
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

    // Send to parent Wix page for backend saving
    window.parent?.postMessage({ 
      type: "SAVE_DIVE_LOG", 
      diveLog: logWithId,
      source: 'koval-ai-embed'
    }, "*");
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
      style={{ display: "flex", height: "500px", fontFamily: "Arial, sans-serif", border: "1px solid #ccc", borderRadius: "8px", overflow: "hidden" }}>
      
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
  );
}
