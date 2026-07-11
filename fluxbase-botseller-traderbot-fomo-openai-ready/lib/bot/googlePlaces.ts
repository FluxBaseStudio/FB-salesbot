import "server-only";

export type PlaceLead = {
  companyName: string;
  industry: string | null;
  city: string | null;
  phone: string | null;
  website: string | null;
  googleMapsUrl: string | null;
  address: string | null;
  primaryType: string | null;
  types: string[];
};

function cityFromAddress(address: string | undefined, fallback: string) {
  if (!address) return fallback;
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 2] : fallback;
}

export async function searchGooglePlaces(args: {
  apiKey: string;
  industry: string;
  location: string;
  limit: number;
  languageCode?: "pl" | "en";
}): Promise<PlaceLead[]> {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": args.apiKey,
      "X-Goog-FieldMask": [
        "places.displayName",
        "places.formattedAddress",
        "places.internationalPhoneNumber",
        "places.nationalPhoneNumber",
        "places.websiteUri",
        "places.googleMapsUri",
        "places.primaryTypeDisplayName",
        "places.primaryType",
        "places.types",
      ].join(","),
    },
    body: JSON.stringify({
      textQuery: `${args.industry} ${args.location}`,
      languageCode: args.languageCode || "pl",
      maxResultCount: Math.min(Math.max(args.limit, 1), 20),
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || "Google Places zwróciło błąd.";
    throw new Error(message);
  }

  return (payload?.places || [])
    .map((place: any): PlaceLead | null => {
      const companyName = place?.displayName?.text?.trim();
      if (!companyName) return null;
      return {
        companyName,
        industry: place?.primaryTypeDisplayName?.text || args.industry,
        city: cityFromAddress(place?.formattedAddress, args.location),
        phone: place?.internationalPhoneNumber || place?.nationalPhoneNumber || null,
        website: place?.websiteUri || null,
        googleMapsUrl: place?.googleMapsUri || null,
        address: place?.formattedAddress || null,
        primaryType: place?.primaryType || null,
        types: Array.isArray(place?.types) ? place.types.filter((item: unknown) => typeof item === "string") : [],
      };
    })
    .filter(Boolean) as PlaceLead[];
}
