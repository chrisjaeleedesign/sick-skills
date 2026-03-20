"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DEVICE_PRESETS, DEVICE_ICONS, type DevicePreset } from "@/app/lib/constants";

export default function PrototypeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [captureMode] = useState<DevicePreset | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    if (params.get("capture") !== "true") return null;
    const device = params.get("device") as DevicePreset | null;
    return device && DEVICE_PRESETS[device] ? device : "desktop";
  });
  const [preset, setPreset] = useState<DevicePreset>("desktop");
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const { width, height } = DEVICE_PRESETS[preset];

  const recalcScale = useCallback(() => {
    const el = containerRef.current?.parentElement;
    if (!el) return;
    const pad = 48;
    const s = Math.min((el.clientWidth - pad) / width, (el.clientHeight - pad) / height, 1);
    setScale(s);
  }, [width, height]);

  useEffect(() => {
    recalcScale();
    window.addEventListener("resize", recalcScale);
    return () => window.removeEventListener("resize", recalcScale);
  }, [recalcScale]);

  if (captureMode) {
    const cap = DEVICE_PRESETS[captureMode];
    return (
      <div
        style={{
          width: cap.width, height: cap.height,
          "--container-width": `${cap.width}px`,
          "--container-height": `${cap.height}px`,
        } as React.CSSProperties}
        className="overflow-hidden bg-white"
      >
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-57px)] flex-col bg-zinc-100 dark:bg-zinc-900">
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b border-border bg-surface-0 px-4 py-2">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Gallery
        </Link>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-1">
          {(Object.keys(DEVICE_PRESETS) as DevicePreset[]).map((key) => {
            const { label } = DEVICE_PRESETS[key];
            const Icon = DEVICE_ICONS[key];
            return (
              <button
                key={key}
                onClick={() => setPreset(key)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                  preset === key
                    ? "bg-surface-2 text-text-primary font-medium"
                    : "text-text-tertiary hover:text-text-secondary hover:bg-surface-2/50"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </div>
        <div className="flex-1" />
        <span className="text-[10px] text-text-tertiary font-mono">
          {width}×{height} @ {Math.round(scale * 100)}%
        </span>
      </div>

      {/* Screen frame */}
      <div
        ref={containerRef}
        className="flex flex-1 items-center justify-center overflow-hidden p-6"
      >
        <div
          style={{ width: width * scale, height: height * scale }}
          className="relative rounded-xl shadow-2xl shadow-black/10 ring-1 ring-black/5"
        >
          <div
            style={{
              width,
              height,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              // Inject container dimensions as CSS vars so prototypes can use them
              // instead of viewport units (100vh → var(--container-height))
              "--container-width": `${width}px`,
              "--container-height": `${height}px`,
            } as React.CSSProperties}
            className="relative overflow-auto rounded-xl bg-white"
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
