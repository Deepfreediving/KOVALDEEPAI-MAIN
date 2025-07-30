import { items } from '@wix/data';
import { createClient, OAuthStrategy } from '@wix/sdk';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables

(async () => {
  try {
    const myWixClient = createClient({
      modules: { items },
      auth: OAuthStrategy({
        clientId: process.env.WIX_CLIENT_ID,
        tokens: { accessToken: process.env.WIX_ACCESS_TOKEN } // Must be valid
      }),
    });

    const dataItemsList = await myWixClient.items
      .queryDataItems({
        dataCollectionId: "UserMemory", // your collection ID
      })
      .find();

    console.log('✅ My Data Items:');
    console.log('Total:', dataItemsList.items.length);
    console.log(
      dataItemsList.items.map((item) => item.data._id).join('\n')
    );
  } catch (error) {
    console.error("❌ Error fetching data:", error.message);
  }
})();
