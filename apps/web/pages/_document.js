import Document, { Html, Head, Main, NextScript } from "next/document";

export default class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          {/* ✅ Move critical resources to head */}
          <link rel="icon" href="/favicon.ico" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://cdn.openai.com" />

          {/* ✅ Meta tags for performance */}
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="description" content="Koval AI - Your freediving coach" />
          <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />

          {/* ✅ Preload critical resources with proper attributes */}
          <link rel="preload" href="/koval-logo.png" as="image" type="image/png" crossOrigin="anonymous" />

          {/* ✅ DNS prefetch for external APIs */}
          <link rel="dns-prefetch" href="//openai.com" />
          <link rel="dns-prefetch" href="//api.pinecone.io" />
          <link rel="dns-prefetch" href="//pinecone.io" />
          <link rel="dns-prefetch" href="//zhlacqhzhwvkmyxsxevv.supabase.co" />
          <link rel="dns-prefetch" href="//supabase.co" />
          <link rel="dns-prefetch" href="//deepfreediving.com" />
          <link rel="dns-prefetch" href="//vercel.app" />

          {/* ⛔ Removed all debug/hotfix scripts that interfere with React initialization */}

          {/* ✅ Critical CSS inline for faster rendering */}
          <style
            dangerouslySetInnerHTML={{
              __html: `
              /* Critical CSS for initial render */
              html, body { margin: 0; padding: 0; box-sizing: border-box; }
              * { box-sizing: inherit; }
              
              /* Loading state optimization */
              .loading-container {
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                background: #000;
              }
              
              /* Prevent layout shift */
              #__next {
                min-height: 100vh;
                isolation: isolate;
              }
              
              /* Optimize scrolling */
              body {
                overflow-y: auto;
                overflow-x: hidden;
                scroll-behavior: smooth;
                -webkit-overflow-scrolling: touch;
              }
            `,
            }}
          />
        </Head>
        <body className="bg-black text-white">
          {/* ✅ Main app container with proper isolation */}
          <div
            id="app-root"
            style={{ isolation: "isolate", contain: "layout style paint" }}
          >
            <Main />
          </div>

          {/* ✅ Scripts at the end for optimal loading */}
          <NextScript />

          {/* ⛔ Removed all debug scripts that were interfering with React initialization */}
        </body>
      </Html>
    );
  }
}
