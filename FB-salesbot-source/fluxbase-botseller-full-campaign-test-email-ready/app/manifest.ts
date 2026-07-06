import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FluxBase BotSeller",
    short_name: "BotSeller",
    description: "AI Sales Bot do automatyzacji maili, prospectingu B2B i pozyskiwania leadów.",
    start_url: "/",
    display: "standalone",
    background_color: "#050505",
    theme_color: "#3A86FF",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
