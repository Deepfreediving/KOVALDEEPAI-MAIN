// pages/api/wixConnect.js
import { items } from '@wix/data';
import { createClient, ApiKeyStrategy } from '@wix/sdk';

export default async function handler(req, res) {
  console.log("📡 [wixConnect] Incoming request:", req.method, req.query);

  // ✅ Allow only GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed. Use GET.' });
  }

  // ✅ Check environment variable
  const apiKey = process.env.WIX_API_KEY;
  if (!apiKey) {
    console.error("❌ [wixConnect] Missing WIX_API_KEY");
    return res.status(500).json({ 
      error: 'Server misconfiguration: missing WIX_API_KEY.' 
    });
  }

  let myWixClient;
  try {
    // ✅ Initialize client
    console.log("🔑 [wixConnect] Initializing Wix Client...");
    myWixClient = createClient({
      modules: { items },
      auth: ApiKeyStrategy({ apiKey }),
    });
    console.log("✅ [wixConnect] Wix Client initialized successfully.");
  } catch (clientError) {
    console.error("❌ [wixConnect] Failed to create Wix client:", clientError);
    return res.status(500).json({ 
      error: 'Failed to initialize Wix client.', 
      details: clientError?.message 
    });
  }

  // ✅ Validate collectionId param
  const dataCollectionId = (req.query.collectionId || 'userMemory').trim();
  if (!dataCollectionId) {
    console.error("⚠️ [wixConnect] Invalid or missing collectionId parameter.");
    return res.status(400).json({ 
      error: 'Invalid collectionId parameter.' 
    });
  }

  console.log(`📂 [wixConnect] Querying collection: ${dataCollectionId}`);

  try {
    // ✅ Perform query
    const dataItemsList = await myWixClient.items
      .queryDataItems({
        dataCollectionId,
        paging: { limit: 100 },
      })
      .find();

    console.log("✅ [wixConnect] Query successful. Items found:", dataItemsList?.items?.length || 0);

    // ✅ Check for empty results
    if (!dataItemsList?.items?.length) {
      return res.status(404).json({ 
        error: 'No data found in the specified collection.',
        collectionId: dataCollectionId
      });
    }

    // ✅ Return successful response
    return res.status(200).json({
      success: true,
      total: dataItemsList.items.length,
      data: dataItemsList.items,
    });

  } catch (queryError) {
    console.error("❌ [wixConnect] Wix SDK query failed:", queryError);
    return res.status(502).json({ 
      error: 'Failed to query Wix data collection.', 
      details: queryError?.message 
    });
  }
}
