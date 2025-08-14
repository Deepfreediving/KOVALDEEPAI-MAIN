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
  onRefreshDiveLogs,  // 🚀 NEW: Callback to refresh dive logs in parent
  editingLog = null,  // 🚀 NEW: Log to edit (pre-fills form)
  onEditDiveLog       // ✅ V5.0: Edit callback to pass to SavedDiveLogsViewer
}) {
  const [logs, setLogs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [sortBy, setSortBy] = useState('date');
  const [activeTab, setActiveTab] = useState('saved-logs'); // Tab navigation: saved-logs, add-new
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
  const [isEditMode, setIsEditMode] = useState(false); // Track if we're editing

  // ✅ Handle editing mode - pre-fill form when editingLog is provided
  useEffect(() => {
    if (editingLog) {
      console.log('📝 DiveJournalDisplay: Entering edit mode for log:', editingLog.id);
      setNewEntry({
        ...editingLog,
        imageFile: null, // Reset file input
        imagePreview: editingLog.imageUrl || null // Use existing image URL if available
      });
      setIsEditMode(true);
      setActiveTab('add-new'); // Switch to form tab
    } else {
      setIsEditMode(false);
    }
  }, [editingLog]);

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
        console.log('📭 DiveJournalDisplay: No stored logs found');
      }
    } catch (error) {
      console.error('❌ DiveJournalDisplay: Failed to load logs:', error);
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
      id: isEditMode ? editingLog.id : Date.now().toString(),
      timestamp: new Date().toISOString(),
      userId: userId // Ensure userId is included
    };
    
    console.log('📝 DiveJournalDisplay: Prepared dive log data:', {
      id: newLog.id,
      userId: newLog.userId,
      location: newLog.location,
      depth: newLog.reachedDepth || newLog.targetDepth,
      date: newLog.date,
      isEditMode
    });
    
    try {
      // 🚀 STEP 1: Save to Wix via API (backend handles both Wix and localStorage)
      console.log('🌐 DiveJournalDisplay: Saving to Wix via API...');
      const response = await fetch('/api/analyze/save-dive-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newLog)
      });

      console.log('📥 DiveJournalDisplay: Save API response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ DiveJournalDisplay: Save successful:', result);
        
        // 🚀 STEP 2: Update local state with proper deduplication
        let updatedLogs;
        if (isEditMode) {
          updatedLogs = logs.map(log => log.id === newLog.id ? newLog : log);
          console.log('✅ DiveJournalDisplay: Updated existing log in local state');
        } else {
          // Check for duplicates before adding
          const existingLog = logs.find(log => 
            log.id === newLog.id || 
            (log.date === newLog.date && 
             log.reachedDepth === newLog.reachedDepth && 
             log.location === newLog.location)
          );
          
          if (existingLog) {
            console.log('⚠️ DiveJournalDisplay: Duplicate log detected, updating instead of adding');
            updatedLogs = logs.map(log => 
              (log.id === newLog.id || 
               (log.date === newLog.date && 
                log.reachedDepth === newLog.reachedDepth && 
                log.location === newLog.location)) ? newLog : log
            );
          } else {
            updatedLogs = [...logs, newLog];
            console.log('✅ DiveJournalDisplay: Added new log to local state');
          }
        }
        setLogs(updatedLogs);
        
        // 🚀 STEP 3: Update localStorage with deduplication
        try {
          const storageKey = `diveLogs-${userId}`;
          const existingLogs = JSON.parse(localStorage.getItem(storageKey) || '[]');
          
          // Deduplicate logs in localStorage too
          const filteredExisting = existingLogs.filter(log => 
            log.id !== newLog.id && 
            !(log.date === newLog.date && 
              log.reachedDepth === newLog.reachedDepth && 
              log.location === newLog.location)
          );
          
          const finalLogs = [...filteredExisting, newLog].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
          );
          
          localStorage.setItem(storageKey, JSON.stringify(finalLogs));
          console.log('💾 DiveJournalDisplay: Updated localStorage with deduplication');
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
            content: `✅ **Dive Log ${isEditMode ? 'Updated' : 'Saved'}** \n\n${newLog.discipline || 'Freediving'} dive to ${newLog.reachedDepth || newLog.targetDepth}m at ${newLog.location || 'location'} has been ${isEditMode ? 'updated' : 'saved'} successfully.`
          }]);
        }
        
        // Reset form and close popup after successful save
        resetForm();
        
        // 🚀 Close popup journal after save
        if (onClose && !isEmbedded) {
          console.log('🔒 DiveJournalDisplay: Closing popup journal after successful save');
          onClose();
        }
        
        // 🚀 Switch back to saved logs tab if embedded
        if (isEmbedded) {
          setActiveTab('saved-logs');
        }
        
        console.log('✅ DiveJournalDisplay: Dive log submit process completed successfully');
        
      } else {
        throw new Error(`API save failed: ${response.status} ${response.statusText}`);
      }
      
    } catch (error) {
      console.error("❌ DiveJournalDisplay: Failed to save dive log via API:", error);
      
      // Show error message in chat
      if (setMessages) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `❌ **Save Failed** \n\nFailed to ${isEditMode ? 'update' : 'save'} dive log: ${error.message}. Please try again.`
        }]);
      }
    }
  };

  const resetForm = () => {
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
    setIsEditMode(false);
  };

  // ✅ Add analyze functionality for individual dive logs
  const handleAnalyzeDiveLog = async (log) => {
    if (!log || !userId) {
      console.warn('⚠️ Missing log or userId for analysis');
      return;
    }
    
    try {
      console.log('🔍 Starting dive log analysis in DiveJournalDisplay:', log);
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
      
      // Show error message in chat
      if (setMessages) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `❌ **Delete Failed** \n\nFailed to delete dive log: ${error.message}. Please try again.`
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
      <div className="h-full flex flex-col">
        {/* Tab Navigation for Embedded */}
        <div className={`border-b ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
          <div className="flex">
            <button
              onClick={() => setActiveTab('saved-logs')}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === 'saved-logs' 
                  ? darkMode 
                    ? 'bg-blue-600 text-white border-b-2 border-blue-400' 
                    : 'bg-blue-500 text-white border-b-2 border-blue-400'
                  : darkMode
                    ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              💾 Saved Dive Logs
            </button>
            <button
              onClick={() => setActiveTab('add-new')}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === 'add-new' 
                  ? darkMode 
                    ? 'bg-blue-600 text-white border-b-2 border-blue-400' 
                    : 'bg-blue-500 text-white border-b-2 border-blue-400'
                  : darkMode
                    ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              ✍️ {isEditMode ? 'Edit Dive Log' : 'Create New Dive Log'}
            </button>
          </div>
        </div>

        {/* Tab Content for Embedded */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Saved Dive Logs Tab */}
          {activeTab === 'saved-logs' && (
            <div className="space-y-4">
              {!logs.length ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🤿</div>
                  <p className={`text-lg font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                    No dive logs yet
                  </p>
                  <p className={`text-sm mt-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    Add your first dive using the "Create New Dive Log" tab!
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
                  
                  {/* Dive Logs List */}
                  <div className="space-y-3">
                    {sortedLogs.map((log, index) => (
                      <div
                        key={log.id || index}
                        className={`p-4 rounded-lg border ${
                          darkMode 
                            ? "bg-gray-800 border-gray-700" 
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                              {new Date(log.date).toLocaleDateString()} - {log.discipline || 'Freediving'}
                            </div>
                            <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                              📍 {log.location || 'Unknown location'}
                            </div>
                            <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                              🎯 Target: {log.targetDepth || 0}m | Reached: {log.reachedDepth || 0}m
                            </div>
                            {log.notes && (
                              <div className={`text-sm mt-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                                📝 {log.notes.slice(0, 100)}{log.notes.length > 100 ? '...' : ''}
                              </div>
                            )}
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex flex-col gap-2 ml-4">
                            <button
                              onClick={() => handleAnalyzeDiveLog(log)}
                              disabled={analyzingLogId === log.id}
                              className={`px-3 py-1 text-xs rounded transition-colors ${
                                analyzingLogId === log.id
                                  ? 'bg-gray-400 cursor-not-allowed'
                                  : darkMode
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                              }`}
                            >
                              {analyzingLogId === log.id ? '⏳ Analyzing...' : '🤖 Analyze'}
                            </button>
                            <button
                              onClick={() => {
                                // Set editing mode and switch to form tab
                                setNewEntry({
                                  ...log,
                                  imageFile: null,
                                  imagePreview: log.imageUrl || null
                                });
                                setIsEditMode(true);
                                setActiveTab('add-new');
                              }}
                              className={`px-3 py-1 text-xs rounded transition-colors ${
                                darkMode
                                  ? 'bg-green-600 hover:bg-green-700 text-white'
                                  : 'bg-green-500 hover:bg-green-600 text-white'
                              }`}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDeleteDiveLog(log)}
                              className={`px-3 py-1 text-xs rounded transition-colors ${
                                darkMode
                                  ? 'bg-red-600 hover:bg-red-700 text-white'
                                  : 'bg-red-500 hover:bg-red-600 text-white'
                              }`}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Add New / Edit Dive Log Tab */}
          {activeTab === 'add-new' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
                  {isEditMode ? '✏️ Edit Dive Log' : '✍️ Create New Dive Log'}
                </h3>
                {isEditMode && (
                  <button
                    onClick={() => {
                      resetForm();
                      setActiveTab('saved-logs');
                    }}
                    className={`text-sm px-3 py-1 rounded ${
                      darkMode
                        ? 'bg-gray-600 hover:bg-gray-700 text-gray-300'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }`}
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Basic Information */}
                <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-blue-50 border border-blue-200"}`}>
                  <h4 className={`text-sm font-semibold mb-3 ${darkMode ? "text-white" : "text-gray-900"}`}>
                    📅 Basic Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Date</label>
                      <input 
                        name="date" 
                        type="date" 
                        value={newEntry.date} 
                        onChange={handleInputChange} 
                        className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                        required 
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Type</label>
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

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Discipline</label>
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
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Location</label>
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
                </div>

                {/* Depth Section */}
                <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-green-50 border border-green-200"}`}>
                  <h4 className={`text-sm font-semibold mb-3 ${darkMode ? "text-white" : "text-gray-900"}`}>
                    📏 Depth Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Target Depth (m)</label>
                      <input
                        type="number"
                        name="targetDepth"
                        value={newEntry.targetDepth}
                        onChange={handleInputChange}
                        placeholder="25"
                        className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Reached Depth (m)</label>
                      <input
                        type="number"
                        name="reachedDepth"
                        value={newEntry.reachedDepth}
                        onChange={handleInputChange}
                        placeholder="23"
                        className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Mouthfill Depth (m)</label>
                      <input
                        type="number"
                        name="mouthfillDepth"
                        value={newEntry.mouthfillDepth}
                        onChange={handleInputChange}
                        placeholder="15"
                        className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Issue Depth (m)</label>
                      <input
                        type="number"
                        name="issueDepth"
                        value={newEntry.issueDepth}
                        onChange={handleInputChange}
                        placeholder="20"
                        className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Performance Section */}
                <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-purple-50 border border-purple-200"}`}>
                  <h4 className={`text-sm font-semibold mb-3 ${darkMode ? "text-white" : "text-gray-900"}`}>
                    ⏱️ Performance Metrics
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Duration/Distance</label>
                      <input
                        type="text"
                        name="durationOrDistance"
                        value={newEntry.durationOrDistance}
                        onChange={handleInputChange}
                        placeholder="2:30 or 50m"
                        className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Total Dive Time</label>
                      <input
                        type="text"
                        name="totalDiveTime"
                        value={newEntry.totalDiveTime}
                        onChange={handleInputChange}
                        placeholder="3:45"
                        className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Exit Condition</label>
                      <input
                        type="text"
                        name="exit"
                        value={newEntry.exit}
                        onChange={handleInputChange}
                        placeholder="Clean, LMC, BO, etc."
                        className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Attempt Type</label>
                      <input
                        type="text"
                        name="attemptType"
                        value={newEntry.attemptType}
                        onChange={handleInputChange}
                        placeholder="Training, PB attempt, etc."
                        className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Issues & Notes Section */}
                <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-orange-50 border border-orange-200"}`}>
                  <h4 className={`text-sm font-semibold mb-3 ${darkMode ? "text-white" : "text-gray-900"}`}>
                    ⚠️ Issues & Notes
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Issue Comment</label>
                      <textarea
                        name="issueComment"
                        value={newEntry.issueComment}
                        onChange={handleInputChange}
                        placeholder="Describe any issues encountered..."
                        rows={2}
                        className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                      />
                    </div>

                    <div>
                      <label className={`flex items-center text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
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
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Surface Protocol</label>
                      <input
                        type="text"
                        name="surfaceProtocol"
                        value={newEntry.surfaceProtocol}
                        onChange={handleInputChange}
                        placeholder="OK sign, breathing pattern, etc."
                        className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Upload Dive Image</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:bg-blue-600 file:text-white hover:file:bg-blue-700"
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
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Notes</label>
                      <textarea
                        name="notes"
                        value={newEntry.notes}
                        onChange={handleInputChange}
                        placeholder="How did the dive go? Any observations..."
                        rows={3}
                        className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded font-semibold transition-colors"
                >
                  💾 {isEditMode ? 'Update Dive Entry' : 'Save Dive Entry'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Rest of the component for non-embedded (popup) mode would go here...
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"} rounded-lg shadow-xl w-full max-w-4xl h-5/6 flex flex-col`}>
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">🤿 Dive Journal</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Same content as embedded version */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex flex-col">
            {/* Tab Navigation for Popup */}
            <div className={`border-b ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
              <div className="flex">
                <button
                  onClick={() => setActiveTab('saved-logs')}
                  className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'saved-logs' 
                      ? darkMode 
                        ? 'bg-blue-600 text-white border-b-2 border-blue-400' 
                        : 'bg-blue-500 text-white border-b-2 border-blue-400'
                      : darkMode
                        ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  💾 Saved Dive Logs
                </button>
                <button
                  onClick={() => setActiveTab('add-new')}
                  className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'add-new' 
                      ? darkMode 
                        ? 'bg-blue-600 text-white border-b-2 border-blue-400' 
                        : 'bg-blue-500 text-white border-b-2 border-blue-400'
                      : darkMode
                        ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  ✍️ {isEditMode ? 'Edit Dive Log' : 'Create New Dive Log'}
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Saved Dive Logs Tab Content - Same as embedded */}
              {activeTab === 'saved-logs' && (
                <div className="space-y-4">
                  {!logs.length ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">🤿</div>
                      <p className={`text-lg font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                        No dive logs yet
                      </p>
                      <p className={`text-sm mt-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                        Add your first dive using the "Create New Dive Log" tab!
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
                      
                      {/* Dive Logs List */}
                      <div className="space-y-3">
                        {sortedLogs.map((log, index) => (
                          <div
                            key={log.id || index}
                            className={`p-4 rounded-lg border ${
                              darkMode 
                                ? "bg-gray-700 border-gray-600" 
                                : "bg-white border-gray-200"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                                  {new Date(log.date).toLocaleDateString()} - {log.discipline || 'Freediving'}
                                </div>
                                <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                                  📍 {log.location || 'Unknown location'}
                                </div>
                                <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                                  🎯 Target: {log.targetDepth || 0}m | Reached: {log.reachedDepth || 0}m
                                </div>
                                {log.notes && (
                                  <div className={`text-sm mt-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                                    📝 {log.notes.slice(0, 100)}{log.notes.length > 100 ? '...' : ''}
                                  </div>
                                )}
                              </div>
                              
                              {/* Action Buttons */}
                              <div className="flex flex-col gap-2 ml-4">
                                <button
                                  onClick={() => handleAnalyzeDiveLog(log)}
                                  disabled={analyzingLogId === log.id}
                                  className={`px-3 py-1 text-xs rounded transition-colors ${
                                    analyzingLogId === log.id
                                      ? 'bg-gray-400 cursor-not-allowed'
                                      : darkMode
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                                  }`}
                                >
                                  {analyzingLogId === log.id ? '⏳ Analyzing...' : '🤖 Analyze'}
                                </button>
                                <button
                                  onClick={() => {
                                    // Set editing mode and switch to form tab
                                    setNewEntry({
                                      ...log,
                                      imageFile: null,
                                      imagePreview: log.imageUrl || null
                                    });
                                    setIsEditMode(true);
                                    setActiveTab('add-new');
                                  }}
                                  className={`px-3 py-1 text-xs rounded transition-colors ${
                                    darkMode
                                      ? 'bg-green-600 hover:bg-green-700 text-white'
                                      : 'bg-green-500 hover:bg-green-600 text-white'
                                  }`}
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteDiveLog(log)}
                                  className={`px-3 py-1 text-xs rounded transition-colors ${
                                    darkMode
                                      ? 'bg-red-600 hover:bg-red-700 text-white'
                                      : 'bg-red-500 hover:bg-red-600 text-white'
                                  }`}
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Add New / Edit Dive Log Tab Content - Same as embedded */}
              {activeTab === 'add-new' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
                      {isEditMode ? '✏️ Edit Dive Log' : '✍️ Create New Dive Log'}
                    </h3>
                    {isEditMode && (
                      <button
                        onClick={() => {
                          resetForm();
                          setActiveTab('saved-logs');
                        }}
                        className={`text-sm px-3 py-1 rounded ${
                          darkMode
                            ? 'bg-gray-600 hover:bg-gray-700 text-gray-300'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                        }`}
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Basic Information */}
                    <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700 border border-gray-600" : "bg-blue-50 border border-blue-200"}`}>
                      <h4 className={`text-sm font-semibold mb-3 ${darkMode ? "text-white" : "text-gray-900"}`}>
                        📅 Basic Information
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Date</label>
                          <input 
                            name="date" 
                            type="date" 
                            value={newEntry.date} 
                            onChange={handleInputChange} 
                            className={`w-full p-2 rounded border ${darkMode ? "bg-gray-600 text-white border-gray-500" : "bg-white text-gray-900 border-gray-300"}`}
                            required 
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Type</label>
                          <select
                            name="disciplineType"
                            value={newEntry.disciplineType}
                            onChange={handleInputChange}
                            className={`w-full p-2 rounded border ${darkMode ? "bg-gray-600 text-white border-gray-500" : "bg-white text-gray-900 border-gray-300"}`}
                          >
                            <option value="depth">Depth</option>
                            <option value="pool">Pool</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Discipline</label>
                          <input
                            type="text"
                            name="discipline"
                            value={newEntry.discipline}
                            onChange={handleInputChange}
                            placeholder="e.g., CWT, CNF, FIM"
                            className={`w-full p-2 rounded border ${darkMode ? "bg-gray-600 text-white border-gray-500" : "bg-white text-gray-900 border-gray-300"}`}
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Location</label>
                          <input
                            type="text"
                            name="location"
                            value={newEntry.location}
                            onChange={handleInputChange}
                            placeholder="e.g., Blue Hole, Egypt"
                            className={`w-full p-2 rounded border ${darkMode ? "bg-gray-600 text-white border-gray-500" : "bg-white text-gray-900 border-gray-300"}`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* All other form sections go here - same as embedded version */}
                    {/* ... (continuing with all form sections) */}

                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded font-semibold transition-colors"
                    >
                      💾 {isEditMode ? 'Update Dive Entry' : 'Save Dive Entry'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
