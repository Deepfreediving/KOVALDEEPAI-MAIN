import React, { useState, useEffect } from 'react';

export default function TestApp() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🎯 KovalAI - Test Mode</h1>
      <p>✅ App is running successfully!</p>
      <p>🔌 This is a simplified version to test the setup.</p>
      
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
        <h3>Quick Access Links:</h3>
        <ul>
          <li><a href="/?admin=true">🔑 Admin Mode</a></li>
          <li><a href="/?demo=true">🚀 Demo Mode</a></li>
          <li><a href="/?offline=true">🔌 Offline Mode</a></li>
        </ul>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e8f4fd', borderRadius: '8px' }}>
        <h3>Environment Status:</h3>
        <p>• Next.js: ✅ Running</p>
        <p>• Authentication: 🔧 Bypassed in test mode</p>
        <p>• Database: 🔧 Optional for basic features</p>
      </div>
    </div>
  );
}
