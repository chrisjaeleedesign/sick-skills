import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ask",
  description: "Chat interface for Ask conversations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-surface-0 text-text-primary flex h-screen overflow-hidden">
        {children}
      </body>
    </html>
  );
}
