export const PLACEMENT_CATALOG_VERSION = 1 as const;
export const SPEC_VERIFIED_ON = "2026-11-23" as const;

export type SocialPlacement = {
  id: string;
  platform: "Pinterest" | "YouTube" | "LinkedIn";
  name: string;
  folder: string;
  width: number;
  height: number;
  recommendedFormat: "PNG" | "JPEG";
  sourceUrl: string;
  sourceNote: string;
};

export const SOCIAL_PLACEMENTS = [
  {
    id: "pinterest-standard-pin",
    platform: "Pinterest",
    name: "Standard Pin",
    folder: "standard-pin",
    width: 1000,
    height: 1500,
    recommendedFormat: "JPEG",
    sourceUrl: "https://help.pinterest.com/en/business/article/pinterest-product-specs",
    sourceNote: "Pinterest recommends a 2:3 ratio, or 1000 × 1500 px.",
  },
  {
    id: "youtube-video-thumbnail",
    platform: "YouTube",
    name: "Video thumbnail",
    folder: "video-thumbnail",
    width: 3840,
    height: 2160,
    recommendedFormat: "JPEG",
    sourceUrl: "https://support.google.com/youtube/answer/72431?co=GENIE.Platform%3DDesktop&hl=en-on",
    sourceNote: "YouTube recommends 3840 × 2160 px at 16:9 for video thumbnails.",
  },
  {
    id: "youtube-shorts-thumbnail",
    platform: "YouTube",
    name: "Shorts thumbnail",
    folder: "shorts-thumbnail",
    width: 2160,
    height: 3840,
    recommendedFormat: "JPEG",
    sourceUrl: "https://support.google.com/youtube/answer/72431?co=GENIE.Platform%3DDesktop&hl=en-on",
    sourceNote: "YouTube recommends 2160 × 3840 px at 9:16 for Shorts thumbnails.",
  },
  {
    id: "linkedin-single-image-ad-landscape",
    platform: "LinkedIn",
    name: "Single image ad · landscape",
    folder: "single-image-ad-landscape",
    width: 1200,
    height: 628,
    recommendedFormat: "JPEG",
    sourceUrl: "https://www.linkedin.com/help/linkedin/answer/a427596/",
    sourceNote: "LinkedIn recommends 1200 × 628 px at 1.91:1 for horizontal single image ads.",
  },
] as const satisfies readonly SocialPlacement[];

export type PlacementId = (typeof SOCIAL_PLACEMENTS)[number]["id"];
export const PLACEMENT_BY_ID = Object.fromEntries(SOCIAL_PLACEMENTS.map((placement) => [placement.id, placement])) as Record<PlacementId, SocialPlacement>;
