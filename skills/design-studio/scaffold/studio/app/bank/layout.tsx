"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProjectQuery } from "@/app/lib/hooks";

export default function BankLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { suffix } = useProjectQuery();

  const tabs = [
    { label: "All Items", href: `/bank${suffix}` },
    { label: "Boards", href: `/bank/boards${suffix}` },
  ];

  function isActive(href: string) {
    const path = href.split("?")[0];
    if (path === "/bank") return pathname === "/bank";
    return pathname?.startsWith(path) ?? false;
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 57px)" }}>
      <div className="flex items-center gap-1 border-b border-border bg-surface-0 px-6">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative px-4 py-3 text-sm font-medium transition-colors ${
              isActive(tab.href)
                ? "text-text-primary"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            {tab.label}
            {isActive(tab.href) && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </Link>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
