// next.config.mjs

const nextConfig = {
  reactStrictMode: true, // Enables React's Strict Mode for development
  webpack(config, { isServer }) {
    if (isServer) {
      // Additional server-side webpack configurations, if necessary
      // You can add custom server-side configurations here, such as excluding packages from server-side bundles
    }
    return config;
  },

  images: {
    domains: ['example.com', 'yourdomain.com'], // Add allowed domains for optimized images
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
    // Redirect configuration, for example, you can set up redirects for specific pages
    return [
      {
        source: '/old-url',
        destination: '/new-url',
        permanent: true,
      },
    ];
  },

  async rewrites() {
    // Rewrites configuration for altering routes without changing the URL
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

  // Adjust build output directory if needed
  // output: 'standalone', // Use this if you want Vercel to build the app as a standalone package
};

export default nextConfig;
