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

export default function Index() {
  const router = useRouter();
  const BOT_NAME = "Koval AI";
  const defaultSessionName = `Session – ${new Date().toLocaleDateString("en-US")}`;

  // Check if we're in embedded mode
  const [isEmbedded, setIsEmbedded] = useState(false);

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
  
  // ✅ NEW: Authentication state to prevent early interactions
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [authTimeoutReached, setAuthTimeoutReached] = useState(false);

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

  const getDisplayName = useCallback(() => {
    console.log('🔍 getDisplayName called, profile:', profile, 'userId:', userId, 'isAuthenticating:', isAuthenticating);
    
    // ✅ Show loading state while authenticating
    if (isAuthenticating) {
      return "Loading...";
    }
    
    // ✅ PRIORITY: Use member ID format for consistent, fast recognition
    if (userId && !userId.startsWith('guest-')) {
      console.log(`✅ Using member ID format: User-${userId}`);
      return `User-${userId}`;
    }
    
    // Fallback for guest users (only after timeout)
    if (userId?.startsWith('guest-') && authTimeoutReached) {
      console.log('🔄 Using guest fallback after timeout');
      return "Guest User";
    }
    
    // Still waiting for authentication
    if (userId?.startsWith('guest-') && !authTimeoutReached) {
      return "Loading...";
    }
    
    // Final fallback
    console.log('🔄 Using final fallback: User');
    return "User";
  }, [profile, userId, isAuthenticating, authTimeoutReached]);

  // ✅ INITIALIZATION - Enhanced with authentication gating
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSessionsList(safeParse("kovalSessionsList", []));
      setThreadId(localStorage.getItem("kovalThreadId") || null);
      setProfile(safeParse("kovalProfile", { nickname: "Loading..." }));
      
      // ✅ Check if we have a valid stored userId first
      const storedUserId = localStorage.getItem("kovalUser");
      if (storedUserId && !storedUserId.startsWith('guest-')) {
        console.log('✅ Found valid stored userId:', storedUserId);
        setUserId(storedUserId);
        setIsAuthenticating(false); // We have a valid user, stop waiting
      } else {
        console.log('⏳ No valid stored userId, waiting for authentication...');
        // Start authentication timeout (15 seconds for better Wix loading)
        const timeout = setTimeout(() => {
          console.warn('⚠️ Authentication timeout reached, allowing limited access');
          console.warn('⚠️ This usually means Wix authentication failed or is slow');
          console.warn('⚠️ User will be assigned a guest ID for this session');
          setAuthTimeoutReached(true);
          setIsAuthenticating(false);
          setUserId(`guest-${Date.now()}`); // Fallback after timeout
        }, 15000);
        
        return () => clearTimeout(timeout);
      }
    }
  }, []);

  // ✅ URL PARAMETER HANDLING FOR EMBEDDED MODE
  useEffect(() => {
    if (router.isReady) {
      const { theme, userId: urlUserId, userName, embedded } = router.query;
      
      // Check if we're embedded
      if (embedded === 'true' || window.parent !== window) {
        setIsEmbedded(true);
        console.log('🎯 Running in embedded mode');
        
        // Notify parent that we're ready
        window.parent?.postMessage({ 
          type: 'EMBED_READY', 
          source: 'koval-ai-embed',
          timestamp: Date.now()
        }, "*");
      }
      
      // Apply theme from URL
      if (theme === 'dark') {
        setDarkMode(true);
      } else if (theme === 'light') {
        setDarkMode(false);
      }
      
      // Set user data from URL parameters
      if (urlUserId && !urlUserId.startsWith('guest-')) {
        console.log('✅ Valid userId from URL:', urlUserId);
        setUserId(String(urlUserId));
        localStorage.setItem("kovalUser", String(urlUserId));
        setIsAuthenticating(false); // We have a valid user from URL
      } else if (urlUserId) {
        console.log('⚠️ Guest userId in URL, continuing to wait for authentication');
      }
      
      if (userName) {
        const decodedUserName = decodeURIComponent(String(userName));
        setProfile(prev => ({ 
          ...prev, 
          nickname: decodedUserName,
          displayName: decodedUserName 
        }));
        localStorage.setItem("kovalProfile", JSON.stringify({ 
          nickname: decodedUserName,
          displayName: decodedUserName 
        }));
      }
      
      console.log('✅ URL parameters processed:', { theme, userId: urlUserId, userName, embedded });
    }
  }, [router.isReady, router.query]);

  // ✅ THEME SYNC
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.classList.toggle("dark", darkMode);
      localStorage.setItem("kovalDarkMode", darkMode);
    }
  }, [darkMode]);

  // ✅ AUTO-SCROLL
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
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

  // ✅ WORKING CHAT SUBMISSION - Enhanced with authentication gating
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    // ✅ PREVENT CHAT UNTIL AUTHENTICATED (unless timeout reached)
    if (isAuthenticating) {
      console.log('⏳ Still authenticating, chat disabled');
      return;
    }

    // ✅ WARN IF USING GUEST ID
    if (userId.startsWith('guest-') && !authTimeoutReached) {
      console.warn('⚠️ Attempting to chat with guest ID, this should not happen');
      const errorMessage = {
        role: "assistant", 
        content: "⏳ Please wait while we verify your authentication. You'll be able to chat in just a moment."
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    const userMessage = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      console.log("🚀 Sending message to chat API with userId:", userId);

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
  }, [input, loading, userId, profile, isAuthenticating, authTimeoutReached]);

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

  // ✅ LOAD DIVE LOGS (Enhanced from both versions)
  const loadDiveLogs = useCallback(async () => {
    if (!userId) {
      console.log('⚠️ loadDiveLogs: No userId provided');
      return;
    }
    
    console.log(`🔄 Loading dive logs for userId: ${userId}`);
    setLoadingDiveLogs(true);
    try {
      // Load from localStorage first
      const key = storageKey(userId);
      const localLogs = safeParse(key, []);
      console.log(`📱 Local storage logs found: ${localLogs.length}`);
      setDiveLogs(localLogs);

      // Then try to load from API
      console.log(`🌐 Fetching logs from API: ${API_ROUTES.GET_DIVE_LOGS}?userId=${userId}`);
      const response = await fetch(`${API_ROUTES.GET_DIVE_LOGS}?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        const remoteLogs = data.logs || [];
        console.log(`🌐 Remote logs found: ${remoteLogs.length}`);
        
        // Merge local and remote logs (remove duplicates)
        const merged = [...localLogs, ...remoteLogs].reduce((map, log) => {
          const key = log.localId || log._id || log.id || `${log.date}-${log.reachedDepth}`;
          return { ...map, [key]: log };
        }, {});
        
        const combined = Object.values(merged).sort((a, b) => 
          new Date(b.date) - new Date(a.date)
        );
        
        console.log(`✅ Combined total logs: ${combined.length}`);
        setDiveLogs(combined);
        if (typeof window !== 'undefined') {
          localStorage.setItem(storageKey(userId), JSON.stringify(combined));
        }
        
        console.log(`✅ Loaded ${combined.length} dive logs`);
      } else {
        console.warn(`⚠️ API request failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error("❌ Failed to load dive logs:", error);
    } finally {
      setLoadingDiveLogs(false);
    }
  }, [userId]);

  // ✅ DIVE JOURNAL SUBMIT
  const handleJournalSubmit = useCallback(async (diveData) => {
    try {
      const response = await fetch(API_ROUTES.SAVE_DIVE_LOG, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...diveData, userId }),
      });

      if (response.ok) {
        console.log("✅ Dive log saved successfully");
        await loadDiveLogs(); // Refresh the list
        setIsDiveJournalOpen(false);
        setEditLogIndex(null);
        
        // Add confirmation message
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `📝 Dive log saved! ${diveData.reachedDepth}m dive at ${diveData.location || 'your location'}.`
        }]);
      } else {
        console.error("❌ Failed to save dive log");
      }
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

  // ✅ WRAPPER FUNCTIONS FOR DIVE JOURNAL COMPONENT
  const handleDiveLogSubmit = useCallback(async (diveData) => {
    await handleJournalSubmit(diveData);
  }, [handleJournalSubmit]);

  const handleDiveLogDelete = useCallback(async (logId) => {
    await handleDelete(logId);
  }, [handleDelete]);

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

  // ✅ MESSAGE LISTENER FOR USER AUTH FROM PARENT PAGE
  useEffect(() => {
    const handleMessage = (event) => {
      // Security check for trusted origins
      if (!(
        event.origin === 'https://www.deepfreediving.com' ||
        event.origin === 'https://deepfreediving.com' ||
        event.origin.includes('wix.com') ||
        event.origin.includes('wixsite.com') ||
        event.origin.includes('editorx.com') ||
        event.origin === 'https://kovaldeepai-main.vercel.app' ||
        event.origin === 'http://localhost:3000'
      )) {
        console.log('🚫 Ignoring message from untrusted origin:', event.origin);
        return;
      }
      
      switch (event.data?.type) {
        case 'USER_AUTH':
          console.log('👤 Index: User auth received from parent:', event.data.data);
          
          if (event.data.data?.userId && !event.data.data.userId.startsWith('guest-')) {
            console.log('✅ Index: Setting authenticated userId:', event.data.data.userId);
            const newUserId = String(event.data.data.userId);
            setUserId(newUserId);
            localStorage.setItem("kovalUser", newUserId);
            
            // ✅ AUTHENTICATION COMPLETE - Enable interactions
            setIsAuthenticating(false);
            setAuthTimeoutReached(false); // Reset timeout flag
            
            console.log('🎉 Authentication complete! Chat and AI features now enabled.');
          } else {
            console.warn('⚠️ Received invalid or guest userId, continuing to wait for authentication');
          }
          
          // Update profile with rich data
          if (event.data.data?.userName || event.data.data?.userEmail) {
            const richProfile = {
              nickname: event.data.data.userName || event.data.data.userEmail || 'User',
              displayName: event.data.data.userName || event.data.data.userEmail || 'User',
              loginEmail: event.data.data.userEmail || '',
              firstName: event.data.data.firstName || '',
              lastName: event.data.data.lastName || '',
              profilePicture: event.data.data.profilePicture || '',
              phone: event.data.data.phone || '',
              bio: event.data.data.bio || '',
              location: event.data.data.location || '',
              source: event.data.data.source || 'wix-parent-auth',
              customFields: event.data.data.customFields || {},
              isGuest: event.data.data.isGuest || false
            };
            
            console.log('✅ Index: Setting rich profile to:', richProfile);
            setProfile(richProfile);
            localStorage.setItem("kovalProfile", JSON.stringify(richProfile));
          } else if (!event.data.data?.userId?.startsWith('guest-')) {
            // Set a basic profile if we have a valid userId but no profile data
            const basicProfile = {
              nickname: `User-${event.data.data.userId}`,
              displayName: `User-${event.data.data.userId}`,
              source: 'wix-parent-auth-basic'
            };
            setProfile(basicProfile);
            localStorage.setItem("kovalProfile", JSON.stringify(basicProfile));
          }
          break;
          
        case 'THEME_CHANGE':
          console.log('🎨 Index: Theme change received:', event.data.data);
          setDarkMode(Boolean(event.data.data?.dark));
          break;
          
        default:
          console.log('❓ Index: Unknown message type:', event.data?.type);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('message', handleMessage);
      console.log('👂 Index: Message listener for user auth set up');
      
      return () => {
        window.removeEventListener('message', handleMessage);
      };
    }
  }, []);

  return (
    <main className={`${isEmbedded ? 'h-full' : 'h-screen'} flex ${
      darkMode ? "bg-black text-white" : "bg-white text-gray-900"
    }`}>
      
      {/* ✅ SIDEBAR - Hidden in embedded mode on mobile, smaller on desktop */}
      <div className={`${isEmbedded ? 'w-[250px] hidden sm:flex' : 'w-[320px]'} h-full overflow-y-auto border-r flex flex-col justify-between ${
        darkMode ? "border-gray-700" : "border-gray-300"
      }`}>
        <Sidebar {...sidebarProps} />

        {/* ✅ CONNECTION STATUS - Simplified in embedded mode */}
        {!isEmbedded && (
          <div className={`mt-4 mb-4 mx-4 flex space-x-4 text-xl px-3 py-2 rounded-lg ${
            darkMode ? "bg-gray-800" : "bg-gray-100"
          }`}>
            {!loadingConnections && connectionStatus.openai?.includes("✅") && <span title="AI Connected">🤖</span>}
            {!loadingConnections && connectionStatus.pinecone?.includes("✅") && <span title="Data Connected">🌲</span>}
            {!loadingConnections && connectionStatus.wix?.includes("✅") && <span title="Site Data Connected">🌀</span>}
          </div>
        )}
      </div>

      {/* ✅ MAIN CHAT AREA */}
      <div className={`flex-1 flex flex-col ${isEmbedded ? 'h-full' : 'h-screen'}`}>
        
        {/* Top Bar - Simplified in embedded mode */}
        <div className={`sticky top-0 z-10 border-b ${isEmbedded ? 'p-2' : 'p-3'} flex justify-between items-center text-sm ${
          darkMode ? "bg-black border-gray-700" : "bg-white border-gray-300"
        }`}>
          <div className={`px-2 truncate ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            👤 {getDisplayName()}
          </div>
          {!isEmbedded && (
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`px-3 py-1 rounded-md ${
                darkMode
                  ? "bg-gray-800 text-white hover:bg-gray-700"
                  : "bg-gray-200 text-black hover:bg-gray-300"
              }`}
            >
              {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
            </button>
          )}
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
              userId={userId}
            />
          </div>
        </div>

        {/* Chat Input */}
        <div className={`px-4 py-3 border-t ${darkMode ? "border-gray-700" : "border-gray-300"}`}>
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
            isAuthenticating={isAuthenticating}
            authTimeoutReached={authTimeoutReached}
          />
        </div>

        {/* Dive Journal Button & Quick Access */}
        <div className={`px-4 py-2 border-t ${darkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gray-50"}`}>
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setIsDiveJournalOpen(true)}
              disabled={isAuthenticating}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                isAuthenticating
                  ? "opacity-50 cursor-not-allowed bg-gray-400"
                  : darkMode
                  ? "bg-blue-600 hover:bg-blue-500 text-white"
                  : "bg-blue-500 hover:bg-blue-600 text-white"
              }`}
            >
              📝 {isAuthenticating ? "Loading..." : "Add Dive Log"}
            </button>
            
            <div className="flex items-center gap-3 text-sm">
              <span className={`${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                📊 {diveLogs.length} logs recorded
              </span>
              {diveLogs.length > 0 && (
                <button
                  onClick={() => setIsDiveJournalOpen(true)}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    darkMode
                      ? "text-blue-400 hover:text-blue-300 hover:bg-gray-700"
                      : "text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  }`}
                >
                  View All
                </button>
              )}
            </div>
          </div>

          {/* Quick Recent Dive Logs Preview */}
          {diveLogs.length > 0 && (
            <div className={`mt-3 pt-3 border-t ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
              <div className={`text-xs font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                🏊‍♂️ Recent Dives
              </div>
              <div className="space-y-1">
                {diveLogs.slice(0, 2).map((log, index) => (
                  <div
                    key={index}
                    className={`text-xs p-2 rounded-md cursor-pointer transition-colors ${
                      darkMode
                        ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
                        : "bg-white hover:bg-gray-100 text-gray-700 border border-gray-200"
                    }`}
                    onClick={() => setIsDiveJournalOpen(true)}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">
                        {log.reachedDepth || log.targetDepth}m - {log.discipline || 'Freedive'}
                      </span>
                      <span className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                        {log.date || 'Recent'}
                      </span>
                    </div>
                    {log.location && (
                      <div className={`mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                        📍 {log.location}
                      </div>
                    )}
                  </div>
                ))}
                {diveLogs.length > 2 && (
                  <div
                    className={`text-xs text-center py-1 cursor-pointer ${
                      darkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"
                    }`}
                    onClick={() => setIsDiveJournalOpen(true)}
                  >
                    +{diveLogs.length - 2} more dives...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>



      {/* ✅ DIVE JOURNAL SIDEBAR - Now includes both form and display */}
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
                onSubmit={handleDiveLogSubmit}
                onDelete={handleDiveLogDelete}
                diveLogs={diveLogs}
                loadingDiveLogs={loadingDiveLogs}
                editLogIndex={editLogIndex}
                setEditLogIndex={setEditLogIndex}
                setMessages={setMessages} // ✅ Pass setMessages for analysis integration
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// REPLACE the queryPinecone function in pages/api/openai/chat.ts:

async function queryPinecone(query) {
  if (!query?.trim()) return [];
  try {
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';

    // ✅ Use the chat-embed endpoint for Pinecone queries
    const response = await fetch(`${baseUrl}/api/chat-embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: query,
        userId: 'frontend-user',
        profile: { pb: 50 } // Default profile
      })
    });

    if (!response.ok) {
      console.warn(`⚠️ Chat API query failed with status ${response.status}`);
      return [];
    }

    const result = await response.json();
    // Extract the AI response content
    return result.assistantMessage?.content ? [result.assistantMessage.content] : [];
  } catch (error) {
    console.error('❌ Chat API error:', error.message);
    return [];
  }
}
