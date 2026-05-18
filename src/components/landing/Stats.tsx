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
    { value: data ? fmt(data.businesses) : "—", label: "Verificerede virksomheder" },
    { value: data && data.reviews > 0 ? fmt(data.reviews) : "Nye", label: "Anmeldelser" },
    { value: data?.avg ?? "—", label: "Gennemsnitlig rating" },
    { value: data ? fmt(data.cities) : "—", label: data?.cities === 1 ? "By dækket" : "Byer dækket" },
  ];

  return (
    <section className="bg-background pb-8 pt-12 md:pb-12 md:pt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[28px] border border-border/70 bg-card px-6 py-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)] md:px-12 md:py-11">
          {/* Diskret accent-glow bag tallene */}
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent/[0.06] blur-3xl" />
          <div className="relative grid grid-cols-2 gap-y-8 md:grid-cols-4 md:gap-2">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className={`text-center md:text-left ${i > 0 ? "md:border-l md:border-border/60 md:pl-10" : ""}`}
              >
                <div className="text-[2.25rem] font-semibold leading-none tracking-[-0.02em] text-foreground tabular-nums md:text-[2.75rem]">
                  {s.value}
                </div>
                <div className="mt-3 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Stats;
