import type { ComponentType } from "react";
import { Grid2X2, ImageIcon, Film, Laptop, Images, type LucideIcon } from "lucide-react";
import {
  AppStoreScreenshotsThumbnail,
  CollageThumbnail,
  DeviceMockupsThumbnail,
  FramecraftThumbnail,
  GifMakerThumbnail,
  SocialAssetExporterThumbnail,
} from "@/components/tool-thumbnails";

export type ToolCard = {
  id: string;
  name: string;
  description: string;
  href: string;
  category: string;
  icon: LucideIcon;
  status: "available";
  thumbnail: ComponentType;
};

export const tools: readonly ToolCard[] = [
  {
    id: "framecraft",
    name: "Framecraft",
    description: "Style screenshots for sharing.",
    href: "/tools/framecraft",
    category: "Image",
    icon: ImageIcon,
    status: "available",
    thumbnail: FramecraftThumbnail,
  },
  {
    id: "collage-maker",
    name: "Collage Maker",
    description: "Arrange photos into one collage.",
    href: "/tools/collage-maker",
    category: "Image",
    icon: Grid2X2,
    status: "available",
    thumbnail: CollageThumbnail,
  },
  {
    id: "device-mockups",
    name: "Device Mockups",
    description: "Place your screen in a device.",
    href: "/tools/device-mockups",
    category: "Image",
    icon: Laptop,
    status: "available",
    thumbnail: DeviceMockupsThumbnail,
  },
  {
    id: "app-store-screenshots",
    name: "App Store Screenshots",
    description: "Build a gallery for your app.",
    href: "/tools/app-store-screenshots",
    category: "Image",
    icon: Images,
    status: "available",
    thumbnail: AppStoreScreenshotsThumbnail,
  },
  {
    id: "gif-maker",
    name: "GIF Maker",
    description: "Turn video clips into GIFs.",
    href: "/tools/gif-maker",
    category: "Image",
    icon: Film,
    status: "available",
    thumbnail: GifMakerThumbnail,
  },
  {
    id: "social-asset-exporter",
    name: "Social Asset Pack",
    description: "Turn one design into a social pack.",
    href: "/tools/social-asset-exporter",
    category: "Image",
    icon: Images,
    status: "available",
    thumbnail: SocialAssetExporterThumbnail,
  },
];

export type Tool = ToolCard;
