import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { DEFAULT_RADIUS_KM } from "@/lib/dk-postcodes";

export interface UserLocation {
  city: string | null;
  zip: string | null;
  region: string | null;
  source: "ip" | "manual" | "precise" | null;
}

interface LocationContextValue {
  location: UserLocation;
  /** True while we're attempting auto-detection (initial mount). */
  detecting: boolean;
  /** True once detection has finished (success or failure). */
  detected: boolean;
  /** Set location manually — usually from a postal-code input. */
  setManualZip: (zip: string, city?: string | null) => void;
  /** Ask browser for a more precise location and reverse geocode it. */
  detectPreciseLocation: () => Promise<boolean>;
  /** Clear all location data. */
  clear: () => void;
  /** Search radius in km — null means "Hele DK" (no radius filter). */
  radiusKm: number | null;
  /** Update the search radius (persisted across reloads). */
  setRadiusKm: (km: number | null) => void;
}

const STORAGE_KEY = "sy.userLocation.v1";
const RADIUS_STORAGE_KEY = "sy.userRadius.v1";
const DK_ZIP_RE = /^\d{4}$/;

// Tiny, common DK zip → city map for nicer UX when user types a postcode.
// Not exhaustive — just used to enrich the chip label.
const DK_ZIP_HINTS: Record<string, string> = {
  "1000": "København K", "1050": "København K", "1100": "København K",
  "1500": "København V", "1600": "København V", "1700": "København V",
  "2000": "Frederiksberg", "2100": "København Ø", "2200": "København N",
  "2300": "København S", "2400": "København NV", "2450": "København SV",
  "2500": "Valby", "2600": "Glostrup", "2700": "Brønshøj", "2800": "Kongens Lyngby",
  "2900": "Hellerup", "3000": "Helsingør", "4000": "Roskilde", "4600": "Køge",
  "5000": "Odense C", "5200": "Odense V", "5230": "Odense M",
  "6000": "Kolding", "6700": "Esbjerg", "7000": "Fredericia", "7100": "Vejle",
  "7400": "Herning", "7500": "Holstebro", "7700": "Thisted",
  "8000": "Aarhus C", "8200": "Aarhus N", "8210": "Aarhus V", "8220": "Brabrand",
  "8260": "Viby J", "8270": "Højbjerg", "8800": "Viborg", "8900": "Randers C",
  "9000": "Aalborg", "9200": "Aalborg SV", "9210": "Aalborg SØ", "9220": "Aalborg Ø",
  "9400": "Nørresundby",
};

const LocationContext = createContext<LocationContextValue | undefined>(undefined);

const readStored = (): UserLocation | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as UserLocation;
  } catch {
    // ignore
  }
  return null;
};

const writeStored = (loc: UserLocation | null) => {
  try {
    if (!loc) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
  } catch {
    // ignore
  }
};

const readStoredRadius = (): number | null | undefined => {
  try {
    const raw = localStorage.getItem(RADIUS_STORAGE_KEY);
    if (raw === null) return undefined;
    if (raw === "null") return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  } catch {
    return undefined;
  }
};

const writeStoredRadius = (km: number | null) => {
  try {
    localStorage.setItem(RADIUS_STORAGE_KEY, km === null ? "null" : String(km));
  } catch {
    // ignore
  }
};

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const stored = readStored();
  // Hydrate from storage so we don't flash the loader; but if stored entry is empty
  // (e.g. earlier failed detection), still re-attempt IP lookup.
  const [location, setLocation] = useState<UserLocation>(
    stored || { city: null, zip: null, region: null, source: null }
  );
  const storedRadius = readStoredRadius();
  const [radiusKm, setRadiusKmState] = useState<number | null>(
    storedRadius === undefined ? DEFAULT_RADIUS_KM : storedRadius,
  );

  const setRadiusKm = useCallback((km: number | null) => {
    setRadiusKmState(km);
    writeStoredRadius(km);
  }, []);
  // We re-run IP detection whenever we don't yet have a confirmed city/zip,
  // regardless of source — this lets us recover from earlier failed lookups.
  const needsDetection = !stored || (!stored.city && !stored.zip);
  const [detecting, setDetecting] = useState<boolean>(needsDetection);
  const [detected, setDetected] = useState<boolean>(!needsDetection);

  const fetchJSON = useCallback(async (url: string, ms = 5000): Promise<any | null> => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      const r = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
      if (!r.ok) return null;
      return await r.json();
    } catch {
      return null;
    } finally {
      clearTimeout(t);
    }
  }, []);

  const lookupPostalCity = useCallback(async (zip: string | null) => {
    if (!zip || !DK_ZIP_RE.test(zip)) return null;
    const data = await fetchJSON(`https://api.dataforsyningen.dk/postnumre/${zip}`, 5000);
    return data?.navn || null;
  }, [fetchJSON]);

  const applyDetectedLocation = useCallback(async (city: string | null, zip: string | null, region: string | null, source: UserLocation["source"]) => {
    if (!city && !zip) return false;
    const canonicalCity = await lookupPostalCity(zip);
    const next: UserLocation = { city: canonicalCity || city, zip, region, source };
    setLocation(next);
    writeStored(next);
    return true;
  }, [lookupPostalCity]);

  const reverseGeocodeCoords = useCallback(async (latitude: number, longitude: number) => {
    const dawa = await fetchJSON(
      `https://api.dataforsyningen.dk/adgangsadresser/reverse?x=${longitude}&y=${latitude}`,
      6000,
    );

    if (dawa) {
      const zip = dawa?.postnummer?.nr || null;
      const city = dawa?.postnummer?.navn || dawa?.supplerendebynavn || null;
      const region = dawa?.kommune?.navn || null;
        if (city || zip) return { city, zip, region };
    }

    const nominatim = await fetchJSON(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=da`,
      6000,
    );

    if (nominatim?.address) {
      const address = nominatim.address;
      const city = address.city || address.town || address.village || address.suburb || address.municipality || null;
      const zip = address.postcode || null;
      const region = address.state || address.region || null;
      if (city || zip) return { city, zip, region };
    }

    const bdc = await fetchJSON(
      `https://api-bdc.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=da`,
      6000,
    );
    if (bdc) {
      return {
        city: bdc.locality || bdc.city || null,
        zip: bdc.postcode || null,
        region: bdc.principalSubdivision || null,
      };
    }

    return null;
  }, [fetchJSON]);

  // Auto-detect location. Strategy:
  //   1) Attempt browser geolocation automatically and reverse-geocode to precise DK city/postcode.
  //   2) Fallback to IP coordinates and reverse-geocode those.
  //   3) Last fallback: raw IP city/postcode providers.
  // Manual entries are preserved.
  useEffect(() => {
    if (location.source === "manual") {
      setDetecting(false);
      setDetected(true);
      return;
    }
    if (location.city && location.zip) {
      setDetecting(false);
      setDetected(true);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        if (typeof navigator !== "undefined" && navigator.geolocation) {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: false,
                timeout: 7000,
                maximumAge: 1000 * 60 * 60,
              });
            });

            const precise = await reverseGeocodeCoords(position.coords.latitude, position.coords.longitude);
            if (!cancelled && precise && await applyDetectedLocation(precise.city, precise.zip, precise.region, "precise")) return;
          } catch {
            // ignore and fall back to IP-based lookup
          }
        }

        const who = await fetchJSON("https://ipwho.is/?fields=city,postal,region,success,latitude,longitude");
        if (who?.success !== false) {
          if (Number.isFinite(who?.latitude) && Number.isFinite(who?.longitude)) {
            const precise = await reverseGeocodeCoords(Number(who.latitude), Number(who.longitude));
            if (!cancelled && precise && await applyDetectedLocation(precise.city, precise.zip, precise.region, "ip")) return;
          }
          if (!cancelled && await applyDetectedLocation(who?.city || null, who?.postal || null, who?.region || null, "ip")) return;
        }

        const ipa = await fetchJSON("https://ipapi.co/json/");
        if (ipa) {
          if (Number.isFinite(ipa?.latitude) && Number.isFinite(ipa?.longitude)) {
            const precise = await reverseGeocodeCoords(Number(ipa.latitude), Number(ipa.longitude));
            if (!cancelled && precise && await applyDetectedLocation(precise.city, precise.zip, precise.region, "ip")) return;
          }
          if (!cancelled && await applyDetectedLocation(ipa?.city || null, ipa?.postal || null, ipa?.region || null, "ip")) return;
        }

        // 3) BigDataCloud raw fallback
        const bdc = await fetchJSON("https://api-bdc.net/data/client-ip?localityLanguage=da");
        if (bdc && !cancelled) {
          await applyDetectedLocation(
            bdc?.location?.postcodeLocality || bdc?.location?.city || bdc?.location?.locality || null,
            bdc?.location?.postcode || null,
            bdc?.location?.principalSubdivision || null,
            "ip",
          );
        }
      } finally {
        if (!cancelled) {
          setDetecting(false);
          setDetected(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyDetectedLocation, fetchJSON, location.city, location.source, location.zip]);

  useEffect(() => {
    if (!location.zip) return;

    let cancelled = false;

    (async () => {
      const canonicalCity = await lookupPostalCity(location.zip);
      if (!canonicalCity || cancelled || canonicalCity === location.city) return;

      const next: UserLocation = { ...location, city: canonicalCity };
      setLocation(next);
      writeStored(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [location, lookupPostalCity]);

  const detectPreciseLocation = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return false;

    setDetecting(true);
    setDetected(false);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 1000 * 60 * 10,
        });
      });

      const result = await reverseGeocodeCoords(position.coords.latitude, position.coords.longitude);
      if (!result) return false;

      return await applyDetectedLocation(result.city, result.zip, result.region, "precise");
    } catch {
      return false;
    } finally {
      setDetecting(false);
      setDetected(true);
    }
  }, [applyDetectedLocation, reverseGeocodeCoords]);

  const setManualZip = useCallback((zip: string, city?: string | null) => {
    const trimmed = zip.trim();
    const validZip = DK_ZIP_RE.test(trimmed) ? trimmed : null;
    const enrichedCity = city || (validZip ? DK_ZIP_HINTS[validZip] || null : null);
    const next: UserLocation = {
      city: enrichedCity,
      zip: validZip,
      region: null,
      source: "manual",
    };
    setLocation(next);
    writeStored(next);
    setDetected(true);
    setDetecting(false);
  }, []);

  const clear = useCallback(() => {
    const next: UserLocation = { city: null, zip: null, region: null, source: null };
    setLocation(next);
    writeStored(null);
  }, []);

  return (
    <LocationContext.Provider value={{ location, detecting, detected, setManualZip, detectPreciseLocation, clear, radiusKm, setRadiusKm }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useUserLocation = () => {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useUserLocation must be used inside <LocationProvider>");
  return ctx;
};
