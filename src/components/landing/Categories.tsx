import { Sparkles, Wrench, Truck, TreePine, Paintbrush, Droplets, Zap, ShieldCheck, Hammer, Home as HomeIcon } from "lucide-react";
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

const Categories = () => {
  return (
    <section className="bg-background py-10 md:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 md:mb-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Vælg en kategori</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground md:text-base">Start der, hvor dit behov er mest tydeligt.</p>
          </div>
            <p className="text-sm font-medium text-muted-foreground">Populære valg</p>
        </div>

        <div className="hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-5">
          {categories.map((cat) => (
            <Link
              key={cat.label}
              to={`/search?category=${encodeURIComponent(cat.label)}`}
              className="group flex min-h-[152px] flex-col items-start justify-between rounded-2xl border border-border bg-card p-5 transition-all hover:border-foreground/20 hover:bg-secondary hover:shadow-sm"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-foreground transition-colors group-hover:bg-background">
                <cat.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base font-semibold text-foreground">{cat.label}</div>
                <div className="mt-1 text-sm text-muted-foreground">{cat.desc}</div>
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
                className="group flex w-[180px] shrink-0 flex-col items-start gap-4 rounded-2xl border border-border bg-card p-4 transition-all hover:border-foreground/20 hover:shadow-sm"
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
