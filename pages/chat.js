// pages/chat.js
import { useState } from 'react';

export default function Chat() {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState(null);

  const handleQuery = async (e) => {
    e.preventDefault();

    // Prepare the query vector (example: the user's input transformed into a vector)
    const queryVector = [/* Transform the input into a vector here */];

    try {
      // Call the /api/queryDocuments API route
      const res = await fetch('/api/queryDocuments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryVector }),
      });

      const data = await res.json();
      setResponse(data);  // Display query response
    } catch (err) {
      console.error('Error querying documents:', err);
    }
  };

  return (
    <div>
      <form onSubmit={handleQuery}>
        <input 
          type="text" 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          placeholder="Ask a question..." 
        />
        <button type="submit">Submit</button>
      </form>

      {response && (
        <div>
          <h2>Response from Pinecone:</h2>
          <pre>{JSON.stringify(response, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
