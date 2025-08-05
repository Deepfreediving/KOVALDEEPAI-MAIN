// 📂 lib/pinecone.ts

import { Pinecone } from "@pinecone-database/pinecone";

if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) {
  throw new Error("❌ Missing Pinecone environment variables.");
}

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const index = pinecone.index(process.env.PINECONE_INDEX);

export { pinecone, index };
