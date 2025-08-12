import React, { useState, useEffect } from "react";
import SavedDiveLogsViewer from "@/components/SavedDiveLogsViewer";
import UserIdDebugger from "@/components/UserIdDebugger";
import DiveJournalForm from "@/components/DiveJournalForm";

interface DiveLog {
  date: string;
  location: string;
  depth: string;
  notes: string;
  localId?: string;
}

interface JournalProps {
  userId: string;
  onSave?: (log: DiveLog) => void;
}

export default function Journal({ userId, onSave }: JournalProps) {
  const [entry, setEntry] = useState<DiveLog>({
    date: "",
    location: "",
    depth: "",
    notes: "",
    localId: ""
  });
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [editingLog, setEditingLog] = useState<any>(null);
  const [showDiveForm, setShowDiveForm] = useState(false);

  // 🔄 NEW: Enterprise dive logs state
  const [diveLogs, setDiveLogs] = useState([]);
  const [loadingDiveLogs, setLoadingDiveLogs] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle');

  // 📊 Load dive logs from hybrid system
  const refreshDiveLogs = async () => {
    if (!userId) {
      console.log('⚠️ No userId for loading dive logs');
      return;
    }
    
    try {
      setLoadingDiveLogs(true);
      setSyncStatus('syncing');
      console.log('🔄 Loading dive logs from hybrid system...');
      
      // 🚀 Local API first (fastest)
      const localResponse = await fetch(`/api/analyze/get-dive-logs?userId=${userId}`);
      
      if (localResponse.ok) {
        const localData = await localResponse.json();
        if (localData.logs && localData.logs.length > 0) {
          setDiveLogs(localData.logs);
          setSyncStatus('synced');
          console.log(`✅ Loaded ${localData.logs.length} logs from local`);
          
          // 🌐 Background sync with Wix
          setTimeout(() => syncWithWix(localData.logs), 1000);
          return;
        }
      }
      
      // 🌐 Fallback: Load from Wix directly
      await loadFromWix();
      
    } catch (error) {
      console.error('❌ Failed to load dive logs:', error);
      setSyncStatus('error');
      setDiveLogs([]);
    } finally {
      setLoadingDiveLogs(false);
    }
  };

  // 🌐 Load from Wix backend
  const loadFromWix = async () => {
    try {
      console.log('🌐 Loading from Wix backend...');
      
      const wixResponse = await fetch(`/api/wix/dive-logs-bridge?userId=${userId}`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (wixResponse.ok) {
        const wixData = await wixResponse.json();
        if (wixData.diveLogs) {
          setDiveLogs(wixData.diveLogs);
          setSyncStatus('synced');
          console.log(`✅ Loaded ${wixData.diveLogs.length} logs from Wix DiveLogs`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to load from Wix:', error);
      setSyncStatus('error');
    }
  };

  const syncWithWix = async (logs: any[]) => {
    console.log('🔄 Background sync with Wix...');
    // Implementation would sync local logs to Wix
  };

  useEffect(() => {
    refreshDiveLogs();
  }, [userId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEntry(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    try {
      setLoading(true);

      const newEntry = {
        ...entry,
        localId: Date.now().toString(),
        savedAt: new Date().toISOString()
      };

      // ✅ Save to localStorage first
      const saved = JSON.parse(localStorage.getItem('savedDiveLogs') || '[]');
      saved.push(newEntry);
      localStorage.setItem('savedDiveLogs', JSON.stringify(saved));

      // ✅ Save to API
      const res = await fetch("/api/analyze/save-dive-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, diveLog: newEntry }),
      });

      if (!res.ok) throw new Error("Failed to save dive log");

      // ✅ Trigger onSave callback
      if (onSave) onSave(newEntry);

      // ✅ Reset form
      setEntry({ date: "", location: "", depth: "", notes: "", localId: "" });
      
      // Refresh dive logs
      await refreshDiveLogs();
    } catch (err) {
      console.error("❌ Error saving dive log:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditLog = (index: number, log: any) => {
    setEditingLog(log);
    setShowDiveForm(true);
  };

  const handleDeleteLog = async (index: number, log: any) => {
    try {
      setLoadingDiveLogs(true);
      // Remove from state immediately for better UX
      const updatedLogs = diveLogs.filter((_, i) => i !== index);
      setDiveLogs(updatedLogs);
      
      // Refresh from API to get accurate state
      setTimeout(() => refreshDiveLogs(), 1000);
    } catch (error) {
      console.error('Error handling delete:', error);
      // Refresh logs if there's an error
      refreshDiveLogs();
    }
  };

  const handleDiveFormSubmit = async (formData: any) => {
    try {
      setLoading(true);
      
      // Save the dive log
      const response = await fetch('/api/analyze/save-dive-log-optimized', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          userId,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        const result = await response.json();
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `✅ Dive log saved successfully! Processing time: ${result.processingTime}ms`
        }]);
        
        // Refresh dive logs and close form
        await refreshDiveLogs();
        setShowDiveForm(false);
        setEditingLog(null);
      } else {
        throw new Error('Failed to save dive log');
      }
    } catch (error) {
      console.error('Error saving dive log:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Failed to save dive log: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <UserIdDebugger urlUserId={userId} />
      
      {/* Dive Form Toggle */}
      <div className="mb-4">
        <button
          onClick={() => setShowDiveForm(!showDiveForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {showDiveForm ? "Hide Dive Form" : "Add New Dive Log"}
        </button>
      </div>

      {/* Enhanced Dive Form */}
      {showDiveForm && (
        <div className="mb-6 p-4 border rounded-lg bg-gray-50">
          <h3 className="text-lg font-semibold mb-3">
            {editingLog ? "Edit Dive Log" : "Add New Dive Log"}
          </h3>
          <DiveJournalForm
            onSubmit={handleDiveFormSubmit}
            userId={userId}
            darkMode={false}
          />
        </div>
      )}

      {/* Messages Display */}
      {messages.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          {messages.slice(-3).map((msg, i) => (
            <div key={i} className="text-sm text-blue-800 mb-1">
              {msg.content}
            </div>
          ))}
        </div>
      )}

      {/* Legacy Simple Form (keeping for backward compatibility) */}
      <details className="mb-6">
        <summary className="cursor-pointer text-gray-600 text-sm">
          Show Simple Form (Legacy)
        </summary>
        <form onSubmit={handleSubmit} className="mt-2 p-4 border rounded bg-gray-50">
          <h2 className="text-xl font-semibold mb-4">Simple Dive Journal</h2>
          <input
            type="date"
            name="date"
            value={entry.date}
            onChange={handleChange}
            className="block mb-2 p-2 border rounded w-full"
            required
          />
          <input
            type="text"
            name="location"
            placeholder="Location"
            value={entry.location}
            onChange={handleChange}
            className="block mb-2 p-2 border rounded w-full"
            required
          />
          <input
            type="text"
            name="depth"
            placeholder="Depth (meters)"
            value={entry.depth}
            onChange={handleChange}
            className="block mb-2 p-2 border rounded w-full"
            required
          />
          <textarea
            name="notes"
            placeholder="Notes"
            value={entry.notes}
            onChange={handleChange}
            className="block mb-2 p-2 border rounded w-full"
            rows={3}
          ></textarea>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Dive Log"}
          </button>
        </form>
      </details>

      {/* 📚 Enhanced Dive Logs Viewer */}
      <div className="mt-4">
        <h2 className="text-xl font-semibold mb-2">Saved Dive Logs</h2>
        {loadingDiveLogs ? (
          <p>Loading dive logs...</p>
        ) : (
          <SavedDiveLogsViewer 
            darkMode={false}
            userId={userId}
            setMessages={setMessages}
            setLoading={setLoading}
            onEditLog={handleEditLog}
            onDeleteLog={handleDeleteLog}
          />
        )}
      </div>
    </>
  );
}
