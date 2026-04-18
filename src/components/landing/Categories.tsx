import { Sparkles, Wrench, Truck, TreePine, Paintbrush, Droplets, Zap, ShieldCheck, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const categories = [
  { icon: Sparkles, label: "Rengøring", desc: "Privat & erhverv" },
  { icon: Wrench, label: "Håndværker", desc: "Reparationer" },
  { icon: Truck, label: "Flyttehjælp", desc: "Hele Danmark" },
  { icon: TreePine, label: "Haveservice", desc: "Året rundt" },
  { icon: Paintbrush, label: "Maler", desc: "Ind- & udvendigt" },
  { icon: Droplets, label: "VVS", desc: "Akut & planlagt" },
  { icon: Zap, label: "Elektriker", desc: "Aut. installatører" },
  { icon: ShieldCheck, label: "Sikkerhed", desc: "Alarm & overvågning" },
];

const Categories = () => {
  return (
    <section className="bg-background py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
              Udforsk kategorier
            </h2>
            <p className="mt-2 text-base text-muted-foreground">Find lige det, du har brug for.</p>
          </div>
          <Link to="/search" className="group inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
            Se alle
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {categories.map((cat) => (
            <Link
              key={cat.label}
              to={`/search?category=${encodeURIComponent(cat.label)}`}
              className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground transition-colors group-hover:bg-accent/10 group-hover:text-accent">
                <cat.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-foreground">{cat.label}</div>
                <div className="truncate text-xs text-muted-foreground">{cat.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Categories;
