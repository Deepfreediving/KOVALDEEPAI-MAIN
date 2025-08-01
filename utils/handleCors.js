// utils/handleCors.js

export default function handleCors(req, res) {
  return new Promise((resolve) => {
    const allowedOrigins = [
      'https://www.deepfreediving.com',
      'https://kovaldeepai-main.vercel.app',
      /^https:\/\/kovaldeepai-main-[a-z0-9]+\.vercel\.app$/, // dynamic Vercel previews
      'http://localhost:3000',
      process.env.ADDITIONAL_ALLOWED_ORIGIN || ''
    ].filter(Boolean); // remove empty entries

    const origin = req.headers.origin;
    const isAllowed = allowedOrigins.some((o) =>
      typeof o === 'string' ? o === origin : o.test(origin)
    );

    if (isAllowed && origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return resolve();
    }

    return resolve();
  });
}
