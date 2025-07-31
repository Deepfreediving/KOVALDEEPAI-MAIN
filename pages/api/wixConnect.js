import { items } from '@wix/data';
import { createClient, ApiKeyStrategy } from '@wix/sdk';

export default async function handler(req, res) {
  // Ensure the API key exists
  if (!process.env.WIX_API_KEY) {
    return res.status(500).json({ error: "Missing WIX_API_KEY in environment variables." });
  }

  try {
    // Initialize Wix client using API Key authentication
    const myWixClient = createClient({
      modules: { items },
      auth: ApiKeyStrategy({
        apiKey: process.env.WIX_API_KEY,
      }),
    });

    // Choose the collection dynamically or fallback to "userMemory"
    const dataCollectionId = req.query.collectionId || "userMemory";

    // Fetch data from the Wix collection
    const dataItemsList = await myWixClient.items
      .queryDataItems({ dataCollectionId })
      .find();

    // Return the data
    return res.status(200).json({
      total: dataItemsList.items.length,
      data: dataItemsList.items,
    });

  } catch (error) {
    console.error("❌ Wix API Error:", error.message);
    return res.status(500).json({
      error: "Failed to fetch data from Wix",
      details: error.message || "Unknown error occurred.",
    });
  }
}
