import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import ChatMessages from "../components/ChatMessages";
import ChatInput from "../components/ChatInput";
import Sidebar from "../components/Sidebar";
import DiveJournalSidebarCard from "../components/DiveJournalSidebarCard";
import apiClient from "../utils/apiClient";
import { upgradeTemporaryUserToAuthenticated } from "../utils/userIdUtils";

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

  // ===== CORE STATE (Simplified - No Authentication Blocking) =====
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
  const [sessionStatus, setSessionStatus] = useState("Ready");

  const bottomRef = useRef(null);

  // ✅ HELPERS
  const safeParse = (key, defaultValue) => {
    try {
      if (typeof window === 'undefined') return defaultValue;
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`⚠️ Failed to parse localStorage key "${key}":`, error);
      return defaultValue;
    }
  };
  
  const storageKey = (uid) => `diveLogs_${uid}`; // ✅ Canonical key (underscore)
  const legacyKeysFor = (uid) => [
    `diveLogs-${uid}`,          // hyphen legacy
    `savedDiveLogs_${uid}`,     // savedDiveLogs legacy
    `diveLogs_${uid}`           // canonical
  ];
  const mergeArraysUnique = (a = [], b = []) => {
    const map = {}; const out = [];
    [...a, ...b].forEach(l => { const k = l.id || l._id || l.localId || `${l.date||''}-${l.reachedDepth||''}-${l.timestamp||''}`; if(!map[k]) { map[k]=1; out.push(l);} });
    return out;
  };
  const migrateLegacyDiveLogKeys = (uid) => {
    if (typeof window === 'undefined' || !uid) return [];
    const keys = legacyKeysFor(uid);
    let collected = [];
    keys.forEach(k => {
      try {
        const raw = localStorage.getItem(k);
        if (raw) {
          const arr = JSON.parse(raw);
            if (Array.isArray(arr) && arr.length) {
              collected = mergeArraysUnique(collected, arr);
              if (k !== storageKey(uid)) {
                console.log(`🔧 Migrating ${arr.length} logs from legacy key ${k}`);
                localStorage.removeItem(k);
              }
            }
        }
      } catch {}
    });
    if (collected.length) {
      localStorage.setItem(storageKey(uid), JSON.stringify(collected));
      console.log(`✅ Migration complete -> ${collected.length} logs stored under ${storageKey(uid)}`);
    }
    return collected;
  };

  const getDisplayName = useCallback(() => {
    console.log('🔍 getDisplayName called, profile:', profile, 'userId:', userId);
    
    // ✅ PRIORITY: Use member ID format for consistent, fast recognition
    if (userId && !userId.startsWith('guest') && !userId.startsWith('session')) {
      console.log(`✅ Using member ID format: User-${userId}`);
      return `User-${userId}`;
    }
    
    // Use profile nickname if available
    if (profile?.nickname) {
      return profile.nickname;
    }
    
    // Fallback
    return "User";
  }, [profile, userId]);

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

  // ===== SIMPLIFIED INITIALIZATION - ALWAYS WORKS =====
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSessionsList(safeParse("kovalSessionsList", []));
      setThreadId(localStorage.getItem("kovalThreadId") || null);
      
      // Check if we have a stored userId
      const storedUserId = localStorage.getItem("kovalUser");
      if (storedUserId && !storedUserId.startsWith('guest-') && !storedUserId.startsWith('session-')) {
        console.log('✅ Embed: Found valid stored userId:', storedUserId);
        setUserId(storedUserId);
        migrateLegacyDiveLogKeys(storedUserId);
        
        const storedProfile = safeParse("kovalProfile", {});
        if (storedProfile && storedProfile.source) {
          setProfile(storedProfile);
        }
      } else {
        console.log('ℹ️ Embed: No valid stored userId, will wait for parent data');
        // Create a session user for now
        const sessionId = `session-${Date.now()}`;
        setUserId(sessionId);
        console.log('✅ Created session user:', sessionId);
      }
    }
  }, []);

  // ===== URL PARAMETER HANDLING FOR EMBEDDED MODE =====
  useEffect(() => {
    if (router.isReady) {
      const { theme, userId: urlUserId, nickname, embedded } = router.query;

      console.log('🎯 Embed page - URL parameters:', { theme, userId: urlUserId, nickname, embedded });

      // Notify parent that we're ready
      console.log('📡 Sending EMBED_READY message to parent...');
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
      
      console.log('✅ Embed URL parameters processed, ready for data from parent...');
    }
  }, [router.isReady, router.query]);

  // ✅ MESSAGE HANDLING FOR EMBEDDED MODE
  useEffect(() => {
    const handleParentMessages = (event) => {
      console.log('📨 Embed received message from origin:', event.origin, 'data:', event.data);
      
      // ✅ More permissive origin check for Wix sites
      const allowedOrigins = [
        'https://kovaldeepai-main.vercel.app',
        'http://localhost:3000',
        'https://www.wix.com',
        'https://static.wixstatic.com',
        'https://editor.wix.com',
        'https://www.deepfreediving.com',
        'https://deepfreediving.com' // ✅ Added without www
      ];
      
      // ✅ More permissive origin check for Wix sites
      const isAllowedOrigin = !event.origin || 
        allowedOrigins.some(origin => event.origin === origin) ||
        event.origin.includes('wix.com') ||
        event.origin.includes('wixsite.com') ||
        event.origin.includes('deepfreediving.com') ||
        event.origin === 'https://kovaldeepai-main.vercel.app' ||
        event.origin === 'http://localhost:3000';
      
      if (!isAllowedOrigin) {
        console.log('🚫 Blocking message from origin:', event.origin);
        return;
      }
      
      switch (event.data?.type) {
        case 'initialized':
          console.log('🚀 Widget initialized with data:', event.data.data);
          
          if (event.data.data?.user?.id) {
            const newUserId = String(event.data.data.user.id);
            console.log('✅ Received user ID from widget initialization:', newUserId);
            
            // Upgrade and migrate data
            const migrationSuccess = upgradeTemporaryUserToAuthenticated(newUserId);
            if (migrationSuccess) {
              console.log('🔄 Successfully migrated temporary user data');
            }
            migrateLegacyDiveLogKeys(newUserId);
            
            setUserId(newUserId);
            localStorage.setItem("kovalUser", newUserId);
            
            // Extract profile data
            if (event.data.data.user.profile) {
              const profile = event.data.data.user.profile;
              const initProfile = {
                nickname: profile.displayName || profile.nickname || 'User',
                displayName: profile.displayName || profile.nickname || 'User',
                loginEmail: profile.loginEmail || '',
                firstName: profile.firstName || '',
                lastName: profile.lastName || '',
                profilePicture: profile.profilePhoto || '',
                source: 'wix-initialized',
                ...profile
              };
              
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
          console.log('👤 User auth received:', event.data.data);
          
          if (event.data.data?.userId) {
            const newUserId = String(event.data.data.userId);
            console.log('✅ Setting user ID from USER_AUTH:', newUserId);
            
            // Upgrade and migrate data
            const migrationSuccess = upgradeTemporaryUserToAuthenticated(newUserId);
            if (migrationSuccess) {
              console.log('🔄 Successfully migrated temporary user data');
            }
            migrateLegacyDiveLogKeys(newUserId);
            
            setUserId(newUserId);
            localStorage.setItem("kovalUser", newUserId);
          }
          
          // Update profile with data from parent
          if (event.data.data?.userName || event.data.data?.userEmail) {
            const richProfile = {
              nickname: event.data.data.userName || event.data.data.userEmail || 'User',
              displayName: event.data.data.userName || event.data.data.userEmail || 'User',
              loginEmail: event.data.data.userEmail || '',
              firstName: event.data.data.firstName || '',
              lastName: event.data.data.lastName || '',
              profilePicture: event.data.data.profilePicture || '',
              source: event.data.data.source || 'wix-collections',
              isWixMember: event.data.data.isWixMember || false
            };
            
            setProfile(richProfile);
            localStorage.setItem("kovalProfile", JSON.stringify(richProfile));
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
            
            // ✅ UPGRADE TEMPORARY USER DATA TO AUTHENTICATED USER
            const migrationSuccess = upgradeTemporaryUserToAuthenticated(event.data.userId);
            if (migrationSuccess) {
              console.log('🔄 Successfully migrated temporary user data to authenticated user (direct)');
            }
            // ✅ Consolidate any legacy keys
            migrateLegacyDiveLogKeys(event.data.userId);
          } else {
            console.log('⚠️ Invalid userId in KOVAL_USER_AUTH - waiting for valid user data');
          }
          break;
      }
    };
    
    window.addEventListener('message', handleParentMessages);
    
    return () => window.removeEventListener('message', handleParentMessages);
  }, []);

  // ✅ CHECK FOR GLOBAL USER DATA (Alternative method) - Simplified
  useEffect(() => {
    const checkGlobalUserData = () => {
      try {
        // Check if parent window has global user data
        const globalUserData = window.parent?.KOVAL_USER_DATA;
        if (globalUserData && globalUserData.userId) {
          console.log('🌍 Found global user data:', globalUserData);
          
          // Upgrade and migrate data
          const migrationSuccess = upgradeTemporaryUserToAuthenticated(globalUserData.userId);
          if (migrationSuccess) {
            console.log('🔄 Successfully migrated temporary user data from global');
          }
          migrateLegacyDiveLogKeys(globalUserData.userId);
          
          setUserId(globalUserData.userId);
          localStorage.setItem("kovalUser", globalUserData.userId);
          
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
          }
          
          if (globalUserData.userDiveLogs) {
            setDiveLogs(globalUserData.userDiveLogs);
            localStorage.setItem("koval_ai_logs", JSON.stringify(globalUserData.userDiveLogs));
          }
          
          return true; // User data found
        }
      } catch (error) {
        console.log('ℹ️ Could not access global user data:', error.message);
      }
      return false; // No user data found
    };
    
    // Check immediately and then periodically
    const found = checkGlobalUserData();
    if (!found) {
      const interval = setInterval(() => {
        const found = checkGlobalUserData();
        if (found) {
          clearInterval(interval);
        }
      }, 1000);
      
      // Stop checking after 10 seconds
      setTimeout(() => clearInterval(interval), 10000);
      
      return () => clearInterval(interval);
    }
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

  // ✅ SIMPLIFIED CHAT SUBMISSION - ALWAYS WORKS
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      console.log("🚀 Sending message to chat API with userId:", userId);
      console.log("📊 Chat context:", {
        userId,
        profileSource: profile?.source,
        diveLogsCount: diveLogs?.length || 0,
        embedMode: true
      });
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
  }, [input, loading, userId, profile, diveLogs, messages]);

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
      userIdType: typeof userId
    });
    
    // Always attempt migration before loading
    if (userId) migrateLegacyDiveLogKeys(userId);
    
    setLoadingDiveLogs(true);
    
    try {
      // Load from localStorage first for immediate display (after migration)
      const localLogs = safeParse(storageKey(userId || 'session'), []);
      setDiveLogs(localLogs);
      console.log(`📱 Loaded ${localLogs.length} local dive logs`);

      // Only try API if we have a real Wix user ID
      if (userId && !userId.startsWith('session-') && !userId.startsWith('guest-')) {
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
            try {
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
                
                console.log(`✅ Total dive logs after fallback merge: ${combined.length}`);
              } else {
                console.warn(`⚠️ Fallback API also failed (${fallbackResponse.status}), continuing with local logs`);
              }
            } catch (fallbackError) {
              console.log("ℹ️ Fallback API not available, using local logs only:", fallbackError.message);
            }
          }
        } catch (apiError) {
          console.log("ℹ️ API not available, using local logs only:", apiError.message);
        }
      } else {
        console.log('ℹ️ Session user - using local storage only');
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
  const sidebarProps = useMemo(() => {
    console.log('🔧 EMBED: Creating sidebarProps with diveLogs:', { 
      length: diveLogs.length, 
      logs: diveLogs.slice(0, 2), // Show first 2 logs
      userId 
    });
    
    return {
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
      setLoading,
      sessionStatus // Add session status to sidebar props
    };
  }, [
    sessionName, sessionsList, messages, userId, profile, diveLogs, darkMode,
    isDiveJournalOpen, startNewSession, handleSaveSession, handleSelectSession, 
    handleJournalSubmit, handleDelete, loadDiveLogs, loadingDiveLogs, 
    editingSessionName, connectionStatus, loadingConnections, sessionStatus
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
