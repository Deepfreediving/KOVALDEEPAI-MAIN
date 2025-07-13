import { useState } from 'react';

export default function QueryDocuments() {
  const [query, setQuery] = useState(''); // User input for query
  const [results, setResults] = useState([]); // Query results
  const [loading, setLoading] = useState(false); // Loading state
  const [error, setError] = useState(null); // Error state

  // Handle query submission
  const handleQuerySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Convert query to a vector format (you may need a utility to do this)
      const queryVector = convertQueryToVector(query);

      // Send the query to the backend API
      const response = await fetch('/api/queryDocuments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryVector }), // Send queryVector instead of query string
      });

      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data = await response.json();
      setResults(data.matches || []); // Assuming "matches" contains the results from Pinecone
    } catch (err) {
      setError(err.message); // Handle error
      console.error('Error during query:', err); // Log error for debugging
    } finally {
      setLoading(false);
    }
  };

  // Function to convert query string to vector (assuming a predefined method)
  const convertQueryToVector = (query) => {
    // You may use a library or pre-trained model to convert the query to a vector
    // For now, it's just a placeholder function
    return [/* Vectorized representation of the query */];
  };

  return (
    <div>
      <h1>Query Documents</h1>
      <form onSubmit={handleQuerySubmit}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your query"
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Loading...' : 'Submit Query'}
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>} {/* Display error if present */}

      <div>
        {results.length > 0 ? (
          <ul>
            {results.map((doc, index) => (
              <li key={index}>{doc.content}</li> // Assuming doc.content is the text you want to display
            ))}
          </ul>
        ) : (
          <p>No documents found.</p> // Message when no results
        )}
      </div>
    </div>
  );
}
