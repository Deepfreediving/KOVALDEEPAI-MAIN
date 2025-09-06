/**
 * 🎯 ENHANCED PINECONE SERVICE WITH KOVAL KNOWLEDGE INDEX
 * 
 * Uses the comprehensive knowledge index for ultra-fast routing and improved retrieval
 */

import { queryPineconeOptimized as originalQuery, CONFIG } from '@/lib/pineconeService';
import fs from 'fs';
import path from 'path';

interface IndexItem {
  id: string;
  title: string;
  category: string;
  author: string;
  canonical: boolean;
  synonyms: string[];
  must_terms: string[];
  bot_must_say?: string;
  file_path: string;
  chunk_ids: string[];
  priority: number;
  content_hash: string;
}

export interface KnowledgeIndex {
  generated_at: string;
  version: string;
  total_items: number;
  defaults: {
    topK: number;
    alpha: number;
    confidence: number;
  };
  categories: string[];
  items: IndexItem[];
}

interface IndexMatch {
  item: IndexItem;
  score: number;
}

interface QueryOptions {
  topK?: number;
  threshold?: number;
  confidence?: number;
  includeMetadata?: boolean;
}

// Load the knowledge index
let knowledgeIndex: KnowledgeIndex | null = null;

function loadKnowledgeIndex(): KnowledgeIndex | null {
  if (knowledgeIndex) return knowledgeIndex;
  
  // ✅ SECURITY FIX: Load from SECURE private knowledge folder (not accessible via web)
  // Try multiple paths for different deployment environments
  const possiblePaths = [
    path.join(process.cwd(), 'private', 'knowledge', 'koval-knowledge-index.json'), // SECURE primary location
    path.join(process.cwd(), 'apps', 'web', 'knowledge', 'koval-knowledge-index.json'), // Legacy fallback
    path.join(__dirname, '..', '..', '..', 'private', 'knowledge', 'koval-knowledge-index.json'), // Vercel build relative
    path.join(__dirname, '..', 'knowledge', 'koval-knowledge-index.json'), // Legacy relative
  ];
  
  for (const indexPath of possiblePaths) {
    try {
      if (fs.existsSync(indexPath)) {
        console.log(`✅ Found knowledge index at: ${indexPath}`);
        const indexData = fs.readFileSync(indexPath, 'utf-8');
        knowledgeIndex = JSON.parse(indexData) as KnowledgeIndex;
        console.log(`✅ Loaded knowledge index with ${knowledgeIndex?.total_items} items`);
        return knowledgeIndex;
      } else {
        console.log(`⚠️ Knowledge index not found at: ${indexPath}`);
      }
    } catch (error) {
      console.error(`❌ Failed to load knowledge index from ${indexPath}:`, error);
    }
  }
  
  console.error('❌ Knowledge index not found in any expected location');
  return null;
}

/**
 * Enhanced query expansion using the knowledge index
 */
function expandQueryWithIndex(userQuery) {
  const index = loadKnowledgeIndex();
  if (!index) return [userQuery];
  
  const queryLower = userQuery.toLowerCase();
  const expansions = new Set([userQuery]);
  
  // Find matching items in the index
  for (const item of index.items) {
    // Check if query matches title, synonyms, or must_terms
    const allTerms = [
      item.title.toLowerCase(),
      ...item.synonyms.map(s => s.toLowerCase()),
      ...item.must_terms.map(t => t.toLowerCase())
    ];
    
    for (const term of allTerms) {
      if (queryLower.includes(term) || term.includes(queryLower)) {
        // Add all related terms
        expansions.add(item.title);
        item.synonyms.forEach(s => expansions.add(s));
        item.must_terms.forEach(t => expansions.add(t));
        break;
      }
    }
  }
  
  return Array.from(expansions);
}

/**
 * Find the best matching index item for direct routing
 */
function findBestIndexMatch(userQuery: string): IndexMatch | null {
  const index = loadKnowledgeIndex();
  if (!index) return null;
  
  const queryLower = userQuery.toLowerCase();
  let bestMatch: IndexMatch | null = null;
  let bestScore = 0;
  
  for (const item of index.items) {
    let score = 0;
    
    // Title exact match (highest score)
    if (queryLower.includes(item.title.toLowerCase())) {
      score += 100;
    }
    
    // Synonym matches
    for (const synonym of item.synonyms) {
      if (queryLower.includes(synonym.toLowerCase())) {
        score += 50;
      }
    }
    
    // Must-term matches (very important for canonical content)
    let mustTermMatches = 0;
    for (const mustTerm of item.must_terms) {
      if (queryLower.includes(mustTerm.toLowerCase())) {
        mustTermMatches++;
        score += 75;
      }
    }
    
    // Boost canonical items
    if (item.canonical) {
      score *= 1.5;
    }
    
    // Priority boost (safety first)
    score *= (6 - item.priority);
    
    // For safety items, require at least 2 must-term matches for high confidence
    if (item.category === 'safety' && item.canonical && mustTermMatches >= 2) {
      score += 200;
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = { item, score };
    }
  }
  
  return bestMatch;
}

/**
 * Enhanced reranking with index-aware scoring
 */
function rerankWithIndex(userQuery, pineconeMatches) {
  const indexMatch = findBestIndexMatch(userQuery);
  
  return pineconeMatches.map(match => {
    let boost = 1.0;
    
    // If we have a strong index match, boost related chunks
    if (indexMatch && indexMatch.score > 150) {
      const { item } = indexMatch;
      
      // Boost chunks from the same file
      if (match.metadata?.file_path === item.file_path) {
        boost *= 2.0;
      }
      
      // Boost chunks containing must-terms
      const text = match.metadata?.text?.toLowerCase() || '';
      for (const mustTerm of item.must_terms) {
        if (text.includes(mustTerm.toLowerCase())) {
          boost *= 1.5;
        }
      }
      
      // Boost canonical content
      if (item.canonical) {
        boost *= 1.3;
      }
    }
    
    return {
      ...match,
      score: match.score * boost,
      indexBoost: boost,
      indexMatch: indexMatch?.item
    };
  }).sort((a, b) => b.score - a.score);
}

/**
 * Check if we should return verbatim content
 */
function shouldReturnVerbatim(bestMatch: any, threshold = 0.85): boolean {
  if (!bestMatch || !bestMatch.indexMatch) return false;
  
  const { indexMatch } = bestMatch;
  return (
    bestMatch.score >= threshold &&
    indexMatch.canonical &&
    indexMatch.bot_must_say
  );
}

/**
 * Enhanced query function with knowledge index integration
 */
export async function queryPineconeWithIndex(query: string, options: QueryOptions = {}) {
  console.log(`🎯 Enhanced query with knowledge index: "${query}"`);
  
  // Step 1: Expand query using knowledge index
  const expandedTerms = expandQueryWithIndex(query);
  const expandedQuery = expandedTerms.join(' | ');
  
  console.log(`📈 Query expanded to: ${expandedTerms.length} terms`);
  
  // Step 2: Find best index match for routing
  const indexMatch = findBestIndexMatch(query);
  if (indexMatch) {
    console.log(`🎯 Index match found: ${indexMatch.item.title} (score: ${indexMatch.score})`);
  }
  
  // Step 3: Query Pinecone with expanded query
  const pineconeResult = await originalQuery(expandedQuery, {
    topK: options.topK || 10,
    threshold: options.threshold || 0.3, // Lower threshold, we'll rerank
    ...options
  });
  
  if (pineconeResult.chunks.length === 0) {
    console.log('⚠️ No Pinecone results found');
    return pineconeResult;
  }
  
  // Step 4: Rerank with index-aware scoring
  const matches = pineconeResult.chunks.map((chunk, i) => ({
    metadata: { 
      text: chunk,
      file_path: pineconeResult.metadata?.[i]?.file_path || ''
    },
    score: pineconeResult.scores[i]
  }));
  
  const rerankedMatches = rerankWithIndex(query, matches);
  
  // Step 5: Check for verbatim return
  const bestMatch = rerankedMatches[0];
  if (bestMatch) {
    bestMatch.indexMatch = indexMatch?.item;
  }
  
  const shouldBeVerbatim = shouldReturnVerbatim(bestMatch, options.confidence || 0.85);
  
  if (shouldBeVerbatim && indexMatch) {
    console.log(`✅ Returning verbatim canonical content for: ${indexMatch.item.title}`);
    return {
      chunks: rerankedMatches.slice(0, 2).map(m => m.metadata.text), // Top 2 chunks
      scores: rerankedMatches.slice(0, 2).map(m => m.score),
      metadata: rerankedMatches.slice(0, 2).map(m => m.metadata),
      processingTime: pineconeResult.processingTime,
      indexMatch: indexMatch.item,
      verbatim: true,
      botMustSay: indexMatch.item.bot_must_say
    };
  }
  
  // Step 6: Return enhanced results
  const topResults = rerankedMatches.slice(0, options.topK || 5);
  
  console.log(`✅ Enhanced results: ${topResults.length} chunks (best score: ${topResults[0]?.score?.toFixed(3)})`);
  
  return {
    chunks: topResults.map(m => m.metadata.text),
    scores: topResults.map(m => m.score),
    metadata: topResults.map(m => m.metadata),
    processingTime: pineconeResult.processingTime,
    indexMatch: indexMatch?.item,
    verbatim: false
  };
}

/**
 * Get micro-clarifier for ambiguous queries
 */
export function getMicroClarifier(query: string): string | null {
  const indexMatch = findBestIndexMatch(query);
  
  if (indexMatch && indexMatch.score > 50 && indexMatch.score < 150) {
    const { item } = indexMatch;
    const mustTermsStr = item.must_terms.slice(0, 3).join(', ');
    return `Do you mean "${item.title}" (${mustTermsStr})?`;
  }
  
  return null;
}

export { CONFIG };
