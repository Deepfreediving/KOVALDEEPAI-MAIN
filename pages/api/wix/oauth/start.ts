// pages/api/wix/oauth/start.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const redirectUri = `${process.env.BASE_URL}/api/wix/oauth/callback`;

    // ✅ Build Wix OAuth authorization URL using correct ENV vars
    const authUrl = `https://www.wix.com/oauth/authorize?response_type=code&client_id=${
      process.env.WIX_OAUTH_CLIENT_ID
    }&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(
      'wix-data.read-write offline_access'
    )}`;

    console.log("🔗 Redirecting user to Wix OAuth URL:", authUrl);

    // ✅ Redirect user to Wix's authorization page
    return res.redirect(authUrl);

  } catch (error: any) {
    console.error("❌ OAuth Start Error:", error.message);
    return res.status(500).json({ error: "Failed to initiate Wix OAuth flow" });
  }
}
