import { items } from '@wix/data';
import { createClient, OAuthStrategy } from '@wix/sdk';

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed. Use GET instead." });
  }

  try {
    const { collectionId, limit = 50 } = req.query;

    // Validate input
    if (!collectionId || typeof collectionId !== "string") {
      return res.status(400).json({ error: "Missing or invalid 'collectionId' parameter." });
    }

    // Initialize Wix SDK client
    const myWixClient = createClient({
      modules: { items },
      auth: OAuthStrategy({
        clientId: process.env.WIX_CLIENT_ID,
        tokens: { accessToken: process.env.WIX_ACCESS_TOKEN }, // Ensure valid token
      }),
    });

    // Query items from Wix Data
    const dataItemsList = await myWixClient.items
      .queryDataItems({ dataCollectionId: collectionId })
      .limit(Number(limit))
      .find();

    return res.status(200).json({
      message: "Data fetched successfully",
      total: dataItemsList.items.length,
      items: dataItemsList.items.map((item) => ({
        id: item.data._id,
        ...item.data,
      })),
    });

  } catch (error) {
    console.error("❌ Error fetching data from Wix:", error.message);
    return res.status(500).json({ error: "Failed to fetch data from Wix", details: error.message });
  }
}
