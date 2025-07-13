// pages/_document.js
import { Html, Head, Main, NextScript } from 'next/document';
import { metadata } from '../lib/metadata';  // Import metadata from your lib

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <title>{metadata.title}</title>
        <meta name="description" content={metadata.description} />
        {/* You can add other metadata, links to styles, or fonts here */}
      </Head>
      <body className="bg-black text-white">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
