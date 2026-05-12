import { queryFeatures, getAllConnections, featureAreas } from "@/app/lib/db-features";
import { Features } from "./features";

export const dynamic = "force-dynamic";

export default async function FeaturesPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project } = await searchParams;
  const features = queryFeatures({ project: project ?? "default" });
  const connections = getAllConnections();
  const areas = featureAreas();
  return <Features initialFeatures={features} initialConnections={connections} initialAreas={areas} />;
}
