"use client";
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const App = dynamic(() => import("./index"), { ssr: false });

export default function Embed() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [botIframe, setBotIframe] = useState(null);

  useEffect(() => {
    const adjustHeight = () => {
      if (window.parent) {
        window.parent.postMessage(
          { type: "RESIZE_IFRAME", data: { height: document.body.scrollHeight } },
          "*"
        );
      }
    };

    const resizeObserver = new ResizeObserver(adjustHeight);
    resizeObserver.observe(document.body);

    const findBotIframe = () => {
      const botElement = document.getElementById("kovalAiElement");
      if (botElement && botElement.shadowRoot) {
        const iframe = botElement.shadowRoot.querySelector("iframe");
        if (iframe && iframe.contentWindow) {
          setBotIframe(iframe.contentWindow);
          // ✅ Notify Wix that bot is ready
          window.parent?.postMessage({ type: "BOT_READY" }, "*");
        }
      }
    };

    // Retry finding iframe every 500ms until it loads
    const iframeInterval = setInterval(findBotIframe, 500);

    const handleMessage = async (event) => {
      const allowedOrigins = [
        window.location.origin,
        "https://kovaldeepai-main.vercel.app"
      ];
      if (!allowedOrigins.includes(event.origin)) return;

      // ✅ Forward AI_RESPONSE messages to bot iframe
      if (event.data?.type === "AI_RESPONSE" && botIframe) {
        botIframe.postMessage(event.data, "*");
      }

      // ✅ Load user logs
      if (event.data?.type === "LOAD_LOGS" && event.data.data?.userId) {
        setLoading(true);
        setErrorMsg("");
        try {
          const res = await fetch(`/api/analyze/getDiveLogs?userId=${event.data.data.userId}`);
          if (!res.ok) throw new Error(`API error: ${res.status}`);
          const data = await res.json();
          setLogs(Array.isArray(data.logs) ? data.logs : []);
        } catch (err) {
          console.error("❌ Failed to fetch dive logs:", err);
          setErrorMsg("Failed to load dive logs. Please try again later.");
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
      clearInterval(iframeInterval);
    };
  }, [botIframe]);

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#fff",
        overflow: "hidden",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ flex: 1, overflowY: "auto" }}>
        <App />
      </div>

      {loading && (
        <div style={{ padding: "10px", background: "#222", color: "#ccc" }}>
          Loading dive logs...
        </div>
      )}

      {!loading && errorMsg && (
        <div style={{ padding: "10px", background: "#300", color: "#fdd" }}>
          {errorMsg}
        </div>
      )}

      {!loading && logs.length > 0 && (
        <div
          style={{
            padding: "10px",
            background: "#111",
            color: "#fff",
            maxHeight: "220px",
            overflowY: "auto",
            borderTop: "2px solid #333",
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
                  paddingBottom: "6px",
                }}
              >
                <strong>
                  {log.timestamp
                    ? new Date(log.timestamp).toLocaleString()
                    : "Unknown date"}
                  :
                </strong>
                <div>
                  {log.logEntry || log.memoryContent || "No details available"}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
