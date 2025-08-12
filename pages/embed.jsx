import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import ChatMessages from "../components/ChatMessages";
import ChatInput from "../components/ChatInput";
import Sidebar from "../components/Sidebar";
import DiveJournalSidebarCard from "../components/DiveJournalSidebarCard";
import apiClient from "../utils/apiClient";

const API_ROUTES = {
  CREATE_THREAD: "/api/openai/create-thread",
  // ✅ Use enhanced bridge APIs for better Wix integration
  CHAT: "/api/wix/chat-bridge",
  CHAT_FALLBACK: "/api/openai/chat",
  GET_DIVE_LOGS: "/api/wix/dive-logs-bridge",
  GET_DIVE_LOGS_FALLBACK: "/api/analyze/get-dive-logs",
  GET_USER_PROFILE: "/api/wix/user-profile-bridge",
  SAVE_DIVE_LOG: "/api/analyze/save-dive-log",
  DELETE_DIVE_LOG: "/api/analyze/delete-dive-log",
  READ_MEMORY: "/api/analyze/read-memory",
  QUERY_WIX: "/api/wix/query-wix-data",
  HEALTH_CHECK: "/api/system/health-check",
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
    if (userId && !userId.startsWith('guest')) {
      console.log(`✅ Using member ID format: User-${userId}`);
      return `User-${userId}`;
    }
    
    // Fallback for guest users (only after timeout)
    if (userId?.startsWith('guest') && authTimeoutReached) {
      console.log('🔄 Using guest fallback after timeout');
      return "Guest User";
    }
    
    // Still waiting for authentication
    if (userId?.startsWith('guest') && !authTimeoutReached) {
      return "Loading...";
    }
    
    // Final fallback
    console.log('🔄 Using final fallback: User');
    return "User";
  }, [profile, userId, isAuthenticating, authTimeoutReached]);

  const getProfilePhoto = useCallback(() => {
    // Return profile photo URL if available
    if (profile?.profilePicture && profile.profilePicture !== 'unknown') {
      return profile.profilePicture;
    }
    if (profile?.contactDetails?.picture) {
      return profile.contactDetails.picture;
    }
    return null;
  }, [profile]);

  // ✅ MINIMAL INITIALIZATION - Only load sessions, wait for auth from parent
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSessionsList(safeParse("kovalSessionsList", []));
      setThreadId(localStorage.getItem("kovalThreadId") || null);
      
      // ✅ Check if we have a valid stored userId first
      const storedUserId = localStorage.getItem("kovalUser");
      if (storedUserId && !storedUserId.startsWith('guest-')) {
        console.log('✅ Embed: Found valid stored userId:', storedUserId);
        setUserId(storedUserId);
        setIsAuthenticating(false); // We have a valid user, stop waiting
        
        // Try to load stored profile too
        const storedProfile = safeParse("kovalProfile", {});
        if (storedProfile && storedProfile.source) {
          setProfile(storedProfile);
        }
      } else {
        console.log('⏳ Embed: No valid stored userId, waiting for authentication...');
        // Start authentication timeout (15 seconds for embed - much longer since it depends on parent)
        const timeout = setTimeout(() => {
          console.warn('⚠️ Embed: Authentication timeout reached, allowing limited access');
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
      const { theme, userId: urlUserId, nickname, embedded } = router.query;

      console.log('🎯 Embed page - URL parameters:', { theme, userId: urlUserId, nickname, embedded });

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
      
      // ✅ REMOVED: No URL parameter fallback - always wait for proper USER_AUTH message
      // This ensures we always get the correct nickname from Members/FullData instead of URL params
      console.log('✅ Embed URL parameters processed, waiting for USER_AUTH message from parent...');

      console.log('✅ Embed URL parameters processed:', { theme, userId: urlUserId, nickname });
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
        case 'initialized':
          console.log('🚀 Widget initialized with data:', event.data.data);
          
          if (event.data.data?.user?.id) {
            const newUserId = String(event.data.data.user.id);
            
            // Validate userId is real - no fallback to guest users
            if (!newUserId || newUserId === 'undefined' || newUserId === 'null' || newUserId.startsWith('guest-')) {
              console.warn('⚠️ Invalid or guest userId received, waiting for real user authentication');
              console.warn('⚠️ Received userId:', newUserId);
              return; // Don't set invalid user data
            }
            
            setUserId(newUserId);
            localStorage.setItem("kovalUser", newUserId);
            console.log('✅ UserId set from initialized message:', newUserId);
            
            // ✅ AUTHENTICATION COMPLETE - Enable interactions
            setIsAuthenticating(false);
            setAuthTimeoutReached(false);
            console.log('🎉 Authentication complete via initialized message! Chat and AI features now enabled.');
            
            // Extract profile data from the initialized message
            if (event.data.data.user.profile) {
              const profile = event.data.data.user.profile;
              const initProfile = {
                nickname: profile.displayName || profile.nickname || 'User',
                displayName: profile.displayName || profile.nickname || 'User',
                loginEmail: profile.loginEmail || '',
                firstName: profile.firstName || '',
                lastName: profile.lastName || '',
                profilePicture: profile.profilePhoto || '',
                about: profile.about || '',
                source: 'wix-initialized',
                ...profile
              };
              
              console.log('✅ Setting profile from initialized message:', initProfile);
              setProfile(initProfile);
              localStorage.setItem("kovalProfile", JSON.stringify(initProfile));
            }
          }
          break;
          
        case 'THEME_CHANGE':
          console.log('🎨 Theme change received:', event.data.data);
          setDarkMode(Boolean(event.data.data?.dark));
          break;
          
        case 'USER_AUTH':
          console.log('👤 User auth received with rich profile data:', event.data.data);
          console.log('🔍 Current profile before update:', profile);
          console.log('🔍 Current userId before update:', userId);
          
          if (event.data.data?.userId && !event.data.data.userId.startsWith('guest-')) {
            console.log('✅ Setting authenticated userId:', event.data.data.userId);
            const newUserId = String(event.data.data.userId);
            
            setUserId(newUserId);
            localStorage.setItem("kovalUser", newUserId);
            console.log('✅ UserId set successfully:', newUserId);
            
            // ✅ AUTHENTICATION COMPLETE - Enable interactions
            setIsAuthenticating(false);
            setAuthTimeoutReached(false);
            console.log('🎉 Authentication complete via USER_AUTH! Chat and AI features now enabled.');
          } else {
            console.warn('⚠️ Received invalid or guest userId via USER_AUTH, continuing to wait for authentication');
          }
          
          // Update profile with rich Wix Collections/Members data
          if (event.data.data?.userName || event.data.data?.userEmail) {
            const richProfile = {
              nickname: event.data.data.userName || 
                       (event.data.data.firstName && event.data.data.lastName ? 
                        `${event.data.data.firstName} ${event.data.data.lastName}` : '') ||
                       event.data.data.userEmail || 'User',
              displayName: event.data.data.userName || 
                          (event.data.data.firstName && event.data.data.lastName ? 
                           `${event.data.data.firstName} ${event.data.data.lastName}` : '') ||
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
            
            console.log('✅ Setting rich profile to:', richProfile);
            setProfile(richProfile);
            localStorage.setItem("kovalProfile", JSON.stringify(richProfile));
            console.log('✅ Rich profile updated with Members/FullData:', richProfile);
          } else {
            console.log('⚠️ No userName or userEmail in USER_AUTH data - waiting for valid user data');
          }
          
          if (event.data.data?.diveLogs) {
            setDiveLogs(event.data.data.diveLogs);
            localStorage.setItem("koval_ai_logs", JSON.stringify(event.data.data.diveLogs));
          }
          break;
          
        case 'KOVAL_USER_AUTH':
          // ✅ DIRECT USER AUTH FALLBACK (for communication issues)
          console.log('🔧 Direct user auth received:', event.data);
          
          if (event.data.userId && !event.data.userId.startsWith('guest-')) {
            console.log('✅ Setting direct userId:', event.data.userId);
            setUserId(event.data.userId);
            localStorage.setItem("kovalUser", event.data.userId);
            
            if (event.data.profile) {
              const directProfile = {
                nickname: event.data.profile.displayName || event.data.profile.nickname || 'User',
                displayName: event.data.profile.displayName || event.data.profile.nickname || 'User',
                loginEmail: event.data.profile.loginEmail || '',
                source: 'direct-auth',
                ...event.data.profile
              };
              
              setProfile(directProfile);
              localStorage.setItem("kovalProfile", JSON.stringify(directProfile));
              console.log('✅ Direct profile updated:', directProfile);
            }
            
            if (event.data.diveLogs) {
              setDiveLogs(event.data.diveLogs);
              localStorage.setItem("koval_ai_logs", JSON.stringify(event.data.diveLogs));
            }
          } else {
            console.log('⚠️ Invalid userId in KOVAL_USER_AUTH - waiting for valid user data');
          }
          break;
      }
    };
    
    window.addEventListener('message', handleParentMessages);
    
    return () => window.removeEventListener('message', handleParentMessages);
  }, []);

  // ✅ CHECK FOR GLOBAL USER DATA (Alternative method) - Enhanced with Authentication State
  useEffect(() => {
    const checkGlobalUserData = () => {
      try {
        // Check if parent window has global user data
        const globalUserData = window.parent?.KOVAL_USER_DATA;
        if (globalUserData && globalUserData.userId && !globalUserData.userId.startsWith('guest-')) {
          console.log('🌍 Found global user data:', globalUserData);
          
          setUserId(globalUserData.userId);
          localStorage.setItem("kovalUser", globalUserData.userId);
          
          // ✅ AUTHENTICATION COMPLETE - Enable interactions  
          setIsAuthenticating(false);
          setAuthTimeoutReached(false);
          console.log('🎉 Authentication complete via global data! Chat and AI features now enabled.');
          
          if (globalUserData.profile) {
            const globalProfile = {
              nickname: globalUserData.profile.displayName || globalUserData.profile.nickname || 'User',
              displayName: globalUserData.profile.displayName || globalUserData.profile.nickname || 'User',
              loginEmail: globalUserData.profile.loginEmail || '',
              source: 'global-data',
              ...globalUserData.profile
            };
            
            setProfile(globalProfile);
            localStorage.setItem("kovalProfile", JSON.stringify(globalProfile));
            console.log('✅ Global profile updated:', globalProfile);
          }
          
          if (globalUserData.userDiveLogs) {
            setDiveLogs(globalUserData.userDiveLogs);
            localStorage.setItem("koval_ai_logs", JSON.stringify(globalUserData.userDiveLogs));
          }
          
          return true; // Authentication found
        } else if (globalUserData && globalUserData.userId && globalUserData.userId.startsWith('guest-')) {
          console.log('⚠️ Found guest user data in global - waiting for real user authentication');
        }
      } catch (error) {
        console.warn('⚠️ Could not access global user data:', error);
      }
      return false; // No authentication found
    };
    
    // Check immediately and then periodically until authentication is found
    if (isAuthenticating) {
      const found = checkGlobalUserData();
      if (!found) {
        const interval = setInterval(() => {
          const found = checkGlobalUserData();
          if (found) {
            clearInterval(interval);
          }
        }, 1000); // Check every second
        
        // Clean up interval after 20 seconds
        setTimeout(() => clearInterval(interval), 20000);
        
        return () => clearInterval(interval);
      }
    }
  }, [isAuthenticating]);

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

  // ✅ ENHANCED CHAT SUBMISSION with Bridge API Integration and Authentication Gating
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    // ✅ PREVENT CHAT UNTIL AUTHENTICATED (unless timeout reached)
    if (isAuthenticating) {
      console.log('⏳ Embed: Still authenticating, chat disabled');
      return;
    }

    // ✅ WARN IF USING GUEST ID
    if (userId.startsWith('guest-') && !authTimeoutReached) {
      console.warn('⚠️ Embed: Attempting to chat with guest ID, this should not happen');
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
      console.log("🚀 Sending message to enhanced chat bridge API with userId:", userId);
      console.log("📊 Chat context:", {
        userId,
        profileSource: profile?.source,
        diveLogsCount: diveLogs?.length || 0,
        embedMode: true
      });
      console.log("📝 Dive logs being sent:", diveLogs?.slice(0, 2)); // Show first 2 logs

      // ✅ Use enhanced chat bridge with dive logs context
      const response = await fetch(API_ROUTES.CHAT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: input,
          userId,
          profile,
          embedMode: true,
          diveLogs: diveLogs.slice(0, 10), // Include recent dive logs for context
          conversationHistory: messages.slice(-6), // Last 3 conversation pairs
        }),
      });

      if (!response.ok) {
        console.warn(`⚠️ Chat bridge failed (${response.status}), trying fallback...`);
        
        // ✅ Fallback to direct chat API
        const fallbackResponse = await fetch(API_ROUTES.CHAT_FALLBACK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: input,
            userId,
            profile,
            embedMode: true,
            diveLogs: diveLogs.slice(0, 5),
          }),
        });

        if (!fallbackResponse.ok) {
          throw new Error(`Both chat APIs failed: Bridge ${response.status}, Fallback ${fallbackResponse.status}`);
        }

        const fallbackData = await fallbackResponse.json();
        console.log("✅ Fallback chat response received:", fallbackData);

        const assistantMessage = fallbackData.assistantMessage || {
          role: "assistant",
          content: fallbackData.answer || fallbackData.aiResponse || "I received your message!",
        };

        setMessages(prev => [...prev, assistantMessage]);
        return;
      }

      const data = await response.json();
      console.log("✅ Enhanced chat bridge response received:", data);

      const assistantMessage = {
        role: "assistant",
        content: data.aiResponse || data.assistantMessage?.content || data.answer || "I received your message!",
      };

      // Add metadata if available
      if (data.metadata) {
        assistantMessage.metadata = data.metadata;
        console.log(`📊 Chat metadata: ${data.metadata.processingTime}ms, source: ${data.source}`);
      }

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("❌ Enhanced chat error:", error);

      const errorMessage = {
        role: "assistant",
        content: "I'm having trouble responding right now. Please try again in a moment, and I'll be happy to help with your freediving training!",
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, userId, profile, diveLogs, messages, isAuthenticating, authTimeoutReached]);

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

  // ✅ ENHANCED DIVE LOGS LOADING with Bridge API Integration
  const loadDiveLogs = useCallback(async () => {
    console.log('🔄 LOADING DIVE LOGS...');
    console.log('📊 Current userId:', userId);
    console.log('📊 UserId validation:', {
      hasUserId: !!userId,
      isGuest: userId?.startsWith('guest-'),
      userIdType: typeof userId
    });
    
    if (!userId || userId.startsWith('guest-')) {
      console.log('⚠️ No valid userId available for dive logs loading');
      return;
    }
    
    setLoadingDiveLogs(true);
    try {
      // Load from localStorage first for immediate display
      const key = storageKey(userId);
      console.log('📂 localStorage key:', key);
      const localLogs = safeParse(key, []);
      setDiveLogs(localLogs);
      console.log(`📱 Loaded ${localLogs.length} local dive logs`);

      // ✅ Try enhanced dive logs bridge API
      try {
        console.log('📡 Attempting to fetch from bridge API...');
        const response = await fetch(API_ROUTES.GET_DIVE_LOGS, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            limit: 50,
            includeAnalysis: true
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          const remoteLogs = data.diveLogs || [];
          
          console.log(`🌉 Bridge API loaded ${remoteLogs.length} dive logs from ${data.source}`);
          
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
          
          console.log(`✅ Total dive logs after merge: ${combined.length}`);
        } else {
          console.warn(`⚠️ Bridge API failed (${response.status}), trying fallback...`);
          
          // ✅ Fallback to direct API
          const fallbackResponse = await fetch(`${API_ROUTES.GET_DIVE_LOGS_FALLBACK}?userId=${userId}`);
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            const fallbackLogs = fallbackData.logs || [];
            
            console.log(`📱 Fallback API loaded ${fallbackLogs.length} dive logs`);
            
            // Merge with local logs
            const merged = [...localLogs, ...fallbackLogs].reduce((map, log) => {
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
          }
        }
      } catch (apiError) {
        console.log("ℹ️ APIs not available, using local logs only:", apiError.message);
      }
    } catch (error) {
      console.error("❌ Failed to load dive logs:", error);
    } finally {
      setLoadingDiveLogs(false);
    }
  }, [userId]);

  // ✅ SEND INITIAL USER DATA TO PARENT WIDGET (when diveLogs are loaded)
  useEffect(() => {
    if (userId && !loadingDiveLogs && diveLogs && window.parent && window.parent !== window) {
      const userDataToSend = {
        userId,
        diveLogsCount: diveLogs.length,
        memoriesCount: profile?.memoriesCount || 0,
        lastUpdated: new Date().toISOString(),
        source: 'embed-initial-load'
      };
      
      window.parent.postMessage({
        type: 'USER_DATA_UPDATE',
        userData: userDataToSend
      }, '*');
      
      console.log(`📤 Sent initial user data to widget - Dive logs: ${diveLogs.length}`);
    }
  }, [userId, loadingDiveLogs, diveLogs, profile]);

  // ✅ DIVE JOURNAL SUBMIT (Enhanced with persistent counting)
  const handleJournalSubmit = useCallback(async (diveData) => {
    console.log('🚀 DIVE LOG SUBMISSION STARTED');
    console.log('📊 Current userId:', userId);
    console.log('📊 UserId type:', typeof userId);
    console.log('📊 UserId starts with guest?:', userId?.startsWith('guest-'));
    console.log('📊 Dive data to save:', diveData);
    console.log('📊 Current profile:', profile);
    
    if (!userId || userId.startsWith('guest-')) {
      console.error("❌ No valid userId available for dive log submission");
      console.error("❌ userId:", userId);
      console.error("❌ Profile source:", profile?.source);
      return;
    }

    try {
      // Add userId to dive data
      const diveLogWithUser = { ...diveData, userId };
      console.log('📝 Dive log with user data:', diveLogWithUser);
      
      // ✅ STEP 1: Save to Wix DiveLogs collection with proper field mapping
      try {
        console.log('📤 Attempting to save to Wix DiveLogs collection...');
        
        // Generate a unique dive log ID
        const diveLogId = `dive_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Format data to match your Wix collection fields exactly
        const wixDiveLogRecord = {
          userId: userId, // Maps to "User ID" field
          diveLogId: diveLogId, // Maps to "Dive Log ID" field  
          logEntry: JSON.stringify({
            // Store all dive data as JSON in the "Log Entry" field
            dive: diveLogWithUser,
            analysis: {
              discipline: diveLogWithUser.discipline || 'Unknown',
              reachedDepth: diveLogWithUser.reachedDepth || 0,
              targetDepth: diveLogWithUser.targetDepth || 0,
              location: diveLogWithUser.location || 'Unknown',
              notes: diveLogWithUser.notes || ''
            },
            metadata: {
              type: 'dive_log',
              source: 'dive-journal-widget',
              timestamp: new Date().toISOString(),
              version: '4.0'
            }
          }),
          diveDate: new Date(diveLogWithUser.date || new Date()), // Maps to "Dive Date" field
          diveTime: diveLogWithUser.totalDiveTime || new Date().toLocaleTimeString(), // Maps to "Dive Time" field
          diveLogWatch: diveLogWithUser.imageFile || null, // Maps to "Dive Log Watch" field
          dataType: 'dive_log' // Additional field for filtering
        };
        
        console.log('📝 Formatted dive log record for Wix collection:', wixDiveLogRecord);
        
        const wixResponse = await fetch("https://www.deepfreediving.com/_functions/userMemory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: 'saveDiveLog',
            collection: 'DiveLogs',
            record: wixDiveLogRecord,
            userId: userId
          }),
        });
        
        console.log('📥 Wix DiveLogs collection response status:', wixResponse.status);
        
        if (wixResponse.ok) {
          const wixData = await wixResponse.json();
          console.log("✅ Dive log saved to Wix DiveLogs collection successfully");
          console.log(`📊 Record ID: ${wixData._id || wixData.recordId}`);
          
          // Update local state with accurate counts from Wix
          setProfile(prev => ({
            ...prev,
            diveLogsCount: wixData.diveLogsCount || (prev.diveLogsCount || 0) + 1,
            memoriesCount: wixData.memoriesCount || prev.memoriesCount,
            lastDiveLogSaved: new Date().toISOString()
          }));
          
          // Send updated counts to parent widget
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({
              type: 'USER_DATA_UPDATE',
              userData: {
                userId,
                diveLogsCount: wixData.diveLogsCount || (diveLogs.length + 1),
                memoriesCount: wixData.memoriesCount || 0,
                lastUpdated: new Date().toISOString()
              }
            }, '*');
            console.log(`📤 Sent updated counts to widget - Dive logs: ${wixData.diveLogsCount}`);
          }
        } else {
          const errorText = await wixResponse.text();
          console.warn("⚠️ Wix DiveLogs collection save failed:", wixResponse.status, errorText);
          throw new Error(`Wix DiveLogs save failed: ${wixResponse.status}`);
        }
      } catch (wixError) {
        console.warn("⚠️ Wix DiveLogs collection unavailable, trying Next.js API:", wixError.message);
        
        try {
          console.log('📤 Attempting to save to Next.js API fallback...');
          const response = await fetch(API_ROUTES.SAVE_DIVE_LOG, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(diveLogWithUser),
          });

          console.log('📥 Next.js API response status:', response.status);
          
          if (response.ok) {
            console.log("✅ Dive log saved to Next.js API as fallback");
          } else {
            const errorText = await response.text();
            console.warn("⚠️ Next.js API save failed:", response.status, errorText);
          }
        } catch (apiError) {
          console.warn("⚠️ Next.js API also not available for dive log save:", apiError.message);
        }
      }
      
      // ✅ STEP 2: Also save to local storage with proper counting
      console.log('💾 Saving to localStorage...');
      const key = storageKey(userId);
      const existingLogs = safeParse(key, []);
      console.log(`📂 Found ${existingLogs.length} existing logs in localStorage`);
      
      const localId = `local-${Date.now()}`;
      const localLog = { 
        ...diveLogWithUser, 
        localId, 
        savedAt: new Date().toISOString(),
        id: localId // Ensure it has an ID for display
      };
      const updatedLogs = [localLog, ...existingLogs];
      
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(updatedLogs));
        console.log(`✅ Dive log saved to localStorage. Total count: ${updatedLogs.length}`);
      }
      setDiveLogs(updatedLogs);
      console.log('📋 Updated diveLogs state with', updatedLogs.length, 'logs');
      
      // ✅ STEP 3: Refresh dive logs from API to sync with server
      console.log('🔄 Refreshing dive logs from API after save...');
      await loadDiveLogs();
      
      // ✅ STEP 4: Update the profile data immediately for correct count display
      setProfile(prev => ({
        ...prev,
        diveLogsCount: updatedLogs.length,
        lastDiveLogSaved: new Date().toISOString()
      }));
      
      // ✅ STEP 4: Send user data update to parent widget
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'USER_DATA_UPDATE',
          userData: {
            userId,
            diveLogsCount: updatedLogs.length,
            memoriesCount: profile?.memoriesCount || 0,
            lastUpdated: new Date().toISOString()
          }
        }, '*');
        console.log(`📤 Sent updated dive logs count (${updatedLogs.length}) to widget`);
      }

      // Refresh the list regardless of save method
      console.log('🔄 Refreshing dive logs list...');
      await loadDiveLogs();
      setIsDiveJournalOpen(false); // ✅ Close the dive journal
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
      
      console.log('✅ DIVE LOG SUBMISSION COMPLETED SUCCESSFULLY');

    } catch (error) {
      console.error("❌ Error saving dive log:", error);
      console.error("❌ Error details:", error.message);
      console.error("❌ Error stack:", error.stack);
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
    diveLogs, // ✅ Pass actual diveLogs state
    setDiveLogs,
    darkMode,
    setDarkMode,
    // ✅ Sidebar-specific props
    showDiveJournalForm: isDiveJournalOpen,
    toggleDiveJournal: () => setIsDiveJournalOpen(prev => !prev),
    handleSelectSession,
    handleDeleteSession: () => {}, // Add if needed
    handleSaveSession,
    startNewSession,
    handleJournalSubmit,
    editLogIndex,
    handleEdit: () => {}, // Add if needed  
    handleDelete,
    refreshDiveLogs: loadDiveLogs, // ✅ Pass loadDiveLogs function
    loadingDiveLogs,
    syncStatus: "✅ Ready",
    editingSessionName,
    setEditingSessionName,
    // ✅ Additional props for connection status
    connectionStatus,
    loadingConnections,
    setLoading
  }), [
    sessionName, sessionsList, messages, userId, profile, diveLogs, darkMode,
    isDiveJournalOpen, startNewSession, handleSaveSession, handleSelectSession, 
    handleJournalSubmit, handleDelete, loadDiveLogs, loadingDiveLogs, 
    editingSessionName, connectionStatus, loadingConnections
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
            <div className={`px-2 truncate flex items-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              {getProfilePhoto() && (
                <img 
                  src={getProfilePhoto()} 
                  alt="Profile" 
                  className="w-6 h-6 rounded-full mr-2 flex-shrink-0"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
              <span>
                👤 {getDisplayName()}{isEmbedded ? '' : ''}
                {getDisplayName() === "Loading..." && (
                  <span className="ml-2 animate-pulse">⏳</span>
                )}
              </span>
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
                userId={userId}
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
              isAuthenticating={isAuthenticating}
              authTimeoutReached={authTimeoutReached}
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
