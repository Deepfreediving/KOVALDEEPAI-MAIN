import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
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
  userId?: string;
  onSave?: (log: DiveLog) => void;
}

export default function Journal({ userId: propUserId, onSave }: JournalProps) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(propUserId || null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  
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

  // ✅ Authentication handling for standalone journal page
  useEffect(() => {
    // If userId is provided as prop, use it immediately
    if (propUserId) {
      setUserId(propUserId);
      setIsAuthenticating(false);
      return;
    }

    // Try to get userId from localStorage first
    const storedUserId = typeof window !== 'undefined' ? localStorage.getItem("kovalUser") : null;
    if (storedUserId && !storedUserId.startsWith('guest-')) {
      console.log('✅ Found stored userId:', storedUserId);
      setUserId(storedUserId);
      setIsAuthenticating(false);
      return;
    }

    // Try to authenticate using user-profile-bridge
    const authenticateUser = async () => {
      try {
        console.log('🔍 Attempting to authenticate user via bridge...');
        
        // First, try to get user ID from URL parameters
        const urlUserId = router.query.userId as string;
        if (urlUserId && !urlUserId.startsWith('guest-')) {
          setUserId(urlUserId);
          localStorage.setItem("kovalUser", urlUserId);
          setIsAuthenticating(false);
          return;
        }

        // If no URL userId, show authentication required message
        setAuthError('Authentication required. Please log in through the main app.');
        setIsAuthenticating(false);
        
      } catch (error) {
        console.error('❌ Authentication failed:', error);
        setAuthError('Authentication failed. Please try again.');
        setIsAuthenticating(false);
      }
    };

    // Small delay to allow router to be ready
    const timer = setTimeout(authenticateUser, 100);
    return () => clearTimeout(timer);
  }, [propUserId, router.query.userId, router.isReady]);

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

  // ✅ Show authentication status
  if (isAuthenticating) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Authenticating...</h2>
          <p className="text-gray-500">Please wait while we verify your credentials</p>
        </div>
      </div>
    );
  }

  if (authError || !userId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8 max-w-md mx-auto">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">
            {authError || 'Please log in to access your dive journal.'}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/embed'}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              🚀 Go to Main App
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              🔄 Retry Authentication
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">🤿 Dive Journal</h1>
        <p className="text-gray-600">Welcome back! Track your freediving progress.</p>
        <UserIdDebugger urlUserId={userId} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold mb-4">📝 Add New Dive Log</h2>
          <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg shadow-md">
            <input
              type="date"
              name="date"
              value={entry.date}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <input
              type="text"
              name="location"
              placeholder="Dive Location"
              value={entry.location}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <input
              type="text"
              name="depth"
              placeholder="Depth (meters)"
              value={entry.depth}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <textarea
              name="notes"
              placeholder="Notes and observations..."
              value={entry.notes}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Saving..." : "💾 Save Dive Log"}
            </button>
          </form>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">📚 Your Dive Logs ({diveLogs.length})</h2>
          <div className="bg-white rounded-lg shadow-md p-6">
            {loadingDiveLogs ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-500">Loading dive logs...</p>
              </div>
            ) : (
              <SavedDiveLogsViewer 
                darkMode={false}
                userId={userId}
                setMessages={undefined} // No chat integration in standalone journal
                onEditDiveLog={(log: any) => {
                  console.log('📝 Edit dive log requested:', log.id);
                  // Could open modal or navigate to edit page
                }}
                onRefreshDiveLogs={refreshDiveLogs}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
