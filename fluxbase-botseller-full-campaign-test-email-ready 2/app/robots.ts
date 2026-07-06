import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.fluxbase.pl";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/botseller", "/regulamin", "/polityka-prywatnosci", "/rodo", "/cookies"],
        disallow: ["/admin", "/api", "/client", "/unsubscribe"],
      },
    ],
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
    host: siteUrl,
  };
}
