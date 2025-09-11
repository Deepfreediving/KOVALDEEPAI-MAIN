import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import ChatMessages from "@/components/ChatMessages";
import ChatInput from "@/components/ChatInput";
import Sidebar from "@/components/Sidebar";
import DiveJournalDisplay from "@/components/DiveJournalDisplay";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/src/providers/AuthProvider";

const API_ROUTES = {
  CREATE_THREAD: "/api/openai/create-thread",
  // ✅ Use working OpenAI chat endpoint instead of timeout-prone general endpoint
  CHAT: "/api/openai/chat",
  CHAT_FALLBACK: "/api/openai/chat",
  GET_DIVE_LOGS: "/api/supabase/dive-logs",
  GET_DIVE_LOGS_FALLBACK: "/api/supabase/dive-logs",
  GET_USER_PROFILE: "/api/supabase/user-profile",
  SAVE_DIVE_LOG: "/api/supabase/save-dive-log",
  DELETE_DIVE_LOG: "/api/supabase/delete-dive-log",
  UPLOAD_DIVE_IMAGE: "/api/dive/upload-image",
  READ_MEMORY: "/api/analyze/read-memory",
  QUERY_DATA: "/api/supabase/query-data",
  HEALTH_CHECK: "/api/system/health-check",
};

export default function Index() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const BOT_NAME = "Koval AI";
  const defaultSessionName = `Session – ${new Date().toLocaleDateString("en-US")}`;

  // ✅ SSG GUARD: Prevent router access during SSG
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  // ✅ DEVELOPMENT MODE: Skip auth redirect for local testing
  useEffect(() => {
    if (!authLoading && !user && isClient && router?.isReady) {
      console.log("⚠️ No authenticated user - continuing in development mode");
      // Only redirect to login in production
      if (process.env.NODE_ENV === 'production') {
        console.log("❌ No authenticated user, redirecting to login");
        router.push('/auth/login');
      }
    }
  }, [authLoading, user, isClient, router]);

  // ✅ INITIAL DATA: Use authenticated user data or fallback for development
  const initialData = useMemo(() => {
    if (user) {
      return {
        userId: user.id,
        profile: {
          userId: user.id,
          firstName: user.user_metadata?.full_name?.split(' ')[0] || 'User',
          lastName: user.user_metadata?.full_name?.split(' ')[1] || '',
          nickname: user.user_metadata?.full_name || user.email?.split('@')[0],
          email: user.email,
          source: 'supabase'
        }
      };
    }
    // Development fallback when no auth
    if (process.env.NODE_ENV === 'development') {
      return {
        userId: '35b522f1-27d2-49de-ed2b-0d257d33ad7d', // Test user ID
        profile: {
          userId: '35b522f1-27d2-49de-ed2b-0d257d33ad7d',
          firstName: 'Test',
          lastName: 'User',
          nickname: 'Test User',
          email: 'test@kovaldeepai.dev',
          source: 'development'
        }
      };
    }
    return { userId: "", profile: {} };
  }, [user]);
  
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
  const [userId, setUserId] = useState(initialData.userId);
  const [profile, setProfile] = useState(initialData.profile);
  const [diveLogs, setDiveLogs] = useState([]);
  const [loadingDiveLogs, setLoadingDiveLogs] = useState(false);
  const [diveJournalOpen, setDiveJournalOpen] = useState(false);

  // ✅ ALL REFS MUST BE AT THE TOP
  const bottomRef = useRef(null);

  // ✅ ALL USECALLBACKS AND USEMEMOS MUST BE AT THE TOP
  const safeParse = useCallback((key, fallback) => {
    try {
      return typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem(key)) || fallback
        : fallback;
    } catch {
      return fallback;
    }
  }, []);

  const getDisplayName = useCallback(() => {
    // ✅ Use actual user data if available
    if (user) {
      return user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
    }

    // ✅ Fallback to profile data
    return profile?.firstName || profile?.nickname || "User";
  }, [profile, user]);

  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      if (isClient && router) {
        router.push('/auth/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [router, isClient]);

  // ✅ Update user data when authenticated user changes or use development fallback
  useEffect(() => {
    if (user) {
      const userData = {
        userId: user.id,
        firstName: user.user_metadata?.full_name?.split(' ')[0] || 'User',
        lastName: user.user_metadata?.full_name?.split(' ')[1] || '',
        nickname: user.user_metadata?.full_name || user.email?.split('@')[0],
        email: user.email,
        source: 'supabase'
      };
      console.log("✅ Setting authenticated user data:", userData);
      setUserId(user.id);
      setProfile(userData);
    } else if (process.env.NODE_ENV === 'development' && !user) {
      // Development fallback
      const devUserData = {
        userId: '35b522f1-27d2-49de-ed2b-0d257d33ad7d',
        firstName: 'Test',
        lastName: 'User', 
        nickname: 'Test User',
        email: 'test@kovaldeepai.dev',
        source: 'development'
      };
      console.log("🧪 Setting development user data:", devUserData);
      setUserId('35b522f1-27d2-49de-ed2b-0d257d33ad7d');
      setProfile(devUserData);
    }
  }, [user]);

  // ✅ INITIALIZE SESSIONS LIST FROM STORAGE
  useEffect(() => {
    if (typeof window !== "undefined" && isClient && router?.isReady) {
      setSessionsList(safeParse("kovalSessionsList", []));
    }
  }, [router?.isReady, safeParse, isClient]);

  // ✅ URL PARAMETER HANDLING FOR EMBEDDED MODE AND THEME
  useEffect(() => {
    if (router?.isReady && isClient) {
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
  }, [router.isReady, router.query, isClient]);

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

  // 🚀 Load dive logs from API
  const loadDiveLogs = useCallback(async () => {
    if (!userId) {
      console.warn("⚠️ No user ID for loading dive logs");
      return;
    }

    setLoadingDiveLogs(true);
    try {
      const response = await fetch(`/api/dive/batch-logs?userId=${userId}&limit=100&sortBy=date&sortOrder=desc`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log(`✅ Loaded ${result.diveLogs.length} dive logs`);
          setDiveLogs(result.diveLogs);
        } else {
          console.error("❌ Failed to load dive logs:", result.error);
          setDiveLogs([]);
        }
      } else {
        console.error("❌ API error loading dive logs:", response.status);
        setDiveLogs([]);
      }
    } catch (error) {
      console.error("❌ Error loading dive logs:", error);
      setDiveLogs([]);
    } finally {
      setLoadingDiveLogs(false);
    }
  }, [userId]);

  // 🚀 Handle dive log deleted
  const handleDiveLogDeleted = useCallback(() => {
    console.log("🗑️ Dive log deleted, refreshing list");
    loadDiveLogs(); // Refresh the list
    setMessages(prev => [
      ...prev,
      { role: "assistant", content: "🗑️ **Dive Log Deleted**\n\nThe dive log has been removed." }
    ]);
  }, [loadDiveLogs, setMessages]);

  // 🚀 Load dive logs when user changes
  useEffect(() => {
    if (userId && user) {
      loadDiveLogs();
    }
  }, [userId, user, loadDiveLogs]);

  // ✅ PRODUCTION CHAT SUBMISSION 
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!input.trim() || loading) return;

      // ✅ Ensure user is authenticated
      if (!userId || !user) {
        console.warn("⚠️ No authenticated user found");
        const errorMessage = {
          role: "assistant",
          content: "Please log in to continue chatting.",
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
          // Do NOT include dive logs by default; only send when explicitly requested
        };

        // ✅ Only request dive analysis when the user explicitly asks
        try {
          const analysisRequested = /\b(analyz\w*|audit|journal|dive\s*log|dive\s*journal|evaluate|evaluation)\b/i.test(input);
          if (analysisRequested) {
            messageData.analysisRequested = true;
            console.log("📊 User explicitly requested dive analysis – flag set");
          }
        } catch (e) {
          // no-op
        }

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

        // ✅ Get the user's session token for authentication
        let authHeaders = { "Content-Type": "application/json" };
        
        if (user) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
              authHeaders.Authorization = `Bearer ${session.access_token}`;
              console.log("🔐 Including auth token in request");
            }
          } catch (error) {
            console.warn("⚠️ Could not get session token:", error);
          }
        }

        // ✅ Use OpenAI chat API directly with correct format
        const response = await fetch(API_ROUTES.CHAT, {
          method: "POST",
          headers: authHeaders,
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
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, I'm having trouble responding right now. Please try again.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, userId, user, profile, diveLogs, files, setMessages, setInput, setFiles],
  );

  // ✅ Handle key down events
  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [handleSubmit]);

  // ✅ Handle file changes
  const handleFileChange = useCallback((e) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(selectedFiles);
  }, [setFiles]);

  // 🚀 Handle dive log form submission
  const handleDiveLogSubmit = useCallback(async (diveLogData, isEditMode = false, editingLog = null) => {
    // Allow in development mode even without auth
    if (!userId || (!user && process.env.NODE_ENV !== 'development')) {
      console.warn("⚠️ No authenticated user found for dive log submission");
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "❌ **Authentication Required**\n\nPlease log in to save dive logs." }
      ]);
      return { success: false, error: "Authentication required" };
    }

    console.log("🚀 Index: Processing dive log submission", { isEditMode, userId });

    try {
      // 🔐 Build auth headers with Supabase session token if available
      let authHeaders = { "Content-Type": "application/json" };
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          authHeaders.Authorization = `Bearer ${session.access_token}`;
          console.log("🔐 Including auth token in save request");
        }
      } catch (tokenErr) {
        console.warn("⚠️ Could not get session token for save:", tokenErr);
      }

      // 📸 Handle image upload logic - check for temporary data first
      let imagePayload = {};
      
      // If we have temporary image data from the analysis, use it instead of re-uploading
      if (diveLogData._tempImageData) {
        console.log("📸 Using previously analyzed image data");
        imagePayload = diveLogData._tempImageData;
        
        // Update the image record to associate with the real user
        try {
          const updateResp = await fetch("/api/dive/update-image-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageId: imagePayload.imageId,
              userId: userId
            }),
          });
          if (!updateResp.ok) {
            console.warn("⚠️ Could not update image user association, proceeding anyway");
          }
        } catch (updateErr) {
          console.warn("⚠️ Image user update failed:", updateErr);
        }
      } else if (diveLogData.imageFile) {
        // Only upload if no temporary data exists
        try {
          console.log("📤 Uploading dive image before save...");
          const formData = new FormData();
          formData.append("image", diveLogData.imageFile);
          formData.append("userId", userId);
          // Do NOT set Content-Type for FormData; browser will set proper boundary
          const uploadResp = await fetch("/api/dive/upload-image", {
            method: "POST",
            headers: { "x-user-id": userId },
            body: formData,
          });
          if (!uploadResp.ok) {
            const errData = await uploadResp.json().catch(() => ({}));
            throw new Error(errData.error || `Image upload failed (${uploadResp.status})`);
          }
          const uploadJson = await uploadResp.json();
          imagePayload = {
            imageId: uploadJson?.data?.imageId,
            imageUrl: uploadJson?.data?.imageUrl,
            extractedMetrics: uploadJson?.data?.extractedMetrics,
            imageAnalysis: uploadJson?.data?.profileAnalysis,
          };
          console.log("✅ Image uploaded:", imagePayload);
        } catch (imgErr) {
          console.error("❌ Image upload error:", imgErr);
          setMessages(prev => [
            ...prev,
            { role: "assistant", content: `⚠️ Image upload skipped: ${imgErr.message}` }
          ]);
        }
      }

      // 📝 Prepare payload
      const payload = {
        ...diveLogData,
        ...imagePayload,
        user_id: userId,
      };

      // 🔄 Choose method: update or create
      const method = isEditMode && (editingLog?.id || diveLogData.id) ? "PUT" : "POST";
      if (method === "PUT") {
        payload.id = editingLog?.id || diveLogData.id;
      }

      const saveResp = await fetch("/api/supabase/save-dive-log", {
        method,
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      const saveJson = await saveResp.json().catch(() => ({}));
      if (!saveResp.ok || saveJson.success === false) {
        throw new Error(saveJson.error || saveJson.details || `Save failed (${saveResp.status})`);
      }

      // ✅ Refresh list and notify
      await loadDiveLogs();
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: isEditMode ? "✅ **Dive Log Updated**\n\nYour changes have been saved." : "✅ **Dive Log Saved**\n\nYour dive log has been saved successfully!" }
      ]);

      // ✅ NEW: Auto-trigger AI analysis after save and close the journal UI
      if (method === "POST") {
        try {
          // Close the journal UI for confirmation
          setDiveJournalOpen(false);

          // Non-blocking status message
          setMessages(prev => [
            ...prev,
            { role: "assistant", content: "🧠 Analyzing your new dive log... I'll post insights shortly." }
          ]);

          // Fire-and-forget analysis call (await for feedback but isolate errors)
          const analysisResp = await fetch("/api/analyze/dive-log-openai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              adminUserId: userId,
              diveLogData: payload,
            }),
          });

          if (analysisResp.ok) {
            const analysisJson = await analysisResp.json();
            setMessages(prev => [
              ...prev,
              {
                role: "assistant",
                content: analysisJson?.analysis
                  ? `🤖 **AI Analysis Complete**\n\n${analysisJson.analysis}`
                  : "🤖 AI analysis complete. Review has been saved to your log.",
              },
            ]);
          } else {
            const err = await analysisResp.json().catch(() => ({}));
            setMessages(prev => [
              ...prev,
              { role: "assistant", content: `⚠️ AI analysis failed to run: ${err.error || analysisResp.status}` }
            ]);
          }
        } catch (analysisErr) {
          console.warn("⚠️ Auto-analysis error:", analysisErr);
          setMessages(prev => [
            ...prev,
            { role: "assistant", content: "⚠️ Couldn't run AI analysis automatically. You can analyze this log later from the journal." }
          ]);
        }
      }

      return { success: true, diveLog: saveJson.diveLog };
    } catch (error) {
      console.error("❌ Dive log submission error:", error);
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: `❌ **Save Failed**\n\n${error.message}` }
      ]);
      return { success: false, error: error.message };
    }
  }, [userId, user, setMessages, loadDiveLogs]);

  // 🚀 BATCH ANALYSIS STATE AND FUNCTIONS
  const [batchAnalysis, setBatchAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisType, setAnalysisType] = useState("pattern");
  const [timeRange, setTimeRange] = useState("all");
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [analyzingLogId, setAnalyzingLogId] = useState(null);
  
  // Advanced filtering state
  const [filters, setFilters] = useState({
    discipline: "",
    location: "",
    dateFrom: "",
    dateTo: "",
    hasIssues: ""
  });

  // 🚀 Handle batch analysis
  const handleBatchAnalysis = useCallback(async () => {
    if (!userId || diveLogs.length === 0) return;
    
    setIsAnalyzing(true);
    try {
      console.log("🧠 Starting batch analysis...");
      const response = await fetch('/api/dive/analyze-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          analysisType,
          timeRange,
          diveLogs: diveLogs.slice(0, 20) // Limit for API payload
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const newAnalysis = {
            type: analysisType,
            timeRange,
            logsAnalyzed: result.logsAnalyzed || diveLogs.length,
            result: result.analysis,
            createdAt: new Date().toISOString()
          };
          
          setBatchAnalysis(newAnalysis);
          setAnalysisHistory(prev => [newAnalysis, ...prev.slice(0, 9)]); // Keep last 10
          
          setMessages(prev => [
            ...prev,
            { 
              role: "assistant", 
              content: `🧠 **Batch Analysis Complete**\n\n${result.analysis}` 
            }
          ]);
        } else {
          throw new Error(result.error || 'Analysis failed');
        }
      } else {
        throw new Error(`API error: ${response.status}`);
      }
    } catch (error) {
      console.error("❌ Batch analysis error:", error);
      setMessages(prev => [
        ...prev,
        { 
          role: "assistant", 
          content: "❌ Batch analysis failed. Please try again." 
        }
      ]);
    } finally {
      setIsAnalyzing(false);
    }
  }, [userId, diveLogs, analysisType, timeRange, setMessages]);

  // 🚀 Handle individual dive log analysis
  const handleAnalyzeDiveLog = useCallback(async (log) => {
    if (!userId) return;
    
    setAnalyzingLogId(log.id);
    try {
      const analysisResponse = await fetch("/api/openai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Analyze this dive log and provide coaching insights: ${JSON.stringify(log)}`,
          userId,
          profile,
          embedMode: false,
        }),
      });

      if (analysisResponse.ok) {
        const analysisData = await analysisResponse.json();
        const analysis = analysisData.assistantMessage?.content || analysisData.answer || "Analysis completed.";
        
        setMessages(prev => [
          ...prev,
          {
            role: "assistant",
            content: `🤖 **Dive Analysis Results**\n\n${analysis}`,
          },
        ]);
      } else {
        throw new Error(`Analysis failed: ${analysisResponse.status}`);
      }
    } catch (error) {
      console.error("❌ Dive analysis error:", error);
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: "❌ Analysis failed. Please try again.",
        },
      ]);
    } finally {
      setAnalyzingLogId(null);
    }
  }, [userId, profile, setMessages]);

  // 🚀 Handle dive log deletion
  const handleDeleteDiveLog = useCallback(async (logToDelete) => {
    if (!userId) return;
    
    try {
      const response = await fetch("/api/supabase/delete-dive-log", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logId: logToDelete.id,
        }),
      });

      if (response.ok) {
        console.log("✅ Dive log deleted successfully");
        // Call the callback to refresh logs
        handleDiveLogDeleted(logToDelete.id);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }
    } catch (error) {
      console.error("❌ Delete error:", error);
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: "❌ Failed to delete dive log. Please try again.",
        },
      ]);
    }
  }, [userId, handleDiveLogDeleted, setMessages]);

  // 🚀 Handle export logs
  const handleExportLogs = useCallback(async () => {
    if (!userId || diveLogs.length === 0) return;
    
    try {
      const queryParams = new URLSearchParams({
        userId,
        format: 'csv',
        limit: '1000'
      });
      
      const response = await fetch(`/api/dive/batch-logs?${queryParams}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dive-logs-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setMessages(prev => [
          ...prev,
          { 
            role: "assistant", 
            content: "📁 **Export Complete**\n\nYour dive logs have been downloaded as a CSV file." 
          }
        ]);
      } else {
        throw new Error(`Export failed: ${response.status}`);
      }
    } catch (error) {
      console.error("❌ Export error:", error);
      setMessages(prev => [
        ...prev,
        { 
          role: "assistant", 
          content: "❌ Export failed. Please try again." 
        }
      ]);
    }
  }, [userId, diveLogs, setMessages]);

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
      
      setSessionsList(prevSessions => {
        const updated = [
          newSession,
          ...prevSessions.filter((s) => s.sessionName !== sessionName),
        ];
        if (typeof window !== "undefined") {
          localStorage.setItem("kovalSessionsList", JSON.stringify(updated));
          localStorage.setItem(`kovalSessions_${userId}`, JSON.stringify(updated));
        }
        return updated;
      });
      
      console.log("🔄 Auto-saved session with", messages.length, "messages");
    }
  }, [messages, sessionName, userId]);

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
      toggleDiveJournal,
      loadDiveLogs,
      loadingDiveLogs,
      editingSessionName,
    ],
  );

  // ✅ MESSAGE LISTENER FOR USER AUTH FROM PARENT PAGE
  useEffect(() => {
    // Build trusted origins set from env vars (NEXT_PUBLIC_APP_URL + NEXT_PUBLIC_TRUSTED_ORIGINS)
    const rawTrusted = process.env.NEXT_PUBLIC_TRUSTED_ORIGINS || "";
    const baseTrusted = [process.env.NEXT_PUBLIC_APP_URL].filter(Boolean);
    const envTrusted = rawTrusted.split(',').map(s => s.trim()).filter(Boolean);
    const trustedOrigins = new Set([...baseTrusted, ...envTrusted]);

    // Keep a set of origins we've already warned about to avoid console flooding
    const ignoredOriginsLogged = new Set();

    function isTrustedOrigin(origin) {
      if (!origin) return false;
      try {
        const u = new URL(origin);
        // During development, accept any localhost origin (all ports)
        if (process.env.NODE_ENV !== 'production' && u.hostname === 'localhost') return true;
      } catch (e) {
        // If origin is not a valid URL, fall back to whitelist check below
      }
      return trustedOrigins.has(origin);
    }

    const handleMessage = (event) => {
      if (!isTrustedOrigin(event.origin)) {
        // Warn only once per origin to reduce spam
        if (!ignoredOriginsLogged.has(event.origin)) {
          console.warn('🚫 Ignoring message from untrusted origin:', event.origin);
          ignoredOriginsLogged.add(event.origin);
        }
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

            // ✅ AUTHENTICATION COMPLETE
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
          // ✅ Only log if there's actually a message type (reduce noise)
          if (event.data?.type) {
            console.log("❓ Index: Unknown message type:", event.data?.type);
          }
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
          isEmbedded={true}
          setMessages={setMessages}
          diveLogs={diveLogs}
          loadingDiveLogs={loadingDiveLogs}
          // Batch analysis props
          batchAnalysis={batchAnalysis}
          setBatchAnalysis={setBatchAnalysis}
          isAnalyzing={isAnalyzing}
          analysisType={analysisType}
          setAnalysisType={setAnalysisType}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          analysisHistory={analysisHistory}
          analyzingLogId={analyzingLogId}
          filters={filters}
          setFilters={setFilters}
          // Data management functions
          onBatchAnalysis={handleBatchAnalysis}
          onAnalyzeDiveLog={handleAnalyzeDiveLog}
          onDeleteDiveLog={handleDeleteDiveLog}
          onExportLogs={handleExportLogs}
          onDiveLogSubmit={handleDiveLogSubmit}
        />
      )}

    </main>
  );
}

// ✅ Disable SSG for this page to prevent NextRouter issues
export async function getServerSideProps() {
  // This prevents static generation and ensures the page runs on the server
  return {
    props: {
      timestamp: Date.now(), // Force server-side rendering
    },
  };
}

// Removed unused queryPinecone function
