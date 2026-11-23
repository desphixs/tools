import type { Metadata } from "next";
import { tools, type ToolCard } from "./tools";

export const SITE_URL = "https://tools.desphixs.com";
export const SITE_NAME = "Tools";
export const SITE_DESCRIPTION = "A browser-based creative workspace for styling screenshots, building App Store galleries and photo collages, creating device mockups and GIFs, and exporting social media assets.";

export function getToolById(id: ToolCard["id"]) {
  const tool = tools.find((item) => item.id === id);
  if (!tool) throw new Error(`Unknown tool SEO entry: ${id}`);
  return tool;
}

export function createToolMetadata(id: ToolCard["id"]): Metadata {
  const tool = getToolById(id);
  const image = {
    url: "/assets/branding/tools-black-logo-text.png",
    width: 2092,
    height: 522,
    alt: `${tool.name} in Tools`,
  };

  return {
    title: tool.name,
    description: tool.seoDescription,
    keywords: tool.keywords,
    alternates: { canonical: tool.href },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: tool.name,
      description: tool.seoDescription,
      url: tool.href,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: `${tool.name} | ${SITE_NAME}`,
      description: tool.seoDescription,
      images: [image.url],
    },
  };
}

export function createToolStructuredData(id: ToolCard["id"]) {
  const tool = getToolById(id);
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: tool.name,
    description: tool.seoDescription,
    url: `${SITE_URL}${tool.href}`,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires a modern web browser with JavaScript enabled.",
    featureList: tool.features,
    isAccessibleForFree: true,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

export const websiteStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  alternateName: "Desphixs Tools",
  url: SITE_URL,
  description: SITE_DESCRIPTION,
};

export const toolDirectoryStructuredData = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Online creative tools",
  description: SITE_DESCRIPTION,
  itemListElement: tools.filter((tool) => tool.status === "available").map((tool, index) => ({
    "@type": "ListItem",
    position: index + 1,
    item: {
      "@type": "WebApplication",
      name: tool.name,
      description: tool.seoDescription,
      url: `${SITE_URL}${tool.href}`,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Any",
    },
  })),
};
