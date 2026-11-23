import { StructuredData } from "@/components/structured-data";
import { createToolMetadata, createToolStructuredData } from "@/lib/seo";
import { FramecraftEditor } from "@/features/framecraft/framecraft-editor";

export const metadata = createToolMetadata("framecraft");

export default function FramecraftPage() {
  return <><StructuredData data={createToolStructuredData("framecraft")} /><FramecraftEditor /></>;
}
