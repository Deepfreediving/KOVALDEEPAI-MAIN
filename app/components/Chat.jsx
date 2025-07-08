import { useEffect, useState } from 'react';

export default function Chat() {
  const [threadId, setThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  // 🧠 Create a thread when component mounts
  useEffect(() => {
    const createThread = async () => {
      const res = await fetch('/api/create-thread', { method: 'POST' });
      const data = await res.json();
      setThreadId(data.thread_id);
    };

    createThread();
  }, []);

  const sendMessage = async () => {
    const res = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: input, thread_id: threadId }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await res.json();
    setMessages((prev) => [...prev, { role: 'user', content: input }, data.assistantResponse]);
    setInput('');
  };

  return (
    <>
      <div>{/* message render here */}</div>
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={sendMessage}>Send</button>
    </>
  );
}
