import handleCors from "@/utils/cors";
import { queryVectors } from "../../../lib/pineconeService"; // ✅ updated import

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method === "POST") {
    try {
      const { queryVector, topK = 5 } = req.body;

      if (!Array.isArray(queryVector) || queryVector.length === 0) {
        return res.status(400).json({ success: false, error: "Query vector is required." });
      }

      // ✅ Query Pinecone using the updated service
      const matches = await queryVectors(queryVector, topK);

      return res.status(200).json({ success: true, matches });
    } catch (error) {
      console.error("❌ Error querying Pinecone:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  } else {
    res.status(405).json({ success: false, error: "Method Not Allowed" });
  }
}
