import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method, body } = req;

  try {
    const response = await axios({
      method,
      url: 'https://www.wixapis.com/v2/data/items/query',
      headers: {
        Authorization: `Bearer ${process.env.WIX_API_KEY}`,
        'wix-account-id': process.env.WIX_ACCOUNT_ID || '',
        'wix-site-id': process.env.WIX_SITE_ID || '',
        'Content-Type': 'application/json',
      },
      data: body,
    });

    res.status(200).json(response.data);
  } catch (error: any) {
    console.error("Wix Proxy Error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || error.message || 'Unknown error occurred',
    });
  }
}
