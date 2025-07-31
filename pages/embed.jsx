"use client";
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// ✅ Dynamically import the main bot app to avoid SSR issues
const App = dynamic(() => import("./index"), { ssr: false });

export default function Embed() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // ✅ Notify parent page to resize iframe dynamically
    const adjustHeight = () => {
      if (window.parent) {
        window.parent.postMessage(
          { type: "RESIZE_IFRAME", data: { height: document.body.scrollHeight } },
          "*"
        );
      }
    };

    // Watch for DOM size changes to auto-fit height
    const resizeObserver = new ResizeObserver(adjustHeight);
    resizeObserver.observe(document.body);

    // ✅ Listen for messages from parent widget
    const handleMessage = async (event) => {
      const allowedOrigins = [
        window.location.origin,
        "https://kovaldeepai-main.vercel.app"
      ];
      if (!allowedOrigins.includes(event.origin)) return;

      if (event.data?.type === "LOAD_LOGS" && event.data.data?.userId) {
        setLoading(true);
        try {
          const res = await fetch(`/api/getDiveLogs?userId=${event.data.data.userId}`);
          if (!res.ok) throw new Error(`API error: ${res.status}`);
          const data = await res.json();

          // ✅ Always continue loading bot even if no logs exist
          if (Array.isArray(data.logs) && data.logs.length > 0) {
            setLogs(data.logs);
          } else {
            console.info("ℹ️ No dive logs found for this user.");
            setLogs([]);
          }
        } catch (err) {
          console.error("❌ Failed to fetch dive logs:", err);
          setLogs([]);
        } finally {
          setLoading(false);
          adjustHeight();
        }
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#fff",
        overflow: "hidden",
        fontFamily: "Arial, sans-serif"
      }}
    >
      {/* ✅ Main Bot App */}
      <div style={{ flex: 1 }}>
        <App />
      </div>

      {/* ✅ Loading State */}
      {loading && (
        <div style={{ padding: "10px", background: "#222", color: "#ccc" }}>
          Loading dive logs...
        </div>
      )}

      {/* ✅ Dive Logs Section */}
      {!loading && logs.length > 0 && (
        <div
          style={{
            padding: "10px",
            background: "#111",
            color: "#fff",
            maxHeight: "220px",
            overflowY: "auto",
            borderTop: "2px solid #333"
          }}
        >
          <h3 style={{ margin: "0 0 8px" }}>Your Dive Logs</h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {logs.map((log, idx) => (
              <li
                key={idx}
                style={{
                  marginBottom: "8px",
                  borderBottom: "1px solid #333",
                  paddingBottom: "6px"
                }}
              >
                <strong>
                  {log.timestamp
                    ? new Date(log.timestamp).toLocaleString()
                    : "Unknown date"}
                  :
                </strong>
                <div>{log.logEntry || log.memoryContent || "No details available"}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
