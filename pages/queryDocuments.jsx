import { useState } from 'react';

export default function QueryDocuments() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleQuerySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/queryDocuments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data = await response.json();
      setResults(data.documents);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div>
        {results.length > 0 ? (
          <ul>
            {results.map((doc, index) => (
              <li key={index}>{doc.content}</li>
            ))}
          </ul>
        ) : (
          <p>No documents found.</p>
        )}
      </div>
    </div>
  );
}
