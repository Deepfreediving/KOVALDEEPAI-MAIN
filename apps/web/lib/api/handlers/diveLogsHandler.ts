/**
 * 🎯 UNIFIED DIVE LOGS HANDLER - API Endpoint Router
 * 
 * This handler routes API requests to the consolidated business logic in diveLogs.ts
 * Handles HTTP methods and request/response formatting for all dive logs endpoints
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { getDiveLogs, createDiveLog, updateDiveLog, deleteDiveLog } from '@/lib/api/supabase/diveLogs'

/**
 * 🎯 MAIN HANDLER - Routes to appropriate method
 */
async function diveLogsHandler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req
  
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate')
  res.setHeader('X-Request-ID', `dive-logs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
  
  try {
    switch (method) {
      case 'GET': {
        const response = await getDiveLogs(req)
        return res.status(200).json(response)
      }
      case 'POST': {
        const diveLogData = req.body.diveLogData || req.body
        const result = await createDiveLog(diveLogData)
        return res.status(201).json(result)
      }
      case 'PUT': {
        const { id } = req.query
        const updateData = req.body.diveLogData || req.body
        const result = await updateDiveLog(id as string, updateData)
        return res.status(200).json(result)
      }
      case 'DELETE': {
        const { id } = req.query
        const result = await deleteDiveLog(id as string)
        return res.status(200).json(result)
      }
      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Dive logs handler error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      requestId: `dive-logs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    })
  }
}

// Named export for compatibility
export { diveLogsHandler }
// Default export for legacy usage
export default diveLogsHandler
