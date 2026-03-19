"use client";

import "./globals.css";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { Agentation } from "agentation";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setDark(true);
    }
  }, []);

  return (
    <html lang="en" className={dark ? "dark" : ""}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <header className="sticky top-0 z-50 flex items-center gap-4 border-b border-border bg-surface-0 px-6 py-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg bg-primary" />
            <span className="text-lg font-semibold text-text-primary">
              Design Studio
            </span>
          </Link>
          <div id="header-toolbar" className="flex flex-1 items-center justify-end gap-2" />
          <button
            onClick={() => setDark(!dark)}
            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-surface-2 transition-colors"
            aria-label="Toggle theme"
          >
            {dark ? (
              <Sun className="h-4 w-4 text-text-secondary" />
            ) : (
              <Moon className="h-4 w-4 text-text-secondary" />
            )}
          </button>
        </header>
        {children}
        <Agentation />
      </body>
    </html>
  );
}
