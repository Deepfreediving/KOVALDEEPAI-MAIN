// Simple fallback API for dive logs
export default async function handler(req, res) {
  console.log('📋 Simple dive logs fallback API called');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Return empty array for now to prevent 500 errors
  return res.status(200).json({
    success: true,
    data: [],
    message: 'Fallback API - returning empty dive logs',
    source: 'fallback'
  });
}
