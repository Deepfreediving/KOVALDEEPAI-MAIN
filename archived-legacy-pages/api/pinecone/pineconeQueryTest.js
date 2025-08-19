import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Pinecone } from "@pinecone-database/pinecone";
import handleCors from "@/utils/handleCors"; // ✅ CHANGED from cors to handleCors

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const indexName = process.env.PINECONE_INDEX;
const index = pinecone.index(indexName);

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { queryVector } = req.body || {};
  const vector = Array.isArray(queryVector)
    ? queryVector
    : new Array(1024).fill(0.015);

  try {
    const result = await index.query({
      vector,
      topK: 2,
      includeMetadata: true,
    });

    res.status(200).json(result);
  } catch (err) {
    console.error("❌ Query failed:", err);
    res.status(500).json({ error: "Failed to query index" });
  }
}
