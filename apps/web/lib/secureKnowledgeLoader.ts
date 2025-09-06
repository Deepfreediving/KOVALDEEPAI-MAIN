/**
 * 🔒 SECURE KNOWLEDGE INDEX LOADER
 * 
 * Provides secure access to Daniel Koval's knowledge index
 * without exposing it publicly
 */

import { KnowledgeIndex } from '../lib/pineconeServiceEnhanced';

// Cache the index in memory
let cachedIndex: KnowledgeIndex | null = null;

/**
 * Load knowledge index securely from the server-side
 * This prevents public access to Daniel Koval's intellectual property
 */
export async function getSecureKnowledgeIndex(): Promise<KnowledgeIndex | null> {
  if (cachedIndex) return cachedIndex;
  
  try {
    // Import dynamically to avoid build issues
    const fs = require('fs');
    const path = require('path');
    
    // Try multiple possible locations in deployment - SECURE FIRST
    const possiblePaths = [
      path.join(process.cwd(), 'private', 'knowledge', 'koval-knowledge-index.json'), // SECURE primary (apps/web build context)
      path.join(process.cwd(), 'apps', 'web', 'private', 'knowledge', 'koval-knowledge-index.json'), // Cross-directory access
      path.join(__dirname, '..', 'private', 'knowledge', 'koval-knowledge-index.json'), // Relative to lib
      path.join(process.cwd(), 'apps', 'web', 'knowledge', 'koval-knowledge-index.json'), // Legacy fallback
      path.join(__dirname, '..', '..', '..', 'private', 'knowledge', 'koval-knowledge-index.json'), // Vercel relative
    ];
    
    for (const indexPath of possiblePaths) {
      if (fs.existsSync(indexPath)) {
        console.log(`🔒 Loading secure knowledge index from: ${indexPath}`);
        const indexData = fs.readFileSync(indexPath, 'utf-8');
        cachedIndex = JSON.parse(indexData);
        console.log(`✅ Secure knowledge index loaded with ${cachedIndex?.total_items} items`);
        return cachedIndex;
      }
    }
    
    console.error('❌ Knowledge index not found in any secure location');
    return null;
    
  } catch (error) {
    console.error('❌ Failed to load secure knowledge index:', error);
    return null;
  }
}

/**
 * API endpoint to provide controlled access to knowledge index
 * Only returns metadata, not full content
 */
export async function getKnowledgeIndexMetadata() {
  const index = await getSecureKnowledgeIndex();
  
  if (!index) {
    return {
      available: false,
      error: 'Knowledge index not available'
    };
  }
  
  return {
    available: true,
    version: index.version,
    total_items: index.total_items,
    categories: index.categories,
    generated_at: index.generated_at,
    // Do not expose the actual items array with content
  };
}
