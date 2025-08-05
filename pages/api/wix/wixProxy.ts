import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import handleCors from '@/utils/handleCors'; // ✅ CHANGED from cors to handleCors

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (await handleCors(req, res)) return;

  const { method, body, query } = req;

  // Allow specifying a dynamic endpoint via ?path=
  // Default to '/v2/data/items/query' if none provided
  const wixPath = (query.path as string) || '/v2/data/items/query';

  try {
    const response = await axios({
      method,
      url: `https://www.wixapis.com${wixPath}`,
      headers: {
        Authorization: `Bearer ${process.env.WIX_API_KEY}`,
        'wix-account-id': process.env.WIX_ACCOUNT_ID || '',
        'wix-site-id': process.env.WIX_SITE_ID || '',
        'Content-Type': 'application/json',
      },
      data: body,
      params: query, // Pass along any query params (except path)
    });

    return res.status(response.status).json(response.data);
  } catch (error: any) {
    console.error("❌ Wix Proxy Error:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });

    return res.status(error.response?.status || 500).json({
      error: error.response?.data || error.message || 'Unknown error occurred',
    });
  }
}
