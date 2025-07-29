import { items } from '@wix/data';
import { createClient, OAuthStrategy } from '@wix/sdk';

export default async function handler(req, res) {
  try {
    // Create Wix Client
    const myWixClient = createClient({
      modules: { items },
      auth: OAuthStrategy({
        clientId: process.env.WIX_CLIENT_ID,  // Stored in .env.local
      }),
    });

    // Query your Wix Collection
    const dataItemsList = await myWixClient.items
      .queryDataItems({
        dataCollectionId: "Events/Schedules", // Change to your desired collection
      })
      .find();

    res.status(200).json({
      total: dataItemsList.items.length,
      data: dataItemsList.items,
    });
  } catch (error) {
    console.error("Wix API Error:", error);
    res.status(500).json({ error: "Failed to fetch data from Wix" });
  }
}
