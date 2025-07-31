import { items } from '@wix/data';
import { createClient, OAuthStrategy } from '@wix/sdk';

export default async function handler(req, res) {
  if (!process.env.WIX_CLIENT_ID || !process.env.WIX_CLIENT_SECRET) {
    return res.status(500).json({ error: "Missing Wix credentials" });
  }

  try {
    // Step 1: Get Access Token
    const tokenResponse = await fetch("https://www.wixapis.com/oauth2/token", {
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
      const errorText = await tokenResponse.text();
      throw new Error(`Failed to retrieve access token: ${errorText}`);
    }

    const { access_token } = await tokenResponse.json();

    // Step 2: Initialize Wix Client
    const myWixClient = createClient({
      modules: { items },
      auth: OAuthStrategy({
        clientId: process.env.WIX_CLIENT_ID,
        tokens: { accessToken: access_token },
      }),
    });

    // Step 3: Query Wix Collection
    const dataCollectionId = req.query.collectionId || "Events/Schedules";
    const dataItemsList = await myWixClient.items
      .queryDataItems({ dataCollectionId })
      .find();

    res.status(200).json({
      total: dataItemsList.items.length,
      data: dataItemsList.items,
    });

  } catch (error) {
    console.error("❌ Wix API Error:", error);
    res.status(500).json({
      error: "Failed to fetch data from Wix",
      details: error.message || "Unknown error",
    });
  }
}
