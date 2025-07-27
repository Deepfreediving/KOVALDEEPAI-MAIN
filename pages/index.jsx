import { useEffect, useState, useRef } from "react";
import ChatMessages from "../components/ChatMessages";
import DiveJournalDisplay from "../components/DiveJournalDisplay";
import DiveJournalForm from "../components/DiveJournalForm";

export default function Chat() {
  const BOT_NAME = "Koval AI";

  const defaultSessionName = `Session – ${new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  const [sessionName, setSessionName] = useState(defaultSessionName);
  const [sessionsList, setSessionsList] = useState([]);
  const [editingSessionName, setEditingSessionName] = useState(false);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [userId, setUserId] = useState("");
  const [threadId, setThreadId] = useState(null);
  const [profile, setProfile] = useState({});
  const [eqState, setEqState] = useState({ currentDepth: null, answers: {}, alreadyAsked: [] });
  const [showDiveJournalForm, setShowDiveJournalForm] = useState(false);

  const bottomRef = useRef(null);

  useEffect(() => {
    const storedId = localStorage.getItem("kovalUser") || `Guest${Date.now()}`;
    setUserId(storedId);
    localStorage.setItem("kovalUser", storedId);

    const savedProfile = JSON.parse(localStorage.getItem("kovalProfile") || "{}");
    setProfile(savedProfile);

    const savedSession = localStorage.getItem("kovalSessionName") || defaultSessionName;
    setSessionName(savedSession);

    const storedSessions = JSON.parse(localStorage.getItem("kovalSessionsList") || "[]");
    setSessionsList(storedSessions);
  }, []);

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
  const toggleDiveJournal = () => setShowDiveJournalForm((prev) => !prev);

  const handleSaveDive = async (form) => {
    try {
      const res = await fetch("/api/save-dive-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (data?.success && threadId) {
        const summaryRes = await fetch("/api/record-memory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ log: form, threadId, userId }),
        });
        const memoryData = await summaryRes.json();
        if (memoryData?.assistantMessage) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: memoryData.assistantMessage.content },
          ]);
        }
      }
    } catch (err) {
      console.error("❌ Dive save error:", err);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.key === "Enter" || e.key === "Return") && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <main className={`min-h-screen flex transition-colors ${darkMode ? "bg-black text-white" : "bg-white text-gray-900"}`}>
      {/* Sidebar */}
      <aside className={`w-72 flex flex-col justify-between border-r p-4 ${darkMode ? "bg-[#121212] border-gray-700" : "bg-gray-100 border-gray-300"}`}>
        <div>
          <h2 className="text-lg font-semibold mb-4">🗂️ Sessions</h2>
          <button onClick={startNewSession} className="mb-4 text-blue-600 underline">➕ New Session</button>
          <ul className="space-y-2 mb-6">
            {sessionsList.map((s, i) => (
              <li key={i}>
                <button
                  className={`text-left w-full px-2 py-1 rounded ${s === sessionName ? "bg-blue-100" : ""}`}
                  onClick={() => handleSelectSession(s)}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>

          <button
            onClick={toggleDiveJournal}
            className="mb-4 text-left w-full px-3 py-2 rounded bg-blue-50 hover:bg-blue-100 border"
          >
            {showDiveJournalForm ? "📕 Close Dive Journal" : "📘 Open Dive Journal"}
          </button>

          {showDiveJournalForm && <DiveJournalForm onSubmit={handleJournalSubmit} />}
        </div>

        <button onClick={handleSaveSession} className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 mt-4">
          💾 Save Session
        </button>
      </aside>

      {/* Chat & Display */}
      <div className="flex-1 flex flex-col border-l">
        <div className={`flex justify-between px-6 py-4 border-b ${darkMode ? "border-gray-700 bg-[#1a1a1a]" : "border-gray-200 bg-gray-100"}`}>
          <div>
            {editingSessionName ? (
              <input className="text-xl font-semibold bg-transparent border-b border-dashed focus:outline-none"
                value={sessionName} onChange={handleSessionNameChange} onBlur={saveSessionName} autoFocus />
            ) : (
              <h1 className="text-xl font-semibold cursor-pointer" onClick={() => setEditingSessionName(true)}>
                {sessionName}
              </h1>
            )}
            <p className="text-xs text-gray-500 mt-1">User ID: {userId}</p>
          </div>
          <button onClick={toggleDarkMode} className={`px-4 py-1 rounded-md border text-sm ${darkMode ? "bg-white text-black" : "bg-black text-white"}`}>
            {darkMode ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>

        <ChatMessages messages={messages} BOT_NAME={BOT_NAME} darkMode={darkMode} loading={loading} bottomRef={bottomRef} />
        <DiveJournalDisplay userId={userId} />

        <div className="p-4 border-t flex flex-col gap-2">
          <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Type your message or upload dive profiles..." className="w-full p-2 border rounded" rows={2} />
          <div className="flex items-center justify-between">
            <input type="file" onChange={(e) => setFiles(Array.from(e.target.files).slice(0, 3))} />
            <button onClick={handleSubmit} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700" disabled={loading}>
              {loading ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
