import { Grid2X2, ImageIcon, Film, Laptop, Images } from "lucide-react";

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
  {
    id: "device-mockups",
    name: "Device Mockups",
    description: "Place a product screenshot inside a laptop or monitor scene.",
    href: "/tools/device-mockups",
    category: "Image",
    icon: Laptop,
    status: "available",
  },
  {
    id: "gif-maker",
    name: "GIF Maker",
    description: "Create an animated GIF from a video or a sequence of images.",
    href: "/tools/gif-maker",
    category: "Image",
    icon: Film,
    status: "available",
  },
  {
    id: "social-asset-exporter",
    name: "Batch Social Asset Exporter",
    description: "Create a pack of social image sizes from one original design.",
    href: "/tools/social-asset-exporter",
    category: "Image",
    icon: Images,
    status: "available",
  },
] as const;

export type Tool = (typeof tools)[number];
