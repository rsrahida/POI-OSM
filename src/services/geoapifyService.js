const GEOAPIFY_PLACES_URL = "https://api.geoapify.com/v2/places";
const GEOAPIFY_AUTOCOMPLETE_URL =
  "https://api.geoapify.com/v1/geocode/autocomplete";
const GEOAPIFY_PLACE_DETAILS_URL = "https://api.geoapify.com/v2/place-details";
const API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY;

const BAKU_BBOX = "49.30,40.25,50.40,40.65";

const RESULT_LIMIT = 500;

export const POI_CATEGORIES = [
  {
    id: "restaurant",
    label: "Restoran",
    category: "catering.restaurant",
    iconName: "Utensils",
    color: "#e67e22",
  },
  {
    id: "pharmacy",
    label: "Aptek",
    category: "healthcare.pharmacy",
    iconName: "Pill",
    color: "#27ae60",
  },
  {
    id: "bank",
    label: "Bank",
    category: "service.financial.bank",
    iconName: "Landmark",
    color: "#2980b9",
  },
  {
    id: "hospital",
    label: "Xəstəxana",
    category: "healthcare.hospital",
    iconName: "Cross",
    color: "#b43527",
  },
  {
    id: "park",
    label: "Park",
    category: "leisure.park",
    iconName: "Trees",
    color: "#16a085",
  },
  {
    id: "market",
    label: "Market",
    category: "commercial.supermarket",
    iconName: "ShoppingCart",
    color: "#8e44ad",
  },
];

export async function fetchPoisByCategory(categoryId) {
  const category = POI_CATEGORIES.find((c) => c.id === categoryId);
  if (!category) return [];

  const url = `${GEOAPIFY_PLACES_URL}?categories=${category.category}&filter=rect:${BAKU_BBOX}&limit=${RESULT_LIMIT}&apiKey=${API_KEY}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Datalar yüklənərkən xəta baş verdi`);
  }

  const data = await response.json();

  console.log("RAW DATA:", data);
  console.log("Property key-ləri:", Object.keys(data.features[0].properties));

  return data.features.map((feature) => ({
    id: feature.properties.place_id,
    lat: feature.geometry.coordinates[1],
    lon: feature.geometry.coordinates[0],
    name: feature.properties.name || category.label,
    address:
      feature.properties.formatted || feature.properties.address_line2 || "",
  }));
}

export async function searchPlacesByText(query) {
  if (!query || query.trim().length < 2) return [];

  const url = `${GEOAPIFY_AUTOCOMPLETE_URL}?text=${encodeURIComponent(
    query,
  )}&filter=rect:${BAKU_BBOX}&limit=8&apiKey=${API_KEY}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Geoapify axtaris xetasi: ${response.status}`);
  }

  const data = await response.json();

  return data.features.map((feature) => ({
    id: feature.properties.place_id,
    lat: feature.properties.lat,
    lon: feature.properties.lon,
    name:
      feature.properties.name ||
      feature.properties.address_line1 ||
      "Adsız mekan",
    address: feature.properties.formatted || "",
  }));
}

export async function fetchPlaceDetails(placeId) {
  if (!placeId) return null;

  const url = `${GEOAPIFY_PLACE_DETAILS_URL}?id=${placeId}&apiKey=${API_KEY}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Geoapify detallar xetasi: ${response.status}`);
  }

  const data = await response.json();

  console.log("PLACE DETAILS RAW:", data);

  const feature = data.features?.[0];
  const props = feature?.properties || {};
  const coords = feature?.geometry?.coordinates || [];

  console.log("Property tam obyekt:", JSON.stringify(props, null, 2));
  console.log("Coordinates:", coords);

  return {
    name: props.name || props.address_line1 || "Adsız mekan",
    address: props.formatted || "",
    phone: props.contact?.phone || props.phone || null,
    website: props.contact?.website || props.website || null,
    openingHours: props.opening_hours || null,
    lon: coords[0] ?? null,
    lat: coords[1] ?? null,
  };
}