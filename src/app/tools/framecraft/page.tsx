import type { Metadata } from "next";
import { FramecraftEditor } from "@/features/framecraft/framecraft-editor";

export const metadata: Metadata = {
  title: "Screenshot Styler",
  description: "Compose product screenshots into shareable images.",
};

export default function FramecraftPage() {
  return <FramecraftEditor />;
}
