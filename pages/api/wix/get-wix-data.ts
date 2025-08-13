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
    // ✅ Apply CORS handling
    await handleCors(req, res);

    // ✅ Validate required environment variables
    const { WIX_API_KEY, WIX_DATA_COLLECTION_ID, NODE_ENV } = process.env;

    if (!WIX_API_KEY || !WIX_DATA_COLLECTION_ID) {
      console.error("❌ Missing required Wix environment variables.");
      return res.status(500).json({
        success: false,
        error:
          "Wix API configuration is missing. Ensure WIX_API_KEY and WIX_DATA_COLLECTION_ID are set.",
      });
    }

    // ✅ If running locally without a valid API, return mock data
    if (NODE_ENV === "development" && !WIX_API_KEY.startsWith("prod_")) {
      console.warn("⚠️ Using mock Wix data (DEV fallback).");
      return res.status(200).json({
        success: true,
        data: [
          { _id: "mock1", name: "Sample Item 1", description: "This is mock data." },
          { _id: "mock2", name: "Sample Item 2", description: "This is mock data." },
        ],
      });
    }

    // ✅ Construct Wix Data API URL
    const baseURL = `https://www.wixapis.com/data/v2/collections/${WIX_DATA_COLLECTION_ID}/items`;

    // ✅ Support optional query parameters (e.g., filtering)
    const queryString = req.query.q
      ? `?q=${encodeURIComponent(req.query.q as string)}`
      : "";

    const WIX_URL = `${baseURL}${queryString}`;

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
