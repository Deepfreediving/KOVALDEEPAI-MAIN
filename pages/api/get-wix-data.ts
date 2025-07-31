import type { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // ✅ Ensure environment variables are set
    if (!process.env.WIX_API_KEY || !process.env.WIX_DATA_COLLECTION_ID) {
      return res.status(500).json({ error: "Wix API configuration is missing." });
    }

    // ✅ Wix Data API endpoint
    const WIX_URL = `https://www.wixapis.com/data/v2/collections/${process.env.WIX_DATA_COLLECTION_ID}/items`;

    // ✅ Fetch data from Wix with correct Authorization header
    const response = await fetch(WIX_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.WIX_API_KEY}`, // ✅ Dynamically adding Bearer
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Wix API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // ✅ Return data to frontend
    return res.status(200).json({ success: true, data: data.items || [] });
  } catch (error: any) {
    console.error("❌ Error fetching Wix data:", error.message || error);
    return res.status(500).json({ error: "Failed to retrieve Wix data." });
  }
}
