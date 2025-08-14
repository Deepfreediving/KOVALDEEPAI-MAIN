// lib/metadata.js

const DEFAULT_TITLE = "Koval Deep AI";
const DEFAULT_DESCRIPTION =
  "Your freediving training assistant powered by AI insights.";
const DEFAULT_KEYWORDS =
  "freediving, AI, training, diving coach, Koval Deep AI";

export const getMetadata = (
  pageTitle = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
) => {
  return {
    title: pageTitle,
    description,
    keywords,
    openGraph: {
      title: pageTitle,
      description,
      siteName: DEFAULT_TITLE,
      type: "website",
      locale: "en_US",
      url: "https://yourdomain.com",
      images: [
        {
          url: "https://yourdomain.com/og-image.jpg", // Replace with your actual OG image
          width: 1200,
          height: 630,
          alt: pageTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
      images: ["https://yourdomain.com/og-image.jpg"],
    },
  };
};
