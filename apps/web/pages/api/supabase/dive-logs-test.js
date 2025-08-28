// Simple test endpoint to verify API routing works
export default async function handler(req, res) {
  console.log('🧪 Test endpoint called');
  
  try {
    const { userId } = req.query;
    
    return res.status(200).json({ 
      success: true,
      message: 'Test endpoint works',
      userId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Test endpoint error:', error);
    return res.status(500).json({ 
      error: 'Test endpoint failed',
      details: error.message
    });
  }
}
