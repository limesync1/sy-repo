export const OFFICIAL_PROFILES = [
  { label: "Trustpilot", href: "https://dk.trustpilot.com/review/serviceydere.dk" },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/serviceydere" },
  { label: "YouTube", href: "https://www.youtube.com/@serviceydere" },
  { label: "Facebook", href: "https://www.facebook.com/serviceydere" },
  { label: "Instagram", href: "https://www.instagram.com/serviceydere" },
] as const;

export const OFFICIAL_PROFILE_URLS = OFFICIAL_PROFILES.map(({ href }) => href);