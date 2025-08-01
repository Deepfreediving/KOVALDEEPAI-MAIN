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

  // Retry config for OpenAI only
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 3000; // 3 seconds

  const initConnections = async () => {
    try {
      const response = await checkAllConnections();

      const result: Status = {
        wix: response.wix || '⚠️ Unavailable',
        openai: response.openai || '❌ Missing',
        pinecone: response.pinecone || '⚠️ Unavailable',
      };

      setStatus(result);

      // ✅ OpenAI must be ready, others are optional
      if (result.openai === '✅ OK') {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h3>Loading OpenAI Bot...</h3>
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

  return (
    <>
      {/* Show warnings for optional services */}
      {status && (
        <div style={{ background: '#ffedcc', padding: '10px', marginBottom: '10px' }}>
          {status.wix !== '✅ OK' && <p>⚠️ Wix service is unavailable. Some features may not work.</p>}
          {status.pinecone !== '✅ OK' && <p>⚠️ Pinecone service is unavailable. Search features may be limited.</p>}
        </div>
      )}
      {children}
    </>
  );
}
