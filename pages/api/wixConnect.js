import { items } from '@wix/data';
import { createClient, ApiKeyStrategy } from '@wix/sdk';

export default async function handler(req, res) {
  // Allow only GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed. Use GET.' });
  }

  // Ensure API key exists
  if (!process.env.WIX_API_KEY) {
    return res.status(500).json({ error: 'Missing WIX_API_KEY in environment variables.' });
  }

  try {
    // Initialize Wix client
    const myWixClient = createClient({
      modules: { items },
      auth: ApiKeyStrategy({
        apiKey: process.env.WIX_API_KEY,
      }),
    });

    // Choose the collection dynamically or fallback to "userMemory"
    const dataCollectionId = req.query.collectionId || 'userMemory';

    // Validate collection ID
    if (typeof dataCollectionId !== 'string' || dataCollectionId.trim() === '') {
      return res.status(400).json({ error: 'Invalid collectionId parameter.' });
    }

    // Fetch data from the Wix collection
    const dataItemsList = await myWixClient.items
      .queryDataItems({
        dataCollectionId,
        paging: { limit: 100 }, // Optional: add pagination limit
      })
      .find();

    // Ensure data exists
    if (!dataItemsList || !dataItemsList.items) {
      return res.status(404).json({ error: 'No data found in the specified collection.' });
    }

    // Return formatted response
    return res.status(200).json({
      total: dataItemsList.items.length,
      data: dataItemsList.items,
    });

  } catch (error) {
    console.error('❌ Wix API Error:', error);

    return res.status(500).json({
      error: 'Failed to fetch data from Wix',
      details: error?.response?.data?.message || error.message || 'Unknown error occurred.',
    });
  }
}
