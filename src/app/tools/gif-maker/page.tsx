import { StructuredData } from "@/components/structured-data";
import { createToolMetadata, createToolStructuredData } from "@/lib/seo";
import { GifMakerEditor } from "@/features/gif-maker/gif-maker-editor";

export const metadata = createToolMetadata("gif-maker");

export default function GifMakerPage() {
  return <><StructuredData data={createToolStructuredData("gif-maker")} /><GifMakerEditor /></>;
}
