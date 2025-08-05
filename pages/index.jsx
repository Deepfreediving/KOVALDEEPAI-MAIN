import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import ChatMessages from "../components/ChatMessages";
import Sidebar from "../components/Sidebar";
import ChatBox from "../components/ChatBox";
import DiveJournalDisplay from '../components/DiveJournalDisplay';
// ✅ Fix: Remove or create proper apiClient import
// import apiClient from "../utils/apiClient";

const API_ROUTES = {
  CREATE_THREAD: "/api/openai/create-thread",
  CHAT: "/api/openai/chat",
  GET_DIVE_LOGS: "/api/analyze/get-dive-logs",
  READ_MEMORY: "/api/analyze/read-memory",
  QUERY_WIX: "/api/wix/query-wix-data",
};

// ✅ Add safe API client
const apiClient = {
  async checkAllConnections({ signal } = {}) {
    try {
      const checks = await Promise.allSettled([
        fetch('/api/health/openai', { signal }),
        fetch('/api/health/pinecone', { signal }),
        fetch('/api/health/wix', { signal })
      ]);

      return {
        openai: checks[0].status === 'fulfilled' && checks[0].value.ok ? '✅ Connected' : '❌ Disconnected',
        pinecone: checks[1].status === 'fulfilled' && checks[1].value.ok ? '✅ Connected' : '❌ Disconnected',
        wix: checks[2].status === 'fulfilled' && checks[2].value.ok ? '✅ Connected' : '❌ Disconnected',
      };
    } catch (error) {
      return {
        openai: '❌ Error',
        pinecone: '❌ Error', 
        wix: '❌ Error'
      };
    }
  }
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
  const [darkMode, setDarkMode] = useState(() => {
    // ✅ Fix: Safe localStorage access
    try {
      return localStorage.getItem("kovalDarkMode") === "true";
    } catch {
      return false;
    }
  });
  const [userId, setUserId] = useState("");
  const [threadId, setThreadId] = useState(null);
  const [profile, setProfile] = useState({});
  const [eqState, setEqState] = useState({ currentDepth: null, answers: {}, alreadyAsked: [] });
  const [showDiveJournalForm, setShowDiveJournalForm] = useState(false);
  // 🔄 NEW: Enterprise dive logs state
  const [diveLogs, setDiveLogs] = useState([]);
  const [editLogIndex, setEditLogIndex] = useState(null);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState({
    wix: "⏳ Checking...",
    openai: "⏳ Checking...",
    pinecone: "⏳ Checking...",
  });
  const [isDiveJournalOpen, setIsDiveJournalOpen] = useState(false);
  const [loadingDiveLogs, setLoadingDiveLogs] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle', 'syncing', 'synced', 'error'
  const bottomRef = useRef(null);

  // ----------------------------
  // Helpers
  // ----------------------------
  const storageKey = (uid) => `diveLogs-${uid}`;
  const safeParse = (key, fallback) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  };

  const savePendingSync = (logs) => {
    try {
      localStorage.setItem("pendingSync", JSON.stringify(logs));
    } catch (error) {
      console.warn('⚠️ Failed to save pending sync:', error);
    }
  };
  
  const getPendingSync = () => safeParse("pendingSync", []);

  const getDisplayName = () =>
    profile?.loginEmail ||
    profile?.contactDetails?.firstName ||
    (userId?.startsWith("Guest") ? "Guest User" : "User");

  // ----------------------------
  // LocalStorage Initialization
  // ----------------------------
  useEffect(() => {
    try {
      setSessionsList(safeParse("kovalSessionsList", []));
      setUserId(localStorage.getItem("kovalUser") || "");
      setThreadId(localStorage.getItem("kovalThreadId") || null);
      setProfile(safeParse("kovalProfile", {}));
    } catch (error) {
      console.warn('⚠️ Failed to load from localStorage:', error);
    }
  }, []);

  // Theme Sync
  useEffect(() => {
    try {
      document.documentElement.classList.toggle("dark", darkMode);
      localStorage.setItem("kovalDarkMode", darkMode);
    } catch (error) {
      console.warn('⚠️ Failed to save dark mode:', error);
    }
  }, [darkMode]);

  // Widget Messages Listener
  useEffect(() => {
    const handleWidgetMessages = ({ data }) => {
      if (!data?.type) return;
      
      try {
        switch (data.type) {
          case "USER_AUTH":
            if (data.userId) {
              setUserId(data.userId);
              localStorage.setItem("kovalUser", data.userId);
            }
            if (data.profile) {
              setProfile(data.profile);
              localStorage.setItem("kovalProfile", JSON.stringify(data.profile));
            }
            break;
            
          case "THEME_CHANGE":
            if (typeof data.dark === "boolean") {
              setDarkMode(data.dark);
            }
            break;
            
          case "RESIZE_IFRAME":
            if (data.height && window.parent !== window) {
              window.parent.postMessage({ type: "WIDGET_RESIZE", height: data.height }, "*");
            }
            break;
            
          default:
            console.log('🔄 Unhandled widget message:', data.type);
        }
      } catch (error) {
        console.warn('⚠️ Error handling widget message:', error);
      }
    };

    window.addEventListener("message", handleWidgetMessages);
    return () => window.removeEventListener("message", handleWidgetMessages);
  }, []);

  // ✅ Fix: Remove dangerous iframe injection
  // This was likely causing conflicts - remove it or make it safer
  /*
  useEffect(() => {
    const existingIframe = document.querySelector("#KovalAIFrame");
    if (existingIframe) return;
    const iframe = document.createElement("iframe");
    iframe.id = "KovalAIFrame";
    iframe.src = "/koval-ai.html"; // ⚠️ This could load Firebase again
    iframe.style.cssText =
      "width:100%;height:0;border:none;position:fixed;bottom:0;right:0;z-index:9999;";
    document.body.appendChild(iframe);
    return () => {
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
    };
  }, []);
  */

  // Open Bot if No Memories
  useEffect(() => {
    const handler = () => {
      try {
        window.KovalAI?.sendMessage?.(
          "Hi, I noticed you don't have any saved memories yet. Would you like me to help you get started?"
        );
      } catch (error) {
        console.warn('⚠️ Error sending bot message:', error);
      }
    };
    
    window.addEventListener("OpenBotIfNoMemories", handler);
    return () => window.removeEventListener("OpenBotIfNoMemories", handler);
  }, []);

  // Connection Check with AbortController
  useEffect(() => {
    const controller = new AbortController();
    
    (async () => {
      try {
        const result = await apiClient.checkAllConnections({ signal: controller.signal });
        if (!controller.signal.aborted) {
          setConnectionStatus(result);
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.warn("⚠️ API connection check failed:", error);
          setConnectionStatus({
            wix: "❌ Error",
            openai: "❌ Error",
            pinecone: "❌ Error",
          });
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingConnections(false);
        }
      }
    })();
    
    return () => controller.abort();
  }, []);

  // Init AI Thread safely
  useEffect(() => {
    if (!userId || threadId || localStorage.getItem("kovalThreadId")) return;
    
    const controller = new AbortController();
    
    (async () => {
      try {
        const res = await fetch(API_ROUTES.CREATE_THREAD, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            username: userId, 
            displayName: getDisplayName(),
            timestamp: Date.now()
          }),
          signal: controller.signal,
        });
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        const data = await res.json();
        if (data.threadId && !controller.signal.aborted) {
          setThreadId(data.threadId);
          localStorage.setItem("kovalThreadId", data.threadId);
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("❌ Thread init failed:", err);
        }
      }
    })();
    
    return () => controller.abort();
  }, [userId, threadId]);

  // Load Dive Logs
  useEffect(() => {
    if (!userId) return;
    
    const controller = new AbortController();
    const key = storageKey(userId);
    const localLogs = safeParse(key, []);
    setDiveLogs(localLogs);

    (async () => {
      try {
        const [remoteRes, memRes] = await Promise.allSettled([
          fetch(`${API_ROUTES.GET_DIVE_LOGS}?userId=${encodeURIComponent(userId)}`, { 
            signal: controller.signal 
          }),
          fetch(API_ROUTES.READ_MEMORY, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
            signal: controller.signal,
          }),
        ]);

        const remoteLogs = remoteRes.status === 'fulfilled' && remoteRes.value.ok 
          ? await remoteRes.value.json() || []
          : [];
          
        const memData = memRes.status === 'fulfilled' && memRes.value.ok
          ? (await memRes.value.json())?.memory || []
          : [];

        if (controller.signal.aborted) return;

        const merged = [...localLogs, ...remoteLogs, ...memData].reduce((map, log) => {
          const key = log.localId || log._id || log.id;
          if (!map[key] || new Date(log.date) > new Date(map[key].date)) {
            map[key] = log;
          }
          return map;
        }, {});

        const combined = Object.values(merged).sort((a, b) => new Date(b.date) - new Date(a.date));
        setDiveLogs(combined);
        
        try {
          localStorage.setItem(key, JSON.stringify(combined));
        } catch (error) {
          console.warn('⚠️ Failed to save dive logs to localStorage:', error);
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.warn("⚠️ Dive log fetch failed. Using local only.", err);
        }
      }
    })();

    return () => controller.abort();
  }, [userId]);

  // ----------------------------
  // Journal Functions
  // ----------------------------
  const handleJournalSubmit = useCallback(
    (entry) => {
      try {
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
      } catch (error) {
        console.error('❌ Failed to save dive log:', error);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "❌ Failed to save dive log. Please try again." },
        ]);
      }
    },
    [userId, diveLogs]
  );

  const handleEdit = useCallback((index) => {
    setEditLogIndex(index);
    setShowDiveJournalForm(true);
  }, []);

  const handleDelete = useCallback(
    (index) => {
      try {
        const key = storageKey(userId);
        const updated = diveLogs.filter((_, i) => i !== index);
        localStorage.setItem(key, JSON.stringify(updated));
        setDiveLogs(updated);
      } catch (error) {
        console.error('❌ Failed to delete dive log:', error);
      }
    },
    [userId, diveLogs]
  );

  // Save Session
  const handleSaveSession = useCallback(() => {
    try {
      const updated = [
        ...sessionsList.filter((s) => s.sessionName !== sessionName),
        { sessionName, messages, timestamp: Date.now() },
      ];
      
      localStorage.setItem("kovalSessionsList", JSON.stringify(updated));
      localStorage.setItem("kovalSessionName", sessionName);
      setSessionsList(updated);
      
      window.KovalAI?.saveSession?.({ userId, sessionName, messages, timestamp: Date.now() });
    } catch (error) {
      console.error('❌ Failed to save session:', error);
    }
  }, [sessionName, sessionsList, messages, userId]);

  // Fetch Wix Data
  const fetchWixData = useCallback(async (query) => {
    const controller = new AbortController();
    
    try {
      setLoading(true);
      const res = await fetch(API_ROUTES.QUERY_WIX, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to fetch Wix data`);
      }
      
      const data = await res.json();
      setMessages((prev) => [...prev, { 
        role: "assistant", 
        content: `✅ Wix Data fetched: ${JSON.stringify(data, null, 2)}` 
      }]);
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("❌ Error fetching Wix data:", err);
        setMessages((prev) => [...prev, { 
          role: "assistant", 
          content: `❌ Failed to fetch Wix data: ${err.message}` 
        }]);
      }
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
          diveLogs={diveLogs}                           // ✅ Pass enterprise dive logs
          refreshDiveLogs={refreshDiveLogs}             // ✅ Refresh function
          onDiveLogsUpdate={setDiveLogs}               // ✅ Update callback
          loadingDiveLogs={loadingDiveLogs}            // ✅ Loading state
          syncStatus={syncStatus}                       // ✅ Sync status
        />

        {/* ✅ Connection Status Dock */}
        <div className="mt-4 mb-4 mx-4 flex space-x-4 text-xl bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {!loadingConnections && connectionStatus.pinecone?.startsWith("✅") && <span title="Data Connected">🌲</span>}
          {!loadingConnections && connectionStatus.openai?.startsWith("✅") && <span title="AI Connected">🤖</span>}
          {!loadingConnections && connectionStatus.wix?.startsWith("✅") && <span title="Site Data Connected">🌀</span>}
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

      {/* Add dive journal button */}
      <button
        onClick={() => setIsDiveJournalOpen(true)}
        className="fixed top-4 right-16 bg-blue-600 hover:bg-blue-700 p-2 rounded-lg text-sm"
        title="View Dive Journal"
      >
        📘 Journal
      </button>

      {/* Dive journal sidebar */}
      <DiveJournalDisplay 
        userId="current-user" // Replace with actual user ID
        darkMode={true}
        isOpen={isDiveJournalOpen} 
        onClose={() => setIsDiveJournalOpen(false)} 
      />
    </main>
  );
}
