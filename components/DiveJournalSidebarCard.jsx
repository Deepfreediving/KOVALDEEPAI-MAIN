import { useState } from 'react';
import DiveJournalForm from './DiveJournalForm';
import DiveJournalDisplay from './DiveJournalDisplay';

export default function DiveJournalSidebarCard({ userId, darkMode }) {
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Trigger display update

  const handleFormSubmit = (data) => {
    // Save logs to localStorage
    const existingLogs = JSON.parse(localStorage.getItem(`diveLogs-${userId}`)) || [];
    existingLogs.push(data);
    localStorage.setItem(`diveLogs-${userId}`, JSON.stringify(existingLogs));
    setRefreshKey(prev => prev + 1); // Refresh display
  };

  return (
    <div className={`mt-6 border rounded-lg shadow-sm ${darkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-200"}`}>
      <div
        className={`flex justify-between items-center p-3 cursor-pointer ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
        onClick={() => setOpen(!open)}
      >
        <h3 className="font-semibold text-sm">📝 Dive Journal</h3>
        <button className={`text-xs ${darkMode ? "text-blue-400" : "text-blue-600"}`}>
          {open ? 'Hide' : 'Open'}
        </button>
      </div>

      {open && (
        <div className="p-3 border-t space-y-4">
          <DiveJournalForm onSubmit={handleFormSubmit} />
          <DiveJournalDisplay key={refreshKey} userId={userId} darkMode={darkMode} />
        </div>
      )}
    </div>
  );
}
