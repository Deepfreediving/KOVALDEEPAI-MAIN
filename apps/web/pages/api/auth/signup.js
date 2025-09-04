/**
 * 📝 SIMPLE SIGNUP ENDPOINT FOR TESTING
 * Mock user registration for testing purposes
 */

export default function handler(req, res) {
  if (req.method === 'POST') {
    const { email, password, fullName } = req.body;
    
    // Mock user creation - in real app this would use Supabase Auth
    if (email && password) {
      res.status(200).json({
        success: true,
        user: {
          id: 'test-user-id',
          email: email,
          fullName: fullName || 'Test User'
        },
        message: 'Mock user created successfully'
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
