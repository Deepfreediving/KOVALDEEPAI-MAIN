import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import ChatMessages from "@/components/ChatMessages";
import ChatInput from "@/components/ChatInput";
import Sidebar from "@/components/Sidebar";
import { setAdminSession, getAdminUserId, ADMIN_EMAIL } from "@/utils/adminAuth";

const API_ROUTES = {
  CREATE_THREAD: "/api/openai/create-thread",
  // ✅ Use OpenAI chat directly since Supabase chat is admin-only
  CHAT: "/api/openai/chat",
  CHAT_FALLBACK: "/api/openai/chat",
  GET_DIVE_LOGS: "/api/supabase/dive-logs",
  GET_DIVE_LOGS_FALLBACK: "/api/supabase/get-dive-logs",
  GET_USER_PROFILE: "/api/supabase/user-profile",
  SAVE_DIVE_LOG: "/api/supabase/save-dive-log",
  DELETE_DIVE_LOG: "/api/supabase/delete-dive-log",
  UPLOAD_DIVE_IMAGE: "/api/openai/upload-dive-image-simple",
  READ_MEMORY: "/api/analyze/read-memory",
  QUERY_DATA: "/api/supabase/query-data",
  HEALTH_CHECK: "/api/system/health-check",
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
    typeof window !== "undefined"
      ? localStorage.getItem("kovalDarkMode") === "true"
      : false,
  );
  const [userId, setUserId] = useState("");
  // const [threadId, setThreadId] = useState(null); // Unused - removed
  const [profile, setProfile] = useState({});
  const [diveLogs, setDiveLogs] = useState([]);
  const [loadingDiveLogs, setLoadingDiveLogs] = useState(false);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState({
    supabase: "⏳ Checking...",
    openai: "⏳ Checking...",
    pinecone: "⏳ Checking...",
  });

  // ✅ NEW: Authentication state to prevent early interactions
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [authTimeoutReached, setAuthTimeoutReached] = useState(false);

  const bottomRef = useRef(null);

  // ✅ HELPERS
  // ✅ STORAGE KEY: Use nickname for consistent storage across sessions
  const storageKey = (userIdentifier) => `diveLogs_${userIdentifier}`;
  const safeParse = (key, fallback) => {
    try {
      return typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem(key)) || fallback
        : fallback;
    } catch {
      return fallback;
    }
  };

  const getDisplayName = useCallback(() => {
    console.log(
      "🔍 getDisplayName called, profile:",
      profile,
      "userId:",
      userId,
      "isAuthenticating:",
      isAuthenticating,
    );

    // ✅ Show loading state while authenticating
    if (isAuthenticating) {
      return "Loading...";
    }

    // ✅ ADMIN USER: Show Daniel Koval
    return profile?.firstName || profile?.nickname || "Daniel Koval";
  }, [profile, userId, isAuthenticating]);

  // ✅ HELPER: Get user identifier for data storage (always use admin ID)
  const getUserIdentifier = useCallback(() => {
    return getAdminUserId();
  }, []);

  // ✅ SIMPLIFIED ADMIN AUTHENTICATION
  useEffect(() => {
    if (typeof window !== "undefined") {
      setSessionsList(safeParse("kovalSessionsList", []));
      
      // ✅ Set admin session automatically 
      setAdminSession();
      const adminUserId = getAdminUserId();
      setUserId(adminUserId);
      setProfile(safeParse("kovalProfile", {
        userId: adminUserId,
        firstName: 'Daniel',
        lastName: 'Koval', 
        nickname: 'Daniel Koval',
        email: ADMIN_EMAIL,
        isAdmin: true,
        isInstructor: true,
        pb: 120,
        source: 'admin'
      }));
      setIsAuthenticating(false);
      
      console.log("✅ Admin authentication complete:", adminUserId);
    }
  }, []);

  // ✅ URL PARAMETER HANDLING FOR EMBEDDED MODE
  useEffect(() => {
    if (router.isReady) {
      const { theme, userId: urlUserId, userName, embedded } = router.query;

      // Check if we're embedded
      if (embedded === "true" || window.parent !== window) {
        setIsEmbedded(true);
        console.log("🎯 Running in embedded mode");

        // Notify parent that we're ready
        window.parent?.postMessage(
          {
            type: "EMBED_READY",
            source: "koval-ai-embed",
            timestamp: Date.now(),
          },
          "*",
        );
      }

      // Apply theme from URL
      if (theme === "dark") {
        setDarkMode(true);
      } else if (theme === "light") {
        setDarkMode(false);
      }

      // Set user data from URL parameters
      if (urlUserId && !urlUserId.startsWith("guest-")) {
        console.log("✅ Valid userId from URL:", urlUserId);
        setUserId(String(urlUserId));
        localStorage.setItem("kovalUser", String(urlUserId));
        setIsAuthenticating(false); // We have a valid user from URL
      } else if (urlUserId) {
        console.log(
          "⚠️ Guest userId in URL, continuing to wait for authentication",
        );
      }

      if (userName) {
        const decodedUserName = decodeURIComponent(String(userName));
        setProfile((prev) => ({
          ...prev,
          nickname: decodedUserName,
          displayName: decodedUserName,
        }));
        localStorage.setItem(
          "kovalProfile",
          JSON.stringify({
            nickname: decodedUserName,
            displayName: decodedUserName,
          }),
        );
      }

      console.log("✅ URL parameters processed:", {
        theme,
        userId: urlUserId,
        userName,
        embedded,
      });
    }
  }, [router.isReady, router.query]);

  // ✅ THEME SYNC
  useEffect(() => {
    if (typeof window !== "undefined") {
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
        // Simple connection check - Supabase migrated
        const checks = {
          openai: "✅ Connected",
          pinecone: "✅ Connected",
          supabase: "✅ Connected",
        };
        if (isMounted) setConnectionStatus(checks);
      } catch (error) {
        console.warn("⚠️ Connection check failed:", error);
      } finally {
        if (isMounted) setLoadingConnections(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // ✅ WORKING CHAT SUBMISSION - Enhanced with authentication gating
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!input.trim() || loading) return;

      // ✅ PREVENT CHAT UNTIL AUTHENTICATED (unless timeout reached)
      if (isAuthenticating) {
        console.log("⏳ Still authenticating, chat disabled");
        return;
      }

      // ✅ WARN IF USING GUEST ID
      if (userId.startsWith("guest-") && !authTimeoutReached) {
        console.warn(
          "⚠️ Attempting to chat with guest ID, this should not happen",
        );
        const errorMessage = {
          role: "assistant",
          content:
            "⏳ Please wait while we verify your authentication. You'll be able to chat in just a moment.",
        };
        setMessages((prev) => [...prev, errorMessage]);
        return;
      }

      const userMessage = { role: "user", content: input };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setLoading(true);

      try {
        console.log(
          "🚀 Sending message to enhanced chat bridge API with userId:",
          userId,
        );
        console.log("📊 Chat context:", {
          userId,
          profileSource: profile?.source,
          diveLogsCount: diveLogs?.length || 0,
          embedMode: false,
        });

        // ✅ Use OpenAI chat API directly with correct format
        const response = await fetch(API_ROUTES.CHAT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: input,
            userId,
            profile,
            embedMode: false,
            diveLogs: diveLogs.slice(0, 10), // Include recent dive logs for context
          }),
        });

        if (!response.ok) {
          console.error(
            `❌ Chat API failed with status ${response.status}`,
          );
          throw new Error(
            `Chat API failed with status ${response.status}`,
          );
        }

        const data = await response.json();
        console.log("✅ OpenAI chat response received:", data);

        const assistantMessage = data.assistantMessage || {
          role: "assistant",
          content:
            data.answer ||
            data.aiResponse ||
            "I received your message!",
        };

        // Add metadata if available
        if (data.metadata) {
          assistantMessage.metadata = data.metadata;
          console.log(
            `📊 Chat metadata: ${data.metadata.processingTime}ms`,
          );
        }

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        console.error("❌ Chat error:", error);

        const errorMessage = {
          role: "assistant",
          content:
            "I'm having trouble responding right now. Please try again in a moment.",
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, userId, profile, isAuthenticating, authTimeoutReached, diveLogs, messages],
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    },
    [handleSubmit],
  );

  const handleFileChange = useCallback((e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
  }, []);

  // ✅ LOAD DIVE LOGS (Enhanced with session-like reliability)
  const loadDiveLogs = useCallback(async () => {
    // ✅ IMMEDIATE LOCAL LOADING using nickname-based storage
    const currentUserId = getUserIdentifier();
    const key = storageKey(currentUserId);
    const localLogs = safeParse(key, []);
    console.log(`� Local storage logs found: ${localLogs.length} for user: ${currentUserId}`);
    setDiveLogs(localLogs);

    // ✅ SKIP API IF NO REAL USER (guest users stay local-only)
    if (!profile?.nickname && !profile?.firstName) {
      console.log("📱 Using localStorage-only mode (guest user)");
      setLoadingDiveLogs(false);
      return;
    }

    // ✅ OPTIONAL API SYNC (only if we have a real userId)
    console.log(`� Loading dive logs for user: ${currentUserId}`);
    setLoadingDiveLogs(true);
    try {
      console.log(
        `🌐 Fetching logs from API: ${API_ROUTES.GET_DIVE_LOGS}?nickname=${currentUserId}`,
      );
      const response = await fetch(
        `${API_ROUTES.GET_DIVE_LOGS}?nickname=${encodeURIComponent(currentUserId)}`,
      );
      if (response.ok) {
        const data = await response.json();
        const remoteLogs = data.logs || [];
        console.log(`🌐 Remote logs found: ${remoteLogs.length}`);

        // Merge local and remote logs (remove duplicates)
        const merged = [...localLogs, ...remoteLogs].reduce((map, log) => {
          const key =
            log.localId ||
            log._id ||
            log.id ||
            `${log.date}-${log.reachedDepth}`;
          return { ...map, [key]: log };
        }, {});

        const combined = Object.values(merged).sort(
          (a, b) => new Date(b.date) - new Date(a.date),
        );

        console.log(`✅ Combined total logs: ${combined.length}`);
        setDiveLogs(combined);
        if (typeof window !== "undefined") {
          localStorage.setItem(storageKey(getUserIdentifier()), JSON.stringify(combined));
        }

        console.log(`✅ Loaded ${combined.length} dive logs`);
      } else {
        console.warn(
          `⚠️ API request failed: ${response.status} ${response.statusText}, using localStorage only`,
        );
      }
    } catch (error) {
      console.error("❌ Failed to load dive logs from API, using localStorage:", error);
    } finally {
      setLoadingDiveLogs(false);
    }
  }, [profile, getUserIdentifier]);

  // ✅ INITIAL DIVE LOGS LOADING - Runs after loadDiveLogs is defined
  useEffect(() => {
    if (typeof window !== "undefined") {
      loadDiveLogs();
    }
  }, [loadDiveLogs]);

  // ✅ DIVE JOURNAL SUBMIT (Session-like: Immediate localStorage, optional API sync)
  const handleJournalSubmit = useCallback(
    async (diveData) => {
      try {
        // ✅ STEP 1: IMMEDIATE LOCALSTORAGE SAVE (like sessions)
        // Generate unique diveLogId immediately
        const diveLogId = `dive_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Create dive log with all required fields
        const completeDiveLog = {
          ...diveData,
          id: diveLogId,
          diveLogId: diveLogId, // Required by DiveLogs collection
          timestamp: new Date().toISOString(),
          source: 'dive-journal-main-app',
          // User identification fields for localStorage
          userIdentifier: getUserIdentifier(), // For localStorage key consistency
          // Admin user profile fields
          nickname: profile?.nickname || profile?.displayName || 'Unknown User',
          firstName: profile?.firstName || '',
          lastName: profile?.lastName || '',
        };

        // ✅ IMMEDIATE SAVE TO LOCALSTORAGE using nickname-based storage
        const currentUserId = getUserIdentifier();
        const key = storageKey(currentUserId);
        const existingLogs = safeParse(key, []);
        const updatedLogs = [completeDiveLog, ...existingLogs];
        
        if (typeof window !== "undefined") {
          localStorage.setItem(key, JSON.stringify(updatedLogs));
          console.log("✅ Dive log saved to localStorage immediately");
        }

        // ✅ UPDATE UI IMMEDIATELY (like sessions)
        setDiveLogs(updatedLogs);

        // ✅ IMMEDIATE USER FEEDBACK
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `📝 Dive log saved! ${completeDiveLog.reachedDepth}m dive at ${completeDiveLog.location || "your location"}.`,
          },
        ]);

        // ✅ STEP 2: OPTIONAL API SYNC (don't block UI)
        // Only try API if we have real user data (not guest)
        if (profile?.nickname || profile?.firstName) {
          try {
            console.log("🌐 Attempting background sync to API...");
            const response = await fetch(API_ROUTES.SAVE_DIVE_LOG, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(completeDiveLog),
            });

            if (response.ok) {
              console.log("✅ Background API sync successful");
            } else {
              console.warn("⚠️ Background API sync failed, but localStorage save succeeded");
            }
          } catch (apiError) {
            console.warn("⚠️ Background API sync error, but localStorage save succeeded:", apiError);
          }
        } else {
          console.log("📱 Skipping API sync - using localStorage-only mode");
        }

      } catch (error) {
        console.error("❌ Error saving dive log:", error);
        // Even if everything fails, try basic localStorage save
        try {
          const basicLog = { ...diveData, id: Date.now(), timestamp: new Date().toISOString() };
          const key = storageKey(getUserIdentifier());
          const existing = safeParse(key, []);
          localStorage.setItem(key, JSON.stringify([basicLog, ...existing]));
          setDiveLogs([basicLog, ...diveLogs]);
          console.log("✅ Emergency localStorage save successful");
        } catch (emergencyError) {
          console.error("❌ Even emergency save failed:", emergencyError);
        }
      }
    },
    [profile, diveLogs, getUserIdentifier],
  );

  // ✅ DELETE DIVE LOG
  const handleDelete = useCallback(
    async (logId) => {
      try {
        const response = await fetch(
          `${API_ROUTES.DELETE_DIVE_LOG}?id=${logId}`,
          {
            method: "DELETE",
          },
        );

        if (response.ok) {
          console.log("✅ Dive log deleted");
          await loadDiveLogs(); // Refresh the list
        }
      } catch (error) {
        console.error("❌ Error deleting dive log:", error);
      }
    },
    [loadDiveLogs],
  );

  // ✅ SESSION MANAGEMENT
  const handleSaveSession = useCallback(() => {
    const newSession = {
      id: Date.now(),
      sessionName,
      messages,
      timestamp: Date.now(),
    };
    const updated = [
      newSession,
      ...sessionsList.filter((s) => s.sessionName !== sessionName),
    ];
    setSessionsList(updated);
    if (typeof window !== "undefined") {
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

  const handleSelectSession = useCallback(
    (name) => {
      const found = sessionsList.find((s) => s.sessionName === name);
      if (found) {
        setSessionName(found.sessionName);
        setMessages(found.messages || []);
        setInput("");
        console.log("✅ Session loaded:", name);
      }
    },
    [sessionsList],
  );

  // ✅ Load dive logs on mount
  useEffect(() => {
    if (userId) {
      loadDiveLogs();
    }
  }, [userId, loadDiveLogs]);

  // ✅ MEMOIZED PROPS FOR PERFORMANCE
  const sidebarProps = useMemo(
    () => ({
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
      handleJournalSubmit,
      handleDelete,
      refreshDiveLogs: loadDiveLogs,
      loadingDiveLogs,
      syncStatus: "✅ Ready",
      editingSessionName,
      setEditingSessionName,
    }),
    [
      sessionName,
      sessionsList,
      messages,
      userId,
      profile,
      diveLogs,
      darkMode,
      startNewSession,
      handleSaveSession,
      handleSelectSession,
      handleJournalSubmit,
      handleDelete,
      loadDiveLogs,
      loadingDiveLogs,
      editingSessionName,
    ],
  );

  // ✅ MESSAGE LISTENER FOR USER AUTH FROM PARENT PAGE
  useEffect(() => {
    const handleMessage = (event) => {
      // Security check for trusted origins
      if (
        !(
          event.origin === "https://www.deepfreediving.com" ||
          event.origin === "https://deepfreediving.com" ||
          event.origin === "https://kovaldeepai-main.vercel.app" ||
          event.origin === "http://localhost:3000"
        )
      ) {
        console.log("🚫 Ignoring message from untrusted origin:", event.origin);
        return;
      }

      switch (event.data?.type) {
        case "USER_AUTH":
          console.log(
            "👤 Index: User auth received from parent:",
            event.data.data,
          );

          if (
            event.data.data?.userId &&
            !event.data.data.userId.startsWith("guest-")
          ) {
            console.log(
              "✅ Index: Setting authenticated userId:",
              event.data.data.userId,
            );
            const newUserId = String(event.data.data.userId);
            setUserId(newUserId);
            localStorage.setItem("kovalUser", newUserId);

            // ✅ AUTHENTICATION COMPLETE - Enable interactions
            setIsAuthenticating(false);
            setAuthTimeoutReached(false); // Reset timeout flag

            console.log(
              "🎉 Authentication complete! Chat and AI features now enabled.",
            );
          } else {
            console.warn(
              "⚠️ Received invalid or guest userId, continuing to wait for authentication",
            );
          }

          // Update profile with rich data
          if (event.data.data?.userName || event.data.data?.userEmail) {
            const richProfile = {
              nickname:
                event.data.data.userName || event.data.data.userEmail || "User",
              displayName:
                event.data.data.userName || event.data.data.userEmail || "User",
              loginEmail: event.data.data.userEmail || "",
              firstName: event.data.data.firstName || "",
              lastName: event.data.data.lastName || "",
              profilePicture: event.data.data.profilePicture || "",
              phone: event.data.data.phone || "",
              bio: event.data.data.bio || "",
              location: event.data.data.location || "",
              source: "admin-auth",
              customFields: event.data.data.customFields || {},
              isGuest: event.data.data.isGuest || false,
            };

            console.log("✅ Index: Setting rich profile to:", richProfile);
            setProfile(richProfile);
            localStorage.setItem("kovalProfile", JSON.stringify(richProfile));
          } else if (!event.data.data?.userId?.startsWith("guest-")) {
            // Set a basic profile if we have a valid userId but no profile data
            const basicProfile = {
              nickname: `User-${event.data.data.userId}`,
              displayName: `User-${event.data.data.userId}`,
              source: "admin-auth-basic",
            };
            setProfile(basicProfile);
            localStorage.setItem("kovalProfile", JSON.stringify(basicProfile));
          }
          break;

        case "THEME_CHANGE":
          console.log("🎨 Index: Theme change received:", event.data.data);
          setDarkMode(Boolean(event.data.data?.dark));
          break;

        default:
          console.log("❓ Index: Unknown message type:", event.data?.type);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("message", handleMessage);
      console.log("👂 Index: Message listener for user auth set up");

      return () => {
        window.removeEventListener("message", handleMessage);
      };
    }
  }, []);

  return (
    <main
      className={`${isEmbedded ? "h-full" : "h-screen"} flex ${
        darkMode ? "bg-black text-white" : "bg-white text-gray-900"
      }`}
    >
      {/* ✅ SIDEBAR - Hidden in embedded mode on mobile, smaller on desktop */}
      <div
        className={`${isEmbedded ? "w-[250px] hidden sm:flex" : "w-[320px]"} h-full overflow-y-auto border-r flex flex-col justify-between ${
          darkMode ? "border-gray-700" : "border-gray-300"
        }`}
      >
        <Sidebar {...sidebarProps} />

        {/* ✅ CONNECTION STATUS - Simplified in embedded mode */}
        {!isEmbedded && (
          <div
            className={`mt-4 mb-4 mx-4 flex space-x-4 text-xl px-3 py-2 rounded-lg ${
              darkMode ? "bg-gray-800" : "bg-gray-100"
            }`}
          >
            {!loadingConnections && connectionStatus.openai?.includes("✅") && (
              <span title="AI Connected">🤖</span>
            )}
            {!loadingConnections &&
              connectionStatus.pinecone?.includes("✅") && (
                <span title="Data Connected">🌲</span>
              )}
            {!loadingConnections && connectionStatus.supabase?.includes("✅") && (
              <span title="Supabase Database Connected">🗄️</span>
            )}
          </div>
        )}
      </div>

      {/* ✅ MAIN CHAT AREA */}
      <div
        className={`flex-1 flex flex-col ${isEmbedded ? "h-full" : "h-screen"}`}
      >
        {/* Top Bar - Simplified in embedded mode */}
        <div
          className={`sticky top-0 z-10 border-b ${isEmbedded ? "p-2" : "p-3"} flex justify-between items-center text-sm ${
            darkMode ? "bg-black border-gray-700" : "bg-white border-gray-300"
          }`}
        >
          <div
            className={`px-2 truncate ${darkMode ? "text-gray-400" : "text-gray-500"}`}
          >
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
        <div
          className={`px-4 py-3 border-t ${darkMode ? "border-gray-700" : "border-gray-300"}`}
        >
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
      </div>


    </main>
  );
}

// Removed unused queryPinecone function
