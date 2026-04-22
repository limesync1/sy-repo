import {
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
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";

const categories = [
  {
    icon: Sparkles,
    label: "Rengøring",
    desc: "Privat, erhverv og faste aftaler",
    span: "lg:col-span-4",
  },
  {
    icon: Wrench,
    label: "Håndværker",
    desc: "Reparation, montering og projekter",
    span: "lg:col-span-3",
  },
  {
    icon: Truck,
    label: "Flyttehjælp",
    desc: "Flytning og tunge løft",
    span: "lg:col-span-2",
  },
  {
    icon: TreePine,
    label: "Haveservice",
    desc: "Pleje, rydning og sæsonopgaver",
    span: "lg:col-span-3",
  },
  {
    icon: Paintbrush,
    label: "Maler",
    desc: "Inde og ude",
    span: "lg:col-span-2",
  },
  {
    icon: Droplets,
    label: "VVS",
    desc: "Akut og planlagt",
    span: "lg:col-span-2",
  },
  {
    icon: Zap,
    label: "Elektriker",
    desc: "Installation og fejlfinding",
    span: "lg:col-span-2",
  },
  {
    icon: ShieldCheck,
    label: "Sikkerhed",
    desc: "Alarm, låse og adgang",
    span: "lg:col-span-2",
  },
  {
    icon: Hammer,
    label: "Tømrer",
    desc: "Montering og byg",
    span: "lg:col-span-2",
  },
  {
    icon: HomeIcon,
    label: "Boligservice",
    desc: "Praktisk hjælp i hjemmet",
    span: "lg:col-span-2",
  },
];

const Categories = () => {
  return (
    <section className="border-y border-border bg-secondary/35 py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,0.45fr)] lg:items-end">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Kategorier
            </div>
            <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Gå ind dér hvor opgaven starter.
            </h2>
          </div>
          <p className="max-w-xl text-base leading-7 text-muted-foreground lg:justify-self-end">
            De vigtigste indgange ligger øverst, mens resten er organiseret tæt
            nok på til, at du hurtigt kan skifte spor.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {categories.map((category, index) => (
            <Link
              key={category.label}
              to={`/search?category=${encodeURIComponent(category.label)}`}
              className={`group relative overflow-hidden rounded-[30px] bg-background px-5 py-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${category.span}`}
            >
              <div
                className={`pointer-events-none absolute inset-0 ${index % 2 === 0 ? "bg-gradient-to-br from-secondary/70 via-transparent to-transparent" : "bg-gradient-to-br from-accent/10 via-transparent to-transparent"}`}
              />
              <div className="relative flex min-h-[152px] flex-col justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-foreground">
                  <category.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-foreground">
                    {category.label}
                  </div>
                  <p className="mt-2 max-w-[24ch] text-sm leading-6 text-muted-foreground">
                    {category.desc}
                  </p>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-foreground opacity-0 transition-all group-hover:opacity-100">
                    Se kategori
                    <ArrowRight className="h-4 w-4" />
                  </div>
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
