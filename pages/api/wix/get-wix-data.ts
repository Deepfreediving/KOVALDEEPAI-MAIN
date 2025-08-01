import type { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";
import handleCors from "@/utils/handleCors";

/**
 * Type definitions for Wix Data API response
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
    // ✅ Apply CORS handling first
    await handleCors(req, res);

    // ✅ Validate required environment variables
    const { WIX_API_KEY, WIX_DATA_COLLECTION_ID } = process.env;

    if (!WIX_API_KEY || !WIX_DATA_COLLECTION_ID) {
      console.error("❌ Missing required Wix environment variables.");
      return res.status(500).json({
        success: false,
        error:
          "Wix API configuration is missing. Ensure WIX_API_KEY and WIX_DATA_COLLECTION_ID are set.",
      });
    }

    // ✅ Construct Wix Data API URL
    const WIX_URL = `https://www.wixapis.com/data/v2/collections/${WIX_DATA_COLLECTION_ID}/items`;

    // ✅ Fetch data from Wix API
    const response = await fetch(WIX_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${WIX_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    // ✅ Handle non-200 HTTP responses
    if (!response.ok) {
      const errText = await response.text();
      console.error(`❌ Wix API request failed: ${response.status} ${response.statusText}`);
      console.error(`📜 Error details: ${errText}`);
      return res.status(response.status).json({
        success: false,
        error: `Wix API request failed with status ${response.status}`,
      });
    }

    // ✅ Parse JSON response safely
    const result = await response.json();
    const items: WixItem[] = Array.isArray(result?.items) ? result.items : [];

    console.log(`✅ Successfully retrieved ${items.length} items from Wix.`);

    /**
     * (Optional Future Feature) Upsert data into Pinecone
     * ---------------------------------------------------
     * import { upsertData } from "@/lib/pineconeClient";
     * const vectors = await convertToEmbeddings(items);
     * await upsertData(vectors);
     */

    // ✅ Send response to client
    return res.status(200).json({
      success: true,
      data: items,
    });
  } catch (error: any) {
    console.error("❌ Unexpected error while fetching Wix data:", error?.message || error);
    return res.status(500).json({
      success: false,
      error: "An unexpected server error occurred while retrieving Wix data.",
    });
  }
}
