"use client"; // Required for client-side hooks in Next.js App Router

import { useState } from "react";

export default function CreateThread() {
  const [threadId, setThreadId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCreateThreadSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/create-thread", { method: "POST" });

      if (!res.ok) {
        throw new Error("Failed to create thread");
      }

      const data = await res.json();
      if (data?.threadId) {
        setThreadId(data.threadId);
      } else {
        throw new Error("Thread ID missing from response");
      }
    } catch (err) {
      setError(`❌ ${err.message || "Unknown error occurred"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 p-6 border rounded-lg shadow bg-white text-black dark:bg-[#1a1a1a] dark:text-white">
      <h1 className="text-2xl font-semibold mb-4">Create a New Thread</h1>

      <button
        onClick={handleCreateThreadSubmit}
        disabled={loading}
        className={`w-full px-4 py-2 text-white font-medium rounded ${
          loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {loading ? "Creating Thread..." : "Create Thread"}
      </button>

      {threadId && (
        <p className="mt-4 text-green-600 font-mono break-all">
          ✅ Thread created!<br />Thread ID: <strong>{threadId}</strong>
        </p>
      )}

      {error && (
        <p className="mt-4 text-red-600 font-medium">{error}</p>
      )}
    </div>
  );
}
