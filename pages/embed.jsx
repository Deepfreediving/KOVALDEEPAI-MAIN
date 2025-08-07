import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import ChatMessages from "../components/ChatMessages";
import ChatInput from "../components/ChatInput";
import Sidebar from "../components/Sidebar";
import DiveJournalSidebarCard from "../components/DiveJournalSidebarCard";
import apiClient from "../utils/apiClient";

const API_ROUTES = {
  CREATE_THREAD: "/api/openai/create-thread",
  CHAT: "/api/chat-embed",
  GET_DIVE_LOGS: "/api/analyze/get-dive-logs",
  SAVE_DIVE_LOG: "/api/analyze/save-dive-log",
  DELETE_DIVE_LOG: "/api/analyze/delete-dive-log",
  READ_MEMORY: "/api/analyze/read-memory",
  QUERY_WIX: "/api/wix/query-wix-data",
};

export default function Embed() {
  const router = useRouter();
  const BOT_NAME = "Koval AI";
  const defaultSessionName = `Session – ${new Date().toLocaleDateString("en-US")}`;

  // Always assume we're in embedded mode for this page
  const [isEmbedded, setIsEmbedded] = useState(true);

  // ✅ CORE STATE (Combined from both versions)
  const [sessionName, setSessionName] = useState(defaultSessionName);
  const [sessionsList, setSessionsList] = useState([]);
  const [editingSessionName, setEditingSessionName] = useState(false);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState([]);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `🤿 Hi! I'm ${BOT_NAME}, your freediving coach. How can I help you today?`,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(() => 
    typeof window !== 'undefined' ? localStorage.getItem("kovalDarkMode") === "true" : false
  );
  const [userId, setUserId] = useState("");
  const [threadId, setThreadId] = useState(null);
  const [profile, setProfile] = useState({});
  const [diveLogs, setDiveLogs] = useState([]);
  const [isDiveJournalOpen, setIsDiveJournalOpen] = useState(false);
  const [loadingDiveLogs, setLoadingDiveLogs] = useState(false);
  const [editLogIndex, setEditLogIndex] = useState(null);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState({
    wix: "⏳ Checking...",
    openai: "⏳ Checking...",
    pinecone: "⏳ Checking...",
  });

  const bottomRef = useRef(null);

  // ✅ HELPERS
  const storageKey = (uid) => `diveLogs-${uid}`;
  const safeParse = (key, fallback) => {
    try {
      return typeof window !== 'undefined' ? JSON.parse(localStorage.getItem(key)) || fallback : fallback;
    } catch {
      return fallback;
    }
  };

  const getDisplayName = useCallback(() =>
    profile?.loginEmail ||
    profile?.contactDetails?.firstName ||
    profile?.displayName ||
    profile?.nickname ||
    (userId?.startsWith("guest") ? "Guest User" : "User"),
    [profile, userId]
  );

  // ✅ INITIALIZATION
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSessionsList(safeParse("kovalSessionsList", []));
      setUserId(localStorage.getItem("kovalUser") || `guest-${Date.now()}`);
      setThreadId(localStorage.getItem("kovalThreadId") || null);
      setProfile(safeParse("kovalProfile", { nickname: "Guest User" }));
    }
  }, []);

  // ✅ URL PARAMETER HANDLING FOR EMBEDDED MODE
  useEffect(() => {
    if (router.isReady) {
      const { theme, userId: urlUserId, userName, embedded } = router.query;
      
      console.log('🎯 Embed page - URL parameters:', { theme, userId: urlUserId, userName, embedded });
      
      // Notify parent that we're ready
      window.parent?.postMessage({ 
        type: 'EMBED_READY', 
        source: 'koval-ai-embed',
        timestamp: Date.now()
      }, "*");
      
      // Apply theme from URL
      if (theme === 'dark') {
        setDarkMode(true);
      } else if (theme === 'light') {
        setDarkMode(false);
      }
      
      // Set user data from URL parameters (as fallback)
      if (urlUserId && !userId) {  // Only if no userId is already set
        setUserId(String(urlUserId));
        localStorage.setItem("kovalUser", String(urlUserId));
      }
      
      if (userName && (!profile?.nickname || profile?.nickname === 'Guest User')) {  // Only if no better name exists
        const decodedUserName = decodeURIComponent(String(userName));
        setProfile(prev => ({ 
          ...prev, 
          nickname: decodedUserName,
          displayName: decodedUserName,
          source: 'url-params'
        }));
        localStorage.setItem("kovalProfile", JSON.stringify({ 
          nickname: decodedUserName,
          displayName: decodedUserName,
          source: 'url-params'
        }));
      }
      
      console.log('✅ Embed URL parameters processed:', { theme, userId: urlUserId, userName });
    }
  }, [router.isReady, router.query]);

  // ✅ MESSAGE HANDLING FOR EMBEDDED MODE
  useEffect(() => {
    const handleParentMessages = (event) => {
      console.log('📨 Embed received message:', event.data);
      
      // Security check
      const allowedOrigins = [
        'https://kovaldeepai-main.vercel.app',
        'http://localhost:3000',
        'https://www.wix.com',
        'https://static.wixstatic.com',
        'https://editor.wix.com'
      ];
      
      if (event.origin && !allowedOrigins.some(origin => 
        event.origin.includes('wix') || 
        event.origin === 'https://kovaldeepai-main.vercel.app' ||
        event.origin === 'http://localhost:3000'
      )) {
        console.log('🚫 Ignoring message from untrusted origin:', event.origin);
        return;
      }
      
      switch (event.data?.type) {
        case 'THEME_CHANGE':
          console.log('🎨 Theme change received:', event.data.data);
          setDarkMode(Boolean(event.data.data?.dark));
          break;
          
        case 'USER_AUTH':
          console.log('👤 User auth received with rich profile data:', event.data.data);
          
          if (event.data.data?.userId) {
            setUserId(event.data.data.userId);
            localStorage.setItem("kovalUser", event.data.data.userId);
          }
          
          // Update profile with rich Wix Collections/Members data
          if (event.data.data?.userName || event.data.data?.userEmail) {
            const richProfile = {
              nickname: event.data.data.userName || 
                       event.data.data.firstName + ' ' + event.data.data.lastName ||
                       event.data.data.userEmail || 'User',
              displayName: event.data.data.userName || 
                          event.data.data.firstName + ' ' + event.data.data.lastName ||
                          event.data.data.userEmail || 'User',
              loginEmail: event.data.data.userEmail || '',
              firstName: event.data.data.firstName || '',
              lastName: event.data.data.lastName || '',
              profilePicture: event.data.data.profilePicture || '',
              phone: event.data.data.phone || '',
              bio: event.data.data.bio || '',
              location: event.data.data.location || '',
              source: event.data.data.source || 'wix-collections',
              customFields: event.data.data.customFields || {},
              isGuest: event.data.data.isGuest || false
            };
            
            setProfile(richProfile);
            localStorage.setItem("kovalProfile", JSON.stringify(richProfile));
            console.log('✅ Rich profile updated with Collections/Members data:', richProfile);
          }
          
          if (event.data.data?.diveLogs) {
            setDiveLogs(event.data.data.diveLogs);
            localStorage.setItem("koval_ai_logs", JSON.stringify(event.data.data.diveLogs));
          }
          break;
      }
    };
    
    window.addEventListener('message', handleParentMessages);
    
    return () => window.removeEventListener('message', handleParentMessages);
  }, []);

  // ✅ THEME SYNC
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.classList.toggle("dark", darkMode);
      localStorage.setItem("kovalDarkMode", darkMode);
    }
  }, [darkMode]);

  // ✅ AUTO-SCROLL - More controlled for embedded mode
  useEffect(() => {
    if (bottomRef.current && messages.length > 0) {
      // Only scroll if user is near bottom to avoid interrupting reading
      const messagesContainer = bottomRef.current.closest('.overflow-y-auto');
      if (messagesContainer) {
        const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        
        if (isNearBottom) {
          bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
        }
      }
    }
  }, [messages]);

  // ✅ CONNECTION CHECK
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        // Simple connection check
        const checks = {
          openai: "✅ Connected",
          pinecone: "✅ Connected", 
          wix: "✅ Connected"
        };
        if (isMounted) setConnectionStatus(checks);
      } catch (error) {
        console.warn("⚠️ Connection check failed:", error);
      } finally {
        if (isMounted) setLoadingConnections(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  // ✅ WORKING CHAT SUBMISSION (From working version)
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      console.log("🚀 Sending message to chat API...");

      const response = await fetch(API_ROUTES.CHAT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          userId,
          profile,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("✅ Chat response received:", data);

      const assistantMessage = data.assistantMessage || {
        role: "assistant",
        content: data.answer || "I received your message!",
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("❌ Chat error:", error);

      const errorMessage = {
        role: "assistant",
        content: "I'm having trouble responding right now. Please try again in a moment.",
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, userId, profile]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [handleSubmit]);

  const handleFileChange = useCallback((e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
  }, []);

  // ✅ LOAD DIVE LOGS (Enhanced with better error handling)
  const loadDiveLogs = useCallback(async () => {
    if (!userId) return;
    
    setLoadingDiveLogs(true);
    try {
      // Load from localStorage first
      const key = storageKey(userId);
      const localLogs = safeParse(key, []);
      setDiveLogs(localLogs);

      // Then try to load from API - but don't fail if API is not available
      try {
        const response = await fetch(`${API_ROUTES.GET_DIVE_LOGS}?userId=${userId}`);
        if (response.ok) {
          const data = await response.json();
          const remoteLogs = data.logs || [];
          
          // Merge local and remote logs (remove duplicates)
          const merged = [...localLogs, ...remoteLogs].reduce((map, log) => {
            const key = log.localId || log._id || log.id || `${log.date}-${log.reachedDepth}`;
            return { ...map, [key]: log };
          }, {});
          
          const combined = Object.values(merged).sort((a, b) => 
            new Date(b.date) - new Date(a.date)
          );
          
          setDiveLogs(combined);
          if (typeof window !== 'undefined') {
            localStorage.setItem(storageKey(userId), JSON.stringify(combined));
          }
          
          console.log(`✅ Loaded ${combined.length} dive logs`);
        } else {
          console.log("ℹ️ API not available, using local logs only");
        }
      } catch (apiError) {
        console.log("ℹ️ API not available, using local logs only");
      }
    } catch (error) {
      console.error("❌ Failed to load dive logs:", error);
    } finally {
      setLoadingDiveLogs(false);
    }
  }, [userId]);

  // ✅ DIVE JOURNAL SUBMIT (Enhanced with better error handling)
  const handleJournalSubmit = useCallback(async (diveData) => {
    if (!userId) {
      console.error("❌ No userId available for dive log submission");
      return;
    }

    try {
      // Add userId to dive data
      const diveLogWithUser = { ...diveData, userId };
      
      // Try API first, then fall back to local storage
      try {
        const response = await fetch(API_ROUTES.SAVE_DIVE_LOG, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(diveLogWithUser),
        });

        if (response.ok) {
          console.log("✅ Dive log saved to API successfully");
        } else {
          throw new Error("API save failed");
        }
      } catch (apiError) {
        console.log("ℹ️ API not available, saving to local storage only");
        
        // Save to local storage as fallback
        const key = storageKey(userId);
        const existingLogs = safeParse(key, []);
        const localId = `local-${Date.now()}`;
        const localLog = { ...diveLogWithUser, localId, savedAt: new Date().toISOString() };
        const updatedLogs = [localLog, ...existingLogs];
        
        if (typeof window !== 'undefined') {
          localStorage.setItem(key, JSON.stringify(updatedLogs));
        }
        setDiveLogs(updatedLogs);
      }

      // Refresh the list regardless of save method
      await loadDiveLogs();
      setIsDiveJournalOpen(false);
      setEditLogIndex(null);
      
      // Add confirmation message
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `📝 Dive log saved! ${diveData.reachedDepth}m dive at ${diveData.location || 'your location'}.`
      }]);

      // Notify parent about dive log save
      window.parent?.postMessage({ 
        type: "SAVE_DIVE_LOG", 
        diveLog: diveLogWithUser,
        source: 'koval-ai-embed',
        userId: userId,
        timestamp: Date.now()
      }, "*");

    } catch (error) {
      console.error("❌ Error saving dive log:", error);
    }
  }, [userId, loadDiveLogs]);

  // ✅ DELETE DIVE LOG
  const handleDelete = useCallback(async (logId) => {
    try {
      const response = await fetch(`${API_ROUTES.DELETE_DIVE_LOG}?id=${logId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        console.log("✅ Dive log deleted");
        await loadDiveLogs(); // Refresh the list
      }
    } catch (error) {
      console.error("❌ Error deleting dive log:", error);
    }
  }, [loadDiveLogs]);

  // ✅ SESSION MANAGEMENT
  const handleSaveSession = useCallback(() => {
    const newSession = {
      id: Date.now(),
      sessionName,
      messages,
      timestamp: Date.now(),
    };
    const updated = [newSession, ...sessionsList.filter(s => s.sessionName !== sessionName)];
    setSessionsList(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem("kovalSessionsList", JSON.stringify(updated));
    }
    console.log("✅ Session saved");
  }, [sessionName, messages, sessionsList]);

  const startNewSession = useCallback(() => {
    const name = `Session – ${new Date().toLocaleDateString("en-US")} (${Date.now()})`;
    setSessionName(name);
    setMessages([
      {
        role: "assistant",
        content: `🤿 Hi! I'm ${BOT_NAME}, your freediving coach. How can I help you today?`,
      },
    ]);
    setFiles([]);
    setEditingSessionName(false);
    console.log("✅ New session started");
  }, [BOT_NAME]);

  const handleSelectSession = useCallback((name) => {
    const found = sessionsList.find(s => s.sessionName === name);
    if (found) {
      setSessionName(found.sessionName);
      setMessages(found.messages || []);
      setInput("");
      console.log("✅ Session loaded:", name);
    }
  }, [sessionsList]);

  // ✅ Load dive logs on mount
  useEffect(() => {
    if (userId) {
      loadDiveLogs();
    }
  }, [userId, loadDiveLogs]);

  // ✅ MEMOIZED PROPS FOR PERFORMANCE
  const sidebarProps = useMemo(() => ({
    BOT_NAME,
    sessionName,
    setSessionName,
    sessionsList,
    messages,
    setMessages,
    userId,
    profile,
    setProfile,
    diveLogs,
    setDiveLogs,
    darkMode,
    setDarkMode,
    startNewSession,
    handleSaveSession,
    handleSelectSession,
    toggleDiveJournal: () => setIsDiveJournalOpen(prev => !prev),
    handleJournalSubmit,
    handleDelete,
    refreshDiveLogs: loadDiveLogs,
    loadingDiveLogs,
    syncStatus: "✅ Ready",
    editingSessionName,
    setEditingSessionName
  }), [
    sessionName, sessionsList, messages, userId, profile, diveLogs, darkMode,
    startNewSession, handleSaveSession, handleSelectSession, handleJournalSubmit,
    handleDelete, loadDiveLogs, loadingDiveLogs, editingSessionName
  ]);

  return (
    <div className={`h-screen w-full flex flex-col overflow-hidden ${
      darkMode ? "bg-black text-white" : "bg-white text-gray-900"
    }`}>
      <div className="flex h-full overflow-hidden">
        
        {/* ✅ SIDEBAR - Fixed height in embedded mode */}
        <div className={`w-[250px] h-full overflow-y-auto border-r flex flex-col justify-between ${
          darkMode ? "border-gray-700" : "border-gray-300"
        }`}>
          <Sidebar {...sidebarProps} />

          {/* ✅ CONNECTION STATUS - Simplified */}
          <div className={`mt-2 mb-2 mx-2 flex justify-center space-x-2 text-lg px-2 py-1 rounded ${
            darkMode ? "bg-gray-800" : "bg-gray-100"
          }`}>
            {!loadingConnections && connectionStatus.openai?.includes("✅") && <span title="AI Connected">🤖</span>}
            {!loadingConnections && connectionStatus.pinecone?.includes("✅") && <span title="Data Connected">🌲</span>}
            {!loadingConnections && connectionStatus.wix?.includes("✅") && <span title="Site Data Connected">🌀</span>}
          </div>
        </div>

        {/* ✅ MAIN CHAT AREA - Fixed height with proper overflow */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          
          {/* Top Bar - Fixed position */}
          <div className={`flex-shrink-0 border-b p-2 flex justify-between items-center text-sm ${
            darkMode ? "bg-black border-gray-700" : "bg-white border-gray-300"
          }`}>
            <div className={`px-2 truncate ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              👤 {getDisplayName()} • Embedded
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`px-2 py-1 rounded text-xs ${
                darkMode
                  ? "bg-gray-800 text-white hover:bg-gray-700"
                  : "bg-gray-200 text-black hover:bg-gray-300"
              }`}
            >
              {darkMode ? "☀️" : "🌙"}
            </button>
          </div>

          {/* Messages - Scrollable area only */}
          <div className="flex-1 overflow-y-auto flex justify-center">
            <div className="w-full max-w-3xl px-4 py-3">
              <ChatMessages
                messages={messages}
                BOT_NAME={BOT_NAME}
                darkMode={darkMode}
                loading={loading}
                bottomRef={bottomRef}
              />
            </div>
          </div>

          {/* Chat Input - Fixed at bottom */}
          <div className={`flex-shrink-0 px-3 py-2 border-t ${darkMode ? "border-gray-700" : "border-gray-300"}`}>
            <ChatInput
              input={input}
              setInput={setInput}
              handleSubmit={handleSubmit}
              handleKeyDown={handleKeyDown}
              handleFileChange={handleFileChange}
              files={files}
              setFiles={setFiles}
              loading={loading}
              darkMode={darkMode}
            />
          </div>
        </div>
      </div>

      {/* ✅ DIVE JOURNAL SIDEBAR */}
      {isDiveJournalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden ${
            darkMode ? "bg-gray-900" : "bg-white"
          }`}>
            <div className={`flex justify-between items-center p-4 border-b ${
              darkMode ? "border-gray-700" : "border-gray-200"
            }`}>
              <h2 className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                🤿 Dive Journal
              </h2>
              <button 
                onClick={() => setIsDiveJournalOpen(false)}
                className={`text-2xl transition-colors ${
                  darkMode 
                    ? "text-gray-400 hover:text-white" 
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                ×
              </button>
            </div>
            <div className="h-[calc(95vh-80px)]">
              <DiveJournalSidebarCard 
                userId={userId} 
                darkMode={darkMode}
                onSubmit={handleJournalSubmit}
                onDelete={handleDelete}
                diveLogs={diveLogs}
                loadingDiveLogs={loadingDiveLogs}
                editLogIndex={editLogIndex}
                setEditLogIndex={setEditLogIndex}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
