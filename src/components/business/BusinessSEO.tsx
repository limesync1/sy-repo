import SEO from "@/components/SEO";

interface BusinessSEOProps {
  name: string;
  description?: string | null;
  city?: string | null;
  address?: string | null;
  zipCode?: string | null;
  phone?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  avgRating?: string | null;
  reviewCount?: number;
  slug: string;
  openingHours?: Record<string, string>;
  categories?: string[];
  services?: { name: string; description?: string | null; base_price?: number | null }[];
}

const DAY_MAP: Record<string, string> = {
  monday: "Mo", mandag: "Mo",
  tuesday: "Tu", tirsdag: "Tu",
  wednesday: "We", onsdag: "We",
  thursday: "Th", torsdag: "Th",
  friday: "Fr", fredag: "Fr",
  saturday: "Sa", lørdag: "Sa",
  sunday: "Su", søndag: "Su",
};

const formatHours = (hours?: Record<string, string>): string[] | undefined => {
  if (!hours) return undefined;
  const out: string[] = [];
  Object.entries(hours).forEach(([day, val]) => {
    const code = DAY_MAP[day.toLowerCase()];
    if (code && val && /\d/.test(val)) {
      // Try "08:00 - 17:00" / "08-17"
      const m = val.match(/(\d{1,2})[:.]?(\d{0,2})\s*[-–]\s*(\d{1,2})[:.]?(\d{0,2})/);
      if (m) {
        const op = `${m[1].padStart(2, "0")}:${(m[2] || "00").padStart(2, "0")}`;
        const cl = `${m[3].padStart(2, "0")}:${(m[4] || "00").padStart(2, "0")}`;
        out.push(`${code} ${op}-${cl}`);
      }
    }
  });
  return out.length ? out : undefined;
};

const BusinessSEO = ({
  name, description, city, address, zipCode, phone, email,
  logoUrl, coverImageUrl, avgRating, reviewCount, slug, openingHours,
  categories, services,
}: BusinessSEOProps) => {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://serviceydere.dk";
  const businessUrl = `${origin}/b/${slug}`;

  const title = `${name}${city ? ` i ${city}` : ""} – Book online`;
  const desc = description
    ? description.replace(/\s+/g, " ").slice(0, 155).trim()
    : `Book ${name}${city ? ` i ${city}` : ""} online${categories?.length ? ` – ${categories.slice(0, 2).join(", ")}` : ""}. Se priser, anmeldelser og åbningstider på Serviceydere.`;

  const localBusinessLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": businessUrl,
    name,
    url: businessUrl,
  };
  if (description) localBusinessLd.description = description;
  if (address || city || zipCode) {
    localBusinessLd.address = {
      "@type": "PostalAddress",
      ...(address && { streetAddress: address }),
      ...(zipCode && { postalCode: zipCode }),
      ...(city && { addressLocality: city }),
      addressCountry: "DK",
    };
  }
  if (phone) localBusinessLd.telephone = phone;
  if (email) localBusinessLd.email = email;
  if (logoUrl) localBusinessLd.logo = logoUrl;
  if (coverImageUrl || logoUrl) localBusinessLd.image = coverImageUrl || logoUrl;
  if (avgRating && reviewCount) {
    localBusinessLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: avgRating,
      reviewCount,
      bestRating: "5",
      worstRating: "1",
    };
  }
  const hours = formatHours(openingHours);
  if (hours) localBusinessLd.openingHours = hours;
  if (categories?.length) localBusinessLd.keywords = categories.join(", ");

  const breadcrumbsLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Forside", item: origin + "/" },
      { "@type": "ListItem", position: 2, name: "Find services", item: origin + "/search" },
      ...(categories?.[0]
        ? [{ "@type": "ListItem", position: 3, name: categories[0], item: `${origin}/search?category=${encodeURIComponent(categories[0])}` }]
        : []),
      { "@type": "ListItem", position: categories?.[0] ? 4 : 3, name, item: businessUrl },
    ],
  };

  const ldArr: Record<string, unknown>[] = [localBusinessLd, breadcrumbsLd];

  if (services?.length) {
    services.slice(0, 10).forEach((s) => {
      const offer: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "Service",
        name: s.name,
        provider: { "@type": "LocalBusiness", name, url: businessUrl },
      };
      if (s.description) offer.description = s.description;
      if (s.base_price) {
        offer.offers = {
          "@type": "Offer",
          price: String(s.base_price),
          priceCurrency: "DKK",
          availability: "https://schema.org/InStock",
        };
      }
      ldArr.push(offer);
    });
  }

  return (
    <SEO
      title={title}
      description={desc}
      canonicalPath={`/b/${slug}`}
      image={coverImageUrl || logoUrl || undefined}
      ogType="profile"
      keywords={[name, ...(categories || []), city, "book online", "serviceydere"].filter(Boolean).join(", ")}
      jsonLd={ldArr}
    />
  );
};

export default BusinessSEO;
