// pages/api/wix/query-wix-data.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { collectionId, filter = {}, limit = 50 } = req.body;

    // Call Wix Data REST API
    const response = await fetch(`https://www.wixapis.com/wix-data/v2/items/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.WIX_API_KEY}`, // Ensure you have this in your .env file
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dataCollectionId: collectionId,
        query: {
          filter: filter,
          paging: {
            limit: limit
          }
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("❌ Wix Data Query Error:", error);
    return res.status(500).json({ error: "Failed to query Wix Data API" });
  }
}
