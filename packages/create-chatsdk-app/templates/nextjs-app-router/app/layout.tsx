import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChatSDK App",
  description: "Built with ChatSDK 2.0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.Node;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
