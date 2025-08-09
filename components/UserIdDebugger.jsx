import { useEffect, useState } from 'react';
import { getOrCreateUserId, debugUserIdSituation, extractUserIdFromUrl } from '@/utils/userIdUtils';

export default function UserIdDebugger({ urlUserId }) {
  const [debugInfo, setDebugInfo] = useState({});
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      debugUserIdSituation();
      
      const info = {
        urlUserId,
        extractedFromUrl: extractUserIdFromUrl(),
        sessionUserId: sessionStorage.getItem('koval-ai-user-id'),
        persistentUserId: localStorage.getItem('koval-ai-persistent-user-id'),
        effectiveUserId: getOrCreateUserId(urlUserId),
        diveLogKeys: Object.keys(localStorage).filter(key => key.includes('dive-logs') || key.includes('savedDiveLogs'))
      };
      
      setDebugInfo(info);
      console.log('🔍 UserID Debug Info:', info);
    }
  }, [urlUserId]);
  
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-sm">
      <h3 className="font-bold text-yellow-800 mb-2">🔍 User ID Debug Info</h3>
      <div className="space-y-1 text-yellow-700">
        <div><strong>URL User ID:</strong> {debugInfo.urlUserId || 'none'}</div>
        <div><strong>Extracted from URL:</strong> {debugInfo.extractedFromUrl || 'none'}</div>
        <div><strong>Session User ID:</strong> {debugInfo.sessionUserId || 'none'}</div>
        <div><strong>Persistent User ID:</strong> {debugInfo.persistentUserId || 'none'}</div>
        <div><strong>Effective User ID:</strong> <code className="bg-yellow-100 px-1 rounded">{debugInfo.effectiveUserId}</code></div>
        <div><strong>Dive Log Storage Keys:</strong> {debugInfo.diveLogKeys?.length || 0} found</div>
        {debugInfo.diveLogKeys?.length > 0 && (
          <div className="ml-4 text-xs">
            {debugInfo.diveLogKeys.map(key => <div key={key}>• {key}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}
