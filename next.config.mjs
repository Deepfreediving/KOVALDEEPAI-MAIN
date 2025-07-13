const nextConfig = {
  reactStrictMode: true, // Enables React's Strict Mode for development
  webpack(config, { isServer }) {
    if (isServer) {
      // Custom server-side webpack configurations can go here if needed
    }
    return config;
  },

  images: {
    domains: ['yourdomain.com', 'anotherdomain.com'],  // Replace with your actual domains for image optimization
  },

  serverRuntimeConfig: {
    // Sensitive keys for server-side only
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,  // Ensure your API key is loaded from environment
  },

  publicRuntimeConfig: {
    // These variables are available on both the client and the server
    APP_NAME: process.env.APP_NAME || 'DefaultApp', // Public runtime variables
    CUSTOM_ENV_VAR: process.env.CUSTOM_ENV_VAR || 'default',  // Custom environment variables
  },

  env: {
    // Adding custom environment variables directly to be accessed throughout the app
    CUSTOM_ENV_VAR: process.env.CUSTOM_ENV_VAR || 'default',  // Use these in your app, accessible client-side and server-side
  },

  // Optional features
  async redirects() {
    // Example redirects (can be customized based on your needs)
    return [
      {
        source: '/old-url',
        destination: '/new-url',
        permanent: true,
      },
    ];
  },

  async rewrites() {
    // Example rewrites (can be customized based on your needs)
    return [
      {
        source: '/api/old-api',
        destination: '/api/new-api',
      },
    ];
  },

  async headers() {
    // Set custom headers for your pages or API routes
    return [
      {
        source: '/:path*',  // Apply to all routes
        headers: [
          {
            key: 'X-Custom-Header',
            value: 'my-custom-value',
          },
        ],
      },
    ];
  },

  // Uncomment below if you're using experimental features in Next.js 12+
  // experimental: {
  //   optimizeImages: true, // Optimize images by default for better performance
  // },

  // Use this if you want to create a standalone build
  // output: 'standalone', // This can be used for Vercel deployment if needed
};

export default nextConfig;
