import React, { useState, useEffect } from "react";
import SavedDiveLogsViewer from "@/components/SavedDiveLogsViewer";
import UserIdDebugger from "@/components/UserIdDebugger";

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
      
      const wixResponse = await fetch(`https://www.deepfreediving.com/_functions/diveLogs?userId=${userId}`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (wixResponse.ok) {
        const wixData = await wixResponse.json();
        if (wixData.success && wixData.data) {
          const transformedLogs = wixData.data.map((log: any) => ({
            id: log.uniqueKey || log._id,
            date: log.date,
            discipline: log.discipline,
            disciplineType: log.disciplineType,
            location: log.location,
            targetDepth: log.targetDepth,
            reachedDepth: log.reachedDepth,
            notes: log.notes,
            timestamp: log.timestamp,
            syncedToWix: true,
            wixId: log._id
          }));
          
          setDiveLogs(transformedLogs);
          setSyncStatus('synced');
          console.log(`✅ Loaded ${transformedLogs.length} logs from Wix`);
        }
      }
    } catch (error) {
      console.error('❌ Wix load failed:', error);
      throw error;
    }
  };

  // 🔄 Background sync with Wix
  const syncWithWix = async (localLogs: DiveLog[]) => {
    try {
      const syncResponse = await fetch('/api/analyze/sync-dive-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, localLogs })
      });
      
      if (syncResponse.ok) {
        const syncData = await syncResponse.json();
        if (syncData.logs) {
          setDiveLogs(syncData.logs);
          console.log(`✅ Background sync: ${syncData.totalCount} total, ${syncData.uploadedCount} uploaded`);
        }
      }
    } catch (error) {
      console.warn('⚠️ Background sync failed:', error);
    }
  };

  // 🔄 Load when userId changes
  useEffect(() => {
    if (userId) {
      refreshDiveLogs();
    }
  }, [userId]);

  // ✅ Enhanced handlers
  const handleJournalSubmit = async (formData: DiveLog) => {
    console.log('📝 Dive journal submitted:', formData);
    setTimeout(() => refreshDiveLogs(), 2000);
  };

  const handleDelete = async (index: number) => {
    const logToDelete = diveLogs[index];
    if (!logToDelete) return;

    try {
      setLoadingDiveLogs(true);
      const updatedLogs = diveLogs.filter((_, i) => i !== index);
      setDiveLogs(updatedLogs);
      setTimeout(() => refreshDiveLogs(), 1000);
    } catch (error) {
      console.error('❌ Delete failed:', error);
      refreshDiveLogs();
    } finally {
      setLoadingDiveLogs(false);
    }
  };

  // ✅ Handles input change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setEntry({ ...entry, [e.target.name]: e.target.value });
  };

  // ✅ Handles form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const newEntry = { ...entry, localId: entry.localId || `${userId}-${Date.now()}` };

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
    } catch (err) {
      console.error("❌ Error saving dive log:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="p-4 bg-gray-100 rounded shadow-md">
        <input
          type="date"
          name="date"
          value={entry.date}
          onChange={handleChange}
          className="block mb-2"
          required
        />
        <input
          type="text"
          name="location"
          placeholder="Location"
          value={entry.location}
          onChange={handleChange}
          className="block mb-2"
          required
        />
        <input
          type="text"
          name="depth"
          placeholder="Depth (meters)"
          value={entry.depth}
          onChange={handleChange}
          className="block mb-2"
          required
        />
        <textarea
          name="notes"
          placeholder="Notes"
          value={entry.notes}
          onChange={handleChange}
          className="block mb-2"
          rows={3}
        ></textarea>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          {loading ? "Saving..." : "Save Dive Log"}
        </button>
      </form>

      {/* 📚 Dive Logs Viewer */}
      <div className="mt-4">
        <h2 className="text-xl font-semibold mb-2">Saved Dive Logs</h2>
        {loadingDiveLogs ? (
          <p>Loading dive logs...</p>
        ) : (
          <SavedDiveLogsViewer darkMode={false} />
        )}
      </div>
    </>
  );
}
