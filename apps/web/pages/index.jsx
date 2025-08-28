import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import ChatMessages from "@/components/ChatMessages";
import ChatInput from "@/components/ChatInput";
import Sidebar from "@/components/Sidebar";
import DiveJournalDisplay from "@/components/DiveJournalDisplay";
import { getAdminUserId } from "@/utils/adminAuth";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/src/providers/AuthProvider";

const API_ROUTES = {
  CREATE_THREAD: "/api/openai/create-thread",
  // ✅ Use OpenAI chat directly since Supabase chat is admin-only
  CHAT: "/api/openai/chat",
  CHAT_FALLBACK: "/api/openai/chat",
  GET_DIVE_LOGS: "/api/supabase/dive-logs-optimized",
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
  const { user, loading: authLoading, session } = useAuth();
  const BOT_NAME = "Koval AI";
  const defaultSessionName = `Session – ${new Date().toLocaleDateString("en-US")}`;

  // ✅ Check for admin or demo mode from URL
  const [adminMode, setAdminMode] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [adminUser, setAdminUser] = useState(null);

  // ✅ ALL STATE DECLARATIONS MUST BE AT THE TOP (Rules of Hooks)
  const [isEmbedded, setIsEmbedded] = useState(false);
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
  const [profile, setProfile] = useState({});
  const [diveLogs, setDiveLogs] = useState([]);
  const [loadingDiveLogs, setLoadingDiveLogs] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [authTimeoutReached, setAuthTimeoutReached] = useState(false);
  const [internalUser, setUser] = useState(null);
  const [internalSession, setSession] = useState(null);
  const [diveJournalOpen, setDiveJournalOpen] = useState(false);

  const bottomRef = useRef(null);

  useEffect(() => {
    // Check URL parameters for admin or demo mode
    const urlParams = new URLSearchParams(window.location.search);
    const isAdmin = urlParams.get('admin') === 'true';
    const isDemo = urlParams.get('demo') === 'true';
    const userName = urlParams.get('userName');
    const userId = urlParams.get('userId');
    const subscription = urlParams.get('subscription');

    if (isAdmin) {
      setAdminMode(true);
      setAdminUser({
        id: userId || 'admin-daniel-koval',
        email: 'danielkoval@admin.com',
        user_metadata: {
          full_name: userName || 'Daniel Koval (Admin)',
        },
        subscription_tier: subscription || 'premium'
      });
    } else if (isDemo) {
      setDemoMode(true);
      setAdminUser({
        id: userId,
        email: 'demo@example.com',
        user_metadata: {
          full_name: userName || 'Demo User',
        },
        subscription_tier: 'free'
      });
    }
  }, []);

  // ✅ Redirect to login if not authenticated (unless admin/demo mode)
  useEffect(() => {
    if (!authLoading && !user && !adminMode && !demoMode) {
      router.push('/auth/login');
    }
  }, [authLoading, user, adminMode, demoMode, router]);

  // ✅ Show loading screen while checking authentication
  if (authLoading && !adminMode && !demoMode) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // ✅ Don't render main app if not authenticated (unless admin/demo mode)
  if (!user && !adminMode && !demoMode) {
    return null;
  }

  // ✅ Use admin user or authenticated user
  const currentUser = adminUser || user;

  // Set userId from authenticated user
  useEffect(() => {
    if (currentUser?.id) {
      setUserId(currentUser.id);
      setIsAuthenticating(false); // Authentication complete
    }
  }, [currentUser]);

  // Debug: Track diveLogs state changes
  useEffect(() => {
    console.log(`🔍 diveLogs state updated: ${diveLogs.length} logs`);
  }, [diveLogs]);

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
      "user:",
      user,
    );

    // ✅ Use actual user data if available
    if (user) {
      return user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
    }

    // ✅ Fallback to profile data
    return profile?.firstName || profile?.nickname || "User";
  }, [profile, userId, user]);

  // ✅ LOGOUT FUNCTION
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  const getUserIdentifier = useCallback(() => {
    // Use the actual authenticated user's ID if available
    if (user?.id) {
      console.log(`🆔 Using authenticated user ID: ${user.id}`);
      return user.id;
    }
    // Fallback to profile userId if available
    if (profile?.userId) {
      console.log(`🆔 Using profile user ID: ${profile.userId}`);
      return profile.userId;
    }
    // For development/demo purposes, always fall back to admin ID
    const adminId = getAdminUserId();
    console.log(`🆔 Using admin fallback ID: ${adminId}`);
    return adminId;
  }, [user, profile]);

  // ✅ SUPABASE AUTHENTICATION (Modified to handle demo mode)
  useEffect(() => {
    let isMounted = true;
    
    const initAuth = async () => {
      try {
        // Check if we have URL parameters for demo/admin mode
        const { userId: urlUserId } = router.query;
        
        if (urlUserId && !urlUserId.startsWith("guest-")) {
          console.log("🎯 Demo/Admin mode detected from URL parameters");
          setUserId(String(urlUserId));
          setProfile({
            userId: String(urlUserId),
            firstName: 'Admin',
            lastName: 'User',
            nickname: 'KovalAdmin',
            email: 'admin@koval.ai',
            source: 'url-params'
          });
          setIsAuthenticating(false);
          return; // Skip Supabase auth for demo mode
        }
        
        // Get initial session for real authentication
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting session:", error);
        }
        
        if (isMounted) {
          if (currentSession) {
            console.log("✅ User authenticated:", currentSession.user.email);
            setSession(currentSession);
            setUser(currentSession.user);
            setUserId(currentSession.user.id);
            setProfile({
              userId: currentSession.user.id,
              firstName: currentSession.user.user_metadata?.full_name?.split(' ')[0] || 'User',
              lastName: currentSession.user.user_metadata?.full_name?.split(' ')[1] || '',
              nickname: currentSession.user.user_metadata?.full_name || currentSession.user.email?.split('@')[0],
              email: currentSession.user.email,
              source: 'supabase'
            });
            setIsAuthenticating(false);
          } else {
            // No session and no URL userId - redirect to login
            console.log("❌ No session found, checking for demo mode...");
            
            // Give a moment for router to be ready and check for URL params
            setTimeout(() => {
              if (isMounted && !router.query.userId) {
                console.log("❌ No demo mode, redirecting to login");
                setIsAuthenticating(false);
                router.push('/auth/login');
              }
            }, 500);
            return;
          }
        }
        
        // Listen for auth changes (only for real Supabase auth)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!isMounted) return;
            
            console.log("🔄 Auth state changed:", event, session?.user?.email);
            
            if (session) {
              setSession(session);
              setUser(session.user);
              setUserId(session.user.id);
              setProfile({
                userId: session.user.id,
                firstName: session.user.user_metadata?.full_name?.split(' ')[0] || 'User',
                lastName: session.user.user_metadata?.full_name?.split(' ')[1] || '',
                nickname: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
                email: session.user.email,
                source: 'supabase'
              });
              setIsAuthenticating(false);
            } else if (!router.query.userId) {
              // Only redirect if not in demo mode
              setSession(null);
              setUser(null);
              router.push('/auth/login');
            }
          }
        );
        
        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Auth initialization error:", error);
        if (isMounted) {
          setIsAuthenticating(false);
        }
      }
    };
    
    if (typeof window !== "undefined" && router.isReady) {
      setSessionsList(safeParse("kovalSessionsList", []));
      initAuth();
    }
    
    return () => {
      isMounted = false;
    };
  }, [router]);

  // ✅ URL PARAMETER HANDLING FOR EMBEDDED MODE AND THEME
  useEffect(() => {
    if (router.isReady) {
      const { theme, embedded } = router.query;

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

      console.log("✅ URL parameters processed:", {
        theme,
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



  // ✅ DIVE JOURNAL FUNCTIONS
  const toggleDiveJournal = useCallback(() => {
    setDiveJournalOpen(!diveJournalOpen);
  }, [diveJournalOpen]);

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
          filesCount: files?.length || 0,
        });

        let messageData = {
          message: input,
          userId,
          profile,
          embedMode: false,
          diveLogs: diveLogs.slice(0, 10), // Include recent dive logs for context
        };

        // ✅ Handle file uploads if present
        if (files && files.length > 0) {
          console.log("📎 Processing file uploads:", files.length, "files");
          
          // Convert files to base64 for API transmission
          const filePromises = files.map(file => {
            return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                resolve({
                  name: file.name,
                  type: file.type,
                  size: file.size,
                  data: reader.result
                });
              };
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
          });

          const uploadedFiles = await Promise.all(filePromises);
          messageData.files = uploadedFiles;
          
          // Clear files after processing
          setFiles([]);
        }

        // ✅ Use OpenAI chat API directly with correct format
        const response = await fetch(API_ROUTES.CHAT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(messageData),
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
    [input, loading, userId, profile, isAuthenticating, authTimeoutReached, diveLogs, files],
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
    console.log(`🗄️ Local storage logs found: ${localLogs.length} for user: ${currentUserId}`);
    console.log(`🔑 Storage key: ${key}`);
    setDiveLogs(localLogs);

    // ✅ SKIP API ONLY IF NO USER IDENTIFIER AT ALL
    if (!currentUserId || currentUserId === 'anonymous') {
      console.log("📱 Using localStorage-only mode (no user identifier)");
      setLoadingDiveLogs(false);
      return;
    }

    // ✅ API SYNC - Always try to get remote logs when we have a user ID
    console.log(`🌐 Loading dive logs for user: ${currentUserId}`);
    setLoadingDiveLogs(true);
    try {
      // Build query parameters including email for admin detection
      const queryParams = new URLSearchParams({ userId: currentUserId });
      if (user?.email) {
        queryParams.append('email', user.email);
      }
      
      const apiUrl = `${API_ROUTES.GET_DIVE_LOGS}?${queryParams.toString()}`;
      console.log(`🌐 Fetching logs from API: ${apiUrl}`);
      
      const response = await fetch(apiUrl);
      if (response.ok) {
        const data = await response.json();
        const remoteLogs = data.diveLogs || data.logs || [];
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
        console.log(`🔄 Setting diveLogs state with ${combined.length} logs:`, combined.slice(0, 2));
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
  }, [getUserIdentifier, user?.email]);

  // ✅ INITIAL DIVE LOGS LOADING - Runs after loadDiveLogs is defined
  useEffect(() => {
    if (typeof window !== "undefined") {
      loadDiveLogs();
    }
  }, [loadDiveLogs]);

  // ✅ DIVE LOG CALLBACKS - Defined after loadDiveLogs
  const handleDiveLogSaved = useCallback((newLog) => {
    console.log("🚀 Dive log saved:", newLog);
    // Refresh dive logs
    loadDiveLogs();
  }, [loadDiveLogs]);

  const handleDiveLogDeleted = useCallback((deletedLogId) => {
    console.log("🗑️ Dive log deleted:", deletedLogId);
    // Refresh dive logs
    loadDiveLogs();
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

  // ✅ DELETE DIVE LOG (for future use)
  // eslint-disable-next-line no-unused-vars
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

  // ✅ SESSION MANAGEMENT - Enhanced with auto-save and better feedback
  const handleSaveSession = useCallback(() => {
    const newSession = {
      id: Date.now(),
      sessionName,
      messages,
      timestamp: Date.now(),
      userId,
      messageCount: messages.length,
    };
    const updated = [
      newSession,
      ...sessionsList.filter((s) => s.sessionName !== sessionName),
    ];
    setSessionsList(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("kovalSessionsList", JSON.stringify(updated));
      // Also save a backup with user identifier
      localStorage.setItem(`kovalSessions_${userId}`, JSON.stringify(updated));
    }
    console.log("✅ Session saved with", messages.length, "messages");
    
    // Add a success message to the chat
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "💾 **Session Saved** \n\nYour chat session has been saved to local storage. You can continue this conversation later by selecting it from the sidebar.",
        metadata: { type: "system", timestamp: new Date().toISOString() }
      },
    ]);
  }, [sessionName, messages, sessionsList, userId]);

  // Auto-save session every 5 messages
  useEffect(() => {
    if (messages.length > 1 && messages.length % 5 === 0) {
      const newSession = {
        id: Date.now(),
        sessionName,
        messages,
        timestamp: Date.now(),
        userId,
        messageCount: messages.length,
        autoSaved: true,
      };
      const updated = [
        newSession,
        ...sessionsList.filter((s) => s.sessionName !== sessionName),
      ];
      setSessionsList(updated);
      if (typeof window !== "undefined") {
        localStorage.setItem("kovalSessionsList", JSON.stringify(updated));
        localStorage.setItem(`kovalSessions_${userId}`, JSON.stringify(updated));
      }
      console.log("🔄 Auto-saved session with", messages.length, "messages");
    }
  }, [messages, sessionName, sessionsList, userId]);

  // Load user-specific sessions on mount
  useEffect(() => {
    if (typeof window !== "undefined" && userId) {
      const userSessions = JSON.parse(localStorage.getItem(`kovalSessions_${userId}`) || "[]");
      const globalSessions = JSON.parse(localStorage.getItem("kovalSessionsList") || "[]");
      
      // Merge and deduplicate sessions
      const allSessions = [...userSessions, ...globalSessions];
      const uniqueSessions = allSessions.reduce((acc, session) => {
        const key = session.sessionName;
        if (!acc[key] || session.timestamp > acc[key].timestamp) {
          acc[key] = session;
        }
        return acc;
      }, {});
      
      const mergedSessions = Object.values(uniqueSessions).sort((a, b) => b.timestamp - a.timestamp);
      setSessionsList(mergedSessions);
    }
  }, [userId]);

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

  // ✅ SESSION DELETE HANDLER
  const handleDeleteSession = useCallback((index) => {
    const updated = sessionsList.filter((_, i) => i !== index);
    setSessionsList(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("kovalSessionsList", JSON.stringify(updated));
      localStorage.setItem(`kovalSessions_${userId}`, JSON.stringify(updated));
    }
    console.log("🗑️ Session deleted");
  }, [sessionsList, userId]);

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
      handleDeleteSession,
      handleJournalSubmit,
      toggleDiveJournal,
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
      handleDeleteSession,
      handleJournalSubmit,
      toggleDiveJournal,
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
        className={`${isEmbedded ? "w-[250px] hidden sm:flex" : "w-[320px]"} h-full overflow-y-auto flex flex-col relative z-20`}
      >
        <Sidebar {...sidebarProps} />
      </div>

      {/* ✅ MAIN CHAT AREA */}
      <div
        className={`flex-1 flex flex-col ${isEmbedded ? "h-full" : "h-screen"} relative`}
      >
        {/* Top Bar - Compact ChatGPT-style */}
        <div
          className={`sticky top-0 z-10 ${isEmbedded ? "px-3 py-2" : "px-4 py-3"} flex justify-between items-center ${
            darkMode ? "bg-gray-900" : "bg-white"
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className={`text-sm font-medium ${darkMode ? "text-gray-200" : "text-gray-700"}`}>
              {getDisplayName()}
            </div>
            {user && (
              <div className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                {user.email}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {user && !isEmbedded && (
              <button
                onClick={handleLogout}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  darkMode
                    ? "hover:bg-gray-800 text-gray-400 hover:text-gray-200"
                    : "hover:bg-gray-100 text-gray-600 hover:text-gray-800"
                }`}
              >
                Sign out
              </button>
            )}
            {!isEmbedded && (
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode
                    ? "hover:bg-gray-800 text-gray-400 hover:text-gray-200"
                    : "hover:bg-gray-100 text-gray-600 hover:text-gray-800"
                }`}
              >
                {darkMode ? "☀️" : "🌙"}
              </button>
            )}
          </div>
        </div>

        {/* Border line that flows seamlessly from sidebar */}
        <div className={`relative ${isEmbedded ? "hidden" : ""}`}>
          <div
            className={`absolute left-[-320px] right-0 h-px -top-px ${
              darkMode ? "bg-gray-700" : "bg-gray-200"
            }`}
          ></div>
        </div>

        {/* Messages - ChatGPT-style compact layout */}
        <div className="flex-1 overflow-y-auto">
          <div className="w-full max-w-4xl mx-auto">
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

        {/* Chat Input - ChatGPT-style compact */}
        <div className={`relative ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
          {/* Background extension that goes under sidebar but behind it */}
          <div
            className={`absolute top-0 bottom-0 left-[-320px] right-0 z-0 ${
              darkMode ? "bg-gray-900" : "bg-gray-50"
            } ${isEmbedded ? "hidden" : ""}`}
          ></div>
          <div className="relative z-10 w-full max-w-4xl mx-auto px-4 py-3">
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
      </div>

      {/* ✅ DIVE JOURNAL DISPLAY - Modal overlay */}
      {diveJournalOpen && (
        <DiveJournalDisplay
          darkMode={darkMode}
          isOpen={diveJournalOpen}
          onClose={() => setDiveJournalOpen(false)}
          isEmbedded={isEmbedded}
          setMessages={setMessages}
          refreshKey={Date.now()}
          onDiveLogSaved={handleDiveLogSaved}
          onDiveLogDeleted={handleDiveLogDeleted}
          onRefreshDiveLogs={loadDiveLogs}
          diveLogs={diveLogs}
          loadingDiveLogs={loadingDiveLogs}
        />
      )}
      {/* Debug: Log diveLogs state when passing to component */}
      {diveJournalOpen && console.log(`🔍 Passing ${diveLogs.length} dive logs to DiveJournalDisplay`)}

    </main>
  );
}

// Removed unused queryPinecone function
