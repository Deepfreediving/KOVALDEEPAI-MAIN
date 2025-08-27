const dotenv = require("dotenv");
const { Pinecone } = require("@pinecone-database/pinecone");

// Load environment variables
dotenv.config();

const PINECONE_INDEX = process.env.PINECONE_INDEX;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;

if (!PINECONE_INDEX || !PINECONE_API_KEY) {
  throw new Error("❌ Missing required environment variables");
}

const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });

async function cleanupDuplicates() {
  try {
    console.log("🧹 Starting duplicate cleanup...");
    const index = pinecone.index(PINECONE_INDEX);
    
    // Get index stats to see current state
    const stats = await index.describeIndexStats();
    console.log("📊 Current vector count:", stats.totalVectorCount);
    
    // Option 1: Delete all vectors and start fresh (safest)
    console.log("🗑️  Deleting all vectors to start fresh...");
    await index.deleteAll();
    
    console.log("✅ All vectors deleted. Database is now clean.");
    console.log("💡 You can now re-run ingestion with only new content.");
    
  } catch (error) {
    console.error("❌ Cleanup failed:", error.message);
  }
}

cleanupDuplicates();
