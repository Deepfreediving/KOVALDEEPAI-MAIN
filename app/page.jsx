import Chat from './components/Chat';

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="bg-white text-black p-10 rounded-2xl shadow-lg w-full max-w-4xl">
        <div className="text-center mb-6">
          <img
            src="/deeplogo.jpg"
            alt="Deep Freediving Logo"
            width={100}
            height={100}
            className="mx-auto mb-4"
          />
          <h1 className="text-4xl font-bold mb-2">Welcome to Koval Deep AI</h1>
          <p className="text-lg">Your personalized freediving assistant is ready to chat.</p>
        </div>
        <div className="h-[500px] overflow-hidden">
          <Chat />
        </div>
      </div>
    </main>
  );
}

