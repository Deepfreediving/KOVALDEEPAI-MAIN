/* eslint-disable no-unused-vars */
export default async function handler(req, res) {
  // Check if the OpenAI API key is missing from environment variables
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is missing' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    });

    // Check if the response status is ok (2xx)
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch data from OpenAI' });
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'API request failed' });
  }
}
