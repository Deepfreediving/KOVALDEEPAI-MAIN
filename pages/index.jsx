import { useEffect, useState, useRef } from "react";
import ChatInput from "../components/ChatInput";
import ChatMessages from "../components/ChatMessages";

export default function Chat() {
  const BOT_NAME = "Koval AI";
  const defaultSessionName = `Session – ${new Date().toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })}`;

  const [sessionName, setSessionName] = useState(defaultSessionName);
  const [editingSessionName, setEditingSessionName] = useState(false);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [userId, setUserId] = useState("");
  const [threadId, setThreadId] = useState(null);
  const [profile, setProfile] = useState({});
  const [eqState, setEqState] = useState({
    currentDepth: null,
    answers: {},
    alreadyAsked: [],
  });

  const bottomRef = useRef(null);

  // Load local data
  useEffect(() => {
    const localId = localStorage.getItem("kovalUser") || `User${Date.now()}`;
    if (!localStorage.getItem("kovalUser")) localStorage.setItem("kovalUser", localId);
    setUserId(localId);

    const saved = JSON.parse(localStorage.getItem("kovalProfile") || "{}");
    setProfile(saved);

    const savedSession = localStorage.getItem("kovalSessionName");
    if (savedSession) setSessionName(savedSession);
  }, []);

  // Ensure thread ID
  useEffect(() => {
    const initThread = async () => {
      let id = localStorage.getItem("kovalThreadId");
      if (!id && userId) {
        try {
          const res = await fetch("/api/create-thread", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: userId }),
          });
          const data = await res.json();
          id = data.threadId;
          localStorage.setItem("kovalThreadId", id);
        } catch (err) {
          console.error("❌ Thread init error:", err);
        }
      }
      setThreadId(id);
    };
    initThread();
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const handleSessionNameChange = (e) => setSessionName(e.target.value);
  const saveSessionName = () => {
    setEditingSessionName(false);
    localStorage.setItem("kovalSessionName", sessionName.trim() || defaultSessionName);
  };

  const saveProfileAnswer = (key, value) => {
    const updated = { ...profile, [key]: value };
    setProfile(updated);
    localStorage.setItem("kovalProfile", JSON.stringify(updated));
  };

  const handleSubmit = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput && files.length === 0) return;
    setLoading(true);

    // Upload image
    if (files.length > 0) {
      try {
        const formData = new FormData();
        formData.append("image", files[0]);

        const uploadRes = await fetch("/api/upload-dive-image", {
          method: "POST",
          body: formData,
        });

        const data = await uploadRes.json();
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: data?.answer || data?.error || "⚠️ Upload failed.",
        }]);
      } catch (err) {
        console.error("❌ Upload error:", err);
      } finally {
        setFiles([]);
      }
    }

    // Chat
    if (trimmedInput) {
      setMessages((prev) => [...prev, { role: "user", content: trimmedInput }]);
      setInput("");

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmedInput,
            userId,
            profile,
            eqState,
            intakeCount: messages.filter(m => m.role === "assistant" && m.content?.includes("question")).length,
            sessionName,
          }),
        });

        const data = await res.json();

        if (data?.type === "intake") {
          saveProfileAnswer(data.key, trimmedInput);
          setMessages((prev) => [...prev, { role: "assistant", content: data.question }]);
        } else if (data?.type === "eq-followup") {
          setEqState((prev) => ({
            ...prev,
            answers: { ...prev.answers, [data.key]: trimmedInput },
            alreadyAsked: [...(prev.alreadyAsked || []), data.key],
          }));
          setMessages((prev) => [...prev, { role: "assistant", content: data.question }]);
        } else if (data?.type === "eq-diagnosis") {
          const diagnosis = `🩺 Diagnosis: ${data.label}\n\nSuggested drills:\n${data.drills.join("\n")}`;
          setMessages((prev) => [...prev, { role: "assistant", content: diagnosis }]);
        } else {
          const reply = data?.assistantMessage?.content || "⚠️ No response.";
          setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
        }

      } catch (err) {
        console.error("❌ Chat error:", err);
        setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Chat failed." }]);
      }
    }

    setLoading(false);
  };

  const handleManualSave = async () => {
    try {
      const res = await fetch("/api/save-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          sessionName,
          profile,
          eqState,
          messages,
          timestamp: new Date().toISOString(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`✅ Session saved to Wix. (${data.saved} entries)`);
      } else {
        alert("⚠️ Failed to save session.");
      }
    } catch (err) {
      console.error("❌ Manual save error:", err);
      alert("❌ Could not save session.");
    }
  };

  const handleKeyDown = (e) => {
    if ((e.key === "Enter" || e.key === "Return") && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <main
      className={`relative min-h-screen flex items-center justify-center px-4 transition-colors ${
        darkMode ? "bg-black text-white" : "bg-white text-gray-900"
      }`}
    >
      <div
        className={`w-full max-w-3xl h-screen flex flex-col rounded-xl overflow-hidden border ${
          darkMode ? "border-gray-700 bg-[#121212]" : "border-gray-300 bg-white"
        }`}
      >
        <div className={`flex justify-between px-6 py-4 border-b ${darkMode ? "border-gray-700 bg-[#1a1a1a]" : "border-gray-200 bg-gray-100"}`}>
          <div>
            {editingSessionName ? (
              <input
                className="text-xl font-semibold bg-transparent border-b border-dashed focus:outline-none"
                value={sessionName}
                onChange={handleSessionNameChange}
                onBlur={saveSessionName}
                autoFocus
              />
            ) : (
              <h1 className="text-xl font-semibold cursor-pointer" onClick={() => setEditingSessionName(true)}>
                {sessionName}
              </h1>
            )}
            <p className="text-xs text-gray-500 mt-1">User ID: {userId}</p>
          </div>

          <button
            onClick={toggleDarkMode}
            className={`px-4 py-1 rounded-md border text-sm ${
              darkMode ? "bg-white text-black" : "bg-black text-white"
            }`}
          >
            {darkMode ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>

        <ChatMessages
          messages={messages}
          BOT_NAME={BOT_NAME}
          darkMode={darkMode}
          loading={loading}
          bottomRef={bottomRef}
        />

        <ChatInput
          input={input}
          setInput={setInput}
          handleSubmit={handleSubmit}
          handleKeyDown={handleKeyDown}
          handleFileChange={(e) => setFiles(Array.from(e.target.files).slice(0, 3))}
          files={files}
          setFiles={setFiles}
          loading={loading}
          darkMode={darkMode}
        />

        {/* Save Button */}
        <button
          onClick={handleManualSave}
          className="absolute bottom-5 right-6 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 shadow-md text-sm"
        >
          💾 Save Session
        </button>
      </div>
    </main>
  );
}
