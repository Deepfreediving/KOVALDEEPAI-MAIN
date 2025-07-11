// pages/layout.jsx
export const metadata = {
  title: "Koval Deep AI",
  description: "Your freediving training assistant",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-black text-white">{children}</body>
    </html>
  );
}