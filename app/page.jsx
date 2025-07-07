'use client';
import Chat from './components/Chat';

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-cover bg-center bg-black text-white" style={{ backgroundImage: "url('/background.jpg')" }}>
      <div className="bg-white text-black p-10 rounded-2xl shadow-2xl w-full max-w-3xl">
        <img
          src="/deeplogo.jpg"
          alt="Deep Freediving Logo"
          width={100}
          height={100}
          style={{ display: 'block', margin: '0 auto', height: 'auto' }}
        />
        <h1 className="text-4xl font-bold text-center mt-4 mb-2">Welcome to Koval Deep AI</h1>
        <p className="text-center text-lg mb-6">Your personalized freediving assistant is ready to chat.</p>
        <Chat />
      </div>
    </main>
  );
}
