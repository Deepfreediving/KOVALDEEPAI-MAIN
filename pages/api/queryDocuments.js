// pages/api/queryDocuments.js
import { queryData } from '@lib/pinecone'; // Import query function

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { queryVector } = req.body;  // Expecting a query vector from the request body

      // Validate that the query vector is provided and is an array
      if (!queryVector || !Array.isArray(queryVector)) {
        return res.status(400).json({ error: 'Query vector must be provided as an array.' });
      }

      // Optionally, validate the query vector length (based on your index's dimensions)
      const expectedLength = 1536;  // Replace with the actual dimension of your Pinecone index
      if (queryVector.length !== expectedLength) {
        return res.status(400).json({ error: `Query vector must have ${expectedLength} elements.` });
      }

      // Log incoming query (useful for debugging)
      console.log('Query vector received:', queryVector);

      // Call Pinecone query
      const queryResponse = await queryData(queryVector);

      // Handle case where no matches are found
      if (!queryResponse || queryResponse.matches.length === 0) {
        return res.status(404).json({ error: 'No matching documents found.' });
      }

      // Respond with the query results
      res.status(200).json(queryResponse);  
    } catch (error) {
      // Log error for debugging
      console.error('Error querying Pinecone:', error);

      // Send more context with the error response
      res.status(500).json({ error: 'Error querying Pinecone', details: error.message });
    }
  } else {
    // Handle only POST requests
    res.status(405).json({ error: 'Method Not Allowed' });  // Only POST requests are allowed
  }
}
