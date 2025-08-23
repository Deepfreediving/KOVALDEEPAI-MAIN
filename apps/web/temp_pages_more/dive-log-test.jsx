import { useEffect, useState } from 'react';

export default function DiveLogTest() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        console.log('🔍 Loading dive logs...');
        const response = await fetch('/api/supabase/dive-logs?userId=f47ac10b-58cc-4372-a567-0e02b2c3d479');
        const data = await response.json();
        console.log('📊 API Response:', data);
        setLogs(data.diveLogs || []);
        setLoading(false);
      } catch (error) {
        console.error('❌ Error loading logs:', error);
        setLoading(false);
      }
    };

    loadLogs();
  }, []);

  const createTestLog = async () => {
    try {
      const testLog = {
        date: new Date().toISOString().split('T')[0],
        discipline: 'Test Dive',
        location: 'Test Pool',
        targetDepth: 10,
        reachedDepth: 9,
        totalDiveTime: '1:30',
        notes: 'Test dive from test page'
      };

      console.log('🚀 Creating test log:', testLog);
      const response = await fetch('/api/supabase/save-dive-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testLog)
      });

      if (response.ok) {
        console.log('✅ Test log created successfully');
        // Refresh the list
        window.location.reload();
      } else {
        console.error('❌ Failed to create test log');
      }
    } catch (error) {
      console.error('❌ Error creating test log:', error);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Dive Log Test Page</h1>
      
      <button onClick={createTestLog} style={{ 
        padding: '10px 20px', 
        marginBottom: '20px',
        backgroundColor: '#007cba',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer'
      }}>
        Create Test Dive Log
      </button>

      <h2>Current Dive Logs ({logs.length})</h2>
      
      {loading ? (
        <p>Loading logs...</p>
      ) : logs.length === 0 ? (
        <p>No dive logs found</p>
      ) : (
        <div>
          {logs.map((log, index) => (
            <div key={log.id || index} style={{ 
              border: '1px solid #ccc', 
              padding: '10px', 
              margin: '10px 0',
              borderRadius: '5px'
            }}>
              <h3>{log.discipline} - {log.location}</h3>
              <p><strong>Date:</strong> {log.date}</p>
              <p><strong>Depth:</strong> {log.reached_depth || log.target_depth}m</p>
              <p><strong>Time:</strong> {log.total_dive_time}</p>
              <p><strong>Notes:</strong> {log.notes}</p>
              <p><strong>ID:</strong> {log.id}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
