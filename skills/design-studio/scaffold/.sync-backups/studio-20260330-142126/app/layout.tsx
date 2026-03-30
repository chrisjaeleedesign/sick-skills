"use client";

import "./globals.css";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Moon, Sun, ListChecks, Brain } from "lucide-react";
import { Agentation } from "agentation";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const capture =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("capture") === "true";
  const [dark, setDark] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setDark(true);
    }
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "t" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        router.push("/thoughts");
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [router]);

  return (
    <html lang="en" className={dark ? "dark" : ""}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {capture ? children : (
          <>
            <header className="sticky top-0 z-50 flex items-center gap-4 border-b border-border bg-surface-0 px-6 py-3">
              <Link href="/" className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-lg bg-primary" />
                <span className="text-lg font-semibold text-text-primary">
                  Design Studio
                </span>
              </Link>
              <div id="header-toolbar" className="flex flex-1 items-center justify-end gap-2" />
              <Link
                href="/thoughts"
                className="flex h-8 items-center gap-1.5 rounded-md px-2.5 hover:bg-surface-2 transition-colors"
                title="Thoughts (⌘T)"
              >
                <Brain className="h-4 w-4 text-text-secondary" />
                <span className="text-xs text-text-secondary">Thoughts</span>
              </Link>
              <Link
                href="/features"
                className="flex h-8 items-center gap-1.5 rounded-md px-2.5 hover:bg-surface-2 transition-colors"
              >
                <ListChecks className="h-4 w-4 text-text-secondary" />
                <span className="text-xs text-text-secondary">Features</span>
              </Link>
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
            <Agentation endpoint="http://localhost:4747" />
          </>
        )}
      </body>
    </html>
  );
}
