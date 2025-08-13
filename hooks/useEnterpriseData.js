import { useState, useEffect, useCallback } from 'react';

const API_ROUTES = {
  GET_DIVE_LOGS: "/api/analyze/get-dive-logs",
  SAVE_DIVE_LOG: "/api/analyze/save-dive-log",
  SYNC_DIVE_LOGS: "/api/analyze/sync-dive-logs",
};

export function useEnterpriseData(userId) {
  const [diveLogs, setDiveLogs] = useState([]);
  const [loadingDiveLogs, setLoadingDiveLogs] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle');

  const refreshDiveLogs = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoadingDiveLogs(true);
      setSyncStatus('syncing');
      
      const response = await fetch(`${API_ROUTES.GET_DIVE_LOGS}?userId=${encodeURIComponent(userId)}`);
      
      if (response.ok) {
        const data = await response.json();
        setDiveLogs(data.logs || []);
        setSyncStatus('synced');
        console.log(`✅ Loaded ${data.logs?.length || 0} dive logs`);
      }
    } catch (error) {
      console.error('❌ Failed to load dive logs:', error);
      setSyncStatus('error');
    } finally {
      setLoadingDiveLogs(false);
    }
  }, [userId]);

  const handleJournalSubmit = useCallback(async (formData) => {
    try {
      const response = await fetch(API_ROUTES.SAVE_DIVE_LOG, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, userId, timestamp: new Date().toISOString() })
      });

      if (response.ok) {
        await refreshDiveLogs();
        console.log('✅ Dive log saved successfully');
      }
    } catch (error) {
      console.error('❌ Failed to save dive log:', error);
    }
  }, [userId, refreshDiveLogs]);

  const handleDelete = useCallback(async (index) => {
    const updatedLogs = diveLogs.filter((_, i) => i !== index);
    setDiveLogs(updatedLogs);
    setTimeout(() => refreshDiveLogs(), 1000);
  }, [diveLogs, refreshDiveLogs]);

  useEffect(() => {
    if (userId) {
      refreshDiveLogs();
    }
  }, [userId, refreshDiveLogs]);

  return {
    diveLogs,
    setDiveLogs,
    loadingDiveLogs,
    syncStatus,
    refreshDiveLogs,
    handleJournalSubmit,
    handleDelete
  };
}