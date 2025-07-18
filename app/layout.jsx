// app/layout.jsx
import "../styles/globals.css"; // Assuming your global styles are in this file

export const metadata = {
  title: "Koval Deep AI",
  description: "Your freediving training assistant",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta
          name="description"
          content="Koval Deep AI - Your freediving training assistant"
        />
        <title>Koval Deep AI</title>
      </head>
      <body className="bg-black text-white">{children}</body>
    </html>
  );
}
