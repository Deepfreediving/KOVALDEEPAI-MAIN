import { useState } from 'react';
import DiveJournalForm from './DiveJournalForm';
import DiveJournalDisplay from './DiveJournalDisplay';

export default function DiveJournalSidebarCard({ 
  userId, 
  darkMode, 
  onSubmit, 
  onDelete, 
  diveLogs, 
  loadingDiveLogs, 
  editLogIndex, 
  setEditLogIndex,
  setMessages // ✅ Add setMessages prop for analysis integration
}) {
  const [activeTab, setActiveTab] = useState('logs'); // 'logs' or 'add'
  const [refreshKey, setRefreshKey] = useState(0);

  const handleFormSubmit = async (data) => {
    try {
      console.log('🚀 DiveJournalSidebarCard: Submitting dive log...', data);
      if(!userId || userId.startsWith('guest-')) {
        console.error('❌ DiveJournalSidebarCard: Invalid userId at submit time:', userId);
      }
      // Call the onSubmit callback from parent (embed page) FIRST
      if (onSubmit) {
        await onSubmit(data);
        console.log('✅ DiveJournalSidebarCard: Parent onSubmit completed');
      } else {
        console.warn('⚠️ DiveJournalSidebarCard: onSubmit missing');
      }
      // Force refresh the logs display by updating key
      setRefreshKey(prev => prev + 1);
      setActiveTab('logs'); // Switch to logs after saving
      console.log('✅ DiveJournalSidebarCard: Dive log submitted successfully, refreshing display');
    } catch (error) {
      console.error('❌ DiveJournalSidebarCard: Error submitting dive log:', error);
    }
  };

  return (
    <div className={`w-full h-full flex flex-col ${darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
      {/* Header with Tabs */}
      <div className={`border-b ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
        <div className="flex">
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'logs'
                ? darkMode 
                  ? "bg-blue-900 text-blue-200 border-b-2 border-blue-400"
                  : "bg-blue-50 text-blue-700 border-b-2 border-blue-500"
                : darkMode
                  ? "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              � <span>My Logs</span>
            </span>
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'add'
                ? darkMode 
                  ? "bg-green-900 text-green-200 border-b-2 border-green-400"
                  : "bg-green-50 text-green-700 border-b-2 border-green-500"
                : darkMode
                  ? "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              ➕ <span>Add Dive</span>
            </span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'logs' ? (
          <div className="h-full">
            <DiveJournalDisplay 
              key={refreshKey} 
              refreshKey={refreshKey}
              userId={userId} 
              darkMode={darkMode}
              isEmbedded={true}
              setMessages={setMessages} // ✅ Pass setMessages for analysis integration
            />
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-4">
            <div className={`rounded-lg border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} p-4`}>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                🤿 <span>New Dive Entry</span>
              </h3>
              <DiveJournalForm onSubmit={handleFormSubmit} darkMode={darkMode} userId={userId} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
