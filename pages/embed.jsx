"use client";
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// ✅ Import your main app dynamically (avoids SSR issues)
const App = dynamic(() => import("./index"), { ssr: false });

export default function Embed() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // ✅ Listen for messages from the bot widget
    const handleMessage = async (event) => {
      // Only accept messages from same origin or your main domain
      const allowedOrigins = [
        window.location.origin,
        "https://kovaldeepai-main.vercel.app"
      ];
      if (!allowedOrigins.includes(event.origin)) return;

      if (event.data?.type === "LOAD_LOGS" && event.data.data?.userId) {
        try {
          const res = await fetch(`/api/getDiveLogs?userId=${event.data.data.userId}`);
          const data = await res.json();
          setLogs(data.logs || []);
        } catch (err) {
          console.error("❌ Failed to fetch dive logs:", err);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <div style={{ width: "100%", height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Main Bot App */}
      <div style={{ flex: 1 }}>
        <App />
      </div>

      {/* ✅ Dive Logs Section (appears if logs exist) */}
      {logs.length > 0 && (
        <div style={{ padding: "10px", background: "#111", color: "#fff", maxHeight: "200px", overflowY: "auto" }}>
          <h3 style={{ margin: "0 0 5px" }}>Your Dive Logs</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {logs.map((log, idx) => (
              <li key={idx} style={{ marginBottom: "6px", borderBottom: "1px solid #333", paddingBottom: "4px" }}>
                <strong>{log.timestamp ? new Date(log.timestamp).toLocaleString() : "Unknown date"}:</strong>
                <div>{log.logEntry || log.memoryContent}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
