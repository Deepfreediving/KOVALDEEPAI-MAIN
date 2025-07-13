import { metadata } from '../lib/metadata';  // Ensure path is correct

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>{metadata.title}</title>
        <meta name="description" content={metadata.description} />
      </head>
      <body className="bg-black text-white">{children}</body>
    </html>
  );
}
