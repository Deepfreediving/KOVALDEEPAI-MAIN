/**
 * 🔍 KNOWLEDGE FILE ACCESS TEST
 * Test if knowledge index file is accessible in production
 */

import { NextApiRequest, NextApiResponse } from "next";

interface KnowledgeFileResult {
  path: string;
  exists: boolean;
  size?: number;
  totalItems?: number;
  version?: string;
  categories?: string[];
  sampleItems?: any[];
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Test multiple possible paths
    const possiblePaths = [
      path.join(process.cwd(), 'private', 'knowledge', 'koval-knowledge-index.json'),
      path.join(process.cwd(), 'apps', 'web', 'private', 'knowledge', 'koval-knowledge-index.json'),
      path.join(__dirname, '..', 'private', 'knowledge', 'koval-knowledge-index.json'),
      path.join(__dirname, '..', '..', '..', 'private', 'knowledge', 'koval-knowledge-index.json'),
    ];
    
    const results: KnowledgeFileResult[] = [];
    
    for (const filePath of possiblePaths) {
      try {
        const exists = fs.existsSync(filePath);
        if (exists) {
          const stats = fs.statSync(filePath);
          const content = fs.readFileSync(filePath, 'utf8');
          const parsed = JSON.parse(content);
          
          results.push({
            path: filePath,
            exists: true,
            size: stats.size,
            totalItems: parsed.total_items,
            version: parsed.version,
            categories: parsed.categories,
            sampleItems: parsed.items?.slice(0, 2)?.map(item => ({
              title: item.title,
              category: item.category,
              synonyms: item.synonyms
            }))
          });
        } else {
          results.push({
            path: filePath,
            exists: false
          });
        }
      } catch (error: any) {
        results.push({
          path: filePath,
          exists: false,
          error: error.message
        });
      }
    }
    
    res.status(200).json({
      timestamp: new Date().toISOString(),
      cwd: process.cwd(),
      dirname: __dirname,
      paths: results,
      success: results.some(r => r.exists)
    });
    
  } catch (error: any) {
    res.status(500).json({
      error: "Knowledge file test failed",
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
