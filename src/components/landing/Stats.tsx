import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Stats = () => {
  const { data } = useQuery({
    queryKey: ["landing-stats"],
    queryFn: async () => {
      const [biz, rev, cit] = await Promise.all([
        supabase.from("businesses").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("reviews").select("rating"),
        supabase.from("businesses").select("city").eq("is_active", true).not("city", "is", null),
      ]);
      const ratings = rev.data ?? [];
      const avg = ratings.length
        ? (ratings.reduce((s, r) => s + (r.rating || 0), 0) / ratings.length).toFixed(1)
        : null;
      const cities = new Set((cit.data ?? []).map((r) => r.city?.trim().toLowerCase()).filter(Boolean));
      return {
        businesses: biz.count ?? 0,
        reviews: ratings.length,
        avg,
        cities: cities.size,
      };
    },
    staleTime: 1000 * 60 * 5,
  });

  const fmt = (n: number) => new Intl.NumberFormat("da-DK").format(n);

  const stats = [
    {
      value: data ? `${fmt(data.businesses)}` : "—",
      label: "Verificerede virksomheder",
      sub: "i hele Danmark",
    },
    {
      value: data && data.reviews > 0 ? fmt(data.reviews) : "Nye",
      label: data && data.reviews > 0 ? "Anmeldelser" : "Anmeldelser kommer",
      sub: data && data.reviews > 0 ? "fra rigtige kunder" : "efter første bookings",
    },
    {
      value: data?.avg ?? "—",
      label: "Gennemsnitlig rating",
      sub: data?.avg ? "baseret på anmeldelser" : "ingen anmeldelser endnu",
    },
    {
      value: data ? `${fmt(data.cities)}` : "—",
      label: data && data.cities === 1 ? "By dækket" : "Byer dækket",
      sub: "og voksende",
    },
  ];

  return (
    <section className="border-y border-border bg-background">
      <div className="container mx-auto px-4">
        <div className="grid divide-y divide-border md:grid-cols-4 md:divide-x md:divide-y-0">
          {stats.map((s) => (
            <div key={s.label} className="group relative overflow-hidden px-6 py-8 transition-colors hover:bg-secondary/40 md:py-10">
              <div className="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
                {s.value}
              </div>
              <div className="mt-2 text-sm font-semibold text-foreground">{s.label}</div>
              <div className="text-xs text-muted-foreground">{s.sub}</div>
              <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-accent transition-all duration-500 group-hover:w-full" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
