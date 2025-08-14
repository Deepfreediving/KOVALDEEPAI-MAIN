export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ error: "Method not allowed. Use POST instead." });
  }

  try {
    const { collectionId, item } = req.body;

    // Validate input
    if (!collectionId || typeof collectionId !== "string") {
      return res
        .status(400)
        .json({ error: "Invalid or missing 'collectionId'." });
    }

    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return res.status(400).json({ error: "Invalid or missing 'item' data." });
    }

    // Determine if we need to create or update the item
    const isUpdate = item._id && typeof item._id === "string";

    // Define API endpoint and method
    const url = isUpdate
      ? `https://www.wixapis.com/wix-data/v2/items/${item._id}?dataCollectionId=${collectionId}`
      : `https://www.wixapis.com/wix-data/v2/items`;

    const method = isUpdate ? "PATCH" : "POST";

    // Call Wix Data REST API
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${process.env.WIX_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dataCollectionId: collectionId,
        item,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Wix API Error:", data);
      return res.status(response.status).json({ error: data });
    }

    return res.status(200).json({
      message: isUpdate
        ? "Item updated successfully"
        : "Item created successfully",
      data,
    });
  } catch (error) {
    console.error("❌ Wix Data Save Error:", error);
    return res.status(500).json({ error: "Failed to save data to Wix" });
  }
}
