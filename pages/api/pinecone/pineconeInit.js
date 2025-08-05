// lib/pineconeInit.js
import { Pinecone } from "@pinecone-database/pinecone";

const { PINECONE_API_KEY, PINECONE_INDEX, PINECONE_ENVIRONMENT } = process.env;

// ✅ Enhanced environment validation
if (!PINECONE_API_KEY) {
  console.error("❌ PINECONE_API_KEY is required");
  throw new Error("Missing Pinecone API key");
}

if (!PINECONE_INDEX) {
  console.error("❌ PINECONE_INDEX is required");
  throw new Error("Missing Pinecone index name");
}

// ✅ Enhanced client initialization with error handling
let pineconeClient;
let index;

try {
  // Use global instance to prevent multiple connections
  if (!globalThis.pineconeClient) {
    console.log("🔄 Initializing Pinecone client...");
    
    const config = { apiKey: PINECONE_API_KEY };
    if (PINECONE_ENVIRONMENT) {
      config.environment = PINECONE_ENVIRONMENT;
    }
    
    pineconeClient = new Pinecone(config);
    globalThis.pineconeClient = pineconeClient;
    console.log("✅ Pinecone client initialized");
  } else {
    pineconeClient = globalThis.pineconeClient;
    console.log("♻️ Using existing Pinecone client");
  }

  // Initialize index
  index = pineconeClient.index(PINECONE_INDEX);
  
  if (!index) {
    throw new Error(`Failed to initialize index: ${PINECONE_INDEX}`);
  }
  
  console.log(`✅ Connected to Pinecone index: ${PINECONE_INDEX}`);

} catch (error) {
  console.error("❌ Failed to initialize Pinecone:", error);
  throw error;
}

// ✅ Enhanced vector validation
function validateVector(vector, id) {
  if (!Array.isArray(vector)) {
    throw new Error(`Vector must be an array (ID: ${id})`);
  }
  
  if (vector.length === 0) {
    throw new Error(`Vector cannot be empty (ID: ${id})`);
  }
  
  if (vector.length > 10000) {
    throw new Error(`Vector too large: ${vector.length} dimensions (ID: ${id})`);
  }
  
  // Check for valid numbers
  for (let i = 0; i < vector.length; i++) {
    if (typeof vector[i] !== 'number' || !isFinite(vector[i])) {
      throw new Error(`Invalid vector value at index ${i} (ID: ${id}): ${vector[i]}`);
    }
  }
  
  return true;
}

// ✅ Enhanced metadata validation and sanitization
function sanitizeMetadata(metadata, id) {
  if (!metadata || typeof metadata !== 'object') {
    return {};
  }
  
  const sanitized = {};
  const maxMetadataSize = 40960; // 40KB limit
  let totalSize = 0;
  
  for (const [key, value] of Object.entries(metadata)) {
    // Validate key
    if (typeof key !== 'string' || key.length === 0 || key.length > 100) {
      console.warn(`⚠️ Skipping invalid metadata key for ID ${id}: ${key}`);
      continue;
    }
    
    // Sanitize and validate value
    let sanitizedValue;
    
    if (typeof value === 'string') {
      // Limit string length and remove dangerous characters
      sanitizedValue = value.slice(0, 10000).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    } else if (typeof value === 'number' && isFinite(value)) {
      sanitizedValue = value;
    } else if (typeof value === 'boolean') {
      sanitizedValue = value;
    } else if (Array.isArray(value)) {
      // Handle arrays (common for tags, categories)
      sanitizedValue = value
        .filter(item => typeof item === 'string' || typeof item === 'number')
        .slice(0, 50); // Limit array size
    } else {
      console.warn(`⚠️ Skipping unsupported metadata type for ID ${id}, key ${key}: ${typeof value}`);
      continue;
    }
    
    // Check total metadata size
    const itemSize = JSON.stringify({ [key]: sanitizedValue }).length;
    if (totalSize + itemSize > maxMetadataSize) {
      console.warn(`⚠️ Metadata size limit reached for ID ${id}, skipping key: ${key}`);
      break;
    }
    
    sanitized[key] = sanitizedValue;
    totalSize += itemSize;
  }
  
  return sanitized;
}

// ✅ Enhanced batch processing for large upserts
const BATCH_SIZE = 100; // Pinecone recommended batch size

async function processBatch(vectors, batchIndex, totalBatches) {
  const startTime = Date.now();
  
  try {
    console.log(`🔄 Processing batch ${batchIndex + 1}/${totalBatches} (${vectors.length} vectors)`);
    
    const response = await index.upsert(vectors, {
      waitForCompletion: false // Don't wait for indexing to complete
    });
    
    const processingTime = Date.now() - startTime;
    console.log(`✅ Batch ${batchIndex + 1} completed in ${processingTime}ms`);
    
    return response;
    
  } catch (error) {
    console.error(`❌ Batch ${batchIndex + 1} failed:`, error);
    throw error;
  }
}

// ✅ Enhanced upsert with validation, batching, and retry logic
export async function upsertData(vectors = [], options = {}) {
  if (!Array.isArray(vectors) || vectors.length === 0) {
    throw new Error("Data must be a non-empty array of vectors");
  }

  if (vectors.length > 10000) {
    throw new Error(`Too many vectors: ${vectors.length}. Maximum is 10,000 per call`);
  }

  const { 
    validateVectors = true, 
    retries = 3,
    batchSize = BATCH_SIZE 
  } = options;

  console.log(`🚀 Starting upsert of ${vectors.length} vectors`);
  const startTime = Date.now();

  try {
    // ✅ Validate and format vectors
    const formattedVectors = vectors.map((item, index) => {
      // Validate required fields
      if (!item.id || typeof item.id !== 'string') {
        throw new Error(`Vector at index ${index} missing or invalid ID`);
      }
      
      if (item.id.length > 512) {
        throw new Error(`Vector ID too long at index ${index}: ${item.id.length} characters`);
      }
      
      if (!item.values) {
        throw new Error(`Vector at index ${index} missing values array`);
      }
      
      // Validate vector if requested
      if (validateVectors) {
        validateVector(item.values, item.id);
      }
      
      return {
        id: item.id,
        values: item.values,
        metadata: sanitizeMetadata(item.metadata, item.id)
      };
    });

    // ✅ Process in batches for better performance and reliability
    const batches = [];
    for (let i = 0; i < formattedVectors.length; i += batchSize) {
      batches.push(formattedVectors.slice(i, i + batchSize));
    }

    const results = [];
    let totalUpserted = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      let lastError;
      
      // Retry logic for each batch
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const result = await processBatch(batch, i, batches.length);
          results.push(result);
          totalUpserted += batch.length;
          break; // Success, exit retry loop
          
        } catch (error) {
          lastError = error;
          console.warn(`⚠️ Batch ${i + 1} attempt ${attempt} failed:`, error.message);
          
          if (attempt < retries) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            console.log(`⏳ Retrying batch ${i + 1} in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // If all retries failed for this batch
      if (lastError && totalUpserted < formattedVectors.length) {
        throw new Error(`Failed to upsert batch ${i + 1} after ${retries} attempts: ${lastError.message}`);
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`✅ Successfully upserted ${totalUpserted} vectors in ${totalTime}ms`);
    
    return {
      upsertedCount: totalUpserted,
      batchResults: results,
      processingTime: totalTime
    };

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ Upsert failed after ${totalTime}ms:`, error);
    throw error;
  }
}

// ✅ Enhanced query with validation and filtering
export async function queryData(vector = [], options = {}) {
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error("Query vector must be a non-empty array");
  }

  // Validate query vector
  validateVector(vector, 'query');

  const {
    topK = 5,
    includeValues = false,
    includeMetadata = true,
    filter = null,
    namespace = null
  } = options;

  // Validate topK
  if (typeof topK !== 'number' || topK < 1 || topK > 10000) {
    throw new Error(`Invalid topK: ${topK}. Must be between 1 and 10,000`);
  }

  const startTime = Date.now();
  
  try {
    console.log(`🔍 Querying Pinecone with topK=${topK}, filter=${JSON.stringify(filter)}`);
    
    const queryOptions = {
      vector,
      topK,
      includeValues,
      includeMetadata
    };
    
    if (filter) queryOptions.filter = filter;
    if (namespace) queryOptions.namespace = namespace;

    const response = await index.query(queryOptions);
    
    const matches = Array.isArray(response.matches) ? response.matches : [];
    const processingTime = Date.now() - startTime;
    
    console.log(`✅ Query completed in ${processingTime}ms, found ${matches.length} matches`);
    
    return {
      matches,
      processingTime,
      namespace: response.namespace
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ Query failed after ${processingTime}ms:`, error);
    throw error;
  }
}

// ✅ Health check function for monitoring
export async function healthCheck() {
  try {
    const startTime = Date.now();
    
    // Test with a small query
    const testVector = new Array(1536).fill(0.1); // OpenAI embedding size
    await queryData(testVector, { topK: 1 });
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'healthy',
      responseTime,
      index: PINECONE_INDEX,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      index: PINECONE_INDEX,
      timestamp: new Date().toISOString()
    };
  }
}

// ✅ Cleanup function for graceful shutdown
export function cleanup() {
  try {
    if (globalThis.pineconeClient) {
      delete globalThis.pineconeClient;
      console.log('✅ Pinecone client cleaned up');
    }
  } catch (error) {
    console.warn('⚠️ Error during Pinecone cleanup:', error);
  }
}

export { index, pineconeClient };
export default index;
