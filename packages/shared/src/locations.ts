/**
 * A pragmatic slice of Rwanda's administrative geography for neighborhood scoping.
 * Coordinates are approximate sector centroids, good enough for "nearby" ranking.
 */
export interface NeighborhoodDef {
  slug: string;
  name: string;
  district: string;
  lat: number;
  lng: number;
}

export const NEIGHBORHOODS: NeighborhoodDef[] = [
  { slug: "kimironko", name: "Kimironko", district: "Gasabo", lat: -1.9446, lng: 30.1262 },
  { slug: "remera", name: "Remera", district: "Gasabo", lat: -1.9578, lng: 30.1127 },
  { slug: "kacyiru", name: "Kacyiru", district: "Gasabo", lat: -1.9436, lng: 30.0925 },
  { slug: "kimihurura", name: "Kimihurura", district: "Gasabo", lat: -1.9536, lng: 30.0931 },
  { slug: "gisozi", name: "Gisozi", district: "Gasabo", lat: -1.9192, lng: 30.0808 },
  { slug: "nyamirambo", name: "Nyamirambo", district: "Nyarugenge", lat: -1.9836, lng: 30.0436 },
  { slug: "nyabugogo", name: "Nyabugogo", district: "Nyarugenge", lat: -1.9389, lng: 30.0506 },
  { slug: "kicukiro", name: "Kicukiro", district: "Kicukiro", lat: -1.9889, lng: 30.1031 },
  { slug: "kanombe", name: "Kanombe", district: "Kicukiro", lat: -1.9706, lng: 30.1389 },
  { slug: "gikondo", name: "Gikondo", district: "Kicukiro", lat: -1.9889, lng: 30.0708 },
  { slug: "musanze", name: "Musanze", district: "Musanze", lat: -1.4998, lng: 29.6344 },
  { slug: "huye", name: "Huye", district: "Huye", lat: -2.5967, lng: 29.7394 },
  { slug: "rubavu", name: "Rubavu", district: "Rubavu", lat: -1.6779, lng: 29.2603 },
];

export const NEIGHBORHOOD_SLUGS = NEIGHBORHOODS.map((n) => n.slug);

export function neighborhoodBySlug(slug: string): NeighborhoodDef | undefined {
  return NEIGHBORHOODS.find((n) => n.slug === slug);
}

/** Haversine distance in kilometers. */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Friendly walking-distance label. */
export function distanceLabel(km: number): string {
  if (km < 0.1) return "Hano hafi";
  if (km < 1) return `Metero ${Math.round(km * 1000)}`;
  return `${km.toFixed(1)} km`;
}
