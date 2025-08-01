import type { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";

/**
 * Response type from Wix Data API
 */
interface WixItem {
  _id: string;
  [key: string]: any;
}

interface WixApiResponse {
  success: boolean;
  data?: WixItem[];
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WixApiResponse>
) {
  try {
    // ✅ Ensure required environment variables
    const apiKey = process.env.WIX_API_KEY;
    const collectionId = process.env.WIX_DATA_COLLECTION_ID;

    if (!apiKey || !collectionId) {
      console.error("❌ Missing Wix environment variables");
      return res.status(500).json({ success: false, error: "Wix API configuration is missing." });
    }

    // ✅ Build Wix Data API URL
    const WIX_URL = `https://www.wixapis.com/data/v2/collections/${collectionId}/items`;

    // ✅ Fetch data from Wix API
    const response = await fetch(WIX_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`❌ Wix API request failed: ${response.status} ${response.statusText}`, errText);
      return res.status(response.status).json({ success: false, error: "Wix API request failed." });
    }

    const result = await response.json();

    // ✅ Handle missing or malformed data
    const items: WixItem[] = result?.items ?? [];
    console.log(`✅ Retrieved ${items.length} items from Wix.`);

    /**
     * Optional Step (Future): Store data into Pinecone
     * 
     * If you plan to insert this data into Pinecone for search:
     * 1. Import your Pinecone client
     * 2. Transform 'items' into vector embeddings
     * 3. Upsert to Pinecone index
     */
    // await upsertToPinecone(items);

    return res.status(200).json({ success: true, data: items });
  } catch (error: any) {
    console.error("❌ Error fetching Wix data:", error?.message || error);
    return res.status(500).json({ success: false, error: "Failed to retrieve Wix data." });
  }
}
