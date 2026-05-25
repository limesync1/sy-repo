import { demoBusiness, demoServices } from "@/data/demoData";
import ServiceCard from "@/components/business/ServiceCard";
import CartSheet from "@/components/business/CartSheet";
import BusinessSEO from "@/components/business/BusinessSEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Clock, Mail, MapPin, Phone, Star, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const BusinessPageContent = () => {
  const biz = demoBusiness;
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMsg, setContactMsg] = useState("");

  return (
    <div className="min-h-screen bg-background">
      <BusinessSEO
        name={biz.name}
        description={biz.description}
        city={(biz as any).city || null}
        address={biz.contact?.address || null}
        phone={biz.contact?.phone || null}
        email={biz.contact?.email || null}
        logoUrl={biz.logo}
        slug="demo"
        services={demoServices.map((s: any) => ({
          name: s.name,
          description: s.description,
          base_price: s.price ?? s.base_price ?? null,
        }))}
        faqs={biz.faq?.map((f: any) => ({ question: f.question, answer: f.answer }))}
      />
      {/* Top nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <img
              src={biz.logo}
              alt={biz.name}
              className="h-8 w-8 rounded-lg"
              width={32}
              height={32}
              decoding="async"
              fetchPriority="high"
             loading="lazy"/>
            <span className="font-bold text-foreground">{biz.name}</span>
          </div>
          <CartSheet />
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-accent/15 via-accent/5 to-background py-16 md:py-24">
        <div className="absolute -top-20 -right-20 h-[400px] w-[400px] rounded-full bg-accent/10 blur-3xl" />
        <div className="container relative mx-auto px-4 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-card shadow-lg">
            <img
              src={biz.logo}
              alt={biz.name}
              className="h-14 w-14"
              width={56}
              height={56}
              decoding="async"
              fetchPriority="high"
             loading="lazy"/>
          </div>
          <h1 className="mb-3 text-4xl font-extrabold text-foreground md:text-5xl">{biz.name}</h1>
          <p className="mx-auto max-w-lg text-lg text-muted-foreground">{biz.tagline}</p>
          <div className="mt-4 flex items-center justify-center gap-1">
            {[1,2,3,4,5].map((i) => <Star key={i} className="h-5 w-5 fill-accent text-accent" />)}
            <span className="ml-2 text-sm text-muted-foreground">4.8 (127 anmeldelser)</span>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-16" id="services">
        <div className="container mx-auto px-4">
          <h2 className="mb-8 text-center text-3xl font-bold text-foreground">Vores services</h2>
          <div className="mx-auto grid max-w-3xl gap-6">
            {demoServices.map((s) => (
              <ServiceCard key={s.id} service={s} />
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section className="border-t border-border/50 bg-muted/30 py-16">
        <div className="container mx-auto max-w-2xl px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground">Om os</h2>
          <p className="text-muted-foreground leading-relaxed">{biz.description}</p>
        </div>
      </section>

      {/* Opening hours */}
      <section className="py-16">
        <div className="container mx-auto max-w-md px-4">
          <h2 className="mb-6 flex items-center justify-center gap-2 text-2xl font-bold text-foreground">
            <Clock className="h-6 w-6 text-accent" /> Åbningstider
          </h2>
          <Card className="border-border/60">
            <CardContent className="p-0">
              {biz.openingHours.map((oh, i) => (
                <div key={oh.day} className={`flex items-center justify-between px-5 py-3 ${i < biz.openingHours.length - 1 ? "border-b border-border/50" : ""}`}>
                  <span className="font-medium text-foreground">{oh.day}</span>
                  <span className="text-muted-foreground">{oh.open && oh.close ? `${oh.open} – ${oh.close}` : "Lukket"}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border/50 bg-muted/30 py-16">
        <div className="container mx-auto max-w-2xl px-4">
          <h2 className="mb-6 text-center text-2xl font-bold text-foreground">Ofte stillede spørgsmål</h2>
          <Accordion type="single" collapsible className="space-y-2">
            {biz.faq.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="rounded-xl border border-border/60 bg-card px-4">
                <AccordionTrigger className="text-left font-medium">{f.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Contact */}
      <section className="py-16">
        <div className="container mx-auto max-w-lg px-4">
          <h2 className="mb-6 text-center text-2xl font-bold text-foreground">Kontakt os</h2>
          <div className="mb-6 flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><Mail className="h-4 w-4 text-accent" />{biz.contact.email}</span>
            <span className="flex items-center gap-2"><Phone className="h-4 w-4 text-accent" />{biz.contact.phone}</span>
            <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-accent" />{biz.contact.address}</span>
          </div>
          <Card className="border-border/60">
            <CardContent className="space-y-4 p-6">
              <Input placeholder="Dit navn" value={contactName} onChange={(e) => setContactName(e.target.value)} />
              <Input type="email" placeholder="Din e-mail" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
              <Textarea placeholder="Din besked..." value={contactMsg} onChange={(e) => setContactMsg(e.target.value)} className="min-h-[100px]" />
              <Button
                onClick={() => {
                  if (!contactName || !contactEmail || !contactMsg) { toast.error("Udfyld venligst alle felter"); return; }
                  toast.success("Besked sendt! Vi vender tilbage hurtigst muligt.");
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
        <p>© {new Date().getFullYear()} {biz.name} · Drevet af <Link to="/" className="font-medium text-accent hover:underline">Serviceydere</Link></p>
      </footer>
    </div>
  );
};

const BusinessPage = () => <BusinessPageContent />;

export default BusinessPage;
