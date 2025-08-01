import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import ChatMessages from "../components/ChatMessages";
import Sidebar from "../components/Sidebar";
import ChatBox from "../components/ChatBox";

export default function Index() {
  const BOT_NAME = "Koval AI";
  const defaultSessionName = `Session – ${new Date().toLocaleDateString("en-US")}`;

  // ----------------------------
  // ✅ State
  // ----------------------------
  const [sessionName, setSessionName] = useState(defaultSessionName);
  const [sessionsList, setSessionsList] = useState([]);
  const [editingSessionName, setEditingSessionName] = useState(false);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("kovalDarkMode") === "true");
  const [userId, setUserId] = useState("");
  const [threadId, setThreadId] = useState(null);
  const [profile, setProfile] = useState({});
  const [eqState, setEqState] = useState({ currentDepth: null, answers: {}, alreadyAsked: [] });
  const [showDiveJournalForm, setShowDiveJournalForm] = useState(false);
  const [diveLogs, setDiveLogs] = useState([]);
  const [editLogIndex, setEditLogIndex] = useState(null);
  const [apiKey, setApiKey] = useState(null); // ✅ New state for WIX_API_KEY
  const bottomRef = useRef(null);

  // ----------------------------
  // ✅ Helpers
  // ----------------------------
  const storageKey = (uid) => `diveLogs-${uid}`;
  const safeParse = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch { return fallback; }
  };

  const savePendingSync = (logs) => localStorage.setItem("pendingSync", JSON.stringify(logs));
  const getPendingSync = () => safeParse("pendingSync", []);

  const getDisplayName = () =>
    profile?.loginEmail ||
    profile?.contactDetails?.firstName ||
    (userId?.startsWith("Guest") ? "Guest User" : "User");

  // ----------------------------
  // ✅ Fetch WIX API Key from server
  // ----------------------------
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/get-api-key");
        const data = await res.json();
        if (data?.key) setApiKey(data.key);
      } catch (err) {
        console.error("❌ Failed to load API key:", err);
      }
    })();
  }, []);

  // ----------------------------
  // ✅ LocalStorage Load
  // ----------------------------
  useEffect(() => {
    setSessionsList(safeParse("kovalSessionsList", []));
    setUserId(localStorage.getItem("kovalUser") || "");
    setThreadId(localStorage.getItem("kovalThreadId") || null);
    setProfile(safeParse("kovalProfile", {}));
  }, []);

  // ✅ Theme sync
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("kovalDarkMode", darkMode);
  }, [darkMode]);

  // ✅ Widget messages
  useEffect(() => {
    const handleWidgetMessages = ({ data }) => {
      if (!data) return;
      switch (data.type) {
        case "USER_AUTH":
          setUserId(data.userId);
          setProfile(data.profile || {});
          localStorage.setItem("kovalUser", data.userId);
          localStorage.setItem("kovalProfile", JSON.stringify(data.profile || {}));
          break;
        case "THEME_CHANGE":
          if (typeof data.dark === "boolean") setDarkMode(data.dark);
          break;
        case "RESIZE_IFRAME":
          if (data.height && window.parent) {
            window.parent.postMessage({ type: "WIDGET_RESIZE", height: data.height }, "*");
          }
          break;
        default:
          break;
      }
    };
    window.addEventListener("message", handleWidgetMessages);
    return () => window.removeEventListener("message", handleWidgetMessages);
  }, []);

  // ✅ Inject bot element once
  useEffect(() => {
    if (!document.querySelector("koa-bot")) {
      const botEl = document.createElement("koa-bot");
      document.body.appendChild(botEl);
      return () => botEl.remove();
    }
  }, []);

  // ✅ Handle "OpenBotIfNoMemories"
  useEffect(() => {
    const handler = () => window.KovalBot?.sendMessage(
      "Hi, I noticed you don’t have any saved memories yet. Would you like me to help you get started?"
    );
    window.addEventListener("OpenBotIfNoMemories", handler);
    return () => window.removeEventListener("OpenBotIfNoMemories", handler);
  }, []);

  // ✅ Init AI thread
  useEffect(() => {
    if (!userId || threadId || !apiKey) return;
    let isMounted = true;
    (async () => {
      try {
        const res = await fetch("/api/create-thread", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}` // ✅ Use WIX_API_KEY
          },
          body: JSON.stringify({ username: userId, displayName: getDisplayName() }),
        });
        const data = await res.json();
        if (isMounted && data.threadId) {
          setThreadId(data.threadId);
          localStorage.setItem("kovalThreadId", data.threadId);
        }
      } catch (err) {
        console.error("❌ Thread init failed:", err);
      }
    })();
    return () => { isMounted = false; };
  }, [userId, threadId, apiKey]);

  // ✅ Load Dive Logs
  useEffect(() => {
    if (!userId) return;
    const key = storageKey(userId);
    const localLogs = safeParse(key, []);
    setDiveLogs(localLogs);

    (async () => {
      try {
        const [remoteRes, memRes] = await Promise.all([
          fetch(`/api/get-dive-logs?userId=${encodeURIComponent(userId)}`, {
            headers: { "Authorization": `Bearer ${apiKey || ""}` }
          }),
          fetch("/api/read-memory", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey || ""}`
            },
            body: JSON.stringify({ userId }),
          }),
        ]);

        const remoteLogs = await remoteRes.json();
        const memData = await memRes.json();

        const merged = [...localLogs, ...(remoteLogs || []), ...(memData?.memory || [])]
          .reduce((map, log) => ({ ...map, [log.localId || log._id || log.id]: log }), {});

        const combined = Object.values(merged).sort((a, b) => new Date(b.date) - new Date(a.date));
        setDiveLogs(combined);
        localStorage.setItem(key, JSON.stringify(combined));
      } catch (err) {
        console.warn("⚠️ Dive log fetch failed. Using local only.", err);
      }
    })();
  }, [userId, apiKey]);

  // ✅ Journal functions
  const handleJournalSubmit = useCallback((entry) => {
    const key = storageKey(userId);
    const newEntry = { ...entry, localId: entry.localId || `${userId}-${Date.now()}` };
    const updated = [...diveLogs.filter((l) => l.localId !== newEntry.localId), newEntry];
    setDiveLogs(updated);
    localStorage.setItem(key, JSON.stringify(updated));
    savePendingSync([...getPendingSync(), { userId, diveLog: newEntry, timestamp: new Date() }]);
    setShowDiveJournalForm(false);
    setEditLogIndex(null);
    setMessages((prev) => [...prev, { role: "assistant", content: "📝 Dive log saved locally and queued for sync." }]);
  }, [userId, diveLogs]);

  const handleEdit = useCallback((index) => {
    setEditLogIndex(index);
    setShowDiveJournalForm(true);
  }, []);

  const handleDelete = useCallback((index) => {
    const key = storageKey(userId);
    const updated = diveLogs.filter((_, i) => i !== index);
    localStorage.setItem(key, JSON.stringify(updated));
    setDiveLogs(updated);
  }, [userId, diveLogs]);

  // ✅ Save session
  const handleSaveSession = useCallback(() => {
    const updated = [...sessionsList.filter((s) => s.sessionName !== sessionName), { sessionName, messages, timestamp: Date.now() }];
    localStorage.setItem("kovalSessionsList", JSON.stringify(updated));
    localStorage.setItem("kovalSessionName", sessionName);
    setSessionsList(updated);
    window.KovalBot?.saveSession({ userId, sessionName, messages, timestamp: Date.now() });
  }, [sessionName, sessionsList, messages, userId]);

  // ✅ Memorized props
  const sharedProps = useMemo(() => ({
    BOT_NAME, sessionName, setSessionName, sessionsList, setSessionsList,
    editingSessionName, setEditingSessionName, messages, setMessages, input,
    setInput, files, setFiles, loading, setLoading, userId, profile, setProfile,
    eqState, setEqState, diveLogs, setDiveLogs, editLogIndex, setEditLogIndex,
    showDiveJournalForm, setShowDiveJournalForm, threadId, bottomRef, darkMode, setDarkMode
  }), [sessionName, sessionsList, messages, darkMode, diveLogs, input, files, loading, userId, profile, eqState, showDiveJournalForm, editLogIndex, threadId]);

  return (
    <main className="h-screen flex bg-white text-gray-900 dark:bg-black dark:text-white">
      {/* Sidebar */}
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
          handleSaveSession={handleSaveSession}
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

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-screen">
        {/* Top Bar */}
        <div className="sticky top-0 z-10 bg-white dark:bg-black border-b border-gray-300 dark:border-gray-700 p-3 flex justify-between items-center text-sm">
          <div className="text-gray-500 dark:text-gray-400 px-2 truncate">👤 {getDisplayName()}</div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="px-3 py-1 rounded-md bg-gray-200 text-black hover:bg-gray-300 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
          >
            {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto flex justify-center">
          <div className="w-full max-w-3xl px-6 py-4">
            <ChatMessages messages={messages} BOT_NAME={BOT_NAME} darkMode={darkMode} loading={loading} bottomRef={bottomRef} />
          </div>
        </div>

        {/* Chat Input */}
        <div className="px-4 py-3 border-t border-gray-300 dark:border-gray-700">
          <ChatBox {...sharedProps} />
        </div>
      </div>
    </main>
  );
}
