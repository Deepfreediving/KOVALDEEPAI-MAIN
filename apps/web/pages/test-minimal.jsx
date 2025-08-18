import { useState } from "react";

export default function Index() {
  const [loading, setLoading] = useState(false);

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Koval AI - Minimal Test</h1>
      <p>If you can see this, the basic React app is working.</p>
      <button onClick={() => setLoading(!loading)}>
        {loading ? 'Loading...' : 'Test Button'}
      </button>
    </div>
  );
}
