export const metadata = {
  title: 'Koval Deep AI',
  description: 'Freediving assistant powered by OpenAI',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
