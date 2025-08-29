// Next.js API route configuration for file uploads
export const config = {
  api: {
    bodyParser: false, // Disable body parsing for file uploads
    responseLimit: '10mb', // Increase response limit for images
  },
};
