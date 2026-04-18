import { Sparkles, Wrench, Truck, TreePine, Paintbrush, Droplets, Zap, ShieldCheck, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

const categories = [
  { icon: Sparkles, label: "Rengøring", desc: "Privat & erhverv", size: "large" },
  { icon: Wrench, label: "Håndværker", desc: "Reparationer", size: "small" },
  { icon: Truck, label: "Flyttehjælp", desc: "Hele Danmark", size: "small" },
  { icon: TreePine, label: "Haveservice", desc: "Året rundt", size: "medium" },
  { icon: Paintbrush, label: "Maler", desc: "Indvendigt & udvendigt", size: "medium" },
  { icon: Droplets, label: "VVS", desc: "Akut & planlagt", size: "small" },
  { icon: Zap, label: "Elektriker", desc: "Aut. installatører", size: "small" },
  { icon: ShieldCheck, label: "Sikkerhed", desc: "Alarm & overvågning", size: "large" },
];

const sizeClasses: Record<string, string> = {
  large: "md:col-span-2 md:row-span-2 min-h-[280px]",
  medium: "md:col-span-2 min-h-[180px]",
  small: "min-h-[180px]",
};

const Categories = () => {
  return (
    <section className="relative border-t border-border bg-secondary/40 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-accent">Udforsk</p>
            <h2 className="text-4xl font-extrabold leading-[0.95] tracking-tight text-foreground md:text-6xl">
              Alt under<br />
              <span className="text-muted-foreground">ét tag.</span>
            </h2>
          </div>
          <Link to="/search" className="group inline-flex items-center gap-2 text-sm font-semibold text-foreground">
            Se alle kategorier
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:auto-rows-[180px]">
          {categories.map((cat) => (
            <Link
              key={cat.label}
              to={`/search?category=${encodeURIComponent(cat.label)}`}
              className={`group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-foreground/20 hover:shadow-xl ${sizeClasses[cat.size]}`}
            >
              <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-accent/0 blur-2xl transition-all duration-500 group-hover:bg-accent/20" />
              <div className="relative flex h-full flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-foreground text-background transition-transform group-hover:scale-110">
                    <cat.icon className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
                </div>
                <div>
                  <div className={`font-bold tracking-tight text-foreground ${cat.size === "large" ? "text-2xl md:text-3xl" : "text-lg"}`}>
                    {cat.label}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{cat.desc}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Categories;
