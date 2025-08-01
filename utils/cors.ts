import type { NextApiRequest, NextApiResponse } from 'next';

const allowedOrigins = [
  'https://www.deepfreediving.com',
  'https://kovaldeepai-main.vercel.app',
  /^https:\/\/kovaldeepai-main-[a-z0-9]+\.vercel\.app$/,
  'http://localhost:3000',
];

export default function handleCors(req: NextApiRequest, res: NextApiResponse): boolean {
  const origin = req.headers.origin || '';
  const isAllowed = allowedOrigins.some((allowed) =>
    typeof allowed === 'string' ? allowed === origin : allowed.test(origin)
  );

  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }

  return false;
}