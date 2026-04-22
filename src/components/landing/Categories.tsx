import { ArrowRight, Sparkles, Wrench, Truck, TreePine, Paintbrush, Droplets, Zap, ShieldCheck, Hammer, Home as HomeIcon } from "lucide-react";
import { Link } from "react-router-dom";
import HorizontalScroller from "./HorizontalScroller";

const categories = [
  { icon: Sparkles, label: "Rengøring", desc: "Privat & erhverv" },
  { icon: Wrench, label: "Håndværker", desc: "Små og store opgaver" },
  { icon: Truck, label: "Flyttehjælp", desc: "Flytning & tunge løft" },
  { icon: TreePine, label: "Haveservice", desc: "Klipning, rydning, pleje" },
  { icon: Paintbrush, label: "Maler", desc: "Inde og ude" },
  { icon: Droplets, label: "VVS", desc: "Akut & planlagt" },
  { icon: Zap, label: "Elektriker", desc: "Installation & reparation" },
  { icon: ShieldCheck, label: "Sikkerhed", desc: "Låse, alarm, adgang" },
  { icon: Hammer, label: "Tømrer", desc: "Montering & byg" },
  { icon: HomeIcon, label: "Boligservice", desc: "Hjælp i hjemmet" },
];

const featuredCategories = categories.slice(0, 4);
const moreCategories = categories.slice(4);
const leadCategory = featuredCategories[0];
const supportCategories = featuredCategories.slice(1);

const Categories = () => {
  return (
    <section className="bg-background py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 md:mb-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Kategorier</div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">Start dér hvor behovet er tydeligt</h2>
          </div>
          <Link to="/virksomheder" className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-secondary">
            Se alle virksomheder
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="hidden gap-5 md:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <Link
              to={`/search?category=${encodeURIComponent(leadCategory.label)}`}
              className="group flex min-h-[430px] flex-col justify-between overflow-hidden rounded-[32px] border border-border bg-card p-6 shadow-sm transition-all hover:border-foreground/20 hover:shadow-md"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-secondary text-foreground">
                <leadCategory.icon className="h-6 w-6" />
              </div>
              <div className="space-y-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Mest valgt</div>
                <div className="text-3xl font-semibold tracking-tight text-foreground">{leadCategory.label}</div>
                <p className="max-w-[26ch] text-base leading-7 text-muted-foreground">{leadCategory.desc} med hurtig adgang til de mest relevante profiler.</p>
                <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                  Udforsk kategori
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {supportCategories.map((cat) => (
              <Link
                key={cat.label}
                to={`/search?category=${encodeURIComponent(cat.label)}`}
                className="group flex min-h-[132px] flex-col justify-between overflow-hidden rounded-[28px] border border-border bg-card p-5 shadow-sm transition-all hover:border-foreground/20 hover:bg-secondary hover:shadow-md"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-foreground transition-colors group-hover:bg-background">
                  <cat.icon className="h-5 w-5" />
                </div>
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Kategori</div>
                  <div className="text-lg font-semibold text-foreground">{cat.label}</div>
                  <div className="max-w-[24ch] text-sm text-muted-foreground">{cat.desc}</div>
                  <div className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
                    Se muligheder
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="rounded-[28px] border border-border bg-secondary/60 p-5 shadow-sm">
            <div className="mb-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Flere muligheder</div>
              <div className="mt-2 text-lg font-semibold text-foreground">Populære kategorier lige ved hånden</div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {moreCategories.map((cat) => (
                <Link
                  key={cat.label}
                  to={`/search?category=${encodeURIComponent(cat.label)}`}
                  className="group flex items-center gap-3 rounded-2xl border border-border bg-background px-3 py-3 transition-colors hover:bg-card"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground transition-colors group-hover:bg-card">
                    <cat.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{cat.label}</div>
                    <div className="truncate text-xs text-muted-foreground">{cat.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="md:hidden">
          <HorizontalScroller>
            {categories.map((cat) => (
            <Link
              key={cat.label}
              to={`/search?category=${encodeURIComponent(cat.label)}`}
                className="group flex w-[208px] shrink-0 flex-col items-start gap-4 rounded-[24px] border border-border bg-card p-4 shadow-sm transition-all hover:border-foreground/20 hover:shadow-md"
            >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-foreground transition-colors group-hover:bg-foreground group-hover:text-background">
                <cat.icon className="h-5 w-5" />
              </div>
              <div>
                  <div className="text-sm font-semibold text-foreground">{cat.label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{cat.desc}</div>
              </div>
            </Link>
            ))}
          </HorizontalScroller>
        </div>
      </div>
    </section>
  );
};

export default Categories;
