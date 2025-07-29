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
  const [userId, setUserId] = useState(localStorage.getItem("kovalUser") || "");
  const [threadId, setThreadId] = useState(localStorage.getItem("kovalThreadId") || null);
  const [profile, setProfile] = useState({});
  const [eqState, setEqState] = useState({ currentDepth: null, answers: {}, alreadyAsked: [] });
  const [showDiveJournalForm, setShowDiveJournalForm] = useState(false);
  const [diveLogs, setDiveLogs] = useState([]);
  const [editLogIndex, setEditLogIndex] = useState(null);
  const bottomRef = useRef(null);

  // ---------- Helper Functions ----------
  const getDisplayName = () => {
    if (profile?.loginEmail) return profile.loginEmail;
    if (profile?.contactDetails?.firstName) return profile.contactDetails.firstName;
    if (userId?.startsWith("Guest")) return "Guest User";
    return "User";
  };

  const storageKey = (uid) => `diveLogs-${uid}`;

  const savePendingSync = (logs) => {
    localStorage.setItem("pendingSync", JSON.stringify(logs));
  };

  const getPendingSync = () => {
    try {
      return JSON.parse(localStorage.getItem("pendingSync") || "[]");
    } catch {
      return [];
    }
  };

  // ---------- 1️⃣ User Detection ----------
  useEffect(() => {
    const memberDetails = localStorage.getItem("__wix.memberDetails");
    if (!userId && memberDetails) {
      try {
        const parsed = JSON.parse(memberDetails);
        const uid = parsed.loginEmail || parsed.id;
        if (uid) {
          setUserId(uid);
          setProfile(parsed);
          localStorage.setItem("kovalUser", uid);
          localStorage.setItem("kovalProfile", JSON.stringify(parsed));
        }
      } catch (e) {
        console.warn("⚠️ Could not parse Wix member details:", e);
      }
    }

    // Listen for Wix message
    const receiveUserId = (e) => {
      if (e.origin !== "https://www.deepfreediving.com") return;
      if (e.data?.type === "user-auth" && e.data.userId) {
        setUserId(e.data.userId);
        localStorage.setItem("kovalUser", e.data.userId);
      }
    };
    window.addEventListener("message", receiveUserId);

    // Fallback guest user
    if (!userId) {
      const guest = `Guest${Date.now()}`;
      setUserId(guest);
      localStorage.setItem("kovalUser", guest);
    }

    return () => window.removeEventListener("message", receiveUserId);
  }, []);

  // ---------- 2️⃣ Initialize Thread ----------
  useEffect(() => {
    if (!userId || threadId) return;
    const initThread = async () => {
      try {
        const res = await fetch("/api/create-thread", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: userId, displayName: getDisplayName() }),
        });
        const data = await res.json();
        if (data.threadId) {
          setThreadId(data.threadId);
          localStorage.setItem("kovalThreadId", data.threadId);
        }
      } catch (err) {
        console.error("❌ Thread init failed:", err);
      }
    };
    initThread();
  }, [userId]);

  // ---------- 3️⃣ Load Dive Logs ----------
  useEffect(() => {
    if (!userId) return;
    const key = storageKey(userId);
    const localLogs = JSON.parse(localStorage.getItem(key) || "[]");
    setDiveLogs(localLogs);

    const fetchLogs = async () => {
      try {
        const res = await fetch(`/api/get-dive-logs?userId=${userId}`);
        const remoteLogs = await res.json();
        if (Array.isArray(remoteLogs)) {
          const merged = [...localLogs, ...remoteLogs].reduce((map, log) => {
            map[log.localId || log._id] = log;
            return map;
          }, {});
          const combined = Object.values(merged).sort((a, b) => new Date(b.date) - new Date(a.date));
          setDiveLogs(combined);
          localStorage.setItem(key, JSON.stringify(combined));
        }
      } catch {
        console.warn("⚠️ Dive log fetch failed. Using local only.");
      }
    };
    fetchLogs();
  }, [userId]);

  // ---------- 4️⃣ Pending Sync Processor ----------
  useEffect(() => {
    const processQueue = async () => {
      const queue = getPendingSync();
      if (!queue.length) return;
      try {
        const batch = queue.slice(0, 10); // up to 10 at a time
        const res = await fetch("https://www.deepfreediving.com/_functions/userMemory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(batch),
        });
        const result = await res.json();
        if (result.success) {
          savePendingSync(queue.slice(10));
        }
      } catch (err) {
        console.error("❌ Sync error, will retry:", err);
      }
    };

    processQueue();
    const interval = setInterval(processQueue, 10000); // every 10s
    window.addEventListener("focus", processQueue);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", processQueue);
    };
  }, []);

  // ---------- 5️⃣ Journal Submit ----------
  const handleJournalSubmit = async (entry) => {
    const key = storageKey(userId);
    const newEntry = { ...entry, localId: entry.localId || `${userId}-${Date.now()}` };
    const updated = [...diveLogs.filter((l) => l.localId !== newEntry.localId), newEntry];

    setDiveLogs(updated);
    localStorage.setItem(key, JSON.stringify(updated));

    // Queue for sync
    const pending = getPendingSync();
    savePendingSync([...pending, { userId, diveLog: newEntry, timestamp: new Date() }]);

    setShowDiveJournalForm(false);
    setEditLogIndex(null);

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "📝 Dive log saved locally and will sync soon." },
    ]);
  };

  const handleEdit = (index) => {
    setEditLogIndex(index);
    setShowDiveJournalForm(true);
  };

  const handleDelete = (index) => {
    const key = storageKey(userId);
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
      <main className="h-screen flex bg-white text-gray-900 dark:bg-black dark:text-white">
        <div className="w-[320px] h-screen overflow-y-auto border-r border-gray-300 dark:border-gray-700">
          <Sidebar
            {...sharedProps}
            startNewSession={() => {
              const name = `Session – ${new Date().toLocaleDateString("en-US")}`;
              setSessionName(name);
              setMessages([]);
              setFiles([]);
              setEditingSessionName(false);
              localStorage.setItem("kovalSessionName", name);
            }}
            handleSaveSession={() => {
              const filtered = sessionsList.filter((s) => s.sessionName !== sessionName);
              const updated = [...filtered, { sessionName, messages, timestamp: Date.now() }];
              localStorage.setItem("kovalSessionsList", JSON.stringify(updated));
              localStorage.setItem("kovalSessionName", sessionName);
              setSessionsList(updated);
            }}
            toggleDiveJournal={() => setShowDiveJournalForm((prev) => !prev)}
            handleSelectSession={(name) => {
              const found = sessionsList.find((s) => s.sessionName === name);
              if (found) {
                setSessionName(found.sessionName);
                setMessages(found.messages || []);
                setInput("");
              }
            }}
            handleJournalSubmit={handleJournalSubmit}
            handleEdit={handleEdit}
            handleDelete={handleDelete}
          />
        </div>

        <div className="flex-1 flex flex-col h-screen">
          <div className="sticky top-0 z-10 bg-white dark:bg-black border-b border-gray-300 dark:border-gray-700 p-2 flex justify-between items-center text-sm">
            <div className="text-gray-500 dark:text-gray-400 px-2 truncate">
              👤 {getDisplayName()}
            </div>
            <button
              onClick={() => setDarkMode((prev) => !prev)}
              className="px-4 py-1 rounded border text-sm dark:bg-white dark:text-black bg-black text-white"
            >
              {darkMode ? "☀ Light Mode" : "🌙 Dark Mode"}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4">
            <ChatMessages
              messages={messages}
              BOT_NAME={BOT_NAME}
              darkMode={darkMode}
              loading={loading}
              bottomRef={bottomRef}
            />
          </div>

          <ChatBox {...sharedProps} />
        </div>
      </main>
    </div>
  );
}
