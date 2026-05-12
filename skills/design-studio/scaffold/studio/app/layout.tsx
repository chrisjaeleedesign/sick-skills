"use client";

import "./globals.css";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Moon, Sun, ListChecks, LayoutGrid } from "lucide-react";
import { Agentation } from "agentation";
import { useProjectQuery } from "@/app/lib/hooks";
import { ProjectPicker } from "@/app/components/project-picker";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [capture, setCapture] = useState(false);
  const [dark, setDark] = useState(false);
  const router = useRouter();
  const { suffix: projectSuffix } = useProjectQuery();

  useEffect(() => {
    setCapture(new URLSearchParams(window.location.search).get("capture") === "true");
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setDark(true);
    }
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "t" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        router.push(`/bank${projectSuffix}`);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [router, projectSuffix]);

  return (
    <html lang="en" className={dark ? "dark" : ""}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {capture ? children : (
          <>
            <header className="sticky top-0 z-50 flex items-center gap-4 border-b border-border bg-surface-0 px-6 py-3">
              <Link href={`/${projectSuffix}`} className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-lg bg-primary" />
                <span className="text-lg font-semibold text-text-primary">
                  Design Studio
                </span>
              </Link>
              <div id="header-toolbar" className="flex flex-1 items-center justify-end gap-2">
                <ProjectPicker />
              </div>
              <Link
                href={`/bank${projectSuffix}`}
                className="flex h-8 items-center gap-1.5 rounded-md px-2.5 hover:bg-surface-2 transition-colors"
                title="Bank (⌘T)"
              >
                <LayoutGrid className="h-4 w-4 text-text-secondary" />
                <span className="text-xs text-text-secondary">Bank</span>
              </Link>
              <Link
                href={`/features${projectSuffix}`}
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
