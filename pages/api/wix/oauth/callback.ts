import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import querystring from 'querystring';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, error } = req.query;

  // Handle OAuth errors returned from Wix
  if (error) {
    console.error("❌ Wix OAuth Error:", error);
    return res.status(400).json({ error: `OAuth error: ${error}` });
  }

  // Ensure the authorization code exists
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid authorization code from Wix' });
  }

  try {
    // ✅ Exchange authorization code for access/refresh tokens
    const tokenResponse = await axios.post(
      'https://www.wix.com/oauth/access',
      querystring.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.WIX_OAUTH_CLIENT_ID,
        client_secret: process.env.WIX_OAUTH_CLIENT_SECRET,
        redirect_uri: `${process.env.BASE_URL}/api/wix/oauth/callback`,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Validate tokens
    if (!access_token || !refresh_token) {
      console.error('❌ Invalid token response from Wix:', tokenResponse.data);
      return res.status(500).json({ error: 'Invalid token response from Wix' });
    }

    // Save tokens locally (for demo only – replace with DB or secrets manager in production)
    const tokensPath = path.join(process.cwd(), 'wix-tokens.json');
    fs.writeFileSync(
      tokensPath,
      JSON.stringify(
        {
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresAt: Date.now() + expires_in * 1000,
        },
        null,
        2
      )
    );

    console.log('✅ Wix Tokens Saved:', {
      accessToken: access_token.substring(0, 8) + '...',
      refreshToken: refresh_token.substring(0, 8) + '...',
    });

    // ✅ Redirect user back to your Wix site or a success page
    return res.redirect(
      'https://www.deepfreediving.com/large-koval-deep-ai-page?auth=success'
    );

  } catch (err: any) {
    console.error('❌ OAuth Callback Error:', err.response?.data || err.message);
    return res.status(500).json({
      error: 'Failed to complete Wix OAuth flow',
      details: err.response?.data || err.message,
    });
  }
}
