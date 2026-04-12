import { Sparkles, Wrench, Truck, TreePine, Paintbrush, Droplets, Zap, ShieldCheck } from "lucide-react";

const categories = [
  { icon: Sparkles, label: "Rengøring", count: 124 },
  { icon: Wrench, label: "Håndværker", count: 89 },
  { icon: Truck, label: "Flyttehjælp", count: 56 },
  { icon: TreePine, label: "Haveservice", count: 73 },
  { icon: Paintbrush, label: "Maler", count: 41 },
  { icon: Droplets, label: "VVS", count: 67 },
  { icon: Zap, label: "Elektriker", count: 52 },
  { icon: ShieldCheck, label: "Sikkerhed", count: 31 },
];

const Categories = () => {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="mb-14 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-accent">Udforsk</p>
          <h2 className="text-3xl font-bold text-foreground md:text-4xl">
            Populære kategorier
          </h2>
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {categories.map((cat) => (
            <button
              key={cat.label}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:border-accent/40 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 transition-colors group-hover:bg-accent/20">
                <cat.icon className="h-6 w-6 text-accent" />
              </div>
              <span className="font-semibold text-foreground">{cat.label}</span>
              <span className="text-xs text-muted-foreground">{cat.count} virksomheder</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Categories;
