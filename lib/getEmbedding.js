const { OpenAI } = require('openai');

async function getEmbedding(text) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const embedding = await openai.createEmbedding({
    model: 'text-embedding-ada-002',
    input: text,
  });
  return embedding.data[0].embedding;
}

module.exports = getEmbedding;
