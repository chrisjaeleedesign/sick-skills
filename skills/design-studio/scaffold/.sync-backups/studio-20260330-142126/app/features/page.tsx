import { queryFeatures, getAllConnections, featureAreas } from "@/app/lib/db-features";
import { Features } from "./features";

export const dynamic = "force-dynamic";

export default function FeaturesPage() {
  const features = queryFeatures();
  const connections = getAllConnections();
  const areas = featureAreas();
  return <Features initialFeatures={features} initialConnections={connections} initialAreas={areas} />;
}
