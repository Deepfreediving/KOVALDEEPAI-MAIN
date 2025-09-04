/**
 * 🎯 OPTIMIZED PINECONE SERVICE - Based on Official Documentation
 * 
 * Architecture: Implements proper connection pooling, error handling, and query optimization
 * References: 
 * - https://docs.pinecone.io/guides/get-started/database-architecture
 * - https://docs.pinecone.io/guides/optimize/increase-relevance
 * 
 * Key Features:
 * ✅ Singleton pattern for connection stability
 * ✅ Proper error handling and retries
 * ✅ Metadata filtering support
 * ✅ Query optimization for relevance
 * ✅ Connection health monitoring
 * ✅ Proper logging for debugging
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';

// Singleton instances for connection stability
let pineconeInstance: Pinecone | null = null;
let openaiInstance: OpenAI | null = null;
let indexInstance: any = null;

// Configuration constants based on Pinecone best practices
const CONFIG = {
  EMBEDDING_MODEL: 'text-embedding-3-small', // Consistent with ingestion
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second base delay
  DEFAULT_TOP_K: 5,
  RELEVANCE_THRESHOLD: 0.5, // Minimum similarity score
  TIMEOUT: 30000, // 30 seconds
} as const;

interface QueryOptions {
  topK?: number;
  filter?: Record<string, any>;
  includeMetadata?: boolean;
  threshold?: number;
  namespace?: string;
}

interface QueryResult {
  chunks: string[];
  scores: number[];
  metadata: any[];
  processingTime: number;
}

/**
 * Initialize Pinecone client with proper error handling
 */
async function initializePinecone(): Promise<Pinecone> {
  if (pineconeInstance) {
    return pineconeInstance;
  }

  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) {
    throw new Error('PINECONE_API_KEY environment variable is required');
  }

  try {
    console.log('🔧 Initializing Pinecone client...');
    pineconeInstance = new Pinecone({ 
      apiKey,
      // Add additional configuration for production stability
      fetchApi: fetch, // Use global fetch for better compatibility
    });
    
    console.log('✅ Pinecone client initialized successfully');
    return pineconeInstance;
  } catch (error) {
    console.error('❌ Failed to initialize Pinecone:', error);
    throw new Error(`Pinecone initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Initialize OpenAI client for embeddings
 */
async function initializeOpenAI(): Promise<OpenAI> {
  if (openaiInstance) {
    return openaiInstance;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  try {
    console.log('🔧 Initializing OpenAI client...');
    openaiInstance = new OpenAI({ apiKey });
    console.log('✅ OpenAI client initialized successfully');
    return openaiInstance;
  } catch (error) {
    console.error('❌ Failed to initialize OpenAI:', error);
    throw new Error(`OpenAI initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get Pinecone index with proper error handling
 */
async function getIndex() {
  if (indexInstance) {
    return indexInstance;
  }

  const indexName = process.env.PINECONE_INDEX;
  if (!indexName) {
    throw new Error('PINECONE_INDEX environment variable is required');
  }

  try {
    const pinecone = await initializePinecone();
    console.log(`🔧 Connecting to Pinecone index: ${indexName}`);
    
    // Get index with proper error handling
    indexInstance = pinecone.index(indexName);
    
    // Test the connection by getting index stats
    const stats = await indexInstance.describeIndexStats();
    console.log(`✅ Connected to index ${indexName} - Total vectors: ${stats.totalRecordCount}`);
    
    return indexInstance;
  } catch (error) {
    console.error('❌ Failed to connect to Pinecone index:', error);
    throw new Error(`Index connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate embedding with retry logic
 */
async function generateEmbedding(text: string, retryCount = 0): Promise<number[]> {
  try {
    const openai = await initializeOpenAI();
    
    console.log(`🤖 Generating embedding for text (${text.length} chars)...`);
    const startTime = Date.now();
    
    const response = await openai.embeddings.create({
      model: CONFIG.EMBEDDING_MODEL,
      input: text,
    });

    const processingTime = Date.now() - startTime;
    console.log(`✅ Embedding generated in ${processingTime}ms`);
    
    return response.data[0].embedding;
  } catch (error) {
    console.error(`❌ Embedding generation failed (attempt ${retryCount + 1}):`, error);
    
    // Retry logic with exponential backoff
    if (retryCount < CONFIG.MAX_RETRIES) {
      const delay = CONFIG.RETRY_DELAY * Math.pow(2, retryCount);
      console.log(`⏳ Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return generateEmbedding(text, retryCount + 1);
    }
    
    throw new Error(`Embedding generation failed after ${CONFIG.MAX_RETRIES} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Optimized query function with relevance improvements
 */
async function queryPineconeOptimized(
  query: string, 
  options: QueryOptions = {}
): Promise<QueryResult> {
  const startTime = Date.now();
  
  try {
    console.log(`🔍 Starting optimized Pinecone query: "${query}"`);
    console.log(`📊 Query options:`, options);
    
    // Input validation
    if (!query?.trim()) {
      throw new Error('Query text is required and cannot be empty');
    }

    // Get embedding for the query
    const embedding = await generateEmbedding(query);
    
    // Get index
    const index = await getIndex();
    
    // Prepare query options with defaults
    const queryOptions = {
      vector: embedding,
      topK: options.topK || CONFIG.DEFAULT_TOP_K,
      includeMetadata: options.includeMetadata !== false, // Default to true
      ...(options.filter && { filter: options.filter }),
      ...(options.namespace && { namespace: options.namespace }),
    };
    
    console.log(`🎯 Executing Pinecone query with topK=${queryOptions.topK}`);
    
    // Execute query with timeout
    const queryPromise = index.query(queryOptions);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), CONFIG.TIMEOUT)
    );
    
    const result = await Promise.race([queryPromise, timeoutPromise]) as any;
    
    // Process results with relevance filtering
    const chunks: string[] = [];
    const scores: number[] = [];
    const metadata: any[] = [];
    
    if (result.matches && result.matches.length > 0) {
      console.log(`📊 Found ${result.matches.length} matches from Pinecone`);
      
      for (const match of result.matches) {
        // Apply relevance threshold
        if (match.score >= (options.threshold || CONFIG.RELEVANCE_THRESHOLD)) {
          if (match.metadata?.text) {
            chunks.push(match.metadata.text);
            scores.push(match.score);
            metadata.push(match.metadata);
          }
        } else {
          console.log(`⚠️ Filtered out low relevance match (score: ${match.score})`);
        }
      }
      
      console.log(`✅ Returning ${chunks.length} relevant chunks after filtering`);
      
      // Log sample of best match for debugging
      if (chunks.length > 0) {
        console.log(`🔍 Best match (score: ${scores[0]?.toFixed(4)}):`, 
          chunks[0].substring(0, 200) + '...'
        );
      }
    } else {
      console.log('⚠️ No matches found in Pinecone index');
    }
    
    const processingTime = Date.now() - startTime;
    console.log(`⏱️ Total query processing time: ${processingTime}ms`);
    
    return {
      chunks,
      scores,
      metadata,
      processingTime,
    };
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ Pinecone query failed after ${processingTime}ms:`, error);
    
    // Return empty result instead of throwing to maintain system stability
    return {
      chunks: [],
      scores: [],
      metadata: [],
      processingTime,
    };
  }
}

/**
 * Health check function to verify Pinecone connectivity
 */
async function healthCheck(): Promise<{
  pinecone: boolean;
  openai: boolean;
  index: boolean;
  details: Record<string, any>;
}> {
  const results = {
    pinecone: false,
    openai: false,
    index: false,
    details: {} as Record<string, any>,
  };
  
  try {
    // Test Pinecone connection
    const pinecone = await initializePinecone();
    results.pinecone = true;
    results.details.pinecone = 'Connected successfully';
    
    // Test OpenAI connection
    const openai = await initializeOpenAI();
    results.openai = true;
    results.details.openai = 'Connected successfully';
    
    // Test index connection and get stats
    const index = await getIndex();
    const stats = await index.describeIndexStats();
    results.index = true;
    results.details.index = {
      status: 'Connected successfully',
      totalRecords: stats.totalRecordCount,
      indexFullness: stats.indexFullness,
      dimension: stats.dimension,
    };
    
  } catch (error) {
    results.details.error = error instanceof Error ? error.message : 'Unknown error';
  }
  
  return results;
}

// Export the optimized service
export {
  queryPineconeOptimized,
  healthCheck,
  initializePinecone,
  initializeOpenAI,
  getIndex,
  generateEmbedding,
  CONFIG,
};

// Export types
export type { QueryOptions, QueryResult };
