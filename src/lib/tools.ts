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
  seoDescription: string;
  keywords: string[];
  features: string[];
  href: string;
  category: string;
  icon: LucideIcon;
  status: "available";
  thumbnail: ComponentType;
};

export const tools: readonly ToolCard[] = [
  {
    id: "framecraft",
    name: "Screenshot Styler",
    description: "Style screenshots with backgrounds, borders, and shadows.",
    seoDescription: "Style product screenshots online with custom backgrounds, image fit and crop controls, borders, and inner or outer shadows. Export high-resolution PNG or JPEG images.",
    keywords: ["screenshot editor", "screenshot styling", "product screenshot", "screenshot background", "image border", "image shadow"],
    features: ["Screenshot background styling", "Image fit and crop controls", "Inside and outside borders", "Inner and outer shadows", "High-resolution PNG and JPEG export"],
    href: "/tools/framecraft",
    category: "Image",
    icon: ImageIcon,
    status: "available",
    thumbnail: FramecraftThumbnail,
  },
  {
    id: "collage-maker",
    name: "Collage Maker",
    description: "Arrange photos into custom grids and collages.",
    seoDescription: "Create photo collages with flexible grid or diagonal layouts. Add images, adjust spacing and backgrounds, and export your finished collage as PNG or JPEG.",
    keywords: ["photo collage maker", "picture collage", "grid collage", "diagonal photo collage", "online collage editor"],
    features: ["Grid and diagonal layouts", "Flexible image cells", "Custom spacing and backgrounds", "PNG and JPEG export"],
    href: "/tools/collage-maker",
    category: "Image",
    icon: Grid2X2,
    status: "available",
    thumbnail: CollageThumbnail,
  },
  {
    id: "device-mockups",
    name: "Device Mockups",
    description: "Place screenshots inside laptop and monitor mockups.",
    seoDescription: "Place a screenshot inside realistic laptop and monitor mockups. Choose a device scene, position the screen, and export a polished PNG or JPEG image.",
    keywords: ["device mockup generator", "laptop mockup", "monitor mockup", "screenshot mockup", "product screenshot mockup"],
    features: ["Laptop and monitor scenes", "Position screenshots in device screens", "Custom composition controls", "PNG and JPEG export"],
    href: "/tools/device-mockups",
    category: "Image",
    icon: Laptop,
    status: "available",
    thumbnail: DeviceMockupsThumbnail,
  },
  {
    id: "app-store-screenshots",
    name: "App Store Screenshots",
    description: "Create App Store galleries for iPhone and iPad.",
    seoDescription: "Create a consistent App Store screenshot gallery for iPhone and iPad. Choose store sizes, arrange screen images, add text and background styling, and export your screenshots.",
    keywords: ["App Store screenshot maker", "iPhone screenshots", "iPad App Store screenshots", "app screenshot generator", "App Store image sizes"],
    features: ["iPhone and iPad screenshot sizes", "Ordered multi-screen galleries", "Text and background styling", "Export store-sized images"],
    href: "/tools/app-store-screenshots",
    category: "Image",
    icon: Images,
    status: "available",
    thumbnail: AppStoreScreenshotsThumbnail,
  },
  {
    id: "gif-maker",
    name: "GIF Maker",
    description: "Create looping GIFs from videos or images.",
    seoDescription: "Create an animated GIF in your browser from a video clip or ordered sequence of images. Trim video, set size and frame rate, and download the result.",
    keywords: ["GIF maker", "video to GIF", "image sequence to GIF", "animated GIF creator", "online GIF editor"],
    features: ["Video and image-sequence input", "Trim and reorder frames", "Adjust output size and frame rate", "Download animated GIFs"],
    href: "/tools/gif-maker",
    category: "Image",
    icon: Film,
    status: "available",
    thumbnail: GifMakerThumbnail,
  },
  {
    id: "social-asset-exporter",
    name: "Social Asset Pack",
    description: "Export one design to multiple social image sizes.",
    seoDescription: "Build a batch of social media image assets from one master design. Select placement sizes, fit or crop the image, review each output, and download the set as a ZIP.",
    keywords: ["social media image sizes", "social media image exporter", "batch image resizer", "social media asset pack", "image size presets"],
    features: ["Multiple social placement sizes", "Fit or crop with focal controls", "Review each output before export", "Download all images in a ZIP"],
    href: "/tools/social-asset-exporter",
    category: "Image",
    icon: Images,
    status: "available",
    thumbnail: SocialAssetExporterThumbnail,
  },
];

export type Tool = ToolCard;
