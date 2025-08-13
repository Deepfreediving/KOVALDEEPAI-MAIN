// pages/api/test/wix-backend.ts
import { NextApiRequest, NextApiResponse } from 'next';
import WIX_APP_CONFIG from '@/lib/wixAppConfig';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const results = {
    timestamp: new Date().toISOString(),
    tests: [] as any[]
  };

  // Test 1: Try to connect to your Wix App backend using new config
  try {
    console.log('🔍 Testing connection to @deepfreediving/kovaldeepai-app backend...');
    
    const wixResponse = await WIX_APP_CONFIG.test.health();

    results.tests.push({
      name: 'Wix App Backend Connection (@deepfreediving/kovaldeepai-app)',
      status: wixResponse ? 'SUCCESS' : 'FAILED',
      response: wixResponse
    });

  } catch (error: any) {
    results.tests.push({
      name: 'Wix App Backend Connection (@deepfreediving/kovaldeepai-app)',
      status: 'ERROR',
      error: error.message
    });
  }

  // Test 2: Check if we can save locally
  try {
    console.log('💾 Testing local storage capability...');
    
    const testData = {
      userId: 'test-user',
      date: new Date().toISOString().split('T')[0],
      discipline: 'Test Dive',
      location: 'Test Location',
      notes: 'Test dive log entry'
    };

    const localResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/analyze/save-dive-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });

    results.tests.push({
      name: 'Local Save Test',
      status: localResponse.ok ? 'SUCCESS' : 'FAILED',
      statusCode: localResponse.status,
      response: localResponse.ok ? await localResponse.json() : await localResponse.text()
    });

  } catch (error: any) {
    results.tests.push({
      name: 'Local Save Test',
      status: 'ERROR',
      error: error.message
    });
  }

  // Test 3: Check localStorage availability (client-side)
  results.tests.push({
    name: 'Environment Check',
    status: 'INFO',
    data: {
      nodeEnv: process.env.NODE_ENV,
      vercel: !!process.env.VERCEL,
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
      isServerless: !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
    }
  });

  res.status(200).json(results);
}
