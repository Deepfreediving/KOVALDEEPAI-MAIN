import { useEffect, useState, useRef } from "react";
import ChatMessages from "../components/ChatMessages";
import DiveJournalDisplay from "../components/DiveJournalDisplay";
import DiveJournalForm from "../components/DiveJournalForm";

export default function Chat() {
  const BOT_NAME = "Koval AI";
  const defaultSessionName = `Session – ${new Date().toLocaleDateString("en-US")}`;

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
    localStorage.setItem("kovalUser", storedId);
    setUserId(storedId);

    setProfile(JSON.parse(localStorage.getItem("kovalProfile") || "{}"));
    setSessionName(localStorage.getItem("kovalSessionName") || defaultSessionName);
    setSessionsList(JSON.parse(localStorage.getItem("kovalSessionsList") || "[]"));

    const receiveUserId = (e) => {
      if (e.data?.userId) {
        setUserId(e.data.userId);
        localStorage.setItem("kovalUser", e.data.userId);
      }
    };
    window.addEventListener("message", receiveUserId);
    return () => window.removeEventListener("message", receiveUserId);
  }, []);

  useEffect(() => {
    const initThread = async () => {
      let id = localStorage.getItem("kovalThreadId");
      if (!id && userId) {
        const res = await fetch("/api/create-thread", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: userId }),
        });
        const data = await res.json();
        id = data.threadId;
        localStorage.setItem("kovalThreadId", id);
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
  const handleSessionNameChange = (e) => setSessionName(e.target.value);

  const saveSessionName = () => {
    const trimmed = sessionName.trim() || defaultSessionName;
    setEditingSessionName(false);
    setSessionName(trimmed);
    localStorage.setItem("kovalSessionName", trimmed);

    if (!sessionsList.includes(trimmed)) {
      const updatedList = [...sessionsList, trimmed];
      setSessionsList(updatedList);
      localStorage.setItem("kovalSessionsList", JSON.stringify(updatedList));
    }
  };

  const handleSelectSession = (name) => {
    const saved = localStorage.getItem(`session-${name}`);
    if (saved) {
      setSessionName(name);
      setMessages(JSON.parse(saved));
    }
  };

  const startNewSession = () => {
    const newName = `Session – ${new Date().toLocaleDateString("en-US")}`;
    setSessionName(newName);
    setMessages([]);
    setEqState({ currentDepth: null, answers: {}, alreadyAsked: [] });
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

    if (files.length > 0) {
      try {
        const formData = new FormData();
        formData.append("image", files[0]);
        const uploadRes = await fetch("/api/upload-dive-image", { method: "POST", body: formData });
        const data = await uploadRes.json();
        setMessages((prev) => [...prev, { role: "assistant", content: data?.answer || "⚠️ Upload failed." }]);
      } catch (err) {
        console.error("❌ Upload error:", err);
      } finally {
        setFiles([]);
      }
    }

    if (trimmedInput) {
      setMessages((prev) => [...prev, { role: "user", content: trimmedInput }]);
      setInput("");

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmedInput, userId, profile, eqState, sessionName }),
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

  const handleSaveSession = () => {
    localStorage.setItem(`session-${sessionName}`, JSON.stringify(messages));
    saveSessionName();
    alert("✅ Session saved locally!");
  };

  const handleJournalSubmit = async (entry) => {
    try {
      const res = await fetch("/api/save-dive-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
      const data = await res.json();

      // Save to local
      const key = `diveLogs-${userId}`;
      const currentLogs = JSON.parse(localStorage.getItem(key) || "[]");
      const updatedLogs = [...currentLogs, entry];
      localStorage.setItem(key, JSON.stringify(updatedLogs));

      // Send summary to OpenAI memory
      const summary = `Dive Log (${entry.date}): ${entry.disciplineType} – ${entry.discipline} in ${entry.location}.\n` +
        `Target depth: ${entry.targetDepth}m, Reached: ${entry.reachedDepth}m.\n` +
        `Mouthfill taken at ${entry.mouthfillDepth}m. Issues at ${entry.issueDepth}: ${entry.issueComment}.\n` +
        `Total time: ${entry.totalDiveTime}, Surface protocol: ${entry.surfaceProtocol}. Notes: ${entry.notes}`;

      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          message: `MEMORY:: ${summary}`,
          sessionName,
          profile,
          eqState,
        }),
      });

      alert("✅ Dive log saved!");
    } catch (err) {
      console.error("❌ Failed to save dive log:", err);
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
