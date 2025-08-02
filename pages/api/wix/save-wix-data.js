// pages/api/wix/save-wix-data.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { collectionId, item } = req.body;

    if (!collectionId || !item) {
      return res.status(400).json({ error: "Missing collectionId or item data" });
    }

    // Call Wix Data REST API to insert an item
    const response = await fetch(`https://www.wixapis.com/wix-data/v2/items`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.WIX_API_KEY}`, // Use your API key from .env
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dataCollectionId: collectionId,
        item: item,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("❌ Wix Data Save Error:", error);
    return res.status(500).json({ error: "Failed to save data to Wix" });
  }
}