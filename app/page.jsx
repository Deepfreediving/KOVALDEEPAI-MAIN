'use client';

import { useState, useEffect } from 'react';
import Chat from '../components/Chat'; // Adjust path as needed

export default function Home() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set loading to false once the page is ready.
    setLoading(false);
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-cover bg-center bg-black text-white p-6" style={{ backgroundImage: `url('/background.jpg')` }}>
      <div className="max-w-2xl mx-auto bg-black bg-opacity-70 rounded-xl p-6 shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-6">Koval Deep AI</h1>
        <Chat />
      </div>
    </div>
  );
}
