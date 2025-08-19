import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/src/providers/AuthProvider";
import { fetchWithAuth } from "@/src/lib/fetchWithAuth";

export default function ModernDiveJournalDisplay({
  darkMode,
  isOpen,
  onClose,
  setMessages,
  refreshKey,
  onDiveLogSaved,
  onDiveLogDeleted,
}) {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [sortBy, setSortBy] = useState("date");
  const [activeTab, setActiveTab] = useState("saved-logs");
  const [loading, setLoading] = useState(false);
  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().split("T")[0],
    disciplineType: "depth",
    discipline: "",
    location: "",
    targetDepth: "",
    reachedDepth: "",
    mouthfillDepth: "",
    issueDepth: "",
    issueComment: "",
    squeeze: false,
    exit: "",
    durationOrDistance: "",
    totalDiveTime: "",
    attemptType: "",
    surfaceProtocol: "",
    notes: "",
    imageFile: null,
    imagePreview: null,
    bottomTime: "",
    earSqueeze: false,
    lungSqueeze: false,
    narcosisLevel: "",
    recoveryQuality: "",
    gear: {
      wetsuit: "",
      fins: "",
      mask: "",
      weights_kg: "",
    },
  });

  // Load dive logs from Supabase
  const loadDiveLogs = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await fetchWithAuth('/app/api/dive-logs');
      const data = await response.json();
      
      if (data.logs) {
        setLogs(data.logs);
      }
    } catch (error) {
      console.error('Failed to load dive logs:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load logs when component mounts or user changes
  useEffect(() => {
    if (user && isOpen) {
      loadDiveLogs();
    }
  }, [user, isOpen, refreshKey, loadDiveLogs]);

  // Save dive log to Supabase
  const saveDiveLog = async (logData) => {
    if (!user) return;

    try {
      const response = await fetchWithAuth('/app/api/dive-logs', {
        method: 'POST',
        body: JSON.stringify(logData),
      });

      const data = await response.json();
      
      if (data.log) {
        // Add to local state
        setLogs(prev => [data.log, ...prev]);
        
        // Trigger fire-and-forget analysis
        startAnalysis(data.log.id);
        
        // Callback to parent
        onDiveLogSaved?.(data.log);
        
        // Reset form
        resetForm();
        
        // Switch to saved logs tab
        setActiveTab("saved-logs");
      }
    } catch (error) {
      console.error('Failed to save dive log:', error);
      alert('Failed to save dive log. Please try again.');
    }
  };

  // Delete dive log from Supabase
  const deleteDiveLog = async (logId) => {
    if (!user || !logId) return;

    if (!confirm('Are you sure you want to delete this dive log?')) return;

    try {
      await fetchWithAuth(`/app/api/dive-logs?id=${logId}`, {
        method: 'DELETE',
      });

      // Remove from local state
      setLogs(prev => prev.filter(log => log.id !== logId));
      
      // Callback to parent
      onDiveLogDeleted?.(logId);
    } catch (error) {
      console.error('Failed to delete dive log:', error);
      alert('Failed to delete dive log. Please try again.');
    }
  };

  // Start AI analysis (fire-and-forget)
  const startAnalysis = async (logId) => {
    if (!user || !logId) return;

    try {
      // Fire-and-forget API call
      fetchWithAuth('/app/api/analyze/dive-log', {
        method: 'POST',
        body: JSON.stringify({ logId }),
      }).then(async (response) => {
        const data = await response.json();
        
        if (data.success && setMessages) {
          // Add analysis result to chat
          setMessages(prev => [...prev, {
            role: "assistant",
            content: `🧠 **Analysis Complete**\n\n${data.analysis}`,
          }]);
        }
      }).catch(error => {
        console.error('Analysis failed:', error);
      });

      // Immediately show "analyzing" message in chat if available
      if (setMessages) {
        setMessages(prev => [...prev, {
          role: "assistant", 
          content: "🧠 Analyzing your dive log... I'll share insights with you in a moment!",
        }]);
      }
    } catch (error) {
      console.error('Failed to start analysis:', error);
    }
  };

  const resetForm = () => {
    setNewEntry({
      date: new Date().toISOString().split("T")[0],
      disciplineType: "depth",
      discipline: "",
      location: "",
      targetDepth: "",
      reachedDepth: "",
      mouthfillDepth: "",
      issueDepth: "",
      issueComment: "",
      squeeze: false,
      exit: "",
      durationOrDistance: "",
      totalDiveTime: "",
      attemptType: "",
      surfaceProtocol: "",
      notes: "",
      imageFile: null,
      imagePreview: null,
      bottomTime: "",
      earSqueeze: false,
      lungSqueeze: false,
      narcosisLevel: "",
      recoveryQuality: "",
      gear: {
        wetsuit: "",
        fins: "",
        mask: "",
        weights_kg: "",
      },
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newEntry.reachedDepth && !newEntry.totalDiveTime) {
      alert('Please enter either depth or time for your dive.');
      return;
    }

    await saveDiveLog(newEntry);
  };

  const sortedLogs = [...logs].sort((a, b) => {
    if (sortBy === "date") {
      return new Date(b.date) - new Date(a.date);
    } else if (sortBy === "depth") {
      return (b.depth || 0) - (a.depth || 0);
    }
    return 0;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`bg-white ${darkMode ? 'dark:bg-gray-800' : ''} rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden`}>
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            Dive Journal
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("saved-logs")}
            className={`px-6 py-3 font-medium ${
              activeTab === "saved-logs"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Saved Logs ({logs.length})
          </button>
          <button
            onClick={() => setActiveTab("add-new")}
            className={`px-6 py-3 font-medium ${
              activeTab === "add-new"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Add New Dive
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === "saved-logs" ? (
            <div>
              {/* Sort Controls */}
              <div className="mb-4 flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-1 text-sm"
                >
                  <option value="date">Date</option>
                  <option value="depth">Depth</option>
                </select>
              </div>

              {/* Dive Logs List */}
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading dive logs...</p>
                </div>
              ) : sortedLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No dive logs yet. Start by adding your first dive!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedLogs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4 mb-2">
                            <span className="font-medium text-gray-800">
                              {new Date(log.date).toLocaleDateString()}
                            </span>
                            {log.location && (
                              <span className="text-sm text-gray-600">
                                📍 {log.location}
                              </span>
                            )}
                            {log.discipline && (
                              <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {log.discipline}
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            {log.depth && (
                              <div>
                                <strong>Depth:</strong> {log.depth}m
                              </div>
                            )}
                            {log.duration && (
                              <div>
                                <strong>Duration:</strong> {log.duration}s
                              </div>
                            )}
                          </div>
                          
                          {log.notes && (
                            <p className="mt-2 text-sm text-gray-700">{log.notes}</p>
                          )}
                          
                          {log.analysis && (
                            <div className="mt-2 text-xs text-green-600">
                              ✅ AI Analysis Available
                            </div>
                          )}
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => startAnalysis(log.id)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Analyze
                          </button>
                          <button
                            onClick={() => deleteDiveLog(log.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Add New Dive Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={newEntry.date}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={newEntry.location}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g., Blue Hole, Dahab"
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              </div>

              {/* Discipline */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discipline Type
                  </label>
                  <select
                    value={newEntry.disciplineType}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, disciplineType: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="depth">Depth (CWT, FIM, etc.)</option>
                    <option value="pool">Pool (STA, DYN, etc.)</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Specific Discipline
                  </label>
                  <input
                    type="text"
                    value={newEntry.discipline}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, discipline: e.target.value }))}
                    placeholder="e.g., CWT, FIM, STA, DYN"
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              </div>

              {/* Performance */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Depth Reached (m)
                  </label>
                  <input
                    type="number"
                    value={newEntry.reachedDepth}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, reachedDepth: e.target.value }))}
                    placeholder="e.g., 30"
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Time (seconds)
                  </label>
                  <input
                    type="number"
                    value={newEntry.totalDiveTime}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, totalDiveTime: e.target.value }))}
                    placeholder="e.g., 120"
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={newEntry.notes}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="How did the dive feel? Any observations or improvements for next time?"
                  rows={3}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  Save Dive Log
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
