import { ArrowRight, Sparkles, Wrench, Truck, TreePine, Paintbrush, Droplets, Zap, ShieldCheck, Hammer, Home as HomeIcon } from "lucide-react";
import { Link } from "react-router-dom";
import HorizontalScroller from "./HorizontalScroller";

const categories = [
  { icon: Sparkles, label: "Rengøring", desc: "Privat & erhverv", tone: "bg-feature-cool text-feature-cool-foreground" },
  { icon: Wrench, label: "Håndværker", desc: "Små og store opgaver", tone: "bg-feature-warm text-feature-warm-foreground" },
  { icon: Truck, label: "Flyttehjælp", desc: "Flytning & tunge løft", tone: "bg-feature-lilac text-feature-lilac-foreground" },
  { icon: TreePine, label: "Haveservice", desc: "Klipning, rydning, pleje", tone: "bg-accent-soft text-accent" },
  { icon: Paintbrush, label: "Maler", desc: "Inde og ude", tone: "bg-secondary text-foreground" },
  { icon: Droplets, label: "VVS", desc: "Akut & planlagt", tone: "bg-feature-cool text-feature-cool-foreground" },
  { icon: Zap, label: "Elektriker", desc: "Installation & reparation", tone: "bg-feature-warm text-feature-warm-foreground" },
  { icon: ShieldCheck, label: "Sikkerhed", desc: "Låse, alarm, adgang", tone: "bg-feature-lilac text-feature-lilac-foreground" },
  { icon: Hammer, label: "Tømrer", desc: "Montering & byg", tone: "bg-secondary text-foreground" },
  { icon: HomeIcon, label: "Boligservice", desc: "Hjælp i hjemmet", tone: "bg-accent-soft text-accent" },
];

const Categories = () => {
  return (
    <section className="bg-background py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.74fr)_minmax(0,1.26fr)] lg:items-start">
          <div className="surface-panel rounded-[30px] border border-border p-6 shadow-panel md:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Populære serviceområder
            </div>
            <h2 className="mt-4 text-3xl leading-tight text-foreground md:text-[2.6rem]">
              Start med det, du skal have løst.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground md:text-base">
              De mest brugte kategorier er prioriteret først, så forsiden føles som et godt overblik frem for en lang liste.
            </p>
            <div className="mt-6 space-y-3">
              <div className="rounded-2xl bg-card p-4 shadow-sm">
                <div className="text-sm font-semibold text-foreground">Direkte søgning</div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Find virksomheder med det samme, hvis du allerede ved hvad du leder efter.</p>
              </div>
              <div className="rounded-2xl bg-card p-4 shadow-sm">
                <div className="text-sm font-semibold text-foreground">Tilbudsspor</div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Vælg tilbudsflowet når opgaven er større, eller du vil sammenligne flere muligheder.</p>
              </div>
            </div>
            <Link to="/virksomheder" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-foreground transition-opacity hover:opacity-75">
              Se alle virksomheder
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="hidden grid-cols-2 gap-4 md:grid xl:grid-cols-3">
            {categories.map((cat, index) => (
              <Link
                key={cat.label}
                to={`/search?category=${encodeURIComponent(cat.label)}`}
                className={`group flex min-h-[180px] flex-col justify-between rounded-[26px] border border-border p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-panel ${index < 2 ? "xl:col-span-1" : ""} ${index === 0 ? "xl:row-span-2 min-h-[376px]" : ""} ${cat.tone}`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-background/50 bg-background/70 shadow-sm">
                  <cat.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-lg font-semibold">{cat.label}</div>
                  <div className="mt-1 text-sm opacity-80">{cat.desc}</div>
                  <div className="mt-5 inline-flex items-center gap-1 text-sm font-semibold">
                    Se muligheder
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="md:hidden">
            <HorizontalScroller>
              {categories.map((cat) => (
                <Link
                  key={cat.label}
                  to={`/search?category=${encodeURIComponent(cat.label)}`}
                  className={`flex w-[210px] shrink-0 flex-col gap-6 rounded-[24px] border border-border p-4 shadow-sm ${cat.tone}`}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-background/50 bg-background/75">
                    <cat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-base font-semibold">{cat.label}</div>
                    <div className="mt-1 text-sm opacity-80">{cat.desc}</div>
                  </div>
                </Link>
              ))}
            </HorizontalScroller>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Categories;
