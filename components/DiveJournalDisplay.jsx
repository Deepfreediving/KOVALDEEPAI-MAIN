import { useEffect, useState } from "react";

export default function DiveJournalDisplay({ 
  userId, 
  darkMode, 
  isOpen, 
  onClose, 
  isEmbedded = false, 
  setMessages, 
  refreshKey,
  onDiveLogSaved,     // 🚀 NEW: Callback when dive log is saved
  onDiveLogDeleted,   // 🚀 NEW: Callback when dive log is deleted
  onRefreshDiveLogs   // 🚀 NEW: Callback to refresh dive logs in parent
}) {
  const [logs, setLogs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [sortBy, setSortBy] = useState('date');
  const [activeTab, setActiveTab] = useState('summary'); // Tab navigation: summary, history, add
  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    disciplineType: 'depth',
    discipline: '',
    location: '',
    targetDepth: '',
    reachedDepth: '',
    mouthfillDepth: '',
    issueDepth: '',
    issueComment: '',
    squeeze: false,
    exit: '',
    durationOrDistance: '',
    totalDiveTime: '',
    attemptType: '',
    surfaceProtocol: '',
    notes: '',
    imageFile: null,
    imagePreview: null
  });
  const [analyzingLogId, setAnalyzingLogId] = useState(null); // Track which log is being analyzed

  useEffect(() => {
    console.log('🔄 DiveJournalDisplay: Refreshing logs from localStorage...', { userId, refreshKey });
    try {
      const stored = localStorage.getItem(`diveLogs-${userId}`);
      if (stored) {
        const parsedLogs = JSON.parse(stored);
        setLogs(parsedLogs);
        console.log(`✅ DiveJournalDisplay: Loaded ${parsedLogs.length} logs from localStorage`);
      } else {
        setLogs([]);
        console.log('📂 DiveJournalDisplay: No logs found in localStorage');
      }
    } catch (error) {
      console.error("❌ DiveJournalDisplay: Failed to parse stored dive logs:", error);
      setLogs([]);
    }
  }, [userId, refreshKey]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewEntry(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewEntry(prev => ({
        ...prev,
        imageFile: file,
        imagePreview: URL.createObjectURL(file)
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🚀 DiveJournalDisplay: Starting dive log submit process...');
    
    const newLog = {
      ...newEntry,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      userId: userId // Ensure userId is included
    };
    
    console.log('📝 DiveJournalDisplay: Prepared dive log data:', {
      id: newLog.id,
      userId: newLog.userId,
      location: newLog.location,
      depth: newLog.reachedDepth || newLog.targetDepth,
      date: newLog.date
    });
    
    try {
      // 🚀 STEP 1: Save to Wix via API (backend handles both Wix and localStorage)
      console.log('🌐 DiveJournalDisplay: Saving to Wix via API...');
      const response = await fetch('/api/analyze/save-dive-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          diveLogData: newLog,
          source: 'dive-journal-display'
        })
      });

      console.log('📥 DiveJournalDisplay: API response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ DiveJournalDisplay: Save successful:', result);
        
        // 🚀 STEP 2: Update local state
        const updatedLogs = [...logs, newLog];
        setLogs(updatedLogs);
        
        // 🚀 STEP 3: Update localStorage as backup
        try {
          localStorage.setItem(`diveLogs-${userId}`, JSON.stringify(updatedLogs));
          console.log('💾 DiveJournalDisplay: Updated localStorage backup');
        } catch (error) {
          console.warn("⚠️ DiveJournalDisplay: Failed to update localStorage:", error);
        }
        
        // 🚀 STEP 4: Notify parent components
        if (onDiveLogSaved) {
          console.log('📢 DiveJournalDisplay: Notifying parent of successful save...');
          onDiveLogSaved(newLog, result);
        }
        
        if (onRefreshDiveLogs) {
          console.log('🔄 DiveJournalDisplay: Triggering parent dive logs refresh...');
          onRefreshDiveLogs();
        }
        
        // 🚀 STEP 5: Show success message in chat
        if (setMessages) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `✅ **Dive Log Saved Successfully!** \n\n📊 ${newLog.discipline || 'Freediving'} dive to ${newLog.reachedDepth || newLog.targetDepth}m at ${newLog.location || 'your location'} has been logged.`
          }]);
        }
        
        console.log('🎉 DiveJournalDisplay: Dive log save process completed successfully');
        
      } else {
        throw new Error(`API save failed: ${response.status} ${response.statusText}`);
      }
      
    } catch (error) {
      console.error("❌ DiveJournalDisplay: Failed to save dive log via API:", error);
      
      // 🚀 FALLBACK: Save to localStorage only and show warning
      const updatedLogs = [...logs, newLog];
      setLogs(updatedLogs);
      
      try {
        localStorage.setItem(`diveLogs-${userId}`, JSON.stringify(updatedLogs));
        console.log('💾 DiveJournalDisplay: Fallback - saved to localStorage only');
      } catch (localError) {
        console.error("❌ DiveJournalDisplay: Even localStorage save failed:", localError);
      }
      
      // Notify parent even if API failed
      if (onDiveLogSaved) {
        onDiveLogSaved(newLog, { success: false, error: error.message, savedLocally: true });
      }
      
      // Show error message in chat
      if (setMessages) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `⚠️ **Dive Log Saved Locally** \n\nYour dive was saved to your device but couldn't sync to the cloud. It will sync automatically when connection is restored. \n\nError: ${error.message}`
        }]);
      }
    }
    
    // Reset form regardless of save outcome
    setNewEntry({
      date: new Date().toISOString().split('T')[0],
      disciplineType: 'depth',
      discipline: '',
      location: '',
      targetDepth: '',
      reachedDepth: '',
      mouthfillDepth: '',
      issueDepth: '',
      issueComment: '',
      squeeze: false,
      exit: '',
      durationOrDistance: '',
      totalDiveTime: '',
      attemptType: '',
      surfaceProtocol: '',
      notes: '',
      imageFile: null,
      imagePreview: null
    });
    setShowForm(false);
  };

  // ✅ Add analyze functionality for individual dive logs
  const handleAnalyzeDiveLog = async (log) => {
    if (!log || !userId) {
      console.warn('⚠️ Missing log or userId for analysis');
      return;
    }
    
    try {
      console.log('🔍 Starting dive log analysis in DiveJournalDisplay:', log);
      console.log('� setMessages function available:', typeof setMessages === 'function');
      
      setAnalyzingLogId(log.id);
      
      // ✅ Show analyzing message in chat immediately
      if (setMessages) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `🔄 Analyzing your ${log.discipline || 'freediving'} dive to ${log.reachedDepth || log.targetDepth}m at ${log.location || 'location'}...`
        }]);
      }
      
      console.log('🌐 Calling analyze API from DiveJournalDisplay...');
      const response = await fetch('/api/analyze/single-dive-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          diveLogData: log
        })
      });

      console.log('📊 Analyze API response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Analysis result:', result);
        
        if (result.success && result.analysis) {
          // Update the log with analysis
          const updatedLogs = logs.map(l => 
            l.id === log.id 
              ? { ...l, analysis: result.analysis, analyzed: true }
              : l
          );
          setLogs(updatedLogs);
          
          // Save to localStorage
          localStorage.setItem(`diveLogs-${userId}`, JSON.stringify(updatedLogs));
          
          // ✅ Post analysis to chat
          if (setMessages) {
            console.log('💬 Posting analysis result to chat...');
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `📊 **Dive Analysis Complete** \n\n${result.analysis}`
            }]);
          }
          
          console.log('✅ Dive log analyzed successfully');
        } else {
          console.error('❌ Analysis failed:', result.error);
          
          // ✅ Post error to chat
          if (setMessages) {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `❌ Analysis failed: ${result.error || 'Unknown error'}. Please try again.`
            }]);
          }
        }
      } else {
        throw new Error(`Analysis request failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Analysis error:', error);
      
      // ✅ Post error to chat
      if (setMessages) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `❌ Failed to analyze dive log: ${error.message}. Please try again.`
        }]);
      }
    } finally {
      setAnalyzingLogId(null);
    }
  };

  // 🚀 Add delete functionality with API integration
  const handleDeleteDiveLog = async (logToDelete) => {
    if (!logToDelete || !logToDelete.id) {
      console.warn('⚠️ DiveJournalDisplay: No log to delete');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete the dive log from ${logToDelete.date} at ${logToDelete.location || 'unknown location'}?`)) {
      return;
    }
    
    console.log('🗑️ DiveJournalDisplay: Starting delete process for log:', logToDelete.id);
    
    try {
      // 🚀 STEP 1: Delete from API/Wix
      console.log('🌐 DiveJournalDisplay: Deleting from Wix via API...');
      const response = await fetch('/api/analyze/delete-dive-log', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          logId: logToDelete.id,
          source: 'dive-journal-display'
        })
      });

      console.log('📥 DiveJournalDisplay: Delete API response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ DiveJournalDisplay: Delete successful:', result);
        
        // 🚀 STEP 2: Update local state
        const updatedLogs = logs.filter(log => log.id !== logToDelete.id);
        setLogs(updatedLogs);
        
        // 🚀 STEP 3: Update localStorage
        try {
          localStorage.setItem(`diveLogs-${userId}`, JSON.stringify(updatedLogs));
          console.log('💾 DiveJournalDisplay: Updated localStorage after delete');
        } catch (error) {
          console.warn("⚠️ DiveJournalDisplay: Failed to update localStorage:", error);
        }
        
        // 🚀 STEP 4: Notify parent components
        if (onDiveLogDeleted) {
          console.log('📢 DiveJournalDisplay: Notifying parent of successful delete...');
          onDiveLogDeleted(logToDelete, result);
        }
        
        if (onRefreshDiveLogs) {
          console.log('🔄 DiveJournalDisplay: Triggering parent dive logs refresh...');
          onRefreshDiveLogs();
        }
        
        // 🚀 STEP 5: Show success message in chat
        if (setMessages) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `🗑️ **Dive Log Deleted** \n\nThe dive log from ${logToDelete.date} at ${logToDelete.location || 'unknown location'} has been removed.`
          }]);
        }
        
        console.log('✅ DiveJournalDisplay: Delete process completed successfully');
        
      } else {
        throw new Error(`API delete failed: ${response.status} ${response.statusText}`);
      }
      
    } catch (error) {
      console.error("❌ DiveJournalDisplay: Failed to delete dive log via API:", error);
      
      // 🚀 FALLBACK: Delete from localStorage only
      const updatedLogs = logs.filter(log => log.id !== logToDelete.id);
      setLogs(updatedLogs);
      
      try {
        localStorage.setItem(`diveLogs-${userId}`, JSON.stringify(updatedLogs));
        console.log('💾 DiveJournalDisplay: Fallback - deleted from localStorage only');
      } catch (localError) {
        console.error("❌ DiveJournalDisplay: Even localStorage delete failed:", localError);
      }
      
      // Notify parent even if API failed
      if (onDiveLogDeleted) {
        onDiveLogDeleted(logToDelete, { success: false, error: error.message, deletedLocally: true });
      }
      
      // Show error message in chat
      if (setMessages) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `⚠️ **Dive Log Deleted Locally** \n\nThe dive log was removed from your device but couldn't sync to the cloud. The deletion will sync automatically when connection is restored. \n\nError: ${error.message}`
        }]);
      }
    }
  };

  // If not open and not embedded, don't render
  if (!isEmbedded && !isOpen) return null;

  // Sort logs
  const sortedLogs = [...logs].sort((a, b) => {
    switch (sortBy) {
      case 'depth':
        return (b.reachedDepth || 0) - (a.reachedDepth || 0);
      case 'location':
        return (a.location || '').localeCompare(b.location || '');
      default: // date
        return new Date(b.date) - new Date(a.date);
    }
  });

  if (isEmbedded) {
    return (
      <div className="h-full overflow-y-auto p-4">
        {!logs.length ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🤿</div>
            <p className={`text-lg font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
              No dive logs yet
            </p>
            <p className={`text-sm mt-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              Add your first dive using the "Add Dive" tab!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header with stats and sort */}
            <div className="flex justify-between items-center">
              <div className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                <span className="font-medium">{logs.length}</span> dive{logs.length !== 1 ? 's' : ''} logged
              </div>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`text-xs px-2 py-1 rounded border ${
                  darkMode 
                    ? "bg-gray-700 border-gray-600 text-white" 
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              >
                <option value="date">Sort by Date</option>
                <option value="depth">Sort by Depth</option>
                <option value="location">Sort by Location</option>
              </select>
            </div>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className={`p-2 rounded-lg text-center ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-blue-50 border border-blue-200"}`}>
                <div className={`text-lg font-bold ${darkMode ? "text-blue-400" : "text-blue-600"}`}>
                  {Math.max(...logs.map(l => l.reachedDepth || 0)) || 0}m
                </div>
                <div className="text-xs text-gray-500">Max Depth</div>
              </div>
              <div className={`p-2 rounded-lg text-center ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-green-50 border border-green-200"}`}>
                <div className={`text-lg font-bold ${darkMode ? "text-green-400" : "text-green-600"}`}>
                  {Math.round(logs.reduce((sum, l) => sum + (l.reachedDepth || 0), 0) / logs.length) || 0}m
                </div>
                <div className="text-xs text-gray-500">Avg Depth</div>
              </div>
              <div className={`p-2 rounded-lg text-center ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-purple-50 border border-purple-200"}`}>
                <div className={`text-lg font-bold ${darkMode ? "text-purple-400" : "text-purple-600"}`}>
                  {new Set(logs.map(l => l.location)).size}
                </div>
                <div className="text-xs text-gray-500">Locations</div>
              </div>
            </div>

            {/* Dive Logs */}
            <div className="space-y-3">
              {sortedLogs.map((log, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg border transition-all hover:shadow-md ${
                    darkMode 
                      ? "bg-gray-800 border-gray-700 hover:bg-gray-750" 
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                          {new Date(log.date).toLocaleDateString()}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          log.disciplineType === 'depth' 
                            ? "bg-blue-100 text-blue-800" 
                            : "bg-green-100 text-green-800"
                        }`}>
                          {log.disciplineType}
                        </span>
                      </div>
                      {log.discipline && (
                        <p className={`text-sm font-medium ${darkMode ? "text-blue-400" : "text-blue-600"}`}>
                          {log.discipline}
                        </p>
                      )}
                      {log.location && (
                        <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                          📍 {log.location}
                        </p>
                      )}
                    </div>
                    
                    {/* Depth Badge */}
                    {log.reachedDepth && (
                      <div className={`text-right ${darkMode ? "text-green-400" : "text-green-600"}`}>
                        <div className="text-lg font-bold">{log.reachedDepth}m</div>
                        {log.targetDepth && log.targetDepth !== log.reachedDepth && (
                          <div className="text-xs opacity-75">Target: {log.targetDepth}m</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Key Metrics */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {log.mouthfillDepth && (
                      <span className={`text-xs px-2 py-1 rounded ${darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-700"}`}>
                        MF: {log.mouthfillDepth}m
                      </span>
                    )}
                    {log.totalDiveTime && (
                      <span className={`text-xs px-2 py-1 rounded ${darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-700"}`}>
                        {log.totalDiveTime}
                      </span>
                    )}
                    {log.exit && (
                      <span className={`text-xs px-2 py-1 rounded ${darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-700"}`}>
                        {log.exit}
                      </span>
                    )}
                  </div>

                  {/* Issues */}
                  {(log.issueDepth || log.squeeze || log.issueComment) && (
                    <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs">
                      <div className="text-red-600 dark:text-red-400 font-medium mb-1">⚠️ Issues</div>
                      {log.issueDepth && <div>Issue at {log.issueDepth}m</div>}
                      {log.squeeze && <div>Squeeze experienced</div>}
                      {log.issueComment && <div>"{log.issueComment}"</div>}
                    </div>
                  )}

                  {/* Notes */}
                  {log.notes && (
                    <div className={`text-xs p-2 rounded ${darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-50 text-gray-600"}`}>
                      {log.notes.length > 100 ? `${log.notes.substring(0, 100)}...` : log.notes}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex gap-2 text-xs">
                      <button className={`${darkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-500"}`}>
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteDiveLog(log)} 
                        className={`${darkMode ? "text-red-400 hover:text-red-300" : "text-red-600 hover:text-red-500"}`}
                      >
                        Delete
                      </button>
                      <button 
                        onClick={() => handleAnalyzeDiveLog(log)} 
                        className={`${darkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-600 hover:text-gray-500"}`}
                        disabled={analyzingLogId === log.id}
                      >
                        {analyzingLogId === log.id ? 'Analyzing...' : 'Analyze'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-gray-900 border-l border-gray-700 z-50 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">📘 Dive Journal</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-700">
        <div className="flex">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'summary' 
                ? 'bg-blue-600 text-white border-b-2 border-blue-400' 
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            📊 Summary
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'history' 
                ? 'bg-blue-600 text-white border-b-2 border-blue-400' 
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            📋 History
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'add' 
                ? 'bg-blue-600 text-white border-b-2 border-blue-400' 
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            ➕ Add New
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4 flex-1 overflow-y-auto">
        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-4xl mb-2">🤿</div>
              <h3 className="text-lg font-semibold text-white mb-2">Dive Summary</h3>
              
              {logs.length === 0 ? (
                <div className="text-gray-400">
                  <p>No dives logged yet.</p>
                  <p className="text-sm mt-1">Use the "Add New" tab to start logging!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-800 p-3 rounded border border-gray-700">
                      <div className="text-2xl font-bold text-blue-400">{logs.length}</div>
                      <div className="text-xs text-gray-400">Total Dives</div>
                    </div>
                    <div className="bg-gray-800 p-3 rounded border border-gray-700">
                      <div className="text-2xl font-bold text-green-400">
                        {Math.max(...logs.map(log => parseInt(log.reachedDepth) || 0))}m
                      </div>
                      <div className="text-xs text-gray-400">Max Depth</div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-800 p-3 rounded border border-gray-700">
                    <div className="text-sm text-gray-300 mb-2">Recent Activities</div>
                    <div className="space-y-1 text-xs">
                      {logs.slice(0, 3).map((log, i) => (
                        <div key={i} className="flex justify-between text-gray-400">
                          <span>{log.date}</span>
                          <span>{log.reachedDepth}m</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setActiveTab('history')}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                  >
                    View All Dives →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-medium">Dive History</h3>
              <button 
                onClick={() => setActiveTab('add')}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
              >
                + Add Dive
              </button>
            </div>

            {/* Existing Logs */}
            {!logs.length ? (
              <div className="text-center text-gray-400 mt-8">
                <div className="text-4xl mb-4">📝</div>
                <p>No dive logs yet.</p>
                <p className="text-sm mt-2">Start logging your dives!</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-gray-300">
                    {logs.length} dive{logs.length !== 1 ? 's' : ''} logged
                  </p>
                  <select className="text-xs bg-gray-700 text-white border border-gray-600 rounded px-2 py-1">
                    <option>Sort by Date (newest first)</option>
                    <option>Sort by Depth</option>
                    <option>Sort by Location</option>
                  </select>
                </div>
                
                <div className="grid gap-3">
                  {logs.map((log, i) => (
                    <div
                      key={i}
                      className="bg-gray-800 border border-gray-700 p-4 rounded-lg hover:bg-gray-750 transition-colors"
                    >
                      {/* Header Row */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-medium">{log.date}</span>
                            <span className="text-xs px-2 py-1 bg-blue-600 text-white rounded">
                              {log.disciplineType}
                            </span>
                          </div>
                          <p className="text-blue-300 font-medium">{log.discipline}</p>
                          {log.location && (
                            <p className="text-gray-300 text-sm">📍 {log.location}</p>
                          )}
                        </div>
                        
                        {/* Depth Badge */}
                        <div className="text-right">
                          {log.reachedDepth && (
                            <div className="text-lg font-bold text-green-400">
                              {log.reachedDepth}m
                            </div>
                          )}
                          {log.targetDepth && log.targetDepth !== log.reachedDepth && (
                            <div className="text-xs text-gray-400">
                              Target: {log.targetDepth}m
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Key Metrics Row */}
                      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                        {log.mouthfillDepth && (
                          <div className="bg-gray-700 px-2 py-1 rounded">
                            <span className="text-gray-400">MF:</span> <span className="text-white">{log.mouthfillDepth}m</span>
                          </div>
                        )}
                        {log.totalDiveTime && (
                          <div className="bg-gray-700 px-2 py-1 rounded">
                            <span className="text-gray-400">Time:</span> <span className="text-white">{log.totalDiveTime}</span>
                          </div>
                        )}
                        {log.exit && (
                          <div className="bg-gray-700 px-2 py-1 rounded">
                            <span className="text-gray-400">Exit:</span> <span className="text-white">{log.exit}</span>
                          </div>
                        )}
                        {log.attemptType && (
                          <div className="bg-gray-700 px-2 py-1 rounded">
                            <span className="text-gray-400">Type:</span> <span className="text-white">{log.attemptType}</span>
                          </div>
                        )}
                      </div>

                      {/* Issues & Notes */}
                      {(log.issueDepth || log.issueComment || log.squeeze) && (
                        <div className="mb-3 p-2 bg-red-900 bg-opacity-30 border border-red-700 rounded">
                          <div className="text-red-300 text-xs font-medium mb-1">⚠️ Issues</div>
                          {log.issueDepth && (
                            <div className="text-red-200 text-xs">Issue at: {log.issueDepth}m</div>
                          )}
                          {log.squeeze && (
                            <div className="text-red-200 text-xs">Squeeze experienced</div>
                          )}
                          {log.issueComment && (
                            <div className="text-red-200 text-xs mt-1">"{log.issueComment}"</div>
                          )}
                        </div>
                      )}

                      {/* Notes */}
                      {log.notes && (
                        <div className="mb-3 p-2 bg-gray-700 rounded">
                          <div className="text-gray-300 text-xs">{log.notes}</div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex justify-end space-x-2 pt-2 border-t border-gray-700">
                        <button className="text-blue-400 hover:text-blue-300 text-xs">
                          📝 Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteDiveLog(log)} 
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          🗑️ Delete
                        </button>
                        <button 
                          onClick={() => handleAnalyzeDiveLog(log)} 
                          className={`text-gray-400 hover:text-gray-300 text-xs ${analyzingLogId === log.id ? 'animate-pulse' : ''}`}
                          disabled={analyzingLogId === log.id}
                        >
                          {analyzingLogId === log.id ? 'Analyzing...' : '📊 Analyze'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add New Tab */}
        {activeTab === 'add' && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-600">
            <h3 className="text-white font-semibold mb-4">📝 New Dive Entry</h3>
            
            <div className="space-y-4">
              {/* Basic Info Section */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Date</label>
                  <input
                    type="date"
                    name="date"
                    value={newEntry.date}
                    onChange={handleInputChange}
                    className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Discipline Type</label>
                  <select
                    name="disciplineType"
                    value={newEntry.disciplineType}
                    onChange={handleInputChange}
                    className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                  >
                    <option value="depth">Depth</option>
                    <option value="pool">Pool</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Discipline</label>
                  <input
                    type="text"
                    name="discipline"
                    value={newEntry.discipline}
                    onChange={handleInputChange}
                    placeholder="e.g., CWT, CNF, FIM"
                    className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Location</label>
                  <input
                    type="text"
                    name="location"
                    value={newEntry.location}
                    onChange={handleInputChange}
                    placeholder="e.g., Blue Hole, Egypt"
                    className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                  />
                </div>
              </div>

              {/* Depth Section */}
              <div className="bg-gray-700 p-3 rounded border border-gray-600">
                <h4 className="text-sm font-medium text-white mb-2">📏 Depth Information</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Target Depth (m)</label>
                    <input
                      type="number"
                      name="targetDepth"
                      value={newEntry.targetDepth}
                      onChange={handleInputChange}
                      placeholder="25"
                      className="w-full p-2 bg-gray-600 text-white rounded border border-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Reached Depth (m)</label>
                    <input
                      type="number"
                      name="reachedDepth"
                      value={newEntry.reachedDepth}
                      onChange={handleInputChange}
                      placeholder="23"
                      className="w-full p-2 bg-gray-600 text-white rounded border border-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Mouthfill Depth (m)</label>
                    <input
                      type="number"
                      name="mouthfillDepth"
                      value={newEntry.mouthfillDepth}
                      onChange={handleInputChange}
                      placeholder="15"
                      className="w-full p-2 bg-gray-600 text-white rounded border border-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Issue Depth (m)</label>
                    <input
                      type="number"
                      name="issueDepth"
                      value={newEntry.issueDepth}
                      onChange={handleInputChange}
                      placeholder="20"
                      className="w-full p-2 bg-gray-600 text-white rounded border border-gray-500"
                    />
                  </div>
                </div>
              </div>

              {/* Performance Section */}
              <div className="bg-gray-700 p-3 rounded border border-gray-600">
                <h4 className="text-sm font-medium text-white mb-2">⏱️ Performance Metrics</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Duration/Distance</label>
                    <input
                      type="text"
                      name="durationOrDistance"
                      value={newEntry.durationOrDistance}
                      onChange={handleInputChange}
                      placeholder="2:30 or 50m"
                      className="w-full p-2 bg-gray-600 text-white rounded border border-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Total Dive Time</label>
                    <input
                      type="text"
                      name="totalDiveTime"
                      value={newEntry.totalDiveTime}
                      onChange={handleInputChange}
                      placeholder="3:45"
                      className="w-full p-2 bg-gray-600 text-white rounded border border-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Exit Condition</label>
                    <input
                      type="text"
                      name="exit"
                      value={newEntry.exit}
                      onChange={handleInputChange}
                      placeholder="Clean, LMC, BO, etc."
                      className="w-full p-2 bg-gray-600 text-white rounded border border-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Attempt Type</label>
                    <input
                      type="text"
                      name="attemptType"
                      value={newEntry.attemptType}
                      onChange={handleInputChange}
                      placeholder="Training, PB attempt, etc."
                      className="w-full p-2 bg-gray-600 text-white rounded border border-gray-500"
                    />
                  </div>
                </div>
              </div>

              {/* Issues & Notes Section */}
              <div className="bg-gray-700 p-3 rounded border border-gray-600">
                <h4 className="text-sm font-medium text-white mb-2">⚠️ Issues & Notes</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Issue Comment</label>
                    <textarea
                      name="issueComment"
                      value={newEntry.issueComment}
                      onChange={handleInputChange}
                      placeholder="Describe any issues encountered..."
                      rows={2}
                      className="w-full p-2 bg-gray-600 text-white rounded border border-gray-500"
                    />
                  </div>

                  <div>
                    <label className="flex items-center text-sm text-gray-300">
                      <input
                        type="checkbox"
                        name="squeeze"
                        checked={newEntry.squeeze}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      Squeeze experienced
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Surface Protocol</label>
                    <input
                      type="text"
                      name="surfaceProtocol"
                      value={newEntry.surfaceProtocol}
                      onChange={handleInputChange}
                      placeholder="OK sign, breathing pattern, etc."
                      className="w-full p-2 bg-gray-600 text-white rounded border border-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Upload Dive Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="w-full p-2 bg-gray-600 text-white rounded border border-gray-500 file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                    />
                    {newEntry.imagePreview && (
                      <img 
                        src={newEntry.imagePreview} 
                        alt="Preview" 
                        className="mt-2 max-w-full h-32 object-cover rounded"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Notes</label>
                    <textarea
                      name="notes"
                      value={newEntry.notes}
                      onChange={handleInputChange}
                      placeholder="How did the dive go? Any observations..."
                      rows={3}
                      className="w-full p-2 bg-gray-600 text-white rounded border border-gray-500"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded font-semibold transition-colors"
              >
                💾 Save Dive Entry
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
