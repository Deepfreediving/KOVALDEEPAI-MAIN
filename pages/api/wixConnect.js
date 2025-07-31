// pages/api/wixConnect.js
import { items } from '@wix/data';
import { createClient, ApiKeyStrategy } from '@wix/sdk';

export default async function handler(req, res) {
  // ✅ Allow only GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed. Use GET.' });
  }

  // ✅ Check environment variable
  const apiKey = process.env.WIX_API_KEY;
  if (!apiKey) {
    console.error("❌ Missing WIX_API_KEY");
    return res.status(500).json({ error: 'Server misconfiguration: missing WIX_API_KEY.' });
  }

  try {
    // ✅ Initialize client
    const myWixClient = createClient({
      modules: { items },
      auth: ApiKeyStrategy({ apiKey }),
    });

    // ✅ Validate collectionId param
    const dataCollectionId = (req.query.collectionId || 'userMemory').trim();
    if (!dataCollectionId) {
      return res.status(400).json({ error: 'Invalid collectionId parameter.' });
    }

    // ✅ Perform query safely
    let dataItemsList;
    try {
      dataItemsList = await myWixClient.items
        .queryDataItems({
          dataCollectionId,
          paging: { limit: 100 },
        })
        .find();
    } catch (queryError) {
      console.error("❌ Wix SDK query failed:", queryError);
      return res.status(502).json({ error: 'Failed to query Wix data collection.' });
    }

    // ✅ Check for empty results
    if (!dataItemsList?.items?.length) {
      return res.status(404).json({ error: 'No data found in the specified collection.' });
    }

    // ✅ Return response
    return res.status(200).json({
      total: dataItemsList.items.length,
      data: dataItemsList.items,
    });

  } catch (error) {
    console.error("❌ Unexpected Wix API Error:", error);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: error?.message || 'Unknown error occurred.',
    });
  }
}
