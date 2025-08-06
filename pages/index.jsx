// SIMPLIFIED VERSION - Much cleaner and shorter:

import { useEffect, useState, useRef } from "react";
import ChatMessages from "../components/ChatMessages";
import Sidebar from "../components/Sidebar";
import ChatBox from "../components/ChatBox";
import DiveJournalDisplay from '../components/DiveJournalDisplay';
import { useEnterpriseData } from '../hooks/useEnterpriseData';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useConnections } from '../hooks/useConnections';

export default function Index() {
  const BOT_NAME = "Koval AI";
  const defaultSessionName = `Session – ${new Date().toLocaleDateString("en-US")}`;

  // ----------------------------
  // Core State (Simplified)
  // ----------------------------
  const [sessionName, setSessionName] = useState(defaultSessionName);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDiveJournalForm, setShowDiveJournalForm] = useState(false);
  const [editLogIndex, setEditLogIndex] = useState(null);
  const [isDiveJournalOpen, setIsDiveJournalOpen] = useState(false);
  const bottomRef = useRef(null);

  // ----------------------------
  // Custom Hooks (Extract Complex Logic)
  // ----------------------------
  const {
    darkMode,
    setDarkMode,
    userId,
    setUserId,
    profile,
    setProfile,
    sessionsList,
    setSessionsList,
    saveToStorage
  } = useLocalStorage();

  const {
    diveLogs,
    setDiveLogs,
    loadingDiveLogs,
    syncStatus,
    refreshDiveLogs,
    handleJournalSubmit,
    handleDelete
  } = useEnterpriseData(userId);

  const { connectionStatus, loadingConnections } = useConnections();

  // ----------------------------
  // Simple Handlers
  // ----------------------------
  const handleEdit = (index) => {
    setEditLogIndex(index);
    setShowDiveJournalForm(true);
  };

  const handleSaveSession = () => {
    const updated = [
      ...sessionsList.filter((s) => s.sessionName !== sessionName),
      { sessionName, messages, timestamp: Date.now() },
    ];
    saveToStorage("kovalSessionsList", updated);
    setSessionsList(updated);
  };

  const startNewSession = () => {
    const name = `Session – ${new Date().toLocaleDateString("en-US")}`;
    setSessionName(name);
    setMessages([]);
    setFiles([]);
    saveToStorage("kovalSessionName", name);
  };

  const handleSelectSession = (name) => {
    const found = sessionsList.find((s) => s.sessionName === name);
    if (found) {
      setSessionName(found.sessionName);
      setMessages(found.messages || []);
      setInput("");
    }
  };

  const getDisplayName = () =>
    profile?.loginEmail ||
    profile?.contactDetails?.firstName ||
    (userId?.startsWith("Guest") ? "Guest User" : "User");

  // ----------------------------
  // Shared Props (Simplified)
  // ----------------------------
  const sharedProps = {
    BOT_NAME,
    sessionName,
    setSessionName,
    messages,
    setMessages,
    input,
    setInput,
    files,
    setFiles,
    loading,
    setLoading,
    userId,
    profile,
    setProfile,
    diveLogs,
    setDiveLogs,
    editLogIndex,
    setEditLogIndex,
    showDiveJournalForm,
    setShowDiveJournalForm,
    darkMode,
    setDarkMode,
    bottomRef
  };

  // ----------------------------
  // Render (Clean & Simple)
  // ----------------------------
  return (
    <main className="h-screen flex bg-white text-gray-900 dark:bg-black dark:text-white">
      {/* Sidebar */}
      <div className="w-[320px] h-screen overflow-y-auto border-r border-gray-300 dark:border-gray-700 flex flex-col justify-between">
        <Sidebar
          {...sharedProps}
          sessionsList={sessionsList}
          startNewSession={startNewSession}
          handleSaveSession={handleSaveSession}
          handleSelectSession={handleSelectSession}
          toggleDiveJournal={() => setShowDiveJournalForm((prev) => !prev)}
          handleJournalSubmit={handleJournalSubmit}
          handleEdit={handleEdit}
          handleDelete={handleDelete}
          refreshDiveLogs={refreshDiveLogs}
          loadingDiveLogs={loadingDiveLogs}
          syncStatus={syncStatus}
        />

        {/* Connection Status */}
        <div className="mt-4 mb-4 mx-4 flex space-x-4 text-xl bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg">
          {!loadingConnections && connectionStatus.pinecone?.startsWith("✅") && <span title="Data Connected">🌲</span>}
          {!loadingConnections && connectionStatus.openai?.startsWith("✅") && <span title="AI Connected">🤖</span>}
          {!loadingConnections && connectionStatus.wix?.startsWith("✅") && <span title="Site Connected">🌀</span>}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-screen">
        {/* Top Bar */}
        <div className="sticky top-0 z-10 bg-white dark:bg-black border-b border-gray-300 dark:border-gray-700 p-3 flex justify-between items-center text-sm">
          <div className="text-gray-500 dark:text-gray-400 px-2 truncate">👤 {getDisplayName()}</div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="px-3 py-1 rounded-md bg-gray-200 text-black hover:bg-gray-300 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
          >
            {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>
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
            />
          </div>
        </div>

        {/* Chat Input */}
        <div className="px-4 py-3 border-t border-gray-300 dark:border-gray-700">
          <ChatBox {...sharedProps} />
        </div>
      </div>

      {/* Dive Journal Button & Modal */}
      <button
        onClick={() => setIsDiveJournalOpen(true)}
        className="fixed top-4 right-16 bg-blue-600 hover:bg-blue-700 p-2 rounded-lg text-sm"
        title="View Dive Journal"
      >
        📘 Journal
      </button>

      <DiveJournalDisplay 
        userId={userId}
        darkMode={darkMode}
        isOpen={isDiveJournalOpen} 
        onClose={() => setIsDiveJournalOpen(false)} 
      />
    </main>
  );
}