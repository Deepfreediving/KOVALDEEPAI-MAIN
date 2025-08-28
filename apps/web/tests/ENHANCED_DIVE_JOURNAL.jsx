// Enhanced Dive Journal with Client Optimism & Background Processing
import { useEffect, useState } from "react";
import { ADMIN_USER_ID } from "@/utils/adminAuth";

export default function EnhancedDiveJournalDisplay({ 
  darkMode, 
  isOpen, 
  onClose,
  setMessages 
}) {
  const [logs, setLogs] = useState([]);
  const [newEntry, setNewEntry] = useState(/* initial state */);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');

  // 🚀 CLIENT OPTIMISM: Immediate UI feedback
  const handleSubmitWithOptimism = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    // Step 1: Create optimistic entry and show immediately
    const optimisticEntry = {
      ...newEntry,
      id: `temp-${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: 'processing', // Mark as processing
      hasImage: !!newEntry.imageFile
    };

    // Step 2: Immediately add to UI (Client Optimism)
    setLogs(prevLogs => [optimisticEntry, ...prevLogs]);
    
    // Step 3: Save to localStorage for persistence
    const storageKey = `diveLogs_${ADMIN_USER_ID}`;
    const existingLogs = JSON.parse(localStorage.getItem(storageKey) || '[]');
    localStorage.setItem(storageKey, JSON.stringify([optimisticEntry, ...existingLogs]));

    // Step 4: Show success and start background processing
    setIsSaving(false);
    onClose(); // Close modal immediately

    if (setMessages) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `✅ **Dive Entry Saved!** 

Your ${optimisticEntry.discipline || 'freediving'} dive to ${optimisticEntry.reachedDepth || optimisticEntry.targetDepth}m has been saved successfully.

${optimisticEntry.hasImage ? '🔄 Processing dive computer image in background...' : ''}`
      }]);
    }

    // Step 5: Start background processing if image present
    if (newEntry.imageFile) {
      processImageInBackground(optimisticEntry, newEntry.imageFile);
    }

    // Step 6: Reset form
    resetForm();
  };

  // 🔄 BACKGROUND PROCESSING: Image analysis without blocking UI
  const processImageInBackground = async (diveEntry, imageFile) => {
    setIsProcessing(true);
    setProcessingStatus('Extracting text from dive computer...');

    try {
      // Show processing notification
      if (setMessages) {
        setMessages(prev => [...prev, {
          role: "assistant", 
          content: "📸 **Processing Dive Computer Image**\n\n🔍 Extracting text and metrics from your dive computer display..."
        }]);
      }

      // Step 1: Upload and analyze image
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('diveLogId', diveEntry.id);

      setProcessingStatus('Analyzing dive computer data...');

      const imageResponse = await fetch('/api/openai/upload-dive-image-simple', {
        method: 'POST',
        body: formData,
      });

      if (!imageResponse.ok) {
        throw new Error('Image analysis failed');
      }

      const imageResult = await imageResponse.json();
      
      setProcessingStatus('Saving to database...');

      // Step 2: Update dive log with image data
      const enhancedDiveEntry = {
        ...diveEntry,
        id: `dive-${Date.now()}`, // Generate real ID
        imageId: imageResult.data?.imageId,
        imageUrl: imageResult.data?.imageUrl,
        imageAnalysis: imageResult.data?.analysis,
        extractedMetrics: imageResult.data?.extractedMetrics,
        ocrText: imageResult.data?.ocrText,
        status: 'completed'
      };

      // Step 3: Save enhanced entry to Supabase
      const saveResponse = await fetch('/api/supabase/save-dive-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enhancedDiveEntry),
      });

      if (saveResponse.ok) {
        // Step 4: Update UI with processed data
        setLogs(prevLogs => 
          prevLogs.map(log => 
            log.id === diveEntry.id ? enhancedDiveEntry : log
          )
        );

        // Step 5: Update localStorage
        const storageKey = `diveLogs_${ADMIN_USER_ID}`;
        const updatedLogs = JSON.parse(localStorage.getItem(storageKey) || '[]')
          .map(log => log.id === diveEntry.id ? enhancedDiveEntry : log);
        localStorage.setItem(storageKey, JSON.stringify(updatedLogs));

        // Step 6: Send to KovalAI for conversation memory
        await injectIntoKovalAIMemory(enhancedDiveEntry);

        // Step 7: Show completion notification
        if (setMessages) {
          const metrics = imageResult.data?.extractedMetrics || {};
          setMessages(prev => [...prev, {
            role: "assistant",
            content: `✅ **Image Analysis Complete!**

📊 **Extracted Metrics:**
• **Depth:** ${metrics.maxDepth || 'N/A'}m
• **Time:** ${metrics.diveTime || 'N/A'}
• **Temperature:** ${metrics.temperature || 'N/A'}°C
• **Date:** ${metrics.date || 'N/A'}

🧠 This dive data is now available for analysis throughout our conversation!`
          }]);
        }

      } else {
        throw new Error('Failed to save to database');
      }

    } catch (error) {
      console.error('Background processing error:', error);
      
      // Update status to show error
      setLogs(prevLogs => 
        prevLogs.map(log => 
          log.id === diveEntry.id ? { ...log, status: 'error', error: error.message } : log
        )
      );

      if (setMessages) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `⚠️ **Image Analysis Failed**

Your dive log was saved, but image analysis encountered an error: ${error.message}

Your dive entry is still saved and accessible.`
        }]);
      }
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  // 🧠 KOVALAI MEMORY INJECTION: Send dive data to conversation context
  const injectIntoKovalAIMemory = async (diveEntry) => {
    try {
      const memoryData = {
        type: 'dive_log',
        data: {
          id: diveEntry.id,
          date: diveEntry.date,
          location: diveEntry.location,
          discipline: diveEntry.discipline,
          depth: diveEntry.reachedDepth || diveEntry.targetDepth,
          time: diveEntry.totalDiveTime,
          notes: diveEntry.notes,
          imageAnalysis: diveEntry.imageAnalysis,
          extractedMetrics: diveEntry.extractedMetrics,
          ocrText: diveEntry.ocrText
        },
        context: `User uploaded dive log: ${diveEntry.discipline} dive to ${diveEntry.reachedDepth || diveEntry.targetDepth}m at ${diveEntry.location}. Available for analysis and coaching.`
      };

      // Send to KovalAI memory endpoint
      await fetch('/api/kovalai/inject-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memoryData)
      });

    } catch (error) {
      console.error('Failed to inject into KovalAI memory:', error);
    }
  };

  // Rest of component implementation...
  return (
    <div>
      {/* Processing Status Indicator */}
      {isProcessing && (
        <div className="fixed top-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>{processingStatus}</span>
          </div>
        </div>
      )}

      {/* Enhanced Dive Log Display with Status Indicators */}
      {logs.map(log => (
        <div key={log.id} className={`dive-log-entry ${log.status === 'processing' ? 'opacity-75' : ''}`}>
          {/* Log content */}
          <div className="flex justify-between items-center">
            <h3>{log.discipline} - {log.reachedDepth || log.targetDepth}m</h3>
            <div className="status-indicator">
              {log.status === 'processing' && (
                <span className="text-blue-500 text-sm">🔄 Processing...</span>
              )}
              {log.status === 'completed' && (
                <span className="text-green-500 text-sm">✅ Complete</span>
              )}
              {log.status === 'error' && (
                <span className="text-red-500 text-sm">❌ Error</span>
              )}
            </div>
          </div>
          
          {/* Enhanced metrics display if available */}
          {log.extractedMetrics && (
            <div className="extracted-metrics mt-2 p-2 bg-blue-50 rounded">
              <h4 className="text-sm font-semibold">📊 Computer Analysis:</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>Depth: {log.extractedMetrics.maxDepth}m</div>
                <div>Time: {log.extractedMetrics.diveTime}</div>
                <div>Temp: {log.extractedMetrics.temperature}°C</div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
