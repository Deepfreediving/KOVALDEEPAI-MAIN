/**
 * 🔐 SIMPLE AUTH ENDPOINT FOR TESTING
 * Mock authentication for testing purposes
 */

export default function handler(req, res) {
  if (req.method === 'POST') {
    const { email, password } = req.body;
    
    // Mock authentication - in real app this would use Supabase Auth
    if (email && password) {
      res.status(200).json({
        success: true,
        user: {
          id: 'test-user-id',
          email: email,
          name: 'Test User'
        },
        access_token: 'mock-jwt-token-for-testing',
        message: 'Mock authentication successful'
      });
    } else {
      res.status(400).json({
        error: 'Email and password required'
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: 'Method not allowed' });
  }
}
