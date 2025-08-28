import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import ChatMessages from "@/components/ChatMessages";
import ChatInput from "@/components/ChatInput";
import Sidebar from "@/components/Sidebar";
import DiveJournalDisplay from "@/components/DiveJournalDisplay";

const ADMIN_USER_ID = "admin-daniel-koval";

export default function ChatPage() {
  const router = useRouter();
  const BOT_NAME = "Koval AI";
  const defaultSessionName = `Admin Session – ${new Date().toLocaleDateString("en-US")}`;

  // ✅ ALL STATE DECLARATIONS MUST BE AT THE TOP (Rules of Hooks)
  const [loading, setLoading] = useState(true);
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
  const [chatLoading, setChatLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("kovalDarkMode") === "true"
      : false,
  );
  const [profile, setProfile] = useState({
    userId: ADMIN_USER_ID,
    firstName: 'Daniel',
    lastName: 'Koval',
    nickname: 'Daniel Koval (Admin)',
    email: 'danielkoval@admin.com',
    source: 'admin'
  });
  const [diveLogs, setDiveLogs] = useState([]);
  const [loadingDiveLogs, setLoadingDiveLogs] = useState(false);
  const [diveJournalOpen, setDiveJournalOpen] = useState(false);

  const bottomRef = useRef(null);

  useEffect(() => {
    // Simple loading delay
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

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

  const handleBackToDashboard = () => {
    router.push('/admin');
  };

  const getDisplayName = useCallback(() => {
    return profile?.nickname || "Daniel Koval (Admin)";
  }, [profile]);

  // ✅ SESSION MANAGEMENT FUNCTIONS
  const handleSelectSession = useCallback((name) => {
    setSessionName(name);
    // Load session messages if needed
  }, []);

  const handleDeleteSession = useCallback((index) => {
    const newSessions = sessionsList.filter((_, i) => i !== index);
    setSessionsList(newSessions);
    if (typeof window !== "undefined") {
      localStorage.setItem("kovalSessionsList", JSON.stringify(newSessions));
    }
  }, [sessionsList]);

  const handleSaveSession = useCallback(() => {
    const session = {
      id: Date.now(),
      sessionName,
      messages,
      timestamp: new Date().toISOString(),
    };
    const newSessions = [session, ...sessionsList];
    setSessionsList(newSessions);
    if (typeof window !== "undefined") {
      localStorage.setItem("kovalSessionsList", JSON.stringify(newSessions));
    }
  }, [sessionName, messages, sessionsList]);

  const startNewSession = useCallback(() => {
    setMessages([
      {
        role: "assistant",
        content: `🤿 Hi! I'm ${BOT_NAME}, your freediving coach. How can I help you today?`,
      },
    ]);
    setInput("");
    setFiles([]);
    setSessionName(defaultSessionName);
  }, [BOT_NAME, defaultSessionName]);

  const refreshDiveLogs = useCallback(() => {
    // Mock function for admin mode
    console.log("Refreshing dive logs...");
  }, []);

  // ✅ DIVE JOURNAL FUNCTIONS
  const toggleDiveJournal = useCallback(() => {
    setDiveJournalOpen(!diveJournalOpen);
  }, [diveJournalOpen]);

  // ✅ WORKING CHAT SUBMISSION
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!input.trim() || chatLoading) return;

      const userMessage = { role: "user", content: input };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setChatLoading(true);

      try {
        const response = await fetch("/api/openai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            userId: ADMIN_USER_ID,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }

        const assistantMessage = {
          role: "assistant",
          content: data.content || data.message || "I'm sorry, I couldn't process that request.",
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        console.error("Chat error:", error);
        const errorMessage = {
          role: "assistant",
          content: "I'm sorry, I encountered an error. Please try again.",
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setChatLoading(false);
      }
    },
    [input, messages, chatLoading],
  );

  // ✅ KEYBOARD HANDLER
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    },
    [handleSubmit],
  );

  // ✅ FILE HANDLER
  const handleFileChange = useCallback((e) => {
    const selected = Array.from(e.target.files);
    if (selected.length > 3) {
      alert("⚠️ You can only upload up to 3 images.");
      return;
    }
    setFiles(selected);
  }, []);

  // ✅ SIDEBAR PROPS
  const sidebarProps = {
    sessionName,
    setSessionName,
    sessionsList,
    setSessionsList,
    editingSessionName,
    setEditingSessionName,
    darkMode,
    setDarkMode,
    profile,
    setProfile,
    diveLogs,
    setDiveLogs,
    loadingDiveLogs,
    setLoadingDiveLogs,
    toggleDiveJournal,
    diveJournalOpen,
    userId: ADMIN_USER_ID,
    handleSelectSession,
    handleDeleteSession,
    handleSaveSession,
    startNewSession,
    refreshDiveLogs,
    handleBackToDashboard,
    adminMode: true
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Chat System...</p>
        </div>
      </div>
    );
  }

  return (
    <main
      className={`h-screen flex ${
        darkMode ? "bg-black text-white" : "bg-white text-gray-900"
      }`}
    >
      {/* ✅ SIDEBAR */}
      <div className="w-[320px] h-full overflow-y-auto flex flex-col relative z-20">
        <Sidebar {...sidebarProps} />
      </div>

      {/* ✅ MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col h-screen relative">
        {/* Top Bar - Compact ChatGPT-style */}
        <div
          className={`sticky top-0 z-10 px-4 py-3 flex justify-between items-center ${
            darkMode ? "bg-gray-900" : "bg-white"
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className={`text-sm font-medium ${darkMode ? "text-gray-200" : "text-gray-700"}`}>
              {getDisplayName()}
            </div>
            <div className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              danielkoval@admin.com
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleBackToDashboard}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                darkMode
                  ? "hover:bg-gray-800 text-gray-400 hover:text-gray-200"
                  : "hover:bg-gray-100 text-gray-600 hover:text-gray-800"
              }`}
            >
              ← Dashboard
            </button>
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
          </div>
        </div>

        {/* Border line that flows seamlessly from sidebar */}
        <div className="relative">
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
              loading={chatLoading}
              bottomRef={bottomRef}
              userId={ADMIN_USER_ID}
            />
          </div>
        </div>

        {/* Chat Input - ChatGPT-style compact */}
        <div className={`relative ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
          {/* Background extension that goes under sidebar but behind it */}
          <div
            className={`absolute top-0 bottom-0 left-[-320px] right-0 z-0 ${
              darkMode ? "bg-gray-900" : "bg-gray-50"
            }`}
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
              loading={chatLoading}
              darkMode={darkMode}
              isAuthenticating={false}
              authTimeoutReached={true}
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
          isEmbedded={false}
          setMessages={setMessages}
          refreshKey={Date.now()}
          diveLogs={diveLogs}
          loadingDiveLogs={loadingDiveLogs}
        />
      )}
    </main>
  );
}
