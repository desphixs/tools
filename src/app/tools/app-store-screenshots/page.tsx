import type { Metadata } from "next";
import { AppStoreScreenshotsEditor } from "@/features/app-store-screenshots/app-store-screenshots-editor";

export const metadata: Metadata = {
  title: "App Store Screenshots",
  description: "Build an ordered, store-sized screenshot gallery for iPhone and iPad.",
};

export default function AppStoreScreenshotsPage() {
  return <AppStoreScreenshotsEditor />;
}
