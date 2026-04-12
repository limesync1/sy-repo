import { useEffect } from "react";

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
}

const BusinessSEO = ({
  name, description, city, address, zipCode, phone, email,
  logoUrl, coverImageUrl, avgRating, reviewCount, slug, openingHours,
}: BusinessSEOProps) => {
  useEffect(() => {
    // Dynamic title & meta
    const prevTitle = document.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc?.getAttribute("content") || "";

    const title = `${name}${city ? ` i ${city}` : ""} | Serviceydere`;
    const desc = description
      ? `${description.slice(0, 140)}${description.length > 140 ? "…" : ""}`
      : `Find og book services hos ${name}${city ? ` i ${city}` : ""} på Serviceydere.`;

    document.title = title;
    if (metaDesc) metaDesc.setAttribute("content", desc);

    // JSON-LD structured data
    const jsonLd: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name,
      url: `${window.location.origin}/b/${slug}`,
    };
    if (description) jsonLd.description = description;
    if (address) {
      jsonLd.address = {
        "@type": "PostalAddress",
        streetAddress: address,
        ...(zipCode && { postalCode: zipCode }),
        ...(city && { addressLocality: city }),
        addressCountry: "DK",
      };
    }
    if (phone) jsonLd.telephone = phone;
    if (email) jsonLd.email = email;
    if (logoUrl) jsonLd.logo = logoUrl;
    if (coverImageUrl) jsonLd.image = coverImageUrl;
    if (avgRating && reviewCount) {
      jsonLd.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: avgRating,
        reviewCount,
        bestRating: "5",
        worstRating: "1",
      };
    }

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);

    return () => {
      document.title = prevTitle;
      if (metaDesc) metaDesc.setAttribute("content", prevDesc);
      script.remove();
    };
  }, [name, description, city, address, zipCode, phone, email, logoUrl, coverImageUrl, avgRating, reviewCount, slug]);

  return null;
};

export default BusinessSEO;
