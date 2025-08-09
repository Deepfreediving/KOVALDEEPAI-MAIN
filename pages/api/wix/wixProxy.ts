import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import handleCors from '@/utils/handleCors';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (handleCors(req, res)) return;

  const startTime = Date.now();
  const { method, body, query } = req;

  // Allow specifying a dynamic endpoint via ?path=
  // Default to '/v2/data/items/query' if none provided
  const wixPath = (query.path as string) || '/v2/data/items/query';

  // Enhanced logging for debugging
  console.log(`🔗 Wix Proxy: ${method} ${wixPath}`, {
    hasBody: !!body,
    queryParams: Object.keys(query).length,
    userAgent: req.headers['user-agent']?.slice(0, 50) || 'unknown'
  });

  try {
    const response = await axios({
      method,
      url: `https://www.wixapis.com${wixPath}`,
      headers: {
        Authorization: `Bearer ${process.env.WIX_API_KEY}`,
        'wix-account-id': process.env.WIX_ACCOUNT_ID || '',
        'wix-site-id': process.env.WIX_SITE_ID || '',
        'Content-Type': 'application/json',
        // Add source tracking for analytics
        'X-API-Source': 'nextjs-proxy',
        'X-Request-ID': `proxy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      },
      data: body,
      params: { ...query, path: undefined }, // Remove path from params
      timeout: 15000 // 15 second timeout
    });

    const processingTime = Date.now() - startTime;
    
    console.log(`✅ Wix Proxy success: ${response.status} in ${processingTime}ms`, {
      dataSize: JSON.stringify(response.data).length,
      itemCount: response.data?.items?.length || 0
    });

    // Add performance metadata to response
    const enhancedResponse = {
      ...response.data,
      _metadata: {
        processingTime,
        source: 'wix-api',
        timestamp: new Date().toISOString(),
        ...(response.data._metadata || {})
      }
    };

    return res.status(response.status).json(enhancedResponse);
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    
    console.error("❌ Wix Proxy Error:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      processingTime,
      path: wixPath,
      method
    });

    // Enhanced error response with debugging info
    const errorResponse = {
      error: error.response?.data || error.message || 'Unknown error occurred',
      statusCode: error.response?.status || 500,
      _metadata: {
        processingTime,
        source: 'wix-api-error',
        timestamp: new Date().toISOString(),
        path: wixPath,
        method
      }
    };

    return res.status(error.response?.status || 500).json(errorResponse);
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '2mb' },
    responseLimit: false,
    timeout: 20000
  }
};
