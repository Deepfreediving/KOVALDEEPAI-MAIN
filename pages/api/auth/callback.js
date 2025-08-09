import handleCors from '@/utils/handleCors'; // ✅ CHANGED from cors to handleCors

export default async function handler(req, res) {
  try {
    // ✅ Use handleCors
    if (handleCors(req, res)) return; // Early exit for OPTIONS
    
    if (req.method !== 'GET' && req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { code } = req.query;

    // Handle the OAuth response from Wix
    if (!code) {
      return res.status(400).json({ error: 'No code provided' });
    }

    try {
      // Exchange authorization code for access token
      const response = await fetch('https://www.wixapis.com/oauth/access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          client_id: process.env.WIX_CLIENT_ID,
          client_secret: process.env.WIX_CLIENT_SECRET,
          grant_type: 'authorization_code',
        }),
      });

      const data = await response.json();

      // Redirect or return tokens
      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'OAuth callback failed' });
    }
  } catch (error) {
    console.error('❌ Auth callback error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
