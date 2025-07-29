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

  useEffect(() => {
    const memberDetails = localStorage.getItem("__wix.memberDetails");
    let profileData = {};
    let storedId = "";

    if (memberDetails) {
      try {
        const parsed = JSON.parse(memberDetails);
        profileData = parsed;
        storedId = parsed.loginEmail || parsed.id;
        if (storedId) {
          localStorage.setItem("kovalUser", storedId);
          localStorage.setItem("kovalProfile", JSON.stringify(profileData));
          setUserId(storedId);
          setProfile(profileData);
        }
      } catch (e) {
        console.warn("⚠️ Could not parse Wix member details:", e);
      }
    }

    // ✅ Listen for user ID from Wix iframe postMessage
    const receiveUserId = (e) => {
      if (e.data?.type === "user-auth" && e.data.userId) {
        console.log("✅ Received userId from Wix:", e.data.userId);
        localStorage.setItem("kovalUser", e.data.userId);
        setUserId(e.data.userId);
      }
    };
    window.addEventListener("message", receiveUserId);

    // ✅ Fallback: If no user ID detected, create guest ID
    setTimeout(() => {
      const existing = localStorage.getItem("kovalUser");
      if (!existing) {
        const guestId = `Guest${Date.now()}`;
        localStorage.setItem("kovalUser", guestId);
        setUserId(guestId);
      }
    }, 1500);

    // Load session state from local storage
    setSessionName(localStorage.getItem("kovalSessionName") || defaultSessionName);
    setSessionsList(JSON.parse(localStorage.getItem("kovalSessionsList") || "[]"));

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
    if (userId) initThread();
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!userId) return;
    const key = `diveLogs-${userId}`;
    const localLogs = JSON.parse(localStorage.getItem(key) || "[]");

    const fetchLogs = async () => {
      try {
        const res = await fetch(`/api/get-dive-logs?userId=${userId}`);
        const remoteLogs = await res.json();
        const combined = Array.isArray(remoteLogs) ? remoteLogs : localLogs;
        localStorage.setItem(key, JSON.stringify(combined));
        setDiveLogs(combined);
      } catch {
        console.warn("⚠️ Dive log fetch failed. Using local logs.");
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
    const updated = [...filtered, { sessionName, messages, timestamp: Date.now() }];
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

  const toggleDiveJournal = () => setShowDiveJournalForm((prev) => !prev);

  const handleSelectSession = (name) => {
    const found = sessionsList.find((s) => s.sessionName === name);
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
      localStorage.setItem(key, JSON.stringify(updated));
      setDiveLogs(updated);
      setShowDiveJournalForm(false);
      setEditLogIndex(null);

      await fetch("https://www.deepfreediving.com/_functions/saveToUserMemory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          diveLog: entry,
          memoryContent: "",
          timestamp: new Date(),
          sessionName: "Dive Log Entry",
        }),
      });

      const memoryRes = await fetch("/api/record-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ log: entry, userId, threadId }),
      });

      const memoryData = await memoryRes.json();
      const aiMessage = memoryData?.assistantMessage?.content;

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            aiMessage ||
            "📝 Dive log saved. Let me know if you'd like coaching on this entry!",
        },
      ]);
    } catch (err) {
      console.error("❌ Error submitting dive log:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ There was an error saving or analyzing your dive log.",
        },
      ]);
    }
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
      <main className="h-screen flex bg-white text-gray-900 dark:bg-black dark:text-white">
        <div className="w-[320px] h-screen overflow-y-auto border-r border-gray-300 dark:border-gray-700">
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
        </div>

        <div className="flex-1 flex flex-col h-screen">
          <div className="sticky top-0 z-10 bg-white dark:bg-black border-b border-gray-300 dark:border-gray-700 p-2 flex justify-end">
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

          <ChatBox {...sharedProps} onUploadSuccess={handleUploadSuccess} />
        </div>
      </main>
    </div>
  );
}
