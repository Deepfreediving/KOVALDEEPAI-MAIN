import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import ChatMessages from "../components/ChatMessages";
import Sidebar from "../components/Sidebar";
import ChatBox from "../components/ChatBox";
import apiClient from "../utils/apiClient";

const API_ROUTES = {
  CREATE_THREAD: "/api/openai/create-thread",
  CHAT: "/api/openai/chat",
  GET_DIVE_LOGS: "/api/analyze/get-dive-logs",
  READ_MEMORY: "/api/analyze/read-memory",
  QUERY_WIX: "/api/wix/query-wix-data",
};

export default function Index() {
  const BOT_NAME = "Koval AI";
  const defaultSessionName = `Session – ${new Date().toLocaleDateString("en-US")}`;

  // ----------------------------
  // State
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
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState({
    wix: "⏳ Checking...",
    openai: "⏳ Checking...",
    pinecone: "⏳ Checking...",
  });
  const bottomRef = useRef(null);

  // ----------------------------
  // Helpers
  // ----------------------------
  const storageKey = (uid) => `diveLogs-${uid}`;
  const safeParse = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch {
      return fallback;
    }
  };

  const savePendingSync = (logs) => localStorage.setItem("pendingSync", JSON.stringify(logs));
  const getPendingSync = () => safeParse("pendingSync", []);

  const getDisplayName = () =>
    profile?.loginEmail ||
    profile?.contactDetails?.firstName ||
    (userId?.startsWith("Guest") ? "Guest User" : "User");

  // ----------------------------
  // LocalStorage Initialization
  // ----------------------------
  useEffect(() => {
    setSessionsList(safeParse("kovalSessionsList", []));
    setUserId(localStorage.getItem("kovalUser") || "");
    setThreadId(localStorage.getItem("kovalThreadId") || null);
    setProfile(safeParse("kovalProfile", {}));
  }, []);

  // Theme Sync
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("kovalDarkMode", darkMode);
  }, [darkMode]);

  // Widget Messages Listener
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

  // Inject Bot Iframe
  useEffect(() => {
    const existingIframe = document.querySelector("#KovalAIFrame");
    if (!existingIframe) {
      const iframe = document.createElement("iframe");
      iframe.id = "KovalAIFrame";
      iframe.src = "/koval-ai.html";
      iframe.style.cssText =
        "width:100%;height:0;border:none;position:fixed;bottom:0;right:0;z-index:9999;";
      document.body.appendChild(iframe);
      return () => iframe.remove();
    }
  }, []);

  // Open Bot if No Memories
  useEffect(() => {
    const handler = () =>
      window.KovalAI?.sendMessage?.(
        "Hi, I noticed you don’t have any saved memories yet. Would you like me to help you get started?"
      );
    window.addEventListener("OpenBotIfNoMemories", handler);
    return () => window.removeEventListener("OpenBotIfNoMemories", handler);
  }, []);

  // Connection Check
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const result = await apiClient.checkAllConnections();
        if (isMounted) setConnectionStatus(result);
      } catch (error) {
        console.warn("⚠️ API connection check failed:", error);
      } finally {
        if (isMounted) setLoadingConnections(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Init AI Thread
  useEffect(() => {
    if (!userId || threadId) return;
    let isMounted = true;
    (async () => {
      try {
        const res = await fetch(API_ROUTES.CREATE_THREAD, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
    return () => {
      isMounted = false;
    };
  }, [userId, threadId]);

  // Load Dive Logs
  useEffect(() => {
    if (!userId) return;
    const key = storageKey(userId);
    const localLogs = safeParse(key, []);
    setDiveLogs(localLogs);

    (async () => {
      try {
        const [remoteRes, memRes] = await Promise.all([
          fetch(`${API_ROUTES.GET_DIVE_LOGS}?userId=${encodeURIComponent(userId)}`),
          fetch(API_ROUTES.READ_MEMORY, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
          }),
        ]);

        const remoteLogs = (await remoteRes.json()) || [];
        const memData = (await memRes.json())?.memory || [];

        const merged = [...localLogs, ...remoteLogs, ...memData].reduce(
          (map, log) => ({ ...map, [log.localId || log._id || log.id]: log }),
          {}
        );

        const combined = Object.values(merged).sort((a, b) => new Date(b.date) - new Date(a.date));
        setDiveLogs(combined);
        localStorage.setItem(key, JSON.stringify(combined));
      } catch (err) {
        console.warn("⚠️ Dive log fetch failed. Using local only.", err);
      }
    })();
  }, [userId]);

  // ----------------------------
  // Journal Functions
  // ----------------------------
  const handleJournalSubmit = useCallback(
    (entry) => {
      const key = storageKey(userId);
      const newEntry = { ...entry, localId: entry.localId || `${userId}-${Date.now()}` };
      const updated = [...diveLogs.filter((l) => l.localId !== newEntry.localId), newEntry];
      setDiveLogs(updated);
      localStorage.setItem(key, JSON.stringify(updated));
      savePendingSync([...getPendingSync(), { userId, diveLog: newEntry, timestamp: new Date() }]);
      setShowDiveJournalForm(false);
      setEditLogIndex(null);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "📝 Dive log saved locally and queued for sync." },
      ]);
    },
    [userId, diveLogs]
  );

  const handleEdit = useCallback((index) => {
    setEditLogIndex(index);
    setShowDiveJournalForm(true);
  }, []);

  const handleDelete = useCallback(
    (index) => {
      const key = storageKey(userId);
      const updated = diveLogs.filter((_, i) => i !== index);
      localStorage.setItem(key, JSON.stringify(updated));
      setDiveLogs(updated);
    },
    [userId, diveLogs]
  );

  // Save Session
  const handleSaveSession = useCallback(() => {
    const updated = [
      ...sessionsList.filter((s) => s.sessionName !== sessionName),
      { sessionName, messages, timestamp: Date.now() },
    ];
    localStorage.setItem("kovalSessionsList", JSON.stringify(updated));
    localStorage.setItem("kovalSessionName", sessionName);
    setSessionsList(updated);
    window.KovalAI?.saveSession?.({ userId, sessionName, messages, timestamp: Date.now() });
  }, [sessionName, sessionsList, messages, userId]);

  // Fetch Wix Data
  const fetchWixData = useCallback(async (query) => {
    try {
      setLoading(true);
      const res = await fetch(API_ROUTES.QUERY_WIX, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: `Wix Data fetched: ${JSON.stringify(data)}` }]);
    } catch (err) {
      console.error("Error fetching Wix data:", err);
      setMessages((prev) => [...prev, { role: "assistant", content: "❌ Failed to fetch Wix data." }]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ----------------------------
  // Memorized Props
  // ----------------------------
  const sharedProps = useMemo(
    () => ({
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
      fetchWixData,
    }),
    [
      sessionName,
      sessionsList,
      messages,
      darkMode,
      diveLogs,
      input,
      files,
      loading,
      userId,
      profile,
      eqState,
      showDiveJournalForm,
      editLogIndex,
      threadId,
    ]
  );

  // ----------------------------
  // Main Render
  // ----------------------------
  return (
    <main className="h-screen flex bg-white text-gray-900 dark:bg-black dark:text-white">
      {/* Sidebar */}
      <div className="w-[320px] h-screen overflow-y-auto border-r border-gray-300 dark:border-gray-700 flex flex-col justify-between">
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

        {/* ✅ Connection Status Dock */}
        <div className="mt-4 mb-4 mx-4 flex space-x-4 text-xl bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {!loadingConnections && connectionStatus.pinecone?.includes("✅") && <span title="Data Connected">🌲</span>}
          {!loadingConnections && connectionStatus.openai?.includes("✅") && <span title="AI Connected">🤖</span>}
          {!loadingConnections && connectionStatus.wix?.includes("✅") && <span title="Site Data Connected">🌀</span>}
        </div>
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
            <ChatMessages
              messages={messages}
              BOT_NAME={BOT_NAME}
              darkMode={darkMode}
              loading={loading}
              bottomRef={bottomRef}
            />
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
