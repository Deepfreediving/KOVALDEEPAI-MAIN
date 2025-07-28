import { useEffect, useState, useRef } from "react";
import ChatMessages from "../components/ChatMessages";
import Sidebar from "../components/Sidebar";
import ChatBox from "../components/Chat";

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

  // 🧠 Load user, sessions, profile
  useEffect(() => {
    const storedId = localStorage.getItem("kovalUser") || `Guest${Date.now()}`;
    localStorage.setItem("kovalUser", storedId);
    setUserId(storedId);

    setProfile(JSON.parse(localStorage.getItem("kovalProfile") || "{}"));
    setSessionsList(JSON.parse(localStorage.getItem("kovalSessionsList") || "[]"));
    setSessionName(localStorage.getItem("kovalSessionName") || defaultSessionName);

    const receiveUserId = (e) => {
      if (e.data?.type === "user-auth" && e.data?.userId) {
        setUserId(e.data.userId);
        localStorage.setItem("kovalUser", e.data.userId);
      }
    };

    window.addEventListener("message", receiveUserId);
    return () => window.removeEventListener("message", receiveUserId);
  }, []);

  // 🎯 Create a new thread
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
    if (userId) initThread();
  }, [userId]);

  // 🔁 Scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 📝 Load local dive logs
  useEffect(() => {
    const key = `diveLogs-${userId}`;
    const logs = JSON.parse(localStorage.getItem(key) || "[]");
    setDiveLogs(logs);
  }, [userId]);

  // ✅ Upload success message handler
  const handleUploadSuccess = (message) => {
    setMessages((prev) => [...prev, { role: "assistant", content: message }]);
  };

  // 💾 Save session
  const saveSession = () => {
    const sessionData = { sessionName, messages, timestamp: Date.now() };
    const updated = [...sessionsList, sessionData];
    setSessionsList(updated);
    localStorage.setItem("kovalSessionsList", JSON.stringify(updated));
  };

  // ➕ Start new session
  const newSession = () => {
    const newName = `Session – ${new Date().toLocaleDateString("en-US")} (${Date.now().toString().slice(-4)})`;
    setSessionName(newName);
    setMessages([]);
    setFiles([]);
  };

  // 🔁 Select existing session
  const handleSelectSession = (selectedName) => {
    setSessionName(selectedName);
    const found = sessionsList.find((s) => s.sessionName === selectedName);
    if (found) setMessages(found.messages || []);
  };

  // 🗑 Delete session
  const handleDeleteSession = (index) => {
    const updated = sessionsList.filter((_, i) => i !== index);
    setSessionsList(updated);
    localStorage.setItem("kovalSessionsList", JSON.stringify(updated));
  };

  // 📘 Journal handlers
  const toggleDiveJournal = () => setShowDiveJournalForm((prev) => !prev);

  const handleJournalSubmit = (entry) => {
    const key = `diveLogs-${userId}`;
    const updated = [...diveLogs];
    if (editLogIndex !== null) {
      updated[editLogIndex] = entry;
    } else {
      updated.push(entry);
    }
    localStorage.setItem(key, JSON.stringify(updated));
    setDiveLogs(updated);
    setShowDiveJournalForm(false);
    setEditLogIndex(null);
  };

  const handleEdit = (index) => {
    setEditLogIndex(index);
    setShowDiveJournalForm(true);
  };

  const handleDelete = (index) => {
    const key = `diveLogs-${userId}`;
    const updated = diveLogs.filter((_, i) => i !== index);
    localStorage.setItem(key, JSON.stringify(updated));
    setDiveLogs(updated);
  };

  const sharedProps = {
    BOT_NAME,
    sessionName,
    setSessionName,
    sessionsList,
    setSessionsList,
    editingSessionName,
    setEditingSessionName,
    messages,
    setMessages,
    input,
    setInput,
    files,
    setFiles,
    loading,
    setLoading,
    userId,
    profile,
    setProfile,
    eqState,
    setEqState,
    diveLogs,
    setDiveLogs,
    editLogIndex,
    setEditLogIndex,
    showDiveJournalForm,
    setShowDiveJournalForm,
    threadId,
    bottomRef,
    darkMode,
    setDarkMode,
  };

  return (
    <main className={`min-h-screen flex ${darkMode ? "bg-black text-white" : "bg-white text-gray-900"}`}>
      <Sidebar
        {...sharedProps}
        startNewSession={newSession}
        handleSaveSession={saveSession}
        handleSelectSession={handleSelectSession}
        handleDeleteSession={handleDeleteSession}
        toggleDiveJournal={toggleDiveJournal}
        handleJournalSubmit={handleJournalSubmit}
        handleEdit={handleEdit}
        handleDelete={handleDelete}
      />
      <div className="flex-1 flex flex-col h-screen">
        <div className="flex-1 overflow-y-auto">
          <ChatMessages
            messages={messages}
            BOT_NAME={BOT_NAME}
            darkMode={darkMode}
            loading={loading}
            bottomRef={bottomRef}
          />
        </div>
        <ChatBox {...sharedProps} onUploadSuccess={handleUploadSuccess} />
      </div>
    </main>
  );
}
