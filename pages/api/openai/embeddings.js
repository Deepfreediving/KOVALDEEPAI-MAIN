import handleCors from '@/utils/handleCors';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  try {
    if (handleCors(req, res)) return;
    
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { input } = req.body;

    if (!input) {
      return res.status(400).json({ error: 'Input text is required' });
    }

    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: input,
    });

    return res.status(200).json({
      success: true,
      embedding: response.data[0].embedding
    });

  } catch (error) {
    console.error('❌ Embedding error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create embedding'
    });
  }
}