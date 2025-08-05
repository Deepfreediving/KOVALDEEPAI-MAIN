import { useEffect, useState } from "react";

export default function DiveJournalDisplay({ userId, darkMode, isOpen, onClose }) {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`diveLogs-${userId}`);
      if (stored) {
        setLogs(JSON.parse(stored));
      }
    } catch (error) {
      console.error("❌ Failed to parse stored dive logs:", error);
      setLogs([]);
    }
  }, [userId]);

  // If not open, don't render
  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-gray-900 border-l border-gray-700 z-50 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">📘 Dive Journal</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {!logs.length ? (
          <div className="text-center text-gray-400 mt-8">
            <div className="text-4xl mb-4">📝</div>
            <p>No dive logs yet.</p>
            <p className="text-sm mt-2">Start logging your dives!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-300 mb-4">
              {logs.length} dive{logs.length !== 1 ? 's' : ''} logged
            </p>
            
            <ul className="space-y-4">
              {logs.map((log, i) => (
                <li
                  key={i}
                  className="bg-gray-800 border border-gray-700 p-3 rounded-lg"
                >
                  <div className="text-sm space-y-1">
                    <p className="text-white font-medium">{log.date}</p>
                    <p className="text-blue-300">{log.disciplineType} – {log.discipline}</p>
                    
                    {log.location && (
                      <p className="text-gray-300">📍 {log.location}</p>
                    )}
                    
                    {log.targetDepth && (
                      <p className="text-gray-300">🎯 Target: {log.targetDepth}m</p>
                    )}
                    
                    {log.reachedDepth && (
                      <p className="text-green-300">✅ Reached: {log.reachedDepth}m</p>
                    )}
                    
                    {log.mouthfillDepth && (
                      <p className="text-gray-300">💨 Mouthfill: {log.mouthfillDepth}m</p>
                    )}
                    
                    {log.issueDepth && (
                      <p className="text-yellow-300">⚠️ Issue at: {log.issueDepth}m</p>
                    )}
                    
                    {log.issueComment && (
                      <p className="text-red-300 text-xs">💬 {log.issueComment}</p>
                    )}
                    
                    {log.squeeze && (
                      <p className="text-red-300">⚠️ Squeeze experienced</p>
                    )}
                    
                    {log.durationOrDistance && (
                      <p className="text-gray-300">⏱️ {log.durationOrDistance}</p>
                    )}
                    
                    {log.totalDiveTime && (
                      <p className="text-gray-300">🕐 Total: {log.totalDiveTime}</p>
                    )}
                    
                    {log.attemptType && (
                      <p className="text-purple-300">🎪 {log.attemptType}</p>
                    )}
                    
                    {log.exit && (
                      <p className="text-gray-300">🚪 Exit: {log.exit}</p>
                    )}
                    
                    {log.surfaceProtocol && (
                      <p className="text-cyan-300">🏊 Protocol: {log.surfaceProtocol}</p>
                    )}
                    
                    {log.notes && (
                      <p className="text-gray-400 text-xs mt-2 italic">"{log.notes}"</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
