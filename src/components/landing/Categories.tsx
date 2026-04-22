import { ArrowRight, Wrench, Truck, TreePine, Paintbrush, Droplets, Zap, ShieldCheck, Hammer, Home as HomeIcon } from "lucide-react";
import { Link } from "react-router-dom";
import HorizontalScroller from "./HorizontalScroller";

const categories = [
  { icon: HomeIcon, label: "Rengøring", tone: "bg-feature-cool text-feature-cool-foreground" },
  { icon: Wrench, label: "Håndværker", tone: "bg-feature-warm text-feature-warm-foreground" },
  { icon: Truck, label: "Flyttehjælp", tone: "bg-feature-lilac text-feature-lilac-foreground" },
  { icon: TreePine, label: "Haveservice", tone: "bg-accent-soft text-accent" },
  { icon: Paintbrush, label: "Maler", tone: "bg-secondary text-foreground" },
  { icon: Droplets, label: "VVS", tone: "bg-secondary text-foreground" },
  { icon: Zap, label: "Elektriker", tone: "bg-secondary text-foreground" },
  { icon: ShieldCheck, label: "Sikkerhed", tone: "bg-secondary text-foreground" },
  { icon: Hammer, label: "Tømrer", tone: "bg-secondary text-foreground" },
  { icon: HomeIcon, label: "Boligservice", tone: "bg-secondary text-foreground" },
];

const Categories = () => {
  return (
    <section className="bg-background py-12 md:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Start med det, du skal have løst.</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground md:text-base">De mest brugte kategorier først.</p>
          </div>
          <Link to="/virksomheder" className="inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:opacity-70">
            Se alle virksomheder
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="hidden grid-cols-2 gap-3 md:grid lg:grid-cols-5">
          {categories.map((cat) => (
            <Link
              key={cat.label}
              to={`/search?category=${encodeURIComponent(cat.label)}`}
              className={`group flex min-h-[132px] flex-col justify-between rounded-[22px] border border-border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${cat.tone}`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-background/40 bg-background/80">
                <cat.icon className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="text-sm font-semibold">{cat.label}</div>
                <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium opacity-75">
                  Se muligheder
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
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
                className={`flex w-[156px] shrink-0 flex-col gap-5 rounded-[20px] border border-border p-4 shadow-sm ${cat.tone}`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-background/40 bg-background/75">
                  <cat.icon className="h-4.5 w-4.5" />
                </div>
                <div className="text-sm font-semibold">{cat.label}</div>
              </Link>
            ))}
          </HorizontalScroller>
        </div>
      </div>
    </section>
  );
};

export default Categories;
