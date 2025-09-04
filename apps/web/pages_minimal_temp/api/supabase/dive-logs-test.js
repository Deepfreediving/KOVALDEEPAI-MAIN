// TEST ENDPOINT - Uses unified handler with test mode
import { diveLogsHandler } from '@/lib/api/handlers/diveLogsHandler'

export default async function handler(req, res) {
  console.log('🧪 Test endpoint called');
  
  // Add test mode headers
  res.setHeader('X-Test-Mode', 'true');
  res.setHeader('X-Test-Timestamp', new Date().toISOString());
  
  // Use the unified handler for actual functionality
  return diveLogsHandler(req, res);
}
