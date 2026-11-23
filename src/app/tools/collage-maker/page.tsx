import { StructuredData } from "@/components/structured-data";
import { createToolMetadata, createToolStructuredData } from "@/lib/seo";
import { CollageEditor } from "@/features/collage-maker/collage-editor";

export const metadata = createToolMetadata("collage-maker");

export default function CollageMakerPage() {
  return <><StructuredData data={createToolStructuredData("collage-maker")} /><CollageEditor /></>;
}
