import SmartLink from "@/components/SmartLink";
import { OFFICIAL_PROFILES } from "@/lib/social-links";
import {
  siFacebook,
  siInstagram,
  siTrustpilot,
  siYoutube,
  type SimpleIcon,
} from "simple-icons";

// Alle interne links i footeren bruger SmartLink, så hover/touch starter
// chunk-prefetch og navigationen føles instant.
const Link = SmartLink;

const LINKEDIN_LOGO: Pick<SimpleIcon, "path"> = {
  path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.447-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.119 20.452H3.555V9h3.564v11.452z",
};

const SOCIAL_ICONS = {
  Trustpilot: siTrustpilot,
  LinkedIn: LINKEDIN_LOGO,
  YouTube: siYoutube,
  Facebook: siFacebook,
  Instagram: siInstagram,
} as const;

const BrandLogo = ({ icon }: { icon: Pick<SimpleIcon, "path"> }) => (
  <svg
    viewBox="0 0 24 24"
    className="h-5 w-5 shrink-0 fill-current"
    role="img"
    aria-hidden="true"
  >
    <path d={icon.path} />
  </svg>
);

const Footer = () => {
  return (
    <footer className="bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 2xl:py-12">
        <div className="mb-7 grid gap-5 rounded-2xl border border-background/10 bg-background/5 p-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-center 2xl:mb-8 2xl:rounded-[28px] 2xl:p-6">
          <div>
            <h3 className="text-xl font-semibold text-background">Find hurtigere frem</h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-background/70">
              Direkte søgning eller 3 tilbud — afhængigt af hvordan du vil finde den rette løsning.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
            <Link to="/virksomheder" className="inline-flex items-center justify-center rounded-full bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-background/90">
              Find services
            </Link>
            <Link to="/tilbud" className="inline-flex items-center justify-center rounded-full border border-background/20 bg-transparent px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-background/10">
              Indhent 3 tilbud
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div>
            <h4 className="mb-3 text-sm font-semibold text-background">Serviceydere</h4>
            <ul className="space-y-2 text-sm text-background/65">
              <li><Link to="/virksomheder" className="transition-colors hover:text-background">Find services</Link></li>
              <li><Link to="/tilbud" className="transition-colors hover:text-background">Indhent tilbud</Link></li>
              <li><Link to="/virksomheder" className="transition-colors hover:text-background">Kategorier</Link></li>
              <li><Link to="/guides" className="transition-colors hover:text-background">Guides &amp; priser</Link></li>
              <li><Link to="/blog" className="transition-colors hover:text-background">Blog</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-background">Populære guides</h4>
            <ul className="space-y-2 text-sm text-background/65">
              <li><Link to="/guides/priser-2026" className="transition-colors hover:text-background">Priser 2026 — oversigt</Link></li>
              <li><Link to="/guides/rengoering" className="transition-colors hover:text-background">Rengøring 2026</Link></li>
              <li><Link to="/guides/flytning" className="transition-colors hover:text-background">Flytning 2026</Link></li>
              <li><Link to="/guides/haandvaerker" className="transition-colors hover:text-background">Håndværker 2026</Link></li>
              <li><Link to="/guides/have" className="transition-colors hover:text-background">Have &amp; haveservice</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-background">For virksomheder</h4>
            <ul className="space-y-2 text-sm text-background/65">
              <li><Link to="/opret-virksomhed" className="transition-colors hover:text-background">Bliv udbyder</Link></li>
              <li><Link to="/software" className="transition-colors hover:text-background">Systemet til virksomheder</Link></li>
              <li><Link to="/software/ruteplanlaegger" className="transition-colors hover:text-background">Ruteplanlægger</Link></li>
              <li><Link to="/software/medarbejder-app" className="transition-colors hover:text-background">Medarbejder-app</Link></li>
              <li><Link to="/software/fakturering-og-regnskab" className="transition-colors hover:text-background">Fakturering &amp; regnskab</Link></li>
              <li><Link to="/log-ind" className="transition-colors hover:text-background">Log ind</Link></li>
              <li><Link to="/virksomhed" className="transition-colors hover:text-background">Virksomhedspanel</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-background">Support</h4>
            <ul className="space-y-2 text-sm text-background/65">
              <li><Link to="/kontakt" className="transition-colors hover:text-background">Kontakt os</Link></li>
              <li><Link to="/hjaelp" className="transition-colors hover:text-background">Hjælpecenter</Link></li>
              <li><Link to="/hjaelp#faq" className="transition-colors hover:text-background">FAQ</Link></li>
              <li><Link to="/anmeldelser" className="transition-colors hover:text-background">Anmeldelser</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-background">Om os</h4>
            <ul className="space-y-2 text-sm text-background/65">
              <li><Link to="/om-os" className="transition-colors hover:text-background">Om Serviceydere</Link></li>
              <li><Link to="/privatlivspolitik" className="transition-colors hover:text-background">Privatlivspolitik</Link></li>
              <li><Link to="/vilkaar" className="transition-colors hover:text-background">Vilkår</Link></li>
              <li><Link to="/cookies" className="transition-colors hover:text-background">Cookies</Link></li>
              <li><Link to="/databehandleraftale" className="transition-colors hover:text-background">Databehandleraftale</Link></li>
              <li><Link to="/underdatabehandlere" className="transition-colors hover:text-background">Underdatabehandlere</Link></li>
              <li><Link to="/slet-data" className="transition-colors hover:text-background">Slet data</Link></li>
            </ul>
          </div>
        </div>

         <div className="mt-10 flex flex-col items-center justify-between gap-5 border-t border-background/10 pt-6 text-xs text-background/55 md:flex-row">
           <div className="flex flex-col items-center gap-3 md:items-start">
             <div>© {new Date().getFullYear()} Serviceydere</div>
             <nav aria-label="Serviceydere på sociale medier" className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
               {OFFICIAL_PROFILES.map(({ label, href }) => {
                 const Icon = SOCIAL_ICONS[label];
                 return (
                   <a
                     key={label}
                     href={href}
                     target="_blank"
                     rel="noopener noreferrer"
                     aria-label={`Serviceydere på ${label}`}
                     title={label}
                     className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-background/20 bg-background/5 px-3 text-background/85 transition-colors hover:border-background/40 hover:bg-background/10 hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                   >
                     <BrandLogo icon={Icon} />
                     <span className="text-xs font-semibold">{label}</span>
                   </a>
                 );
               })}
             </nav>
           </div>
           <img
            src="/serviceydere-logo.webp"
            alt="Serviceydere"
            className="h-9 w-auto opacity-90"
            width={1920}
            height={539}
            decoding="async"
            loading="lazy"
          />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
