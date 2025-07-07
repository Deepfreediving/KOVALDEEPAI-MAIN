'use client';

import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://widget.customgpt.ai/index.js';
    script.type = 'module';
    script.setAttribute('data-chatbot-id', 'asst_1a1DbHbHuT42Q3uZWaG81m8b'); // Replace this if you're using CustomGPT
    document.body.appendChild(script);
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-white"
      style={{
        backgroundImage: "url('/background.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="bg-black bg-opacity-70 p-6 rounded-2xl shadow-lg">
        <img src="/logo.jpg" alt="Deep Freediving Logo" className="h-32 mb-4" />
        <h1 className="text-3xl font-bold mb-2 text-center">Welcome to Koval Deep AI</h1>
        <p className="text-lg text-center mb-6">
          Your personalized freediving assistant is loading below...
        </p>
      </div>
      <div className="w-full max-w-3xl mt-10">
        {/* Placeholder for chatbot iframe or widget */}
        <div id="chatbot" className="w-full h-[600px] bg-white rounded-xl" />
      </div>
    </div>
  );
}
