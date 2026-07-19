import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-config";

// Single-page site (one scroll story, no sub-routes) — one URL is the whole sitemap.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
