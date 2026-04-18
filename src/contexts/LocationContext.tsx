import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";

export interface UserLocation {
  city: string | null;
  zip: string | null;
  region: string | null;
  source: "ip" | "manual" | null;
}

interface LocationContextValue {
  location: UserLocation;
  /** True while we're attempting auto-detection (initial mount). */
  detecting: boolean;
  /** True once detection has finished (success or failure). */
  detected: boolean;
  /** Set location manually — usually from a postal-code input. */
  setManualZip: (zip: string, city?: string | null) => void;
  /** Clear all location data. */
  clear: () => void;
}

const STORAGE_KEY = "sy.userLocation.v1";
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

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const stored = readStored();
  // Hydrate from storage so we don't flash the loader; but if stored entry is empty
  // (e.g. earlier failed detection), still re-attempt IP lookup.
  const [location, setLocation] = useState<UserLocation>(
    stored || { city: null, zip: null, region: null, source: null }
  );
  // We re-run IP detection whenever we don't yet have a confirmed city/zip,
  // regardless of source — this lets us recover from earlier failed lookups.
  const needsDetection = !stored || (!stored.city && !stored.zip);
  const [detecting, setDetecting] = useState<boolean>(needsDetection);
  const [detected, setDetected] = useState<boolean>(!needsDetection);

  // Auto-detect via IP geolocation if we don't have a real location yet.
  // Manual entries (source: "manual") are preserved and never overwritten.
  useEffect(() => {
    if (location.source === "manual") {
      setDetecting(false);
      setDetected(true);
      return;
    }
    if (location.city || location.zip) {
      setDetecting(false);
      setDetected(true);
      return;
    }

    let cancelled = false;
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 4000);

    (async () => {
      try {
        const res = await fetch("https://ipapi.co/json/", { signal: ctrl.signal });
        if (!res.ok) throw new Error("ip lookup failed");
        const data = await res.json();
        const city: string | null = data?.city || null;
        const zip: string | null = data?.postal || null;
        const region: string | null = data?.region || null;
        const country: string | null = data?.country_code || null;

        if (cancelled) return;

        // Accept any city/zip we get back. Prefer DK, but use whatever we have.
        if (city || zip) {
          const next: UserLocation = {
            city,
            zip,
            region,
            source: "ip",
          };
          setLocation(next);
          writeStored(next);
        }
      } catch {
        // Silent — UI will fall back to manual zip entry
      } finally {
        if (!cancelled) {
          setDetecting(false);
          setDetected(true);
        }
        clearTimeout(timeout);
      }
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    <LocationContext.Provider value={{ location, detecting, detected, setManualZip, clear }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useUserLocation = () => {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useUserLocation must be used inside <LocationProvider>");
  return ctx;
};
