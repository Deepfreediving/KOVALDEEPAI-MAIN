// pages/api/pineconeUpsertData.js
import { upsertData } from '@lib/pinecone'; // Import upsert function

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { vectors } = req.body;  // Expecting vectors from the request body
      if (!vectors || !Array.isArray(vectors)) {
        return res.status(400).json({ error: 'Vectors must be provided as an array.' });
      }

      // Call Pinecone upsert
      const upsertResponse = await upsertData(vectors);
      res.status(200).json(upsertResponse);  // Respond with Pinecone's response
    } catch (error) {
      console.error('Error upserting data to Pinecone:', error);
      res.status(500).json({ error: 'Error upserting data to Pinecone' });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });  // Only POST requests are allowed
  }
}
