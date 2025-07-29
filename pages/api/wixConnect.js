import { items } from '@wix/data';
import { createClient, OAuthStrategy } from '@wix/sdk';

export default async function handler(req, res) {
  if (!process.env.WIX_CLIENT_ID || !process.env.WIX_CLIENT_SECRET) {
    console.error("❌ Missing Wix credentials in environment variables");
    return res.status(500).json({ error: "Server misconfiguration: Missing Wix credentials" });
  }

  try {
    // Step 1: Get Access Token
    const tokenResponse = await fetch("https://www.wixapis.com/oauth/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId: process.env.WIX_ACCOUNT_ID,
        clientId: process.env.WIX_CLIENT_ID,
        clientSecret: process.env.WIX_CLIENT_SECRET,
        grant_type: "client_credentials",
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Failed to retrieve access token: ${tokenResponse.statusText}`);
    }

    const { access_token } = await tokenResponse.json();

    // Step 2: Initialize Wix Client with OAuth Token
    const myWixClient = createClient({
      modules: { items },
      auth: OAuthStrategy({
        clientId: process.env.WIX_CLIENT_ID,
        tokens: { accessToken: access_token },
      }),
    });

    // Step 3: Query Wix Collection
    const { collectionId } = req.query;
    const dataCollectionId = collectionId || "Events/Schedules";

    const dataItemsList = await myWixClient.items
      .queryDataItems({ dataCollectionId })
      .find();

    return res.status(200).json({
      total: dataItemsList.items.length,
      data: dataItemsList.items,
    });

  } catch (error) {
    console.error("❌ Wix API Error:", error?.message || error);
    res.status(500).json({
      error: "Failed to fetch data from Wix",
      details: error?.response?.data || error?.message,
    });
  }
}
