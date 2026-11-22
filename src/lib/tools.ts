import { ImageIcon } from "lucide-react";

export const tools = [
  {
    id: "framecraft",
    name: "Framecraft",
    description: "Place a product screenshot on a background and export an image.",
    href: "/tools/framecraft",
    category: "Image",
    icon: ImageIcon,
    status: "available",
  },
] as const;

export type Tool = (typeof tools)[number];
