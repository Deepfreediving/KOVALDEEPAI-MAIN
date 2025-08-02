'use client';

import React, { useEffect, useState } from 'react';
import { checkAllConnections } from '@/utils/apiClient';

export default function AppLoader({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await checkAllConnections();
      } catch (err) {
        console.warn("Connection check failed:", err);
      } finally {
        setReady(true); // Always show the app
      }
    })();
  }, []);

  if (!ready) return null; // or a spinner
  return <>{children}</>;
}
