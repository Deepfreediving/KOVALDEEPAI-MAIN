/**
 * 🔒 SECURE KNOWLEDGE INDEX STATUS
 * 
 * Provides metadata about the knowledge index without exposing content
 */

import { NextApiRequest, NextApiResponse } from "next";
import { getKnowledgeIndexMetadata } from '@/lib/secureKnowledgeLoader';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const metadata = await getKnowledgeIndexMetadata();
    
    res.status(200).json({
      ...metadata,
      timestamp: new Date().toISOString(),
      security_note: "Knowledge content is protected and not exposed via API"
    });
    
  } catch (error: any) {
    console.error('❌ Error getting knowledge index metadata:', error);
    res.status(500).json({
      available: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
