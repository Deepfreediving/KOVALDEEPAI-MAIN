import Chat from './components/Chat';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
      <div className="bg-white text-black p-6 rounded-2xl shadow-lg max-w-xl w-full text-center">
        <img
          src="/logo.jpg"
          alt="Deep Freediving Logo"
          className="h-17 w-auto mx-auto mb-4"
        />
        <h1 className="text-3xl font-bold mb-2">Welcome to Koval Deep AI</h1>
        <p className="text-lg mb-6">Your personalized freediving assistant is ready to chat.</p>
        <Chat />
      </div>
    </main>
  );
}

