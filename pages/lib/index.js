const PineconeClient = require('@pinecone-database/pinecone');
const client = new PineconeClient();

const index = client.Index('your-index-name');  // Your Pinecone index name

module.exports = index;
