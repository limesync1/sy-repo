import { useParams, Link } from "react-router-dom";
import { useBusinessBySlug, useServices, useReviews } from "@/hooks/useDatabase";
import { CartProvider } from "@/contexts/CartContext";
import CartSheet from "@/components/business/CartSheet";
import DynamicServiceCard from "@/components/business/DynamicServiceCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Star, Mail, Phone, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const DynamicBusinessContent = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: business, isLoading: bizLoading, error: bizError } = useBusinessBySlug(slug || "");
  const { data: services } = useServices(business?.id);
  const { data: reviews } = useReviews(business?.id);

  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMsg, setContactMsg] = useState("");

  if (bizLoading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Indlæser...</div>;
  if (bizError || !business) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground">Virksomheden blev ikke fundet.</p>
      <Link to="/"><Button variant="outline">Tilbage til forsiden</Button></Link>
    </div>
  );

  const avgRating = reviews?.length ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
            <span className="font-bold text-foreground">{business.name}</span>
          </div>
          <CartSheet businessId={business.id} />
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-accent/15 via-accent/5 to-background py-16 md:py-24">
        <div className="container relative mx-auto px-4 text-center">
          <h1 className="mb-3 text-4xl font-extrabold text-foreground md:text-5xl">{business.name}</h1>
          {business.description && <p className="mx-auto max-w-lg text-lg text-muted-foreground">{business.description}</p>}
          {avgRating && (
            <div className="mt-4 flex items-center justify-center gap-1">
              {[1,2,3,4,5].map((i) => <Star key={i} className={`h-5 w-5 ${i <= Math.round(parseFloat(avgRating)) ? "fill-accent text-accent" : "text-muted"}`} />)}
              <span className="ml-2 text-sm text-muted-foreground">{avgRating} ({reviews?.length} anmeldelser)</span>
            </div>
          )}
        </div>
      </section>

      {/* Services */}
      {services && services.length > 0 && (
        <section className="py-16" id="services">
          <div className="container mx-auto px-4">
            <h2 className="mb-8 text-center text-3xl font-bold text-foreground">Vores services</h2>
            <div className="mx-auto grid max-w-3xl gap-6">
              {services.map((s) => (
                <DynamicServiceCard key={s.id} service={s} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact */}
      <section className="border-t border-border/50 bg-muted/30 py-16">
        <div className="container mx-auto max-w-lg px-4">
          <h2 className="mb-6 text-center text-2xl font-bold text-foreground">Kontakt os</h2>
          <div className="mb-6 flex flex-col items-center gap-2 text-sm text-muted-foreground">
            {business.email && <span className="flex items-center gap-2"><Mail className="h-4 w-4 text-accent" />{business.email}</span>}
            {business.phone && <span className="flex items-center gap-2"><Phone className="h-4 w-4 text-accent" />{business.phone}</span>}
            {business.address && <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-accent" />{business.address}{business.city ? `, ${business.city}` : ""}</span>}
          </div>
          <Card className="border-border/60">
            <CardContent className="space-y-4 p-6">
              <Input placeholder="Dit navn" value={contactName} onChange={(e) => setContactName(e.target.value)} />
              <Input type="email" placeholder="Din e-mail" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
              <Textarea placeholder="Din besked..." value={contactMsg} onChange={(e) => setContactMsg(e.target.value)} className="min-h-[100px]" />
              <Button
                onClick={() => {
                  if (!contactName || !contactEmail || !contactMsg) { toast.error("Udfyld venligst alle felter"); return; }
                  toast.success("Besked sendt!");
                  setContactName(""); setContactEmail(""); setContactMsg("");
                }}
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              >
                Send besked
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-8 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} {business.name} · Drevet af <Link to="/" className="font-medium text-accent hover:underline">Serviceydere</Link></p>
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
