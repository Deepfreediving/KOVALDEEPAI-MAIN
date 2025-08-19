export default function handler(req, res) {
  try {
    const envCheck = {
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      PINECONE_API_KEY: !!process.env.PINECONE_API_KEY,
      PINECONE_INDEX: !!process.env.PINECONE_INDEX,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NODE_ENV: process.env.NODE_ENV,
    };

    console.log('Environment variables check:', envCheck);

    res.status(200).json({
      message: 'Environment check',
      env: envCheck,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Environment check error:', error);
    res.status(500).json({
      error: 'Environment check failed',
      message: error.message
    });
  }
}
