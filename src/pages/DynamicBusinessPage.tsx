import { useParams, Link } from "react-router-dom";
import { useBusinessBySlug, useServices, useReviews, useCreateReview } from "@/hooks/useDatabase";
import { CartProvider } from "@/contexts/CartContext";
import CartSheet from "@/components/business/CartSheet";
import DynamicServiceCard from "@/components/business/DynamicServiceCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Star, Mail, Phone, MapPin, Clock, CheckCircle, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/* ───── Review Form ───── */
const ReviewForm = ({ businessId }: { businessId: string }) => {
  const createReview = useCreateReview();
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const submit = async () => {
    if (!name.trim()) { toast.error("Indtast dit navn"); return; }
    try {
      await createReview.mutateAsync({ business_id: businessId, reviewer_name: name.trim(), rating, comment: comment.trim() || null });
      toast.success("Anmeldelse sendt!");
      setName(""); setRating(5); setComment("");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Card className="border-border bg-card">
      <CardContent className="space-y-4 p-6">
        <h3 className="font-semibold text-foreground">Skriv en anmeldelse</h3>
        <Input placeholder="Dit navn" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="flex gap-1">
          {[1,2,3,4,5].map((i) => (
            <button key={i} onClick={() => setRating(i)} className="p-0.5">
              <Star className={`h-5 w-5 transition-colors ${i <= rating ? "fill-accent text-accent" : "text-muted hover:text-accent/50"}`} />
            </button>
          ))}
        </div>
        <Textarea placeholder="Din kommentar (valgfrit)" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
        <Button onClick={submit} disabled={createReview.isPending} className="w-full bg-foreground text-background hover:bg-foreground/90">
          {createReview.isPending ? "Sender..." : "Send anmeldelse"}
        </Button>
      </CardContent>
    </Card>
  );
};

/* ───── Main Content ───── */
const DynamicBusinessContent = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: business, isLoading, error } = useBusinessBySlug(slug || "");
  const { data: services } = useServices(business?.id);
  const { data: reviews } = useReviews(business?.id);

  if (isLoading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Indlæser...</div>;
  if (error || !business) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground">Virksomheden blev ikke fundet.</p>
      <Link to="/"><Button variant="outline">Tilbage til forsiden</Button></Link>
    </div>
  );

  const avgRating = reviews?.length ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : null;
  const openingHours = business.opening_hours && typeof business.opening_hours === "object"
    ? Object.entries(business.opening_hours as Record<string, string>).filter(([, v]) => v)
    : [];
  const hasCover = !!business.cover_image_url;

  // Group services by subcategory
  const groupedServices = services?.reduce((acc, s) => {
    const key = (s as any).subcategory || "Øvrige";
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {} as Record<string, typeof services>) || {};

  return (
    <div className="min-h-screen bg-background">
      {/* ── Sticky Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="h-5 w-5" /></Link>
            <Link to="/"><img src="/serviceydere-logo-dark.png" alt="Serviceydere" className="h-7" /></Link>
            <Separator orientation="vertical" className="mx-1 h-5" />
            <span className="hidden text-sm font-medium text-foreground sm:inline">{business.name}</span>
          </div>
          <CartSheet businessId={business.id} />
        </div>
      </nav>

      {/* ── Hero / Cover ── */}
      <header className={`relative overflow-hidden ${hasCover ? "h-56 md:h-72 lg:h-[22rem]" : "h-40 md:h-52"}`}>
        {hasCover ? (
          <img src={business.cover_image_url!} alt={business.name} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-secondary via-secondary to-muted" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 mx-auto flex max-w-7xl items-end gap-5 px-4 pb-6 md:px-8">
          {business.logo_url && (
            <div className="shrink-0 rounded-2xl border-4 border-background bg-background shadow-xl h-20 w-20 md:h-28 md:w-28 lg:h-32 lg:w-32">
              <img src={business.logo_url} alt={business.name} className="h-full w-full rounded-xl object-contain" />
            </div>
          )}
          <div className="min-w-0 pb-1">
            <h1 className="text-2xl font-extrabold text-background drop-shadow-lg md:text-4xl lg:text-5xl">{business.name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-background/80">
              {business.city && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{business.city}</span>}
              {avgRating && (
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                  {avgRating} ({reviews?.length})
                </span>
              )}
              {business.is_verified && <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-accent" />Verificeret</span>}
            </div>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid gap-8 py-8 md:gap-10 md:py-12 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px]">

          {/* ── Main Column ── */}
          <div className="min-w-0 space-y-10">

            {/* About */}
            {business.description && (
              <section>
                <h2 className="mb-3 text-lg font-bold text-foreground">Om {business.name}</h2>
                <p className="max-w-2xl leading-relaxed text-muted-foreground">{business.description}</p>
              </section>
            )}

            {/* Services */}
            {services && services.length > 0 && (
              <section id="services">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-foreground">Services</h2>
                  <span className="text-sm text-muted-foreground">{services.length} {services.length === 1 ? "service" : "services"}</span>
                </div>

                {/* If there are subcategories, group them */}
                {Object.keys(groupedServices).length > 1 ? (
                  <div className="space-y-8">
                    {Object.entries(groupedServices).map(([sub, items]) => (
                      <div key={sub}>
                        <h3 className="mb-3 text-base font-semibold text-foreground">{sub}</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                          {items!.map((s) => <DynamicServiceCard key={s.id} service={s} />)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {services.map((s) => <DynamicServiceCard key={s.id} service={s} />)}
                  </div>
                )}
              </section>
            )}

            {/* Reviews */}
            <section id="reviews">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">Anmeldelser</h2>
                {avgRating && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map((i) => (
                        <Star key={i} className={`h-4 w-4 ${i <= Math.round(Number(avgRating)) ? "fill-accent text-accent" : "text-muted"}`} />
                      ))}
                    </div>
                    <span className="font-medium text-foreground">{avgRating}</span>
                    <span className="text-muted-foreground">({reviews?.length})</span>
                  </div>
                )}
              </div>

              {reviews && reviews.length > 0 ? (
                <div className="mb-6 grid gap-3 sm:grid-cols-2">
                  {reviews.map((r) => (
                    <Card key={r.id} className="border-border">
                      <CardContent className="p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-bold text-foreground">
                            {r.reviewer_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="block truncate text-sm font-semibold text-foreground">{r.reviewer_name}</span>
                            <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("da-DK")}</span>
                          </div>
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map((i) => (
                              <Star key={i} className={`h-3.5 w-3.5 ${i <= r.rating ? "fill-accent text-accent" : "text-muted"}`} />
                            ))}
                          </div>
                        </div>
                        {r.comment && <p className="text-sm leading-relaxed text-muted-foreground">{r.comment}</p>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="mb-6 text-muted-foreground">Ingen anmeldelser endnu — vær den første!</p>
              )}

              <ReviewForm businessId={business.id} />
            </section>
          </div>

          {/* ── Sidebar ── */}
          <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
            <Card className="border-border bg-secondary/30">
              <CardContent className="p-5">
                <h3 className="mb-1 font-bold text-foreground">Kontakt {business.name}</h3>
                <p className="mb-4 text-sm text-muted-foreground">Har du spørgsmål? Kontakt os direkte.</p>
                <div className="space-y-2.5">
                  {business.phone && (
                    <a href={`tel:${business.phone}`} className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
                      <Phone className="h-4 w-4 text-accent" />{business.phone}
                    </a>
                  )}
                  {business.email && (
                    <a href={`mailto:${business.email}`} className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
                      <Mail className="h-4 w-4 text-accent" />{business.email}
                    </a>
                  )}
                  {business.address && (
                    <div className="flex items-start gap-2.5 rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      <span>{business.address}{business.zip_code ? `, ${business.zip_code}` : ""}{business.city ? ` ${business.city}` : ""}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {openingHours.length > 0 && (
              <Card className="border-border">
                <CardContent className="p-5">
                  <h3 className="mb-3 flex items-center gap-2 font-bold text-foreground">
                    <Clock className="h-4 w-4 text-accent" /> Åbningstider
                  </h3>
                  <div className="space-y-1.5 text-sm">
                    {openingHours.map(([day, time]) => (
                      <div key={day} className="flex justify-between">
                        <span className="text-muted-foreground">{day}</span>
                        <span className="font-medium text-foreground">{time}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2 rounded-xl bg-secondary/40 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-accent" /> Verificeret virksomhed
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-accent" /> Sikker betaling
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Star className="h-4 w-4 text-accent" /> Ægte anmeldelser
              </div>
            </div>
          </aside>
        </div>
      </div>

      <footer className="border-t border-border bg-secondary/30 py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground md:px-8">
          <p>© {new Date().getFullYear()} {business.name} · Drevet af <Link to="/" className="font-medium text-foreground hover:underline">Serviceydere</Link></p>
        </div>
      </footer>
    </div>
  );
};

const DynamicBusinessPage = () => (
  <CartProvider>
    <DynamicBusinessContent />
  </CartProvider>
);

export default DynamicBusinessPage;
