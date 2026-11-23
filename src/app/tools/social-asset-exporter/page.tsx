import { StructuredData } from "@/components/structured-data";
import { createToolMetadata, createToolStructuredData } from "@/lib/seo";
import { SocialAssetExporterEditor } from "@/features/social-asset-exporter/social-asset-exporter-editor";

export const metadata = createToolMetadata("social-asset-exporter");

export default function SocialAssetExporterPage() {
  return <><StructuredData data={createToolStructuredData("social-asset-exporter")} /><SocialAssetExporterEditor /></>;
}
