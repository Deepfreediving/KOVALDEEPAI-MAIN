import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import ChatBox from "../components/ChatBox";

const ADMIN_USER_ID = "admin-daniel-koval";

export default function ChatPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    // Simple loading delay
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleBackToDashboard = () => {
    router.push('/admin');
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button
                onClick={handleBackToDashboard}
                className="mr-4 px-3 py-2 text-sm text-gray-600 hover:text-gray-500 border border-gray-300 rounded hover:bg-gray-50"
              >
                ← Back to Dashboard
              </button>
              <img 
                src="/koval-logo.png" 
                alt="KovalAI" 
                className="h-8 w-auto mr-3"
              />
              <h1 className="text-2xl font-bold text-blue-600">KovalAI</h1>
              <span className="ml-4 text-sm text-gray-500">
                Admin Chat
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Admin Info */}
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  D
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Daniel Koval (Admin)
                  </p>
                  <p className="text-xs text-red-600">
                    Full Access
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow h-[calc(100vh-12rem)]">
          <ChatBox
            userId={ADMIN_USER_ID}
            profile={{ name: "Daniel Koval (Admin)" }}
            darkMode={false}
            messages={messages}
            setMessages={setMessages}
            input={input}
            setInput={setInput}
            files={files}
            setFiles={setFiles}
            loading={chatLoading}
            setLoading={setChatLoading}
          />
        </div>
      </div>
    </div>
  );
}
