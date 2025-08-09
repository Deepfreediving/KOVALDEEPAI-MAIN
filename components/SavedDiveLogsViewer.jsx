import { useState, useEffect } from 'react';

export default function SavedDiveLogsViewer({ darkMode }) {
  const [savedLogs, setSavedLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    loadSavedLogs();
  }, []);

  const loadSavedLogs = () => {
    if (typeof window !== 'undefined') {
      const saved = JSON.parse(localStorage.getItem('savedDiveLogs') || '[]');
      setSavedLogs(saved.slice(-10)); // Show last 10 logs
    }
  };

  const clearSavedLogs = () => {
    if (confirm('Are you sure you want to clear all saved dive logs from local storage?')) {
      localStorage.removeItem('savedDiveLogs');
      setSavedLogs([]);
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  if (savedLogs.length === 0) {
    return null;
  }

  return (
    <div className={`mt-6 p-4 rounded-lg border ${
      darkMode 
        ? 'bg-gray-800 border-gray-600 text-white' 
        : 'bg-gray-50 border-gray-200 text-gray-900'
    }`}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-medium">
          💾 Saved Dive Logs ({savedLogs.length})
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className={`px-3 py-1 text-sm rounded ${
              darkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {showLogs ? 'Hide' : 'Show'}
          </button>
          <button
            onClick={clearSavedLogs}
            className={`px-3 py-1 text-sm rounded ${
              darkMode
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
          >
            Clear All
          </button>
        </div>
      </div>

      {showLogs && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {savedLogs.map((log, index) => (
            <div
              key={log.id || index}
              className={`p-3 rounded border ${
                darkMode
                  ? 'bg-gray-700 border-gray-600'
                  : 'bg-white border-gray-300'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-medium">
                    {formatDate(log.date)} - {log.discipline || 'Unknown'}
                  </div>
                  <div className="text-sm opacity-75">
                    📍 {log.location || 'Unknown location'}
                  </div>
                  <div className="text-sm opacity-75">
                    🎯 Target: {log.targetDepth}m | Reached: {log.reachedDepth}m
                  </div>
                  {log.notes && (
                    <div className="text-sm opacity-75 mt-1">
                      📝 {log.notes.slice(0, 100)}...
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      log.syncedToWix
                        ? 'bg-green-500 text-white'
                        : 'bg-yellow-500 text-black'
                    }`}
                  >
                    {log.syncedToWix ? '✅ Synced' : '⏳ Local'}
                  </span>
                  <span className="text-xs opacity-50">
                    {formatDate(log.savedAt)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 text-sm opacity-75">
        💡 Tip: Dive logs are saved locally first, then synced to Wix backend
      </div>
    </div>
  );
}
