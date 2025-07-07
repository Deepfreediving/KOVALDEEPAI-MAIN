export const metadata = {
  title: 'Koval Deep AI',
  description: 'Freediving assistant powered by OpenAI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
