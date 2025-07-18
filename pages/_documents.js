import { Html, Head, Main, NextScript } from "next/document";
import { getMetadata } from "../lib/metadata"; // ✅ Correct function import

const metadata = getMetadata(); // call the function to get values

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <title>{metadata.title}</title>
        <meta name="description" content={metadata.description} />
        {/* Open Graph metadata */}
        <meta property="og:title" content={metadata.title} />
        <meta property="og:description" content={metadata.description} />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <body className="bg-black text-white">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
