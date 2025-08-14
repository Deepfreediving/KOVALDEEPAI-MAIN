"use client";

import React, { useEffect, useState } from "react";
import { checkAllConnections } from "@/utils/apiClient";

export default function AppLoader({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadApp = async () => {
      try {
        // Add a timeout wrapper (5s fallback)
        await Promise.race([
          checkAllConnections(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Connection timeout")), 5000),
          ),
        ]);
      } catch (err) {
        console.warn("Connection check failed:", err);
      } finally {
        if (isMounted) setReady(true);
      }
    };

    loadApp();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!ready) {
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        <p>Loading application...</p>
      </div>
    );
  }

  return <>{children}</>;
}
