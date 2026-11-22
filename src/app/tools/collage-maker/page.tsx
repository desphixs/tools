import type { Metadata } from "next";
import { CollageEditor } from "@/features/collage-maker/collage-editor";

export const metadata: Metadata = {
  title: "Collage Maker",
  description: "Arrange photos in custom grids and diagonal collages, then export your design.",
};

export default function CollageMakerPage() {
  return <CollageEditor />;
}
