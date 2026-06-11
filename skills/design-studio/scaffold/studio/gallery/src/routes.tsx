/**
 * SPA route switch + client-side data wrappers for the two pages that were
 * Next server components (gallery home and features read sqlite/fs during
 * SSR; here they fetch the same data from the API).
 */
import { useEffect, useState } from "react";
import { usePathname, useSearchParams, ParamsContext } from "next/navigation";
import type { Manifest } from "@/app/lib/manifest";
import type { Feature, FeatureConnection } from "@/app/lib/types";
import { Gallery } from "@/app/gallery";
import { Features } from "@/app/features/features";
import BankLayout from "@/app/bank/layout";
import BankPage from "@/app/bank/page";
import BoardsPage from "@/app/bank/boards/page";
import BoardDetailPage from "@/app/bank/boards/[id]/page";

function GalleryRoute() {
  const projectParam = useSearchParams().get("project");
  const [data, setData] = useState<{ manifest: Manifest; project: string } | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const projects: string[] = await (await fetch("/api/manifest/projects")).json();
      const project =
        projectParam && projects.includes(projectParam) ? projectParam : projects[0] || "default";
      const manifest = await (
        await fetch(`/api/manifest?project=${encodeURIComponent(project)}`)
      ).json();
      if (live) setData({ manifest, project });
    })();
    return () => {
      live = false;
    };
  }, [projectParam]);

  if (!data) return null;
  return <Gallery key={data.project} manifest={data.manifest} project={data.project} />;
}

function FeaturesRoute() {
  const project = useSearchParams().get("project") ?? "default";
  const [data, setData] = useState<{
    features: Feature[];
    connections: FeatureConnection[];
    areas: string[];
  } | null>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/features?project=${encodeURIComponent(project)}`)
      .then((r) => r.json())
      .then((d) => live && setData(d));
    return () => {
      live = false;
    };
  }, [project]);

  if (!data) return null;
  return (
    <Features
      key={project}
      initialFeatures={data.features}
      initialConnections={data.connections}
      initialAreas={data.areas}
    />
  );
}

export function Routes() {
  const pathname = usePathname();

  if (pathname === "/bank") {
    return (
      <BankLayout>
        <BankPage />
      </BankLayout>
    );
  }
  if (pathname === "/bank/boards") {
    return (
      <BankLayout>
        <BoardsPage />
      </BankLayout>
    );
  }
  const board = pathname.match(/^\/bank\/boards\/([^/]+)$/);
  if (board) {
    return (
      <BankLayout>
        <ParamsContext.Provider value={{ id: board[1] }}>
          <BoardDetailPage />
        </ParamsContext.Provider>
      </BankLayout>
    );
  }
  if (pathname === "/features") return <FeaturesRoute />;
  return <GalleryRoute />;
}
