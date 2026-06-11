/**
 * Standalone device-frame shim for compiled prototypes.
 *
 * Port of app/prototypes/layout.tsx for static bundles: no Next.js, navigation
 * is plain location changes (each prototype version is its own page). Renders
 * the prototype toolbar (gallery link, version nav, device presets) plus the
 * scaled device frame, or — in `?capture=true` mode — just the bare prototype
 * at exact device dimensions for screenshots.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Agentation } from "agentation";
import { DEVICE_PRESETS, DEVICE_ICONS, type DevicePreset } from "../app/lib/constants";

function useProjectSuffix(): string {
  const project = new URLSearchParams(window.location.search).get("project");
  return project ? `?project=${encodeURIComponent(project)}` : "";
}

export default function Frame({ children }: { children: React.ReactNode }) {
  const suffix = useProjectSuffix();
  const [familyInfo, setFamilyInfo] = useState<{
    name: string;
    description: string;
    version: number;
    versions: { number: number; direction: string; parentVersion?: number; starred: boolean; createdAt: string }[];
    project: string;
  } | null>(null);

  const slugMatch = window.location.pathname.match(/\/prototypes\/([^/]+)\/v(\d+)/);
  const familySlug = slugMatch?.[1];

  useEffect(() => {
    if (!slugMatch) return;
    const [, slug, ver] = slugMatch;
    fetch(`/api/manifest/family/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setFamilyInfo({
            name: data.name,
            description: data.description,
            version: parseInt(ver),
            versions: data.versions,
            project: data.project,
          });
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToVersion = (version: number) => {
    if (!familySlug) return;
    window.location.assign(`/prototypes/${familySlug}/v${version}${suffix}`);
  };

  const [captureMode, setCaptureMode] = useState<DevicePreset | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("capture") !== "true") return;
    const device = params.get("device") as DevicePreset | null;
    setCaptureMode(device && DEVICE_PRESETS[device] ? device : "desktop");
  }, []);
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
        className="overflow-hidden"
      >
        {children}
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-zinc-100" style={{ height: "100vh" }}>
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b border-border bg-surface-0 px-4 py-2">
        <a
          href={`/${suffix}`}
          className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Gallery
        </a>
        {familyInfo && (
          <>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-medium text-text-primary truncate">{familyInfo.name}</span>
            </div>
            <div className="h-4 w-px bg-border" />
            {/* Version navigation */}
            <div className="flex items-center gap-1">
              <button
                disabled={familyInfo.version <= 1}
                onClick={() => goToVersion(familyInfo.version - 1)}
                className="rounded p-1 text-text-tertiary hover:text-text-secondary hover:bg-surface-2 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <select
                value={familyInfo.version}
                onChange={(e) => goToVersion(Number(e.target.value))}
                className="appearance-none rounded bg-surface-2 px-2 py-0.5 text-[11px] font-mono text-text-primary outline-none cursor-pointer"
              >
                {familyInfo.versions.map((v) => (
                  <option key={v.number} value={v.number}>
                    v{v.number} — {v.direction.length > 30 ? v.direction.slice(0, 30) + "…" : v.direction}
                  </option>
                ))}
              </select>
              <button
                disabled={familyInfo.version >= familyInfo.versions.length}
                onClick={() => goToVersion(familyInfo.version + 1)}
                className="rounded p-1 text-text-tertiary hover:text-text-secondary hover:bg-surface-2 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <span className="text-[10px] text-text-tertiary font-mono ml-1">
                {familyInfo.version} of {familyInfo.versions.length}
              </span>
            </div>
          </>
        )}
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
            className="relative overflow-hidden rounded-xl prototype-frame"
          >
            {children}
          </div>
        </div>
      </div>
      <Agentation endpoint="http://localhost:4747" />
    </div>
  );
}
