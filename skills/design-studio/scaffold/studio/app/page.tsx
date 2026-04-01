import { readManifest, listProjects } from "@/app/lib/manifest";
import { Gallery } from "./gallery";

export const dynamic = "force-dynamic";

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project: projectParam } = await searchParams;
  const projects = listProjects();
  const project = projectParam && projects.includes(projectParam) ? projectParam : projects[0] || "default";
  const manifest = readManifest(project);
  return <Gallery manifest={manifest} project={project} projects={projects} />;
}
