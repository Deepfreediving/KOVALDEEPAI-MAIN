import type { NextApiRequest, NextApiResponse } from "next";
import { upsertVectors, queryVectors } from "@lib/pineconeService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "POST") {
      const data = req.body;
      const response = await upsertVectors(data);
      return res.status(200).json({ success: true, data: response });
    }

    if (req.method === "GET") {
      const { vector, topK } = req.query;
      const parsedVector = JSON.parse(vector as string);
      const matches = await queryVectors(parsedVector, Number(topK) || 5);
      return res.status(200).json({ success: true, data: matches });
    }

    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  } catch (error: any) {
    console.error("Pinecone API error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
