import type { MetadataRoute } from "next";
import { PREFECTURES } from "@/lib/prefectures";

const BASE_URL = "https://festmatch.jp";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/festmap`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
  ];

  const prefRoutes: MetadataRoute.Sitemap = PREFECTURES.map((p) => ({
    url: `${BASE_URL}/festmap/${p.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [...staticRoutes, ...prefRoutes];
}
