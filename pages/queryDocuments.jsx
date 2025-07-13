"use client";

import { useState } from 'react';

export default function QueryDocuments() {
  const [query, setQuery] = useState(''); // User input for query
  const [results, setResults] = useState([]); // Query results
  const [loading, setLoading] = useState(false); // Loading state
  const [error, setError] = useState(null); // Error state

  // Placeholder for converting the query to a vector
  const convertQueryToVector = (text) => {
    // Implement vectorization logic here or call a utility
    // For now, return a mock vector for demonstration
    return [0.1, 0.2, 0.3];
  };

  // Handle query submission
  const handleQuerySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const queryVector = convertQueryToVector(query);

      const response = await fetch('/api/queryDocuments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryVector }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch query results');
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      setError(err.message || 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Query Documents</h1>

      <form onSubmit={handleQuerySubmit} className="flex flex-col gap-4 max-w-md mx-auto">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your query here"
          className="p-3 rounded border border-gray-300"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? 'Searching...' : 'Submit Query'}
        </button>
      </form>

      {error && <p className="text-red-500 text-center mt-4">{error}</p>}

      <section className="mt-8 max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold mb-4">Results:</h2>
        <ul className="space-y-2">
          {results.length > 0 ? (
            results.map((res, idx) => (
              <li key={idx} className="bg-white p-4 rounded shadow">
                {JSON.stringify(res)}
              </li>
            ))
          ) : (
            <p className="text-gray-500">No results found.</p>
          )}
        </ul>
      </section>
    </main>
  );
}
