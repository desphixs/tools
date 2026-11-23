import { StructuredData } from "@/components/structured-data";
import { createToolMetadata, createToolStructuredData } from "@/lib/seo";
import { DeviceMockupsEditor } from "@/features/device-mockups/device-mockups-editor";

export const metadata = createToolMetadata("device-mockups");

export default function DeviceMockupsPage() {
  return <><StructuredData data={createToolStructuredData("device-mockups")} /><DeviceMockupsEditor /></>;
}
