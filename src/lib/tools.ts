import { Grid2X2, ImageIcon } from "lucide-react";

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
  {
    id: "collage-maker",
    name: "Collage Maker",
    description: "Arrange photos into flexible grids and custom collages.",
    href: "/tools/collage-maker",
    category: "Image",
    icon: Grid2X2,
    status: "available",
  },
] as const;

export type Tool = (typeof tools)[number];
