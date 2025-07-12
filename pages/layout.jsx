// pages/layout.jsx
import { metadata } from '../metadata'; // Adjust path accordingly

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="description" content={metadata.description} />
        <title>{metadata.title}</title>
      </head>
      <body className="bg-black text-white">{children}</body>
    </html>
  );
}
