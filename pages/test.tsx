import { useState } from 'react';

interface DiveLog {
  id: string;
  date: string;
  discipline: string;
  location: string;
  targetDepth: string;
  reachedDepth: string;
  syncedToWix: boolean;
}

export default function TestPage() {
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [savedLogs, setSavedLogs] = useState<DiveLog[]>([]);

  const runTests = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test/wix-backend');
      const results = await response.json();
      setTestResults(results);
    } catch (error) {
      setTestResults({ error: (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const loadLocalStorage = () => {
    const saved = JSON.parse(localStorage.getItem('savedDiveLogs') || '[]');
    setSavedLogs(saved);
  };

  const clearLocalStorage = () => {
    localStorage.removeItem('savedDiveLogs');
    localStorage.removeItem('diveJournalDraft');
    setSavedLogs([]);
    alert('Local storage cleared!');
  };

  const testDiveLogSave = async () => {
    try {
      const testData = {
        userId: 'test-user-' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        disciplineType: 'depth',
        discipline: 'Test Dive',
        location: 'Test Location',
        targetDepth: '30',
        reachedDepth: '28',
        notes: 'This is a test dive log entry'
      };

      const response = await fetch('/api/analyze/save-dive-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });

      const result = await response.json();
      alert(`Save test: ${response.ok ? 'SUCCESS' : 'FAILED'}\n${JSON.stringify(result, null, 2)}`);
      
      if (response.ok) {
        loadLocalStorage(); // Refresh local storage view
      }
    } catch (error) {
      alert(`Save test failed: ${(error as Error).message}`);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🔧 Koval AI Diagnostic Test Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Test Controls */}
        <div className="space-y-4">
          <div className="bg-gray-100 p-4 rounded">
            <h2 className="text-lg font-semibold mb-3">🧪 System Tests</h2>
            <div className="space-y-2">
              <button
                onClick={runTests}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Running Tests...' : 'Run Backend Tests'}
              </button>
              
              <button
                onClick={testDiveLogSave}
                className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Test Dive Log Save
              </button>
            </div>
          </div>

          <div className="bg-gray-100 p-4 rounded">
            <h2 className="text-lg font-semibold mb-3">💾 Local Storage</h2>
            <div className="space-y-2">
              <button
                onClick={loadLocalStorage}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                Load Saved Dive Logs ({savedLogs.length})
              </button>
              
              <button
                onClick={clearLocalStorage}
                className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Clear Local Storage
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {/* Test Results */}
          {testResults && (
            <div className="bg-gray-50 p-4 rounded">
              <h2 className="text-lg font-semibold mb-3">🔍 Test Results</h2>
              <pre className="text-sm bg-white p-3 rounded overflow-auto max-h-64">
                {JSON.stringify(testResults, null, 2)}
              </pre>
            </div>
          )}

          {/* Local Storage Contents */}
          {savedLogs.length > 0 && (
            <div className="bg-gray-50 p-4 rounded">
              <h2 className="text-lg font-semibold mb-3">💾 Saved Dive Logs</h2>
              <div className="space-y-2 max-h-64 overflow-auto">
                {savedLogs.map((log, index) => (
                  <div key={index} className="bg-white p-2 rounded border">
                    <div className="font-medium">{log.date} - {log.discipline}</div>
                    <div className="text-sm text-gray-600">
                      📍 {log.location} | 🎯 {log.targetDepth}m → {log.reachedDepth}m
                    </div>
                    <div className="text-xs text-gray-500">
                      Synced: {log.syncedToWix ? '✅' : '❌'} | ID: {log.id}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 bg-blue-50 p-4 rounded">
        <h3 className="font-semibold mb-2">📋 Current Issues:</h3>
        <ul className="text-sm space-y-1">
          <li>• Wix backend returning 404 for /_functions/wixConnection</li>
          <li>• User ID mismatch between widget and Wix page</li>
          <li>• Dive logs saving locally but failing Wix sync</li>
          <li>• Directory creation issues in serverless environment</li>
        </ul>
      </div>

      <div className="mt-4 bg-green-50 p-4 rounded">
        <h3 className="font-semibold mb-2">✅ Working Features:</h3>
        <ul className="text-sm space-y-1">
          <li>• Local storage for dive logs</li>
          <li>• Auto-save draft functionality</li>
          <li>• Widget iframe loading</li>
          <li>• OpenAI and Pinecone connections</li>
        </ul>
      </div>
    </div>
  );
}
