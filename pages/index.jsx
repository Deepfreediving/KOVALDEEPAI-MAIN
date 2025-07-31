import { useEffect, useState, useRef, useCallback } from "react";
import ChatMessages from "../components/ChatMessages";
import Sidebar from "../components/Sidebar";
import ChatBox from "../components/ChatBox";

export default function Index() {
  const BOT_NAME = "Koval AI";
  const defaultSessionName = `Session – ${new Date().toLocaleDateString("en-US")}`;

  // ----------------------------
  // ✅ State Management
  // ----------------------------
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
  const [wixData, setWixData] = useState([]);
  const bottomRef = useRef(null);

  // ----------------------------
  // ✅ LocalStorage Helpers
  // ----------------------------
  const storageKey = (uid) => `diveLogs-${uid}`;
  const savePendingSync = (logs) => localStorage.setItem("pendingSync", JSON.stringify(logs));
  const getPendingSync = () => {
    try {
      return JSON.parse(localStorage.getItem("pendingSync") || "[]");
    } catch {
      return [];
    }
  };

  // ✅ Load LocalStorage Data
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        setSessionsList(JSON.parse(localStorage.getItem("kovalSessionsList")) || []);
        setUserId(localStorage.getItem("kovalUser") || "");
        setThreadId(localStorage.getItem("kovalThreadId") || null);
        setProfile(JSON.parse(localStorage.getItem("kovalProfile") || "{}"));
      } catch {
        console.warn("⚠️ Failed to load from localStorage");
      }
    }
  }, []);

  // ✅ Display name helper
  const getDisplayName = () => {
    if (profile?.loginEmail) return profile.loginEmail;
    if (profile?.contactDetails?.firstName) return profile.contactDetails.firstName;
    return userId?.startsWith("Guest") ? "Guest User" : "User";
  };

  // ----------------------------
  // 1️⃣ Listen for messages from widget
  // ----------------------------
  useEffect(() => {
    const handleWidgetMessages = (event) => {
      const { type, data } = event.data || {};

      switch (type) {
        case "USER_AUTH":
          if (data?.userId) {
            setUserId(data.userId);
            setProfile(data.profile || {});
            localStorage.setItem("kovalUser", data.userId);
            localStorage.setItem("kovalProfile", JSON.stringify(data.profile || {}));
          }
          break;

        case "THEME_CHANGE":
          setDarkMode(Boolean(data?.dark));
          break;

        case "RESIZE_IFRAME":
          if (data?.height && window.parent) {
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

  // ----------------------------
  // 2️⃣ Inject <koa-bot> widget if missing
  // ----------------------------
  useEffect(() => {
    if (typeof window !== "undefined" && !document.querySelector("koa-bot")) {
      const botElement = document.createElement("koa-bot");
      document.body.appendChild(botElement);
    }
  }, []);

  // ----------------------------
  // 3️⃣ Handle "OpenBotIfNoMemories" event
  // ----------------------------
  useEffect(() => {
    const openBotHandler = () => {
      if (window.KovalBot) {
        window.KovalBot.sendMessage(
          "Hi, I noticed you don’t have any saved memories yet. Would you like me to help you get started?"
        );
      }
    };
    window.addEventListener("OpenBotIfNoMemories", openBotHandler);
    return () => window.removeEventListener("OpenBotIfNoMemories", openBotHandler);
  }, []);

  // ----------------------------
  // 4️⃣ Fetch Wix Collection Data
  // ----------------------------
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/wixconnect");
        const json = await res.json();
        if (json.data) {
          setWixData(json.data);
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `📌 Pulled ${json.data.length} items from Wix collection.` },
          ]);
        }
      } catch (err) {
        console.error("❌ Failed to fetch Wix data:", err);
      }
    })();
  }, []);

  // ----------------------------
  // 5️⃣ Initialize AI Thread
  // ----------------------------
  useEffect(() => {
    if (!userId || threadId) return;
    (async () => {
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
    })();
  }, [userId]);

  // ----------------------------
  // 6️⃣ Load and Sync Dive Logs
  // ----------------------------
  useEffect(() => {
    if (!userId) return;
    const key = storageKey(userId);
    const localLogs = JSON.parse(localStorage.getItem(key) || "[]");
    setDiveLogs(localLogs);

    (async () => {
      try {
        const [remoteRes, memRes] = await Promise.all([
          fetch(`/api/get-dive-logs?userId=${encodeURIComponent(userId)}`),
          fetch("/api/read-memory", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
          }),
        ]);

        const remoteLogs = await remoteRes.json();
        const memData = await memRes.json();
        const memoryLogs = memData?.memory || [];

        const merged = [...localLogs, ...(remoteLogs || []), ...memoryLogs].reduce((map, log) => {
          map[log.localId || log._id || log.id] = log;
          return map;
        }, {});
        const combined = Object.values(merged).sort((a, b) => new Date(b.date) - new Date(a.date));

        setDiveLogs(combined);
        localStorage.setItem(key, JSON.stringify(combined));
      } catch (err) {
        console.warn("⚠️ Dive log fetch failed. Using local only.", err);
      }
    })();
  }, [userId]);

  // ----------------------------
  // 7️⃣ Handle Dive Journal
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
      setMessages((prev) => [...prev, { role: "assistant", content: "📝 Dive log saved locally and queued for sync." }]);
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

  // ----------------------------
  // 8️⃣ Handle Save Session + Sync with widget
  // ----------------------------
  const handleSaveSession = useCallback(() => {
    const filtered = sessionsList.filter((s) => s.sessionName !== sessionName);
    const updated = [...filtered, { sessionName, messages, timestamp: Date.now() }];
    localStorage.setItem("kovalSessionsList", JSON.stringify(updated));
    localStorage.setItem("kovalSessionName", sessionName);
    setSessionsList(updated);

    if (window.KovalBot) {
      window.KovalBot.saveSession({
        userId,
        sessionName,
        messages,
        timestamp: Date.now(),
      });
    }
  }, [sessionName, sessionsList, messages, userId]);

  // ----------------------------
  // ✅ Shared Props
  // ----------------------------
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

  // ----------------------------
  // 9️⃣ Keep theme in sync with widget
  // ----------------------------
  useEffect(() => {
    if (window.KovalBot) {
      window.postMessage({ type: "THEME_CHANGE", data: { dark: darkMode } }, "*");
    }
  }, [darkMode]);

  return (
    <div className={darkMode ? "dark" : ""}>
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
            <div className="text-gray-500 dark:text-gray-400 px-2 truncate">
              👤 {getDisplayName()}
            </div>
          </div>

          {/* Wix Data */}
          {wixData.length > 0 && (
            <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
              <h2 className="font-bold mb-1">📂 Wix Data:</h2>
              <ul>
                {wixData.map((item) => (
                  <li key={item._id} className="text-sm">
                    {item.data?.title || "Unnamed item"}
                  </li>
                ))}
              </ul>
            </div>
          )}

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
    </div>
  );
}
