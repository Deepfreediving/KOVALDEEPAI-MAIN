import { useEffect, useState, useRef } from "react";
import ChatMessages from "../components/ChatMessages";
import Sidebar from "../components/Sidebar";
import ChatBox from "../components/ChatBox";

export default function Index() {
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

  // Load user and session
  useEffect(() => {
    const storedId = localStorage.getItem("kovalUser") || `Guest${Date.now()}`;
    localStorage.setItem("kovalUser", storedId);
    setUserId(storedId);

    setProfile(JSON.parse(localStorage.getItem("kovalProfile") || "{}"));
    setSessionName(localStorage.getItem("kovalSessionName") || defaultSessionName);
    setSessionsList(JSON.parse(localStorage.getItem("kovalSessionsList") || "[]"));

    const receiveUserId = (e) => {
      if (e.data?.type === "user-auth" && e.data?.userId) {
        setUserId(e.data.userId);
        localStorage.setItem("kovalUser", e.data.userId);
      }
    };

    window.addEventListener("message", receiveUserId);
    return () => window.removeEventListener("message", receiveUserId);
  }, []);

  // Thread init
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

  // Scroll chat to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load and merge dive logs from backend
  useEffect(() => {
    if (!userId) return;
    const key = `diveLogs-${userId}`;
    const localLogs = JSON.parse(localStorage.getItem(key) || "[]");

    const fetchLogs = async () => {
      try {
        const res = await fetch(`/api/get-dive-logs?userId=${userId}`);
        const remoteLogs = await res.json();

        // Merge remote and local (assume remote is source of truth for now)
        const combined = Array.isArray(remoteLogs) ? remoteLogs : localLogs;

        localStorage.setItem(key, JSON.stringify(combined));
        setDiveLogs(combined);
      } catch (err) {
        console.error("⚠️ Dive log fetch failed. Using local backup.");
        setDiveLogs(localLogs);
      }
    };

    fetchLogs();
  }, [userId]);

  const handleUploadSuccess = (message) => {
    setMessages((prev) => [...prev, { role: "assistant", content: message }]);
  };

  const saveSession = () => {
    const filtered = sessionsList.filter((s) => s.sessionName !== sessionName);
    const updated = [
      ...filtered,
      { sessionName, messages, timestamp: Date.now() },
    ];
    localStorage.setItem("kovalSessionsList", JSON.stringify(updated));
    localStorage.setItem("kovalSessionName", sessionName);
    setSessionsList(updated);
  };

  const newSession = () => {
    const name = `Session – ${new Date().toLocaleDateString("en-US")}`;
    setSessionName(name);
    setMessages([]);
    setFiles([]);
    setEditingSessionName(false);
    localStorage.setItem("kovalSessionName", name);
  };

  const toggleDiveJournal = () => {
    setShowDiveJournalForm((prev) => !prev);
  };

  const handleSelectSession = (selectedSessionName) => {
    const found = sessionsList.find((s) => s.sessionName === selectedSessionName);
    if (found) {
      setSessionName(found.sessionName);
      setMessages(found.messages || []);
      setInput("");
    }
  };

  const handleJournalSubmit = async (entry) => {
    const key = `diveLogs-${userId}`;
    const updated = [...diveLogs];

    if (editLogIndex !== null) {
      updated[editLogIndex] = entry;
    } else {
      updated.push(entry);
    }

    try {
      await fetch("/api/save-dive-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
    } catch (err) {
      console.error("❌ Failed to save dive log remotely:", err);
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
    <div className={darkMode ? "dark" : ""}>
      <main className="min-h-screen flex bg-white text-gray-900 dark:bg-black dark:text-white">
        <Sidebar
          {...sharedProps}
          startNewSession={newSession}
          handleSaveSession={saveSession}
          toggleDiveJournal={toggleDiveJournal}
          handleSelectSession={handleSelectSession}
          handleJournalSubmit={handleJournalSubmit}
          handleEdit={handleEdit}
          handleDelete={handleDelete}
        />
        <div className="flex-1 flex flex-col h-screen">
          <div className="flex justify-end p-2">
            <button
              onClick={() => setDarkMode((prev) => !prev)}
              className="px-4 py-1 rounded border text-sm dark:bg-white dark:text-black bg-black text-white"
            >
              {darkMode ? "☀ Light Mode" : "🌙 Dark Mode"}
            </button>
          </div>
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
    </div>
  );
}
