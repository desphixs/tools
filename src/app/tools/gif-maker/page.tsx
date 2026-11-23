import type { Metadata } from "next";
import { GifMakerEditor } from "@/features/gif-maker/gif-maker-editor";

export const metadata: Metadata = {
  title: "GIF Maker",
  description: "Create an animated GIF from a short video or a sequence of images.",
};

export default function GifMakerPage() {
  return <GifMakerEditor />;
}
