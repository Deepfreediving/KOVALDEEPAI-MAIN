import { fileURLToPath } from 'url';
import path from 'path';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';

// Get the current directory in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  reactStrictMode: true,  // Enable React's strict mode for better debugging

  webpack(config, { isServer }) {
    // Aliases for cleaner imports
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname),
      "@lib": path.resolve(__dirname, "lib"),
      "@components": path.resolve(__dirname, "components"),
      "@pages": path.resolve(__dirname, "pages"),
      "@styles": path.resolve(__dirname, "styles"),
    };

    // Conditionally enable Bundle Analyzer (only on client-side builds)
    if (!isServer && process.env.BUNDLE_ANALYZE === "true") {
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: "static",  // Output HTML file
          openAnalyzer: false,     // Set true to open automatically
          reportFilename: "bundle-report.html",
        })
      );
    }

    return config;
  },

  images: {
    domains: ["yourdomain.com"],  // Add your allowed domains here
    formats: ["image/webp"],      // Set image format
    deviceSizes: [640, 750, 1080, 1200, 1920], // Set device sizes for image optimization
  },

  env: {
    NEXT_PUBLIC_OPENAI_API_KEY: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,  // This is your main API key
    OPENAI_API_BASE: process.env.OPENAI_API_URL || "https://api.openai.com/v1",  // Default OpenAI API URL
    PINECONE_API_KEY: process.env.PINECONE_API_KEY,
    PINECONE_INDEX: process.env.PINECONE_INDEX,
    PINECONE_HOST: process.env.PINECONE_HOST,
  },

  // Optional redirects, if you have any
  async redirects() {
    return [
      {
        source: "/old-url",
        destination: "/new-url",
        permanent: true,
      },
    ];
  },

  // Optional rewrites, if needed
  async rewrites() {
    return [
      {
        source: "/api/old-api",
        destination: "/api/new-api",
      },
    ];
  },

  // Optional headers, if you need custom headers for routes
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Custom-Header",
            value: "my-custom-value",
          },
        ],
      },
    ];
  },

  // Middleware: should be in a separate `middleware.js` or `middleware.ts` file
  // Example: /pages/middleware.js or /pages/api/middleware.js
};
