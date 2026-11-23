import { StructuredData } from "@/components/structured-data";
import { createToolMetadata, createToolStructuredData } from "@/lib/seo";
import { AppStoreScreenshotsEditor } from "@/features/app-store-screenshots/app-store-screenshots-editor";

export const metadata = createToolMetadata("app-store-screenshots");

export default function AppStoreScreenshotsPage() {
  return <><StructuredData data={createToolStructuredData("app-store-screenshots")} /><AppStoreScreenshotsEditor /></>;
}
