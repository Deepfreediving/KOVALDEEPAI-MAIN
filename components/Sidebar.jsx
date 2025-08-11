import { useState, useEffect } from 'react';
import DiveJournalForm from "./DiveJournalForm";

export default function Sidebar({
  sessionName,
  sessionsList = [],
  showDiveJournalForm,
  diveLogs = [], // This will be populated from API instead of localStorage
  toggleDiveJournal,
  handleSelectSession,
  handleDeleteSession,
  handleSaveSession,
  startNewSession,
  handleJournalSubmit,
  editLogIndex,
  handleEdit,
  handleDelete,
  userId,
  setLoading,
  setMessages,
  darkMode,
  connectionStatus = { pinecone: "", wix: "", openai: "" },
  loadingConnections = false,
  // NEW PROPS:
  onDiveLogsUpdate, // Callback to parent when dive logs change
  refreshDiveLogs    // Function to refresh dive logs from API
}) {
  
  // 🔄 Load dive logs when component mounts or userId changes
  useEffect(() => {
    if (userId && refreshDiveLogs) {
      refreshDiveLogs();
    }
  }, [userId, showDiveJournalForm]); // Refresh when journal opens/closes

  // 🎯 Enhanced journal submit that integrates with Wix UserMemory repeater
  const handleEnterpriseJournalSubmit = async (formData) => {
    try {
      setLoading(true);
      
      console.log('🔄 Submitting to Wix UserMemory repeater...');
      
      // ✅ Step 1: Save to local system (fast response)
      const localResponse = await fetch('/api/analyze/save-dive-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          userId,
          timestamp: new Date().toISOString()
        })
      });

      if (!localResponse.ok) {
        throw new Error(`Local save failed: ${localResponse.status}`);
      }

      const localResult = await localResponse.json();
      console.log('✅ Local dive log saved:', localResult);

      // ✅ Step 2: Save to Wix UserMemory repeater (your main database)
      try {
        const repeaterResponse = await fetch('/api/wix/dive-journal-repeater', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            title: `${formData.discipline} - ${formData.location} (${formData.reachedDepth}m)`,
            date: formData.date,
            discipline: formData.discipline,
            disciplineType: formData.disciplineType,
            location: formData.location,
            targetDepth: formData.targetDepth,
            reachedDepth: formData.reachedDepth,
            mouthfillDepth: formData.mouthfillDepth,
            issueDepth: formData.issueDepth,
            issueComment: formData.issueComment,
            exit: formData.exit,
            durationOrDistance: formData.durationOrDistance,
            attemptType: formData.attemptType,
            notes: formData.notes,
            totalDiveTime: formData.totalDiveTime,
            surfaceProtocol: formData.surfaceProtocol,
            squeeze: formData.squeeze,
            // ✅ Calculate analysis fields
            progressionScore: calculateProgressionScore(formData),
            riskFactors: identifyRiskFactors(formData),
            technicalNotes: extractTechnicalNotes(formData)
          })
        });

        if (repeaterResponse.ok) {
          const repeaterResult = await repeaterResponse.json();
          console.log('✅ Dive log saved to Wix UserMemory repeater:', repeaterResult.wixId);
          
          // ✅ Notify parent component about successful Wix save
          if (setMessages) {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `✅ Dive log saved to your training database! ID: ${repeaterResult.wixId?.substring(0, 8)}... Starting automatic analysis...`
            }]);
          }
          
          // ✅ AUTOMATIC ANALYSIS: Analyze the dive log immediately after saving
          setTimeout(async () => {
            try {
              console.log('🔄 Starting automatic analysis for new dive log...');
              
              // Create dive log object for analysis
              const savedDiveLog = {
                id: localResult.id || `dive_${Date.now()}`,
                ...formData,
                timestamp: new Date().toISOString(),
                source: 'auto-analysis'
              };
              
              await handleDiveLogAnalysis(savedDiveLog);
            } catch (autoAnalysisError) {
              console.warn('⚠️ Automatic analysis failed:', autoAnalysisError);
              if (setMessages) {
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: `⚠️ Automatic analysis failed, but you can manually analyze this dive by clicking on it in the sidebar.`
                }]);
              }
            }
          }, 2000); // Wait 2 seconds to let the save process complete
        } else {
          console.warn('⚠️ Wix repeater save failed, but local save succeeded');
          
          // ✅ AUTOMATIC ANALYSIS: Even if Wix fails, still analyze the locally saved dive log
          if (setMessages) {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `✅ Dive log saved locally! Starting automatic analysis...`
            }]);
          }
          
          setTimeout(async () => {
            try {
              const savedDiveLog = {
                id: localResult.id || `dive_${Date.now()}`,
                ...formData,
                timestamp: new Date().toISOString(),
                source: 'auto-analysis-local'
              };
              
              await handleDiveLogAnalysis(savedDiveLog);
            } catch (autoAnalysisError) {
              console.warn('⚠️ Automatic analysis failed:', autoAnalysisError);
            }
          }, 2000);
        }
      } catch (repeaterError) {
        console.warn('⚠️ Wix repeater error:', repeaterError);
        // Don't fail the whole operation if Wix fails
        
        // ✅ AUTOMATIC ANALYSIS: Even if Wix fails, still analyze if we have local save
        if (localResult.success && setMessages) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `✅ Dive log saved locally! Starting automatic analysis...`
          }]);
          
          setTimeout(async () => {
            try {
              const savedDiveLog = {
                id: localResult.id || `dive_${Date.now()}`,
                ...formData,
                timestamp: new Date().toISOString(),
                source: 'auto-analysis-fallback'
              };
              
              await handleDiveLogAnalysis(savedDiveLog);
            } catch (autoAnalysisError) {
              console.warn('⚠️ Automatic analysis failed:', autoAnalysisError);
            }
          }, 2000);
        }
      }

      // ✅ Refresh dive logs display
      if (refreshDiveLogs) {
        await refreshDiveLogs();
      }

      // ✅ Call original handler for any additional UI updates
      if (handleJournalSubmit) {
        handleJournalSubmit(formData);
      }

    } catch (error) {
      console.error('❌ Dive log submission failed:', error);
      
      // ✅ Show error message
      if (setMessages) {
        setMessages(prev => [...prev, {
          role: 'assistant', 
          content: `❌ Failed to save dive log: ${error.message}`
        }]);
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ Helper functions for dive log analysis
  const calculateProgressionScore = (formData) => {
    const depthRatio = (formData.reachedDepth / formData.targetDepth) * 100;
    const comfortBonus = formData.exit === 'Good' ? 10 : 0;
    const issuesPenalty = formData.issueDepth > 0 ? -20 : 0;
    return Math.max(0, Math.min(100, depthRatio + comfortBonus + issuesPenalty));
  };

  const identifyRiskFactors = (formData) => {
    const risks = [];
    if (formData.squeeze) risks.push('squeeze-reported');
    if (formData.issueDepth > 0) risks.push('depth-issue');
    if (formData.exit !== 'Good') risks.push('difficult-exit');
    if (formData.reachedDepth > formData.targetDepth * 1.1) risks.push('depth-exceeded');
    return risks;
  };

  const extractTechnicalNotes = (formData) => {
    const notes = [];
    if (formData.mouthfillDepth > 0) notes.push(`Mouthfill at ${formData.mouthfillDepth}m`);
    if (formData.issueComment) notes.push(`Issue: ${formData.issueComment}`);
    if (formData.surfaceProtocol) notes.push(`Surface: ${formData.surfaceProtocol}`);
    return notes.join(' | ');
  };

  // ✅ Handle click-to-analyze for individual dive logs
  const handleDiveLogAnalysis = async (diveLog) => {
    try {
      setLoading(true);
      
      console.log('🔍 Analyzing individual dive log:', diveLog);
      
      if (setMessages) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `🔄 Analyzing your ${diveLog.discipline} dive to ${diveLog.reachedDepth}m at ${diveLog.location}...`
        }]);
      }

      const response = await fetch('/api/analyze/single-dive-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diveLogId: diveLog.id || diveLog._id,
          userId,
          diveLogData: diveLog
        })
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Dive log analysis completed:', result);

      if (setMessages && result.analysis) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `🎯 **Analysis of your ${diveLog.discipline} dive:**\n\n${result.analysis}`
        }]);
      }

    } catch (error) {
      console.error('❌ Dive log analysis failed:', error);
      if (setMessages) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `❌ Failed to analyze dive log: ${error.message}. Please try again.`
        }]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside
      className={`w-[320px] h-screen border-r flex flex-col ${
        darkMode ? "bg-[#121212] text-white border-gray-700" : "bg-gray-100 text-black border-gray-200"
      }`}
    >
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Sessions */}
        <div>
          <h2 className="text-lg font-semibold mb-2">🗂️ Sessions</h2>
          <button
            onClick={startNewSession}
            className="text-blue-600 underline mb-3"
            aria-label="Start a new session"
          >
            ➕ New Session
          </button>
          {sessionsList.length > 0 ? (
            <ul className="space-y-2">
              {sessionsList.map((s, i) => (
                <li key={s.id || i} className="flex justify-between items-center">
                  <button
                    className={`text-left flex-1 px-2 py-1 rounded ${
                      s.sessionName === sessionName
                        ? "bg-blue-100 dark:bg-blue-700"
                        : darkMode
                        ? "hover:bg-gray-800"
                        : "hover:bg-gray-200"
                    }`}
                    onClick={() => handleSelectSession(s.sessionName)}
                  >
                    {s.sessionName}
                  </button>
                  <button
                    onClick={() => handleDeleteSession(i)}
                    className="text-red-500 text-xs ml-2"
                    title="Delete session"
                  >
                    ❌
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm italic text-gray-500">No sessions available</p>
          )}
        </div>

        {/* Enhanced Dive Journal */}
        <div>
          <button
            onClick={toggleDiveJournal}
            className={`w-full px-3 py-2 rounded border font-medium ${
              darkMode
                ? "bg-blue-900 hover:bg-blue-800 text-white"
                : "bg-blue-50 hover:bg-blue-100 text-black"
            }`}
          >
            {showDiveJournalForm ? "📕 Close Dive Journal" : "📘 Open Dive Journal"}
          </button>

          {showDiveJournalForm ? (
            <div className="mt-4">
              <DiveJournalForm
                onSubmit={handleEnterpriseJournalSubmit} // ✅ Use enterprise submit
                existingEntry={editLogIndex !== null ? diveLogs[editLogIndex] : null}
                userId={userId}
                setLoading={setLoading}
                setMessages={setMessages}
                darkMode={darkMode}
              />
            </div>
          ) : (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">📒 Dive Logs ({diveLogs.length})</h3>
              {diveLogs.length > 0 ? (
                <ul className="space-y-2 max-h-64 overflow-y-auto">
                  {diveLogs.slice(0, 10).map((log, i) => (
                    <li
                      key={log.id || i}
                      className={`border p-2 rounded text-sm cursor-pointer transition-colors ${
                        darkMode ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-700" : "bg-white text-black border-gray-200 hover:bg-blue-50"
                      }`}
                      onClick={() => handleDiveLogAnalysis(log)}
                      title="Click for instant AI analysis"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <strong className="text-xs">{new Date(log.date || log.timestamp).toLocaleDateString()}</strong>
                        <div className="flex items-center space-x-1">
                          <span className={`text-xs px-2 py-1 rounded ${
                            darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {log.reachedDepth || log.targetDepth}m
                          </span>
                          {/* ✅ Analysis status indicator */}
                          {log.analysisStatus === 'completed' && (
                            <span className="text-xs text-green-500" title="Already analyzed">🎯</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500 mb-2">
                        {log.discipline || log.disciplineType} • {log.location || 'Unknown location'}
                      </div>
                      
                      {/* ✅ Progress indicators */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs">
                          {log.progressionScore && (
                            <span className={`px-1 py-0.5 rounded ${
                              log.progressionScore >= 80 ? 'bg-green-100 text-green-700' :
                              log.progressionScore >= 60 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {log.progressionScore}%
                            </span>
                          )}
                          {log.riskFactors && log.riskFactors.length > 0 && (
                            <span className="ml-1 text-orange-500" title="Risk factors identified">⚠️</span>
                          )}
                        </div>
                        <div className="text-xs text-blue-500 hover:text-blue-700">
                          🔍 Click to analyze
                        </div>
                      </div>
                      
                      {/* ✅ Show sync status */}
                      {log.syncedToWix && (
                        <div className="text-xs text-green-500 mb-1">✅ Synced to cloud</div>
                      )}
                      
                      <div className="flex justify-end space-x-2 mt-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleEdit(i)}
                          className="text-blue-500 text-xs hover:underline"
                        >
                          🖊️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(i)}
                          className="text-red-500 text-xs hover:underline"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm italic text-gray-500 mb-2">No dive logs yet. Add your first dive above!</p>
                  <p className="text-xs text-gray-400">Each log will be saved to your UserMemory database for AI pattern analysis</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Save Button */}
      <div className="p-4 border-t border-gray-300 dark:border-gray-700 space-y-3">
        <button
          onClick={handleSaveSession}
          className="w-full bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
        >
          💾 Save Session
        </button>

        {/* ✅ Connection Status Dock */}
        <div className="flex space-x-4 text-xl justify-center bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {loadingConnections ? (
            <span className="text-sm italic text-gray-500">Checking connections...</span>
          ) : (
            <>
              {connectionStatus.pinecone?.includes("✅") && (
                <span title="Data Connected">🌲</span>
              )}
              {connectionStatus.openai?.includes("✅") && (
                <span title="AI Connected">🤖</span>
              )}
              {connectionStatus.wix?.includes("✅") && (
                <span title="Site Data Connected">🌀</span>
              )}
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
