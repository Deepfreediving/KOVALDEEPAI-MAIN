import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../src/providers/AuthProvider";
import { fetchWithAuth } from "../src/lib/fetchWithAuth";
import ChatMessages from "../components/ChatMessages";
import ChatInput from "../components/ChatInput";
import Sidebar from "../components/Sidebar";
import DiveJournalSidebarCard from "../components/DiveJournalSidebarCard";

export default function ModernIndex() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const BOT_NAME = "Koval AI";
  const defaultSessionName = `Session – ${new Date().toLocaleDateString("en-US")}`;

  // Core state
  const [sessionName, setSessionName] = useState(defaultSessionName);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `🤿 Hi! I'm ${BOT_NAME}, your freediving coach. How can I help you today?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [diveLogs, setDiveLogs] = useState([]);
  const [isDiveJournalOpen, setIsDiveJournalOpen] = useState(false);
  const [loadingDiveLogs, setLoadingDiveLogs] = useState(false);

  const bottomRef = useRef(null);

  // Load dive logs for authenticated user
  const loadDiveLogs = useCallback(async () => {
    if (!user) return;
    
    setLoadingDiveLogs(true);
    try {
      const response = await fetchWithAuth('/app/api/dive-logs');
      const data = await response.json();
      
      if (data.logs) {
        setDiveLogs(data.logs);
      }
    } catch (error) {
      console.error('Failed to load dive logs:', error);
    } finally {
      setLoadingDiveLogs(false);
    }
  }, [user]);

  // Load dive logs when user is authenticated
  useEffect(() => {
    if (user) {
      loadDiveLogs();
    }
  }, [user, loadDiveLogs]);

  // Handle chat submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    const userMessage = { role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetchWithAuth('/api/openai/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [...messages, userMessage],
          userId: user.id,
        }),
      });

      const data = await response.json();
      
      if (data.choices && data.choices[0]) {
        const assistantMessage = {
          role: "assistant",
          content: data.choices[0].message.content,
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto text-center p-8 bg-white rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Welcome to Koval AI</h1>
          <p className="text-gray-600 mb-6">
            Please sign in to access your freediving coach and dive log management.
          </p>
          <button
            onClick={() => router.push('/auth/login')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <div className="flex h-screen">
        {/* Sidebar */}
        <Sidebar
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          sessionName={sessionName}
          setSessionName={setSessionName}
          user={user}
          onSignOut={signOut}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold text-gray-800">
                {sessionName}
              </h1>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setIsDiveJournalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Dive Journal
                </button>
                <span className="text-sm text-gray-600">
                  {user.email}
                </span>
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-6">
              <ChatMessages messages={messages} botName={BOT_NAME} />
              <div ref={bottomRef} />
            </div>

            {/* Chat Input */}
            <div className="border-t border-gray-200 p-6">
              <ChatInput
                input={input}
                setInput={setInput}
                loading={loading}
                onSubmit={handleSubmit}
                disabled={!user}
              />
            </div>
          </div>
        </div>

        {/* Dive Journal Sidebar */}
        {isDiveJournalOpen && (
          <DiveJournalSidebarCard
            isOpen={isDiveJournalOpen}
            onClose={() => setIsDiveJournalOpen(false)}
            diveLogs={diveLogs}
            setDiveLogs={setDiveLogs}
            loadingDiveLogs={loadingDiveLogs}
            refreshDiveLogs={loadDiveLogs}
            userId={user?.id}
            userProfile={{
              firstName: user?.user_metadata?.first_name || 'User',
              nickname: user?.user_metadata?.nickname || user?.email,
            }}
          />
        )}
      </div>
    </div>
  );
}
