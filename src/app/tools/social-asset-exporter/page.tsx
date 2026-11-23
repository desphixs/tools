import type { Metadata } from "next";
import { SocialAssetExporterEditor } from "@/features/social-asset-exporter/social-asset-exporter-editor";

export const metadata: Metadata = {
  title: "Batch Social Asset Exporter",
  description: "Create a reviewed set of social image sizes from one local master image.",
};

export default function SocialAssetExporterPage() {
  return <SocialAssetExporterEditor />;
}
