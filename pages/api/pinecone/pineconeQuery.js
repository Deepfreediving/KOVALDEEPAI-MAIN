require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const { Pinecone } = require('@pinecone-database/pinecone');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX || 'koval-deep-ai';

if (!OPENAI_API_KEY || !PINECONE_API_KEY || !PINECONE_INDEX_NAME) {
  throw new Error('Missing required .env variables');
}

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
const index = pinecone.index(PINECONE_INDEX_NAME);

async function getQueryEmbedding(query) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });
  return response.data[0].embedding;
}

async function queryPinecone(query) {
  const embedding = await getQueryEmbedding(query);
  const result = await index.query({
    topK: 5,
    vector: embedding,
    includeMetadata: true,
  });
  return result.matches || [];
}

app.post('/api/pineconeQuery', async (req, res) => {
  const { query } = req.body;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query must be a string' });
  }

  try {
    const matches = await queryPinecone(query);

    if (!matches.length) {
      return res.status(200).json({ answer: "I couldn't find relevant information." });
    }

    const context = matches.map((m) => m.metadata?.text).join('\n\n');
    const answer = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are an assistant answering questions based on the provided context.' },
        { role: 'user', content: `Context:\n${context}\n\nQuestion: ${query}` },
      ],
      temperature: 0.2,
    });

    res.status(200).json({ answer: answer.choices[0].message.content.trim() });
  } catch (err) {
    console.error('Handler error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = app;
