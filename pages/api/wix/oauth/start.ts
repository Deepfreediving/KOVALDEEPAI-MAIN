// pages/api/wix/oauth/start.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const redirectUri = `${process.env.BASE_URL}/api/wix/oauth/callback`;

    // ✅ Build Wix OAuth authorization URL
    const authUrl = `https://www.wix.com/oauth/authorize?response_type=code&client_id=${
      process.env.WIX_CLIENT_ID
    }&redirect_uri=${encodeURIComponent(redirectUri)}&scope=wix-data.read-write%20offline_access`;

    console.log("🔗 Redirecting user to Wix OAuth URL:", authUrl);

    // ✅ Redirect user to Wix's authorization page
    res.redirect(authUrl);
  } catch (error: any) {
    console.error("❌ OAuth Start Error:", error.message);
    res.status(500).json({ error: "Failed to initiate Wix OAuth flow" });
  }
}
