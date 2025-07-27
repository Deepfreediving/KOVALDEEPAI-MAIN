import { useEffect, useState } from "react";

export default function DiveJournalDisplay({ userId }) {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem(`diveLogs-${userId}`);
    if (stored) {
      setLogs(JSON.parse(stored));
    }
  }, [userId]);

  if (!logs.length) return null;

  return (
    <div className="p-4 border-t mt-4">
      <h2 className="text-lg font-semibold mb-2">📘 Dive Journal Logs</h2>
      <ul className="space-y-4">
        {logs.map((log, i) => (
          <li key={i} className="border p-3 rounded bg-gray-50">
            <p><strong>Date:</strong> {log.date}</p>
            <p><strong>Discipline:</strong> {log.disciplineType} – {log.discipline}</p>
            {log.targetDepth && <p><strong>Target Depth:</strong> {log.targetDepth}m</p>}
            {log.reachedDepth && <p><strong>Reached:</strong> {log.reachedDepth}m</p>}
            {log.durationOrDistance && <p><strong>Duration/Distance:</strong> {log.durationOrDistance}</p>}
            {log.issueDepth && <p><strong>Issue Depth:</strong> {log.issueDepth}</p>}
            {log.squeeze && <p><strong>Squeeze:</strong> {log.squeeze}</p>}
            <p><strong>Exit:</strong> {log.exit}</p>
            {log.notes && <p className="text-sm text-gray-600 mt-1">{log.notes}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
