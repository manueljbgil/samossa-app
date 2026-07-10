type LocationPoint = {
  latitude: number;
  longitude: number;
};

type ReverseGeocodeResult = {
  area: string;
  city: string;
  address: string;
};

type NominatimReverseResponse = {
  address?: {
    road?: string;
    house_number?: string;
    neighbourhood?: string;
    suburb?: string;
    quarter?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
};

const pickFirst = (...values: Array<string | undefined>) =>
  values.find((value) => value && value.trim().length > 0)?.trim() ?? "";

export async function reverseGeocodeLocation(
  location: LocationPoint,
): Promise<ReverseGeocodeResult | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(location.latitude));
  url.searchParams.set("lon", String(location.longitude));
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", "18");

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as NominatimReverseResponse;
  const address = data.address;
  if (!address) return null;

  const area = pickFirst(
    address.neighbourhood,
    address.suburb,
    address.quarter,
    address.county,
  );
  const city = pickFirst(
    address.city,
    address.town,
    address.village,
    address.municipality,
  );
  const street = pickFirst(address.road);
  const houseNumber = pickFirst(address.house_number);
  const postcode = pickFirst(address.postcode);
  const addressLine = [street, houseNumber].filter(Boolean).join(" ");
  const addressParts = [addressLine, postcode].filter(Boolean);

  return {
    area,
    city,
    address:
      addressParts.join(", ") || pickFirst(address.state, address.country),
  };
}
