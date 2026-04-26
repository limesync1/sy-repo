import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Check, Sparkles, Users, Route, Calculator,
  Database, UploadCloud, Building2, ShieldCheck, Loader2, Mail, Lock,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateBusiness } from "@/hooks/useDatabase";
import { INDUSTRY_GROUPS, findIndustry } from "@/lib/service-taxonomy";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * BusinessOnboarding — flertrins-flow til nye virksomheder.
 *
 * Inspireret af layoutet på fx skvizbiz.dk/priser, hvor man først konfigurerer
 * sin pakke og dernæst færdiggør oprettelsen. Vi opdeler i fire trin:
 *  1) Velkommen — kort intro og forventningsafstemning.
 *  2) Virksomhed — navn, brancher og beskrivelse.
 *  3) Funktioner — vælg de moduler virksomheden vil bruge fra dag ét.
 *  4) Forventet skala — kundetal og dataimport, så vi kan forberede onboarding.
 *
 * Alle valgte funktioner gemmes i `businesses.settings.onboarding` samt på
 * de eksisterende feature-flags (`route_planning_enabled`,
 * `accounting_integration_enabled`), så Indstillinger → Avanceret afspejler
 * valgene med det samme. Brugeren kan altid ændre dem senere.
 */

type FeatureKey =
  | "route_planning"
  | "extra_employee_logins"
  | "accounting_integration"
  | "data_import";

type CustomerScale = "lt_25" | "25_100" | "100_500" | "gt_500" | "unsure";

const FEATURES: { key: FeatureKey; icon: typeof Route; title: string; description: string }[] = [
  {
    key: "route_planning",
    icon: Route,
    title: "Ruteplanlægning",
    description:
      "Planlæg medarbejdernes daglige ruter automatisk og optimér rækkefølgen baseret på afstand, tidsvinduer og prioriteter.",
  },
  {
    key: "extra_employee_logins",
    icon: Users,
    title: "Ekstra medarbejderlogins",
    description:
      "Giv hver medarbejder sit eget login med adgang til ruter, opgaver og tidsregistrering på mobilen.",
  },
  {
    key: "accounting_integration",
    icon: Calculator,
    title: "Integration med regnskabsprogram",
    description:
      "Synkronisér automatisk fakturaer og betalinger med fx e-conomic, Dinero eller Billy, så bogføringen passer hver gang.",
  },
  {
    key: "data_import",
    icon: UploadCloud,
    title: "Importér data fra dit nuværende system",
    description:
      "Få hjælp til at flytte kunder, services og igangværende abonnementer fra dit gamle system, så du kan komme i gang uden manuelt arbejde.",
  },
];

const SCALES: { key: CustomerScale; label: string; hint: string }[] = [
  { key: "lt_25",   label: "Færre end 25 kunder",  hint: "Lige startet eller mindre kundeportefølje." },
  { key: "25_100",  label: "25 – 100 kunder",      hint: "Etableret virksomhed med fast kundekreds." },
  { key: "100_500", label: "100 – 500 kunder",     hint: "Voksende drift med flere medarbejdere." },
  { key: "gt_500",  label: "Mere end 500 kunder",  hint: "Større organisation – vi hjælper med opsætningen." },
  { key: "unsure",  label: "Ved ikke endnu",       hint: "Vi tager den løbende — ingen forventninger fra start." },
];

const BASE_STEPS = [
  { id: "welcome",  label: "Velkommen" },
  { id: "details",  label: "Virksomhed" },
  { id: "features", label: "Funktioner" },
  { id: "scale",    label: "Forventet skala" },
] as const;
const ACCOUNT_STEP = { id: "account", label: "Opret konto" } as const;
type StepId = "welcome" | "details" | "features" | "scale" | "account";

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9æøå]+/g, "-").replace(/^-|-$/g, "");

const BusinessOnboarding = () => {
  const { user, signUp } = useAuth();
  const createBiz = useCreateBusiness();
  const navigate = useNavigate();

  // Når brugeren ikke er logget ind, viser vi også et sidste trin "Opret konto",
  // så virksomheder først konfigurerer deres setup og derefter opretter loginet.
  const STEPS = useMemo(
    () => (user ? [...BASE_STEPS] : [...BASE_STEPS, ACCOUNT_STEP]),
    [user]
  );

  // ─── Step state ───
  const [stepIdx, setStepIdx] = useState(0);
  const step: StepId = STEPS[stepIdx].id;

  // ─── Form state ───
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [features, setFeatures] = useState<Record<FeatureKey, boolean>>({
    route_planning: false,
    extra_employee_logins: false,
    accounting_integration: false,
    data_import: false,
  });
  const [scale, setScale] = useState<CustomerScale | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);

  const toggleCategory = (k: string) => {
    setSelectedCategories((prev) =>
      prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]
    );
  };
  const toggleFeature = (k: FeatureKey) =>
    setFeatures((prev) => ({ ...prev, [k]: !prev[k] }));

  // ─── Validation pr. trin ───
  const canContinue = useMemo(() => {
    if (step === "details") return name.trim().length > 0 && selectedCategories.length > 0;
    if (step === "scale") return !!scale;
    if (step === "account") return email.trim().length > 3 && password.length >= 6;
    return true; // welcome + features kan altid gå videre
  }, [step, name, selectedCategories, scale, email, password]);

  const goNext = () => {
    if (!canContinue) return;
    if (stepIdx < STEPS.length - 1) setStepIdx(stepIdx + 1);
    else handleCreate();
  };
  const goBack = () => stepIdx > 0 && setStepIdx(stepIdx - 1);

  // ─── Final create ───
  const buildBusinessPayload = (ownerId: string) => {
    const trimmedName = name.trim();
    return {
      name: trimmedName,
      slug: slugify(trimmedName),
      description: description.trim() || null,
      owner_id: ownerId,
      category: selectedCategories[0] || null,
      categories: selectedCategories,
      // Feature-flags afspejles direkte i Indstillinger → Avanceret.
      settings: {
        route_planning_enabled: features.route_planning,
        accounting_integration_enabled: features.accounting_integration,
        onboarding: {
          completed_at: new Date().toISOString(),
          extra_employee_logins: features.extra_employee_logins,
          data_import_requested: features.data_import,
          expected_customer_scale: scale,
        },
      },
    } as any;
  };

  const handleCreate = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Indtast et virksomhedsnavn");
      setStepIdx(1);
      return;
    }
    if (selectedCategories.length === 0) {
      toast.error("Vælg mindst én branche");
      setStepIdx(1);
      return;
    }

    // 1) Bruger allerede logget ind — opret bare virksomheden direkte.
    if (user) {
      createBiz.mutate(buildBusinessPayload(user.id), {
        onSuccess: () => toast.success("Velkommen ombord! Din virksomhed er oprettet."),
        onError: (e: any) => toast.error(e?.message || "Kunne ikke oprette virksomhed"),
      });
      return;
    }

    // 2) Public flow — opret kontoen først, derefter virksomheden.
    if (!email.trim() || password.length < 6) {
      toast.error("Udfyld e-mail og en adgangskode på mindst 6 tegn");
      return;
    }
    setCreatingAccount(true);
    try {
      const { error: signUpError } = await signUp(email.trim(), password);
      if (signUpError) throw signUpError;

      // Hvis e-mail-bekræftelse er slået til, har vi ikke en session endnu.
      // Vent kort på onAuthStateChange — ellers beder vi brugeren bekræfte mailen.
      const { data: sessionData } = await supabase.auth.getSession();
      let activeUserId = sessionData.session?.user.id;
      if (!activeUserId) {
        // Forsøg login (auto-confirm sandsynligvis aktiveret).
        const { data: signInData } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        activeUserId = signInData.session?.user.id;
      }

      if (!activeUserId) {
        toast.success("Konto oprettet! Tjek din e-mail og log derefter ind for at færdiggøre opsætningen.");
        navigate("/log-ind?mode=business");
        return;
      }

      const { error: bizError } = await supabase
        .from("businesses")
        .insert(buildBusinessPayload(activeUserId));
      if (bizError) throw bizError;

      toast.success("Velkommen ombord! Din virksomhed er oprettet.");
      navigate("/virksomhed");
    } catch (e: any) {
      toast.error(e?.message || "Kunne ikke oprette konto");
    } finally {
      setCreatingAccount(false);
    }
  };

  const isLastStep = stepIdx === STEPS.length - 1;
  const progress = Math.round(((stepIdx + 1) / STEPS.length) * 100);

  return (
    <div className="min-h-screen bg-secondary/40">
      {/* Topbar */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-foreground">Opret din virksomhed</span>
          </Link>
          <span className="text-xs font-medium text-muted-foreground tabular-nums">
            Trin {stepIdx + 1} af {STEPS.length}
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-1 w-full bg-secondary">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Step indicators */}
        <ol className="mb-8 hidden items-center justify-between gap-2 sm:flex">
          {STEPS.map((s, i) => {
            const done = i < stepIdx;
            const active = i === stepIdx;
            return (
              <li key={s.id} className="flex flex-1 items-center gap-3">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    done
                      ? "bg-accent text-accent-foreground"
                      : active
                        ? "bg-foreground text-background"
                        : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span
                  className={`truncate text-xs font-medium ${
                    active ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <span className="ml-1 hidden h-px flex-1 bg-border md:block" />
                )}
              </li>
            );
          })}
        </ol>

        <Card className="rounded-2xl border-border shadow-sm">
          <CardContent className="p-6 sm:p-8">
            {step === "welcome" && <WelcomeStep />}
            {step === "details" && (
              <DetailsStep
                name={name}
                setName={setName}
                description={description}
                setDescription={setDescription}
                selectedCategories={selectedCategories}
                toggleCategory={toggleCategory}
              />
            )}
            {step === "features" && (
              <FeaturesStep features={features} toggleFeature={toggleFeature} />
            )}
            {step === "scale" && (
              <ScaleStep scale={scale} setScale={setScale} />
            )}
            {step === "account" && (
              <AccountStep
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
              />
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={goBack}
            disabled={stepIdx === 0 || createBiz.isPending || creatingAccount}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Tilbage
          </Button>
          <Button
            type="button"
            onClick={goNext}
            disabled={!canContinue || createBiz.isPending || creatingAccount}
            className="h-11 gap-2 rounded-xl bg-foreground px-6 text-sm font-semibold text-background hover:bg-foreground/90 sm:w-auto"
          >
            {(createBiz.isPending || creatingAccount) ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Opretter…
              </>
            ) : isLastStep ? (
              <>
                {user ? "Opret virksomhed" : "Opret konto & virksomhed"}
                <Check className="h-4 w-4" />
              </>
            ) : (
              <>
                Fortsæt
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {!user && (
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Har du allerede en konto?{" "}
            <Link to="/log-ind?mode=business" className="font-medium text-foreground hover:underline">
              Log ind
            </Link>
          </p>
        )}
      </main>
    </div>
  );
};

/* ─────────────────────────── Step components ─────────────────────────── */

const WelcomeStep = () => (
  <div className="text-center">
    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
      <Sparkles className="h-7 w-7 text-accent" />
    </div>
    <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
      Velkommen til Serviceydere
    </h1>
    <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground sm:text-base">
      Vi guider dig igennem få trin, så du kan vælge nøjagtigt hvilke funktioner
      du har brug for fra start. Du kan altid justere dine valg senere i
      indstillingerne.
    </p>

    <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">
      {[
        { icon: Building2, title: "Profil",      text: "Navn og brancher" },
        { icon: Sparkles,  title: "Funktioner",  text: "Vælg dine moduler" },
        { icon: ShieldCheck, title: "Klar",      text: "Kom i gang med det samme" },
      ].map(({ icon: Icon, title, text }) => (
        <div key={title} className="rounded-xl border border-border bg-secondary/40 p-4">
          <Icon className="h-4 w-4 text-accent" />
          <p className="mt-2 text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{text}</p>
        </div>
      ))}
    </div>
  </div>
);

const DetailsStep = ({
  name, setName, description, setDescription,
  selectedCategories, toggleCategory,
}: {
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  selectedCategories: string[];
  toggleCategory: (k: string) => void;
}) => (
  <div className="space-y-5">
    <div>
      <h2 className="text-xl font-semibold text-foreground sm:text-2xl">Fortæl os om din virksomhed</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Disse oplysninger vises på din offentlige profil. Du kan altid redigere dem senere.
      </p>
    </div>

    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Virksomhedsnavn</label>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Fx Nordic Service ApS"
        className="h-11"
      />
    </div>

    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
        Kort beskrivelse <span className="text-muted-foreground/60">(valgfrit)</span>
      </label>
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Hvad gør jeres virksomhed unik? Hvilke kunder hjælper I oftest?"
        className="min-h-[100px] resize-none"
      />
    </div>

    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
        Vælg en eller flere brancher
      </label>
      <p className="mb-2 text-xs text-muted-foreground/80">
        Vi bruger brancherne til at matche jer med relevante kunder.
      </p>
      <div className="max-h-[300px] space-y-3 overflow-y-auto rounded-xl border border-border bg-secondary/30 p-3">
        {INDUSTRY_GROUPS.map((g) => (
          <div key={g.label}>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {g.label}
            </p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {g.industries.map((ind) => {
                const active = selectedCategories.includes(ind.key);
                return (
                  <button
                    key={ind.key}
                    type="button"
                    onClick={() => toggleCategory(ind.key)}
                    className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left transition-all ${
                      active
                        ? "border-foreground bg-foreground/5 shadow-sm"
                        : "border-border bg-card hover:border-foreground/30"
                    }`}
                  >
                    <span className="text-base leading-none">{ind.icon}</span>
                    <span className="truncate text-xs font-medium text-foreground">{ind.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {selectedCategories.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Valgt: {selectedCategories.map((k) => findIndustry(k)?.label || k).join(", ")}
        </p>
      )}
    </div>
  </div>
);

const FeaturesStep = ({
  features, toggleFeature,
}: {
  features: Record<FeatureKey, boolean>;
  toggleFeature: (k: FeatureKey) => void;
}) => (
  <div className="space-y-5">
    <div>
      <h2 className="text-xl font-semibold text-foreground sm:text-2xl">Vælg dine funktioner</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Slå de moduler til, som passer til jeres arbejdsgange. Du kan altid
        ændre dine valg senere under <span className="font-medium text-foreground">Indstillinger → Avanceret</span>.
      </p>
    </div>

    <div className="grid gap-3">
      {FEATURES.map(({ key, icon: Icon, title, description }) => {
        const active = features[key];
        return (
          <button
            type="button"
            key={key}
            onClick={() => toggleFeature(key)}
            className={`group flex items-start gap-4 rounded-xl border p-4 text-left transition-all ${
              active
                ? "border-accent bg-accent/5 shadow-sm"
                : "border-border bg-card hover:border-foreground/20"
            }`}
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
                active ? "bg-accent text-accent-foreground" : "bg-secondary text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
            </div>
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                active ? "border-accent bg-accent text-accent-foreground" : "border-border bg-card"
              }`}
              aria-hidden
            >
              {active && <Check className="h-3.5 w-3.5" />}
            </span>
          </button>
        );
      })}
    </div>

    <div className="flex items-start gap-3 rounded-xl bg-secondary/60 p-4 text-xs text-muted-foreground">
      <Database className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
      <p>
        Nogle funktioner som <span className="font-medium text-foreground">regnskabsintegration</span> er stadig
        under udvikling — du kan slå dem til nu, og vi aktiverer dem automatisk for dig, så snart de er klar.
      </p>
    </div>
  </div>
);

const ScaleStep = ({
  scale, setScale,
}: {
  scale: CustomerScale | null;
  setScale: (s: CustomerScale) => void;
}) => (
  <div className="space-y-5">
    <div>
      <h2 className="text-xl font-semibold text-foreground sm:text-2xl">Hvor mange kunder forventer I?</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Hjælper os med at forberede den rigtige opsætning. Du kan altid skalere op eller ned senere.
      </p>
    </div>

    <div className="grid gap-2">
      {SCALES.map((s) => {
        const active = scale === s.key;
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => setScale(s.key)}
            className={`flex items-center justify-between gap-4 rounded-xl border p-4 text-left transition-all ${
              active
                ? "border-foreground bg-foreground/5 shadow-sm"
                : "border-border bg-card hover:border-foreground/20"
            }`}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{s.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.hint}</p>
            </div>
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                active ? "border-foreground bg-foreground" : "border-border"
              }`}
              aria-hidden
            >
              {active && <span className="h-2 w-2 rounded-full bg-background" />}
            </span>
          </button>
        );
      })}
    </div>
  </div>
);

export default BusinessOnboarding;