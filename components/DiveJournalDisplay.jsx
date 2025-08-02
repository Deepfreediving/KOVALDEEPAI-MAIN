import { useEffect, useState } from "react";

export default function DiveJournalDisplay({ userId, darkMode }) {
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

  if (!logs.length) return null;

  return (
    <div className={`p-4 border-t mt-4 rounded-md ${darkMode ? "bg-gray-800 text-white border-gray-700" : "bg-gray-50 border-gray-200"}`}>
      <h2 className="text-lg font-semibold mb-2">📘 Dive Journal Logs</h2>
      <ul className="space-y-4">
        {logs.map((log, i) => (
          <li
            key={i}
            className={`border p-3 rounded ${darkMode ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}
          >
            <p><strong>Date:</strong> {log.date}</p>
            <p><strong>Discipline:</strong> {log.disciplineType} – {log.discipline}</p>
            {log.location && <p><strong>Location:</strong> {log.location}</p>}
            {log.targetDepth && <p><strong>Target Depth:</strong> {log.targetDepth}m</p>}
            {log.reachedDepth && <p><strong>Reached Depth:</strong> {log.reachedDepth}m</p>}
            {log.mouthfillDepth && <p><strong>Mouthfill Depth:</strong> {log.mouthfillDepth}m</p>}
            {log.issueDepth && <p><strong>Issue Depth:</strong> {log.issueDepth}m</p>}
            {log.issueComment && <p><strong>Issue Comment:</strong> {log.issueComment}</p>}
            {log.squeeze && <p><strong>Squeeze:</strong> ✅</p>}
            {log.durationOrDistance && <p><strong>Duration/Distance:</strong> {log.durationOrDistance}</p>}
            {log.totalDiveTime && <p><strong>Total Dive Time:</strong> {log.totalDiveTime}</p>}
            {log.attemptType && <p><strong>Attempt Type:</strong> {log.attemptType}</p>}
            {log.exit && <p><strong>Exit:</strong> {log.exit}</p>}
            {log.surfaceProtocol && <p><strong>Surface Protocol:</strong> {log.surfaceProtocol}</p>}
            {log.notes && <p className="text-sm mt-1"><strong>Notes:</strong> {log.notes}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
