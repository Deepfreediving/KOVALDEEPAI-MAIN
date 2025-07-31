'use client';

import React, { useEffect, useState } from 'react';
import { checkAllConnections } from '../utils/apiClient';

interface Status {
  wix: string;
  openai: string;
  pinecone: string;
}

export default function AppLoader({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [ready, setReady] = useState(false);
  const [attempts, setAttempts] = useState(0);

  // Retry configuration
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 3000; // 3 seconds

  const initConnections = async () => {
    try {
      const response = await checkAllConnections();

      const result: Status = {
        wix: response.wix || '❌ Missing',
        openai: response.openai || '❌ Missing',
        pinecone: response.pinecone || '❌ Missing',
      };

      setStatus(result);

      // App only loads if all services return "✅ OK"
      if (result.wix === '✅ OK' && result.openai === '✅ OK' && result.pinecone === '✅ OK') {
        setReady(true);
      } else if (attempts < MAX_RETRIES) {
        setAttempts(prev => prev + 1);
        setTimeout(initConnections, RETRY_DELAY);
      }
    } catch (error) {
      console.error('Error checking connections:', error);
      if (attempts < MAX_RETRIES) {
        setAttempts(prev => prev + 1);
        setTimeout(initConnections, RETRY_DELAY);
      }
    }
  };

  useEffect(() => {
    initConnections();
  }, []);

  if (!ready) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h3>Loading App...</h3>
        {status && (
          <ul>
            <li>Wix: {status.wix}</li>
            <li>OpenAI: {status.openai}</li>
            <li>Pinecone: {status.pinecone}</li>
          </ul>
        )}
        <p>Attempt {attempts + 1} of {MAX_RETRIES}</p>
      </div>
    );
  }

  return <>{children}</>;
}
