// pages/api/queryDocuments.js
import { queryData } from '@lib/pinecone'; // Import query function

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { queryVector } = req.body;  // Expecting a query vector from the request body
      if (!queryVector || !Array.isArray(queryVector)) {
        return res.status(400).json({ error: 'Query vector must be provided as an array.' });
      }

      // Call Pinecone query
      const queryResponse = await queryData(queryVector);
      res.status(200).json(queryResponse);  // Respond with the query results
    } catch (error) {
      console.error('Error querying Pinecone:', error);
      res.status(500).json({ error: 'Error querying Pinecone' });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });  // Only POST requests are allowed
  }
}
