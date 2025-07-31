'use client';
import { useEffect, useState } from 'react';
import apiClient from './apiClient';

export default function PreloadCheck() {
  const [status, setStatus] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkConnections() {
      const health = await apiClient.checkAllConnections();
      setStatus(health);
      setLoading(false);
    }
    checkConnections();
  }, []);

  if (loading) {
    return <div style={{ padding: '20px' }}>🔄 Checking API Connections...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>✅ API Health Check Results:</h2>
      <ul>
        {Object.entries(status).map(([service, result]) => (
          <li key={service}>
            <strong>{service.toUpperCase()}:</strong> {result}
          </li>
        ))}
      </ul>
    </div>
  );
}
