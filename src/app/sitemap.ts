import type { MetadataRoute } from "next";
import { tools } from "@/lib/tools";
import { SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...tools.filter((tool) => tool.status === "available").map((tool) => ({
      url: `${SITE_URL}${tool.href}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
