// pages/api/wix/oauth/callback.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, error } = req.query;

  if (error) {
    console.error("❌ Wix OAuth Error:", error);
    return res.status(400).json({ error: `OAuth error: ${error}` });
  }

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await axios.post(
      'https://www.wix.com/oauth/access',
      {
        grant_type: 'authorization_code',
        code,
        client_id: process.env.WIX_CLIENT_ID,
        client_secret: process.env.WIX_CLIENT_SECRET,
        redirect_uri: `${process.env.BASE_URL}/api/wix/oauth/callback`,
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // ✅ Validate tokens
    if (!access_token || !refresh_token) {
      console.error('❌ Invalid token response from Wix:', tokenResponse.data);
      return res.status(500).json({ error: 'Invalid token response from Wix' });
    }

    // ✅ Store tokens securely (currently local file for demo)
    const tokensPath = path.join(process.cwd(), 'wix-tokens.json');
    fs.writeFileSync(
      tokensPath,
      JSON.stringify({
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: Date.now() + expires_in * 1000, // store expiration timestamp
      }, null, 2)
    );

    console.log('✅ Wix Tokens Saved:', {
      accessToken: access_token.substring(0, 8) + '...', 
      refreshToken: refresh_token.substring(0, 8) + '...',
    });

    // Redirect user to success page on Wix site
    return res.redirect('https://www.deepfreediving.com/large-koval-deep-ai-page?auth=success');

  } catch (err: any) {
    console.error('❌ OAuth Callback Error:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to complete Wix OAuth flow' });
  }
}
