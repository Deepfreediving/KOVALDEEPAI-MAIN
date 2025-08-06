import { useEffect, useState, useRef } from "react";

export default function Embed() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "🤿 Hi! I'm Koval AI, your freediving coach. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("guest");
  const [darkMode, setDarkMode] = useState(false);
  const bottomRef = useRef(null);

  // ✅ Auto-scroll to bottom
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    // Listen for theme changes from parent widget
    const handleParentMessages = (event) => {
      if (event.data?.type === 'THEME_CHANGE') {
        const { theme, dark } = event.data.data || {};
        setDarkMode(Boolean(dark));
        console.log('🎨 Theme updated from parent:', theme);
      }
    };

    window.addEventListener('message', handleParentMessages);
    
    // Check URL params for initial theme
    const urlParams = new URLSearchParams(window.location.search);
    const initialTheme = urlParams.get('theme');
    if (initialTheme) {
      setDarkMode(initialTheme === 'dark');
      console.log('🎨 Initial theme from URL:', initialTheme);
    }

    return () => window.removeEventListener('message', handleParentMessages);
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const res = await fetch("/api/embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, userId })
      });

      const data = await res.json();

      setMessages(prev => [
        ...prev,
        { role: "assistant", content: data?.assistantMessage?.content || "⚠️ No response received." }
      ]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Server error." }]);
    } finally {
      setInput("");
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "20px" }}>
      <h3>🤿 Koval AI Coach</h3>
      <div style={{
        border: "1px solid #ccc",
        borderRadius: "8px",
        padding: "10px",
        height: "300px",
        overflowY: "auto",
        marginBottom: "10px"
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ margin: "6px 0" }}>
            <strong>{msg.role === "user" ? "You" : "Koval AI"}:</strong> {msg.content}
          </div>
        ))}
        <div ref={bottomRef}></div>
      </div>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your message..."
        rows={2}
        style={{ width: "80%", marginRight: "10px" }}
      />
      <button onClick={handleSend} disabled={loading}>
        {loading ? "Sending..." : "Send"}
      </button>
    </div>
  );
}
