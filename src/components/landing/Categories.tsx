import { Sparkles, Wrench, Truck, TreePine, Paintbrush, Droplets, Zap, ShieldCheck, Hammer, Home as HomeIcon } from "lucide-react";
import { Link } from "react-router-dom";
import HorizontalScroller from "./HorizontalScroller";

const categories = [
  { icon: Sparkles, label: "Rengøring", desc: "1.240+ udbydere" },
  { icon: Wrench, label: "Håndværker", desc: "890+ udbydere" },
  { icon: Truck, label: "Flyttehjælp", desc: "320+ udbydere" },
  { icon: TreePine, label: "Haveservice", desc: "560+ udbydere" },
  { icon: Paintbrush, label: "Maler", desc: "410+ udbydere" },
  { icon: Droplets, label: "VVS", desc: "280+ udbydere" },
  { icon: Zap, label: "Elektriker", desc: "350+ udbydere" },
  { icon: ShieldCheck, label: "Sikkerhed", desc: "120+ udbydere" },
  { icon: Hammer, label: "Tømrer", desc: "240+ udbydere" },
  { icon: HomeIcon, label: "Boligservice", desc: "180+ udbydere" },
];

const Categories = () => {
  return (
    <section className="bg-background pt-8 md:pt-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Udforsk kategorier
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Klik en kategori for at finde udbydere i dit område.</p>
        </div>

        <HorizontalScroller>
          {categories.map((cat) => (
            <Link
              key={cat.label}
              to={`/search?category=${encodeURIComponent(cat.label)}`}
              className="group flex w-[140px] sm:w-[160px] shrink-0 flex-col items-start gap-3 rounded-2xl border border-border bg-card p-4 transition-all hover:border-foreground/30 hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-foreground transition-colors group-hover:bg-foreground group-hover:text-background">
                <cat.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">{cat.label}</div>
                <div className="text-xs text-muted-foreground">{cat.desc}</div>
              </div>
            </Link>
          ))}
        </HorizontalScroller>
      </div>
    </section>
  );
};

export default Categories;
