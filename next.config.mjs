import path from 'path';
import withBundleAnalyzer from '@next/bundle-analyzer';

const nextConfig = async () => {
  // Ensure environment variables are set securely
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY environment variable');
  }
  if (!process.env.OPENAI_ASSISTANT_ID) {
    throw new Error('Missing OPENAI_ASSISTANT_ID environment variable');
  }

  return {
    // Server-side configuration, only available on the server
    serverRuntimeConfig: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY, // Load sensitive data securely on the server side
      OPENAI_ASSISTANT_ID: process.env.OPENAI_ASSISTANT_ID,
    },

    // Public-side configuration, accessible on both server and client
    publicRuntimeConfig: {
      APP_NAME: process.env.APP_NAME || 'DefaultApp', // Default public runtime value
    },

    // Optimize images and define allowed domains for image handling
    images: {
      domains: ['example.com'], // Replace with your allowed domains for image optimization
    },

    // Cache static assets efficiently for performance
    async headers() {
      return [
        {
          source: '/:all*(svg|png|jpg|jpeg|gif|webp)', // Cache image files
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=31536000, immutable', // Long cache times for images
            },
          ],
        },
      ];
    },

    // Add additional optimization rules here
    webpack(config, { isServer }) {
      // Example optimization rule: Custom handling for server-side code splitting
      if (isServer) {
        config.externals = ['react', 'react-dom'];
      }
      return config;
    },

    // Any other environment-specific settings can go here
    env: {
      CUSTOM_ENV_VAR: process.env.CUSTOM_ENV_VAR || 'default', // Add more custom environment variables if necessary
    },
  };
};

// Export the configuration with bundle analyzer
export default withBundleAnalyzer(nextConfig);
