// Enhanced Wix Data Query API - Handles DiveLogs collection properly
// pages/api/wix/query-wix-data.js

import handleCors from "@/utils/handleCors";

export default async function handler(req, res) {
  // Handle CORS
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const startTime = Date.now();

  try {
    const { collectionId, filter = {}, limit = 50, sort = [] } = req.body;

    if (!collectionId) {
      return res.status(400).json({ error: "collectionId is required" });
    }

    console.log(
      `🔍 Querying Wix collection: ${collectionId} with filter:`,
      filter,
    );

    // ✅ OPTION 1: Try direct Wix backend function if available
    try {
      const backendResponse = await fetch(
        "https://www.deepfreediving.com/_functions/queryData",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Source": "nextjs-query",
            "X-User-Agent": "KovalDeepAI-Widget",
          },
          body: JSON.stringify({
            collectionId,
            filter,
            limit,
            sort,
            version: "v4.0",
          }),
        },
      );

      if (backendResponse.ok) {
        const backendData = await backendResponse.json();
        const processingTime = Date.now() - startTime;

        console.log(
          `✅ Wix backend query success: ${backendData.items?.length || 0} items in ${processingTime}ms`,
        );

        return res.status(200).json({
          ...backendData,
          success: true,
          source: "wix-backend",
          metadata: { processingTime },
        });
      }
    } catch (backendError) {
      console.warn("⚠️ Wix backend query failed:", backendError.message);
    }

    // ✅ OPTION 2: Try Wix Data REST API directly
    if (process.env.WIX_API_KEY) {
      try {
        const response = await fetch(
          `https://www.wixapis.com/wix-data/v2/items/query`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.WIX_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              dataCollectionId: collectionId,
              query: {
                filter: filter,
                sort: sort,
                paging: {
                  limit: Math.min(limit, 100), // Cap at 100 for safety
                },
              },
            }),
          },
        );

        const data = await response.json();
        const processingTime = Date.now() - startTime;

        if (response.ok) {
          console.log(
            `✅ Wix Data API query success: ${data.items?.length || 0} items in ${processingTime}ms`,
          );

          return res.status(200).json({
            ...data,
            success: true,
            source: "wix-data-api",
            metadata: { processingTime },
          });
        } else {
          console.warn(`⚠️ Wix Data API error:`, data);
        }
      } catch (apiError) {
        console.warn("⚠️ Wix Data API request failed:", apiError.message);
      }
    } else {
      console.warn("⚠️ WIX_API_KEY not configured");
    }

    // ✅ OPTION 3: Fallback response for when APIs are unavailable
    const processingTime = Date.now() - startTime;
    console.log(
      `📝 No data found for collection ${collectionId} after ${processingTime}ms`,
    );

    return res.status(200).json({
      items: [],
      totalCount: 0,
      success: true,
      source: "empty-fallback",
      message: `No data found in collection ${collectionId}`,
      metadata: {
        processingTime,
        collectionId,
        filter,
        sourcesChecked: ["wix-backend", "wix-data-api"],
      },
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("❌ Wix Data Query Error:", error);

    return res.status(500).json({
      error: "Failed to query Wix Data API",
      success: false,
      metadata: {
        processingTime,
        errorType: error.name || "UnknownError",
      },
    });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: "1mb" },
    responseLimit: false,
    timeout: 15000,
  },
};
