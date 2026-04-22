import {
  ArrowRight,
  Sparkles,
  Wrench,
  Truck,
  TreePine,
  Paintbrush,
  Droplets,
  Zap,
  ShieldCheck,
  Hammer,
  Home as HomeIcon,
} from "lucide-react";
import { Link } from "react-router-dom";

const categories = [
  {
    icon: Sparkles,
    label: "Rengøring",
    desc: "Privat, erhverv og faste aftaler",
    meta: "Mest søgt",
  },
  {
    icon: Wrench,
    label: "Håndværker",
    desc: "Reparationer, montering og større projekter",
    meta: "Bolig & erhverv",
  },
  {
    icon: Truck,
    label: "Flyttehjælp",
    desc: "Flytning, bæring og transport",
    meta: "Hurtig koordinering",
  },
  {
    icon: TreePine,
    label: "Haveservice",
    desc: "Klipning, rydning og udendørs pleje",
    meta: "Sæsonopgaver",
  },
  {
    icon: Paintbrush,
    label: "Maler",
    desc: "Inde, ude og løbende vedligehold",
    meta: "Synligt resultat",
  },
  {
    icon: Droplets,
    label: "VVS",
    desc: "Akut hjælp og planlagte opgaver",
    meta: "Akut & planlagt",
  },
  {
    icon: Zap,
    label: "Elektriker",
    desc: "Installationer og fejlfinding",
    meta: "Autoriserede valg",
  },
  {
    icon: ShieldCheck,
    label: "Sikkerhed",
    desc: "Låse, alarm og adgangsløsninger",
    meta: "Tryghed",
  },
  {
    icon: Hammer,
    label: "Tømrer",
    desc: "Montering, byg og specialopgaver",
    meta: "Småt og stort",
  },
  {
    icon: HomeIcon,
    label: "Boligservice",
    desc: "Praktisk hjælp i hverdagen",
    meta: "Til hjemmet",
  },
];

const Categories = () => {
  const lead = categories[0];
  const topGrid = categories.slice(1, 5);
  const bottomList = categories.slice(5);

  return (
    <section className="bg-secondary/45 py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)] lg:gap-10">
          <div className="lg:pr-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Kategorier
            </div>
            <h2 className="mt-3 max-w-sm text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Vælg indgangen efter opgaven, ikke efter støjen.
            </h2>
            <p className="mt-4 max-w-md text-base leading-7 text-muted-foreground">
              De største behov står først, og resten ligger tæt nok på til, at
              du hurtigt kan skifte retning uden at miste overblikket.
            </p>
            <Link
              to="/virksomheder"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-foreground transition-opacity hover:opacity-80"
            >
              Se alle virksomheder
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="space-y-4">
            <Link
              to={`/search?category=${encodeURIComponent(lead.label)}`}
              className="group grid overflow-hidden rounded-[36px] border border-border bg-background shadow-sm transition-all hover:shadow-md lg:grid-cols-[minmax(0,0.95fr)_minmax(260px,0.55fr)]"
            >
              <div className="flex flex-col justify-between px-6 py-6 sm:px-7 sm:py-7">
                <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-secondary text-foreground">
                  <lead.icon className="h-6 w-6" />
                </div>
                <div className="mt-10">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Udvalgt kategori
                  </div>
                  <div className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                    {lead.label}
                  </div>
                  <p className="mt-3 max-w-[30ch] text-base leading-7 text-muted-foreground">
                    {lead.desc} med stærke profiler og hurtig sammenligning.
                  </p>
                </div>
              </div>
              <div className="grid gap-px bg-border">
                <div className="bg-secondary px-6 py-5">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Bruges til
                  </div>
                  <div className="mt-2 text-sm font-semibold text-foreground">
                    Engangsopgaver, faste besøg og større aftaler
                  </div>
                </div>
                <div className="bg-background px-6 py-5">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Fordel
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                    Gå direkte til relevante profiler
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            </Link>

            <div className="grid gap-4 md:grid-cols-2">
              {topGrid.map((cat) => (
                <Link
                  key={cat.label}
                  to={`/search?category=${encodeURIComponent(cat.label)}`}
                  className="group rounded-[28px] border border-border bg-background px-5 py-5 shadow-sm transition-all hover:bg-card hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-foreground">
                      <cat.icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                      {cat.meta}
                    </span>
                  </div>
                  <div className="mt-8">
                    <div className="text-lg font-semibold text-foreground">
                      {cat.label}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {cat.desc}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            <div className="grid gap-px overflow-hidden rounded-[28px] border border-border bg-border bg-background shadow-sm sm:grid-cols-2 xl:grid-cols-3">
              {bottomList.map((cat) => (
                <Link
                  key={cat.label}
                  to={`/search?category=${encodeURIComponent(cat.label)}`}
                  className="group flex items-center gap-3 bg-background px-4 py-4 transition-colors hover:bg-secondary"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground transition-colors group-hover:bg-background">
                    <cat.icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">
                      {cat.label}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {cat.meta}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Categories;
