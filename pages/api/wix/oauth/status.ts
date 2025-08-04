// pages/api/wix/oauth/status.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const tokensPath = path.join(process.cwd(), 'wix-tokens.json');

  if (!fs.existsSync(tokensPath)) {
    return res.status(404).json({ authenticated: false, message: 'No tokens found' });
  }

  let tokens;
  try {
    tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf-8'));
  } catch (err) {
    fs.unlinkSync(tokensPath);
    return res.status(500).json({ authenticated: false, message: 'Invalid token file' });
  }

  const isExpired = Date.now() > tokens.expiresAt;

  if (isExpired && tokens.refreshToken) {
    try {
      const refreshResponse = await axios.post('https://www.wix.com/oauth/access', {
        grant_type: 'refresh_token',
        refresh_token: tokens.refreshToken,
        client_id: process.env.WIX_OAUTH_CLIENT_ID,
        client_secret: process.env.WIX_OAUTH_CLIENT_SECRET,
      });

      const { access_token, refresh_token, expires_in } = refreshResponse.data;

      const newTokens = {
        accessToken: access_token,
        refreshToken: refresh_token || tokens.refreshToken,
        expiresAt: Date.now() + expires_in * 1000,
      };

      fs.writeFileSync(tokensPath, JSON.stringify(newTokens, null, 2));
      return res.status(200).json({ authenticated: true, refreshed: true });
    } catch (error: any) {
      console.error("❌ Failed to refresh token:", error.response?.data || error.message);
      fs.unlinkSync(tokensPath);
      return res.status(500).json({ authenticated: false, error: 'Token refresh failed' });
    }
  }

  return res.status(200).json({ authenticated: true, refreshed: false });
}
