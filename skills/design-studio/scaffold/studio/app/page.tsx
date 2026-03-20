import { readManifest } from "@/app/lib/manifest";
import { Gallery } from "./gallery";

export const dynamic = "force-dynamic";

export default function GalleryPage() {
  const manifest = readManifest();
  return <Gallery manifest={manifest} />;
}
