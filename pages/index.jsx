import { useEffect, useState, useRef } from "react";
import ChatMessages from "../components/ChatMessages";
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
  const [diveLogs, setDiveLogs] = useState([]);
  const [editLogIndex, setEditLogIndex] = useState(null);
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

  useEffect(() => {
    const key = `diveLogs-${userId}`;
    const logs = JSON.parse(localStorage.getItem(key) || "[]");
    setDiveLogs(logs);
  }, [userId]);

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
        const reply = data?.assistantMessage?.content || data?.question || "⚠️ No response.";
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      } catch (err) {
        console.error("❌ Chat error:", err);
        setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Chat failed." }]);
      }
    }

    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if ((e.key === "Enter" || e.key === "Return") && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleJournalSubmit = async (entry) => {
    const key = `diveLogs-${userId}`;
    let logs = JSON.parse(localStorage.getItem(key) || "[]");

    if (editLogIndex !== null) {
      logs[editLogIndex] = entry;
      setEditLogIndex(null);
    } else {
      logs.push(entry);
    }

    localStorage.setItem(key, JSON.stringify(logs));
    setDiveLogs(logs);
    setShowDiveJournalForm(false);

    const summary = `Dive Log (${entry.date}): ${entry.disciplineType} – ${entry.discipline} in ${entry.location}.\n` +
      `Target depth: ${entry.targetDepth}m, Reached: ${entry.reachedDepth}m.\nMouthfill at ${entry.mouthfillDepth}m. Issue: ${entry.issueComment}.\n` +
      `Time: ${entry.totalDiveTime}, Surface: ${entry.surfaceProtocol}. Notes: ${entry.notes}`;

    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: `MEMORY:: ${summary}`, userId, sessionName, profile, eqState }),
    });
  };

  const handleEdit = (i) => {
    setEditLogIndex(i);
    setShowDiveJournalForm(true);
  };

  const handleDelete = (i) => {
    const key = `diveLogs-${userId}`;
    const updated = [...diveLogs];
    updated.splice(i, 1);
    localStorage.setItem(key, JSON.stringify(updated));
    setDiveLogs(updated);
  };

  const handleSaveSession = () => {
    localStorage.setItem(`session-${sessionName}`, JSON.stringify(messages));
    saveSessionName();
    alert("✅ Session saved locally!");
  };

  return (
    <main className={`min-h-screen flex ${darkMode ? "bg-black text-white" : "bg-white text-gray-900"}`}>
      {/* Sidebar */}
      <aside className={`w-72 h-screen overflow-y-auto border-r p-4 flex flex-col justify-between ${darkMode ? "bg-[#121212] border-gray-700" : "bg-gray-100 border-gray-300"}`}>
        <div>
          <h2 className="text-lg font-semibold mb-4">🗂️ Sessions</h2>
          <button onClick={startNewSession} className="mb-4 text-blue-600 underline">➕ New Session</button>
          <ul className="space-y-2 mb-6">
            {sessionsList.map((s, i) => (
              <li key={i}>
                <button className={`text-left w-full px-2 py-1 rounded ${s === sessionName ? "bg-blue-100" : ""}`} onClick={() => handleSelectSession(s)}>
                  {s}
                </button>
              </li>
            ))}
          </ul>

          <button onClick={toggleDiveJournal} className="mb-4 text-left w-full px-3 py-2 rounded bg-blue-50 hover:bg-blue-100 border">
            {showDiveJournalForm ? "📕 Close Dive Journal" : "📘 Open Dive Journal"}
          </button>

          {showDiveJournalForm && (
            <DiveJournalForm
              onSubmit={handleJournalSubmit}
              existingEntry={editLogIndex !== null ? diveLogs[editLogIndex] : null}
            />
          )}

          {!showDiveJournalForm && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">📒 Dive Logs</h3>
              <ul className="space-y-2">
                {diveLogs.map((log, i) => (
                  <li key={i} className="border p-2 rounded text-sm bg-white text-black">
                    <strong>{log.date}</strong> – {log.disciplineType}: {log.targetDepth}m
                    <div className="flex justify-end space-x-2 mt-1">
                      <button onClick={() => handleEdit(i)} className="text-blue-600 text-xs">🖊️ Edit</button>
                      <button onClick={() => handleDelete(i)} className="text-red-600 text-xs">🗑️ Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <button onClick={handleSaveSession} className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 mt-4">
          Save Session
        </button>
      </aside>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col h-screen">
        <div className={`sticky top-0 flex justify-between px-6 py-4 border-b z-10 ${darkMode ? "bg-[#1a1a1a] border-gray-700" : "bg-gray-100 border-gray-200"}`}>
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

        <div className="flex-1 overflow-y-auto">
          <ChatMessages messages={messages} BOT_NAME={BOT_NAME} darkMode={darkMode} loading={loading} bottomRef={bottomRef} />
        </div>

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
