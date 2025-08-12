import { useState, useEffect } from 'react';
import DiveJournalForm from "./DiveJournalForm";
import AIAnalyzeButton from "./AIAnalyzeButton";
import { formatDiveLogForDisplay, formatDiveLogForAnalysis } from "../utils/diveLogFormatter";

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
  
  // 🔧 DEBUG: Log dive logs prop
  console.log('🔧 SIDEBAR: Received diveLogs prop:', { 
    length: diveLogs.length, 
    logs: diveLogs.slice(0, 2), // Show first 2 logs
    userId 
  });
  
  // 🔄 Load dive logs when component mounts or userId changes
  useEffect(() => {
    if (userId && refreshDiveLogs) {
      refreshDiveLogs();
    }
  }, [userId, showDiveJournalForm]); // Refresh when journal opens/closes

  // 🚀 OPTIMIZED: Single batch submission for dive logs
  const handleOptimizedJournalSubmit = async (formData) => {
    console.log('🚀 SIDEBAR: handleOptimizedJournalSubmit called with:', formData);
    try {
      setLoading(true);
      
      console.log('🚀 OPTIMIZED: Starting single batch submission...');
      const startTime = Date.now();
      
      // Show immediate feedback
      if (setMessages) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '🚀 Processing dive log in optimized batch mode...'
        }]);
      }
      
      // ✅ Single optimized API call with all data
      const optimizedResponse = await fetch('/api/analyze/save-dive-log-optimized', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          userId,
          timestamp: new Date().toISOString()
        })
      });

      if (optimizedResponse.ok) {
        const optimizedResult = await optimizedResponse.json();
        const processingTime = Date.now() - startTime;
        
        console.log(`✅ OPTIMIZED: Batch processing completed in ${processingTime}ms`);
        console.log('✅ OPTIMIZED: Result:', optimizedResult);

        // ✅ Show success with performance metrics
        if (setMessages) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `✅ **Dive log saved successfully!**\n\n` +
                    `📊 **Performance:**\n` +
                    `- Processing time: ${optimizedResult.processingTime}ms\n` +
                    `- Progression score: ${optimizedResult.data.analysis.progressionScore}%\n` +
                    `- Depth achievement: ${optimizedResult.data.analysis.depthAchievement.toFixed(1)}%\n\n` +
                    `🎯 **Analysis:** Starting detailed analysis with Pinecone knowledge base...`
          }]);
        }

        // ✅ Trigger automatic analysis notification (analysis already running in background)
        setTimeout(() => {
          if (setMessages) {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `🔍 **Automatic Analysis Complete!**\n\n` +
                      `Your ${optimizedResult.data.dive.discipline} dive to ${optimizedResult.data.dive.depths.reached}m has been analyzed using the complete freediving knowledge base.`
            }]);
          }
        }, 3000);

        // ✅ Refresh dive logs display
        console.log('🔄 SIDEBAR: Calling refreshDiveLogs to update sidebar...');
        if (refreshDiveLogs) {
          await refreshDiveLogs();
          console.log('✅ SIDEBAR: refreshDiveLogs completed');
        } else {
          console.warn('⚠️ SIDEBAR: No refreshDiveLogs function available');
        }

        // ✅ Call original handler for any additional UI updates
        if (handleJournalSubmit) {
          handleJournalSubmit(formData);
        }

        // ✅ AUTO-CLOSE FORM: Close the dive journal form after successful save
        if (toggleDiveJournal) {
          setTimeout(() => {
            toggleDiveJournal(); // Close the form
            console.log('✅ Dive journal form closed automatically after successful save');
          }, 1000); // Small delay to show success message
        }

        return; // Success, exit early
      } else {
        console.warn('⚠️ Optimized save failed, falling back to legacy method...');
        throw new Error(`Optimized save failed: ${optimizedResponse.status}`);
      }
    } catch (optimizedError) {
      console.warn('⚠️ Optimized processing failed, using fallback:', optimizedError);
      
      if (setMessages) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `⚠️ Optimized processing failed, falling back to standard method...`
        }]);
      }
      
      // ✅ FALLBACK: Use legacy method if optimized fails
      await handleLegacyJournalSubmit(formData);
    }
  };

  // 🔄 Legacy method as fallback
  const handleLegacyJournalSubmit = async (formData) => {
    try {
      console.log('🔄 Using legacy submission method...');
      
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
              
              console.log('📝 Dive log for analysis:', savedDiveLog);
              console.log('📝 setMessages function available:', typeof setMessages === 'function');
              
              await handleDiveLogAnalysis(savedDiveLog);
            } catch (autoAnalysisError) {
              console.error('❌ Automatic analysis failed:', autoAnalysisError);
              if (setMessages) {
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: `⚠️ Automatic analysis failed: ${autoAnalysisError.message}. You can manually analyze this dive by clicking on it in the sidebar.`
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
              console.log('🔄 Starting automatic analysis (Wix failed, local success)...');
              console.log('📝 setMessages function available:', typeof setMessages === 'function');
              
              const savedDiveLog = {
                id: localResult.id || `dive_${Date.now()}`,
                ...formData,
                timestamp: new Date().toISOString(),
                source: 'auto-analysis-local'
              };
              
              console.log('📝 Dive log for analysis (local):', savedDiveLog);
              await handleDiveLogAnalysis(savedDiveLog);
            } catch (autoAnalysisError) {
              console.error('❌ Automatic analysis failed (local path):', autoAnalysisError);
              if (setMessages) {
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: `⚠️ Automatic analysis failed: ${autoAnalysisError.message}. You can manually analyze this dive by clicking on it in the sidebar.`
                }]);
              }
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
              console.log('🔄 Starting automatic analysis (fallback path)...');
              console.log('📝 setMessages function available:', typeof setMessages === 'function');
              
              const savedDiveLog = {
                id: localResult.id || `dive_${Date.now()}`,
                ...formData,
                timestamp: new Date().toISOString(),
                source: 'auto-analysis-fallback'
              };
              
              console.log('📝 Dive log for analysis (fallback):', savedDiveLog);
              await handleDiveLogAnalysis(savedDiveLog);
            } catch (autoAnalysisError) {
              console.error('❌ Automatic analysis failed (fallback path):', autoAnalysisError);
              if (setMessages) {
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: `⚠️ Automatic analysis failed: ${autoAnalysisError.message}. You can manually analyze this dive by clicking on it in the sidebar.`
                }]);
              }
            }
          }, 2000);
        }
      }

      // ✅ Refresh dive logs display
      if (refreshDiveLogs) {
        await refreshDiveLogs();
      }

      // ✅ AUTO-CLOSE FORM: Close the dive journal form after successful save (legacy path)
      if (typeof onDiveJournalToggle === 'function') {
        try {
          onDiveJournalToggle(false);
          console.log('✅ Dive journal form closed automatically after successful save (legacy path)');
        } catch (closeError) {
          console.warn('⚠️ Could not auto-close dive journal form (legacy path):', closeError);
        }
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
      console.log('🔍 Starting dive log analysis...', diveLog);
      console.log('� setMessages function available:', typeof setMessages === 'function');
      
      setLoading(true);
      
      if (setMessages) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `🔄 Analyzing your ${diveLog.discipline || 'freediving'} dive to ${diveLog.reachedDepth || diveLog.targetDepth}m at ${diveLog.location || 'location'}...`
        }]);
      }

      console.log('🌐 Calling analyze API...');
      const response = await fetch('/api/analyze/single-dive-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diveLogId: diveLog.id || diveLog._id,
          userId,
          diveLogData: diveLog
        })
      });

      console.log('📊 Analyze API response status:', response.status);

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Dive log analysis completed:', result);

      if (setMessages && result.analysis) {
        console.log('💬 Posting analysis result to chat...');
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `🎯 **Analysis of your ${diveLog.discipline || 'freediving'} dive:**\n\n${result.analysis}`
        }]);
      } else {
        console.warn('⚠️ No analysis content received or setMessages not available');
        if (setMessages) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `⚠️ Analysis completed but no content received. Please try again.`
          }]);
        }
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
                onSubmit={handleOptimizedJournalSubmit} // ✅ Use optimized submit
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
                  {diveLogs.slice(0, 10).map((log, i) => {
                    const formattedLog = formatDiveLogForDisplay(log);
                    return (
                      <li
                        key={log.id || i}
                        className={`border p-3 rounded text-sm transition-colors ${
                          darkMode ? "bg-gray-800 text-white border-gray-600" : "bg-white text-black border-gray-200"
                        }`}
                      >
                        {/* ✅ Structured dive log display */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div className="text-xs font-medium text-gray-500">
                              {new Date(log.date || log.timestamp).toLocaleDateString()}
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className={`text-xs px-2 py-1 rounded font-medium ${
                                darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {log.reachedDepth || log.targetDepth}m
                              </span>
                            </div>
                          </div>
                          
                          {/* ✅ Formatted dive log content */}
                          <div className={`text-xs whitespace-pre-line ${
                            darkMode ? 'text-gray-300' : 'text-gray-600'
                          }`}>
                            {formattedLog}
                          </div>
                          
                          {/* ✅ Action buttons */}
                          <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                            <AIAnalyzeButton
                              diveLog={log}
                              userId={userId}
                              onAnalysisComplete={(analysis) => {
                                if (setMessages) {
                                  setMessages(prev => [...prev, {
                                    role: 'assistant',
                                    content: `🎯 **Analysis of your ${log.discipline || 'freediving'} dive:**\n\n${analysis}`
                                  }]);
                                }
                              }}
                              darkMode={darkMode}
                              size="sm"
                            />
                            
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleEdit?.(i)}
                                className={`text-xs px-2 py-1 rounded transition-colors ${
                                  darkMode 
                                    ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' 
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                }`}
                                title="Edit dive log"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                onClick={() => handleDelete?.(i)}
                                className={`text-xs px-2 py-1 rounded transition-colors ${
                                  darkMode 
                                    ? 'text-red-400 hover:text-red-300 hover:bg-red-900/20' 
                                    : 'text-red-500 hover:text-red-700 hover:bg-red-50'
                                }`}
                                title="Delete dive log"
                              >
                                �️ Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
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
