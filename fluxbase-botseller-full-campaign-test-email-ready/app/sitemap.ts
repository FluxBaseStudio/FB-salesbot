import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.fluxbase.pl";

const publicRoutes = [
  { path: "/", priority: 1, changeFrequency: "weekly" as const },
  { path: "/botseller", priority: 0.95, changeFrequency: "weekly" as const },
  { path: "/regulamin", priority: 0.35, changeFrequency: "monthly" as const },
  { path: "/polityka-prywatnosci", priority: 0.35, changeFrequency: "monthly" as const },
  { path: "/rodo", priority: 0.3, changeFrequency: "monthly" as const },
  { path: "/cookies", priority: 0.3, changeFrequency: "monthly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return publicRoutes.map((route) => ({
    url: new URL(route.path, siteUrl).toString(),
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
