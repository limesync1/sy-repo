// SettingsTab — virksomhedens indstillinger, opbygget med samme designsprog
// som Overblik / Aftaler / Kunder / Medarbejdere / Anmeldelser:
// PageHeader, surface-admin cards, sub-nav chips og konsistent spacing.
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Sparkles, Settings, Bell, Route, Contact, Image as ImageIcon, Clock,
  CheckCircle2, AlertCircle, ArrowRight, Building2,
} from "lucide-react";
import ImageUpload from "@/components/business/ImageUpload";
import { PageHeader, PrimaryButton, SectionCard, FieldLabel } from "@/components/admin/shared/AdminUI";
import { useUpdateBusiness } from "@/hooks/useDatabase";
import { useAuth } from "@/contexts/AuthContext";
import { TrafficOverridesSection } from "./TrafficOverridesSection";
import {
  INDUSTRY_GROUPS,
  ALL_INDUSTRIES,
  industryIcon,
  customIndustryKeys,
  findIndustry,
} from "@/lib/service-taxonomy";

const DAYS = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"];

// ─── Sub-nav sektioner ───
// Hver chip svarer til ét område på siden. Klik scroller blødt til sektionen.
const SECTIONS = [
  { id: "general",       label: "Generelt",       icon: Building2 },
  { id: "contact",       label: "Kontakt",        icon: Contact },
  { id: "branding",      label: "Branding",       icon: ImageIcon },
  { id: "hours",         label: "Åbningstider",   icon: Clock },
  { id: "notifications", label: "Notifikationer", icon: Bell },
  { id: "advanced",      label: "Avanceret",      icon: Route },
] as const;

/* ─── Toggle-switch (delt mellem notifikations- og rute-felter) ─── */
const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button
    type="button"
    onClick={onChange}
    aria-pressed={checked}
    className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${
      checked ? "bg-accent" : "bg-border"
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-background shadow-sm transition-transform mt-0.5 ${
        checked ? "translate-x-4 ml-0.5" : "translate-x-0.5"
      }`}
    />
  </button>
);

const SettingsTab = ({ business }: { business: any }) => {
  const updateBiz = useUpdateBusiness();
  const { user } = useAuth();

  // ─── Form state ───
  const [name, setName] = useState(business.name);
  const [description, setDescription] = useState(business.description || "");
  const [phone, setPhone] = useState(business.phone || "");
  const [email, setEmail] = useState(business.email || "");
  const [address, setAddress] = useState(business.address || "");
  const [city, setCity] = useState(business.city || "");
  const [zipCode, setZipCode] = useState(business.zip_code || "");
  const [logoUrl, setLogoUrl] = useState(business.logo_url || "");
  const [coverUrl, setCoverUrl] = useState(business.cover_image_url || "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    (business.categories as string[]) || (business.category ? [business.category] : [])
  );
  const [openHours, setOpenHours] = useState<Record<string, string>>(business.opening_hours || {});
  const [notifSettings, setNotifSettings] = useState<Record<string, boolean>>({
    new_order: true,
    upcoming_service: true,
    subscription_change: true,
    new_review: false,
    ...(business.notification_settings as Record<string, boolean> || {}),
  });
  const [routePlanningEnabled, setRoutePlanningEnabled] = useState<boolean>(
    !!(business.settings as any)?.route_planning_enabled
  );

  // CVR lookup
  const [cvrQuery, setCvrQuery] = useState("");
  const [cvrLoading, setCvrLoading] = useState(false);
  const [cvrResult, setCvrResult] = useState<any>(null);
  const [cvrError, setCvrError] = useState("");

  // Postnummer auto-udfyld by
  const [zipLoading, setZipLoading] = useState(false);

  // Aktivt sub-nav (kun visuelt, alle sektioner er stadig synlige — chip scroller hen til sektionen)
  const [activeSection, setActiveSection] = useState<string>("general");

  const toggleSettingsCategory = (c: string) => {
    setSelectedCategories((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  };

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(`settings-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const lookupCvr = async () => {
    const q = cvrQuery.trim();
    if (!q) return;
    setCvrLoading(true); setCvrError(""); setCvrResult(null);
    try {
      const isNumber = /^\d+$/.test(q);
      const url = isNumber
        ? `https://cvrapi.dk/api?vat=${q}&country=dk`
        : `https://cvrapi.dk/api?name=${encodeURIComponent(q)}&country=dk`;
      const res = await fetch(url, { headers: { "User-Agent": "Serviceydere/1.0" } });
      if (!res.ok) throw new Error("Ikke fundet");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCvrResult(data);
    } catch (e: any) {
      setCvrError(e.message || "Kunne ikke finde virksomheden");
    }
    setCvrLoading(false);
  };

  const applyCvrData = () => {
    if (!cvrResult) return;
    if (cvrResult.name) setName(cvrResult.name);
    if (cvrResult.phone) setPhone(cvrResult.phone.replace(/\s/g, ""));
    if (cvrResult.email) setEmail(cvrResult.email);
    if (cvrResult.address) setAddress(cvrResult.address);
    if (cvrResult.city) setCity(cvrResult.city);
    if (cvrResult.zipcode) setZipCode(cvrResult.zipcode.toString());
    toast.success("Oplysninger udfyldt fra CVR");
    setCvrResult(null); setCvrQuery("");
  };

  const handleZipChange = async (val: string) => {
    setZipCode(val);
    if (val.length === 4 && /^\d{4}$/.test(val)) {
      setZipLoading(true);
      try {
        const res = await fetch(`https://api.dataforsyningen.dk/postnumre/${val}`);
        if (res.ok) {
          const data = await res.json();
          if (data.navn) setCity(data.navn);
        }
      } catch {}
      setZipLoading(false);
    }
  };

  const handlePhoneChange = (val: string) => setPhone(val.replace(/[^\d+]/g, ""));

  // ─── Profil-completeness ───
  // Bruges i toplinje-bannret (ligesom Overblik viser pending-bestillinger).
  const completeness = useMemo(() => {
    const checks = [
      { key: "logo",        done: !!logoUrl,                    label: "Logo" },
      { key: "cover",       done: !!coverUrl,                   label: "Coverbillede" },
      { key: "description", done: description.trim().length > 20, label: "Beskrivelse" },
      { key: "phone",       done: !!phone,                      label: "Telefon" },
      { key: "email",       done: !!email,                      label: "Email" },
      { key: "address",     done: !!address && !!zipCode,       label: "Adresse" },
      { key: "categories",  done: selectedCategories.length > 0, label: "Branche" },
      { key: "hours",       done: Object.keys(openHours).length > 0, label: "Åbningstider" },
    ];
    const done = checks.filter((c) => c.done).length;
    return { checks, done, total: checks.length, pct: Math.round((done / checks.length) * 100) };
  }, [logoUrl, coverUrl, description, phone, email, address, zipCode, selectedCategories, openHours]);

  const save = () => {
    updateBiz.mutate({
      id: business.id, name: name.trim(),
      description: description.trim() || null,
      phone: phone.trim() || null, email: email.trim() || null,
      address: address.trim() || null, city: city.trim() || null,
      zip_code: zipCode.trim() || null,
      logo_url: logoUrl || null, cover_image_url: coverUrl || null,
      category: selectedCategories[0] || null,
      categories: selectedCategories,
      opening_hours: openHours,
      notification_settings: notifSettings,
      settings: {
        ...((business.settings as any) || {}),
        route_planning_enabled: routePlanningEnabled,
      },
    } as any, {
      onSuccess: () => toast.success("Indstillinger gemt"),
      onError: (e) => toast.error(e.message),
    });
  };

  const origCategories = (business.categories as string[]) || (business.category ? [business.category] : []);
  const origNotif = business.notification_settings as Record<string, boolean> || {};
  const origRoutePlanning = !!(business.settings as any)?.route_planning_enabled;
  const hasChanges = name !== business.name || description !== (business.description || "") ||
    phone !== (business.phone || "") || email !== (business.email || "") ||
    address !== (business.address || "") || city !== (business.city || "") ||
    zipCode !== (business.zip_code || "") || logoUrl !== (business.logo_url || "") ||
    coverUrl !== (business.cover_image_url || "") ||
    JSON.stringify([...selectedCategories].sort()) !== JSON.stringify([...origCategories].sort()) ||
    JSON.stringify(openHours) !== JSON.stringify(business.opening_hours || {}) ||
    routePlanningEnabled !== origRoutePlanning ||
    JSON.stringify(notifSettings) !== JSON.stringify({ new_order: true, upcoming_service: true, subscription_change: true, new_review: false, ...origNotif });

  return (
    <div className="space-y-4 pb-24">
      <PageHeader
        title="Indstillinger"
        description="Administrer din virksomheds profil, kontakt, branding og notifikationer."
        action={
          <PrimaryButton onClick={save} disabled={updateBiz.isPending || !hasChanges}>
            {updateBiz.isPending ? "Gemmer..." : "Gem ændringer"}
          </PrimaryButton>
        }
      />

      {/* ─── Status-bar: profil-completeness + sub-nav chips ─── */}
      {/* Følger samme mønster som Overblik (status-banner) + Medarbejdere (filter-chips). */}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-stretch">
        <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {completeness.pct === 100 ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                )}
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Profil-fuldstændighed
                </p>
              </div>
              <p className="mt-1 text-base font-semibold text-foreground tabular-nums">
                {completeness.done} af {completeness.total} felter udfyldt · {completeness.pct}%
              </p>
              {completeness.pct < 100 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Mangler: {completeness.checks.filter((c) => !c.done).map((c) => c.label).join(", ")}
                </p>
              )}
            </div>
            <div className="flex w-full max-w-[260px] sm:shrink-0">
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full rounded-full transition-all ${
                    completeness.pct === 100 ? "bg-emerald-500" : "bg-accent"
                  }`}
                  style={{ width: `${completeness.pct}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <a
          href={business.slug ? `/biz/${business.slug}` : "#"}
          target="_blank"
          rel="noopener noreferrer"
          className={`hidden sm:flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-foreground/30 ${
            !business.slug ? "pointer-events-none opacity-50" : ""
          }`}
        >
          Se din side <ArrowRight className="h-3 w-3" />
        </a>
      </div>

      {/* ─── Sub-nav chips — samme stil som status-filter på Medarbejdere ─── */}
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => scrollToSection(id)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors [&_svg]:h-3.5 [&_svg]:w-3.5 ${
              activeSection === id
                ? "border-border bg-secondary text-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Icon />
            {label}
          </button>
        ))}
      </div>

      {/* ─── CVR Lookup — fuld bredde, øverst ─── */}
      <SectionCard
        title="Automatisk udfyldning fra CVR"
        icon={<Sparkles />}
        description="Indtast CVR-nummer eller virksomhedsnavn for at hente og udfylde alle felter automatisk."
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="CVR-nummer eller virksomhedsnavn..."
            value={cvrQuery}
            onChange={(e) => setCvrQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lookupCvr()}
            className="bg-card h-10 flex-1 rounded-lg"
          />
          <PrimaryButton onClick={lookupCvr} disabled={cvrLoading || !cvrQuery.trim()}>
            {cvrLoading ? "Søger..." : "Søg i CVR"}
          </PrimaryButton>
        </div>
        {cvrError && <p className="text-xs text-destructive">{cvrError}</p>}
        {cvrResult && (
          <div className="rounded-lg border border-border bg-secondary/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{cvrResult.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  CVR: {cvrResult.vat} · {cvrResult.address}, {cvrResult.zipcode} {cvrResult.city}
                </p>
                {cvrResult.phone && <p className="text-xs text-muted-foreground">Tlf: {cvrResult.phone}</p>}
                {cvrResult.email && <p className="text-xs text-muted-foreground">Email: {cvrResult.email}</p>}
              </div>
              <Button size="sm" onClick={applyCvrData} className="shrink-0 h-8 rounded-lg bg-accent text-accent-foreground hover:bg-accent/90 text-xs font-medium">
                Anvend
              </Button>
            </div>
          </div>
        )}
      </SectionCard>

      {/* ─── Hovedindhold: 2-kolonne grid på store skærme ─── */}
      <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
        {/* Generelt */}
        <div id="settings-general" className="scroll-mt-6">
          <SectionCard title="Generelt" icon={<Building2 />} description="Virksomhedsnavn, beskrivelse og brancher.">
            <div className="space-y-4">
              <div>
                <FieldLabel>Virksomhedsnavn</FieldLabel>
                <Input placeholder="Virksomhedsnavn" value={name} onChange={(e) => setName(e.target.value)} className="bg-card h-10 rounded-lg" />
              </div>
              <div>
                <FieldLabel>Beskrivelse</FieldLabel>
                <Textarea placeholder="Hvad gør din virksomhed? Hvad er jeres speciale?" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={500} className="bg-card rounded-lg" />
                <p className="mt-1 text-xs text-muted-foreground">{description.length}/500 tegn</p>
              </div>
              <div>
                <FieldLabel>Brancher</FieldLabel>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleSettingsCategory(c)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-all ${
                        selectedCategories.includes(c)
                          ? "border-foreground bg-foreground/5 shadow-sm"
                          : "border-border bg-card hover:border-foreground/30"
                      }`}
                    >
                      <span className="text-lg">{CATEGORY_ICONS[c] || "📋"}</span>
                      <span className="text-xs font-medium text-foreground">{c}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Kontakt */}
        <div id="settings-contact" className="scroll-mt-6">
          <SectionCard title="Kontakt & adresse" icon={<Contact />} description="Sådan kan kunder få fat i dig.">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Telefon</FieldLabel>
                  <Input placeholder="12 34 56 78" value={phone} onChange={(e) => handlePhoneChange(e.target.value)} className="bg-card h-10 rounded-lg" type="tel" />
                </div>
                <div>
                  <FieldLabel>Email</FieldLabel>
                  <Input placeholder="kontakt@virksomhed.dk" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-card h-10 rounded-lg" type="email" />
                </div>
              </div>
              <div>
                <FieldLabel>Adresse</FieldLabel>
                <Input placeholder="Vejnavn 123" value={address} onChange={(e) => setAddress(e.target.value)} className="bg-card h-10 rounded-lg" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Postnummer</FieldLabel>
                  <div className="relative">
                    <Input placeholder="2100" value={zipCode} onChange={(e) => handleZipChange(e.target.value)} className="bg-card h-10 rounded-lg" maxLength={4} />
                    {zipLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-accent" />
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">By udfyldes automatisk</p>
                </div>
                <div>
                  <FieldLabel>By</FieldLabel>
                  <Input placeholder="København" value={city} onChange={(e) => setCity(e.target.value)} className="bg-card h-10 rounded-lg" />
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Branding */}
        <div id="settings-branding" className="scroll-mt-6">
          <SectionCard title="Branding" icon={<ImageIcon />} description="Logo og coverbillede vises på din virksomhedsside.">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <FieldLabel>Logo</FieldLabel>
                <ImageUpload folder={`${user!.id}/logo`} currentUrl={logoUrl || null} onUploaded={setLogoUrl} label="" aspectRatio="aspect-square" className="w-28" objectFit="contain" />
                <p className="mt-2 text-xs text-muted-foreground">Kvadratisk format anbefales (fx 512×512).</p>
              </div>
              <div>
                <FieldLabel>Coverbillede</FieldLabel>
                <ImageUpload folder={`${user!.id}/cover`} currentUrl={coverUrl || null} onUploaded={setCoverUrl} label="" aspectRatio="aspect-video" className="w-full" />
                <p className="mt-2 text-xs text-muted-foreground">Bredt format (16:9) — vises som banner.</p>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Åbningstider */}
        <div id="settings-hours" className="scroll-mt-6">
          <SectionCard title="Åbningstider" icon={<Clock />} description="Lad felterne stå tomme for at markere som lukket.">
            <div className="space-y-1.5">
              {DAYS.map((day) => {
                const isWeekend = day === "Lørdag" || day === "Søndag";
                const isOpen = !!openHours[day];
                return (
                  <div key={day} className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
                    isOpen ? "border-border bg-secondary/40" : `border-border bg-card ${isWeekend ? "opacity-70" : ""}`
                  }`}>
                    <span className="w-20 text-sm font-medium text-foreground">{day}</span>
                    <Input
                      placeholder={isWeekend ? "Lukket" : "Fx 08:00 - 16:00"}
                      value={openHours[day] || ""}
                      onChange={(e) => setOpenHours({ ...openHours, [day]: e.target.value })}
                      className="flex-1 h-9 text-sm bg-background rounded-lg"
                    />
                    {isOpen && (
                      <button
                        onClick={() => { const h = { ...openHours }; delete h[day]; setOpenHours(h); }}
                        className="text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
                      >
                        Ryd
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>

        {/* Notifikationer — strækker sig over begge kolonner */}
        <div id="settings-notifications" className="scroll-mt-6 xl:col-span-2">
          <SectionCard
            title="Notifikationer"
            icon={<Bell />}
            description="Vælg hvilke hændelser du vil modtage email-varsler om."
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {([
                { key: "new_order",           label: "Nye bestillinger",       desc: "Besked når en kunde opretter en ny bestilling." },
                { key: "upcoming_service",    label: "Kommende services",      desc: "Påmindelse når en abonnements-service skal udføres snart." },
                { key: "subscription_change", label: "Abonnementsændringer",   desc: "Besked når en kunde pauser eller annullerer et abonnement." },
                { key: "new_review",          label: "Nye anmeldelser",        desc: "Besked når en kunde skriver en anmeldelse." },
              ] as const).map(({ key, label, desc }) => (
                <div key={key} className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <ToggleSwitch
                    checked={!!notifSettings[key]}
                    onChange={() => setNotifSettings((prev) => ({ ...prev, [key]: !prev[key] }))}
                  />
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Avanceret — strækker sig over begge kolonner */}
        <div id="settings-advanced" className="scroll-mt-6 xl:col-span-2">
          <SectionCard title="Avanceret" icon={<Settings />} description="Aktivér ekstra funktioner til din virksomhed.">
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card p-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Route className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Ruteplanlægning</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Tilføjer "Medarbejdere"-fanen og giver adgang til ruteplanlæggeren — opret medarbejder-konti og planlæg daglige ruter med stop hos kunder. Kan optimeres med AI baseret på afstand, tidsvinduer og prioriteter.
                  </p>
                </div>
              </div>
              <ToggleSwitch checked={routePlanningEnabled} onChange={() => setRoutePlanningEnabled((v) => !v)} />
            </div>

            {routePlanningEnabled && (
              <div className="mt-4 rounded-lg border border-border bg-card p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Route className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Trafik-buffer pr. område</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Mapbox' rejsetid er tæt på Google Maps, men undervurderer
                      ofte trafikken i Storkøbenhavn og bymidter. Tilføj
                      område-overrides for at finjustere ETA pr. postnummer.
                    </p>
                  </div>
                </div>
                <TrafficOverridesSection businessId={business.id} />
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      {/* Sticky save bar */}
      {hasChanges && (
        <div className="sticky bottom-4 z-20">
          <Card className="rounded-xl border-accent/30 bg-card shadow-lg">
            <CardContent className="flex items-center justify-between gap-3 p-3">
              <p className="text-sm text-muted-foreground">Du har ændringer der ikke er gemt.</p>
              <PrimaryButton onClick={save} disabled={updateBiz.isPending}>
                {updateBiz.isPending ? "Gemmer..." : "Gem ændringer"}
              </PrimaryButton>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SettingsTab;