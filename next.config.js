const nextConfig = {
  serverRuntimeConfig: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_ASSISTANT_ID: process.env.OPENAI_ASSISTANT_ID,
  },
  publicRuntimeConfig: {
    // Public variables available on client side
    APP_NAME: process.env.APP_NAME,
  },
};

module.exports = nextConfig;
