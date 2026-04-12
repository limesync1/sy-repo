import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useCreateQuoteRequest } from "@/hooks/useDatabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle2, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  "Rengøring", "Håndværker", "Flyttehjælp", "Haveservice",
  "Maler", "VVS", "Elektriker", "Sikkerhed",
];

const RequestQuote = () => {
  const [searchParams] = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const createRequest = useCreateQuoteRequest();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !category || !description) {
      toast.error("Udfyld venligst alle påkrævede felter");
      return;
    }

    try {
      await createRequest.mutateAsync({
        customer_name: name.trim(),
        customer_email: email.trim(),
        customer_phone: phone.trim() || null,
        category,
        description: description.trim(),
      });
      setSubmitted(true);
    } catch (e: any) {
      toast.error("Fejl: " + e.message);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-accent/10 to-background px-4">
        <div className="text-center">
          <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-accent" />
          <h1 className="mb-2 text-3xl font-bold text-foreground">Tilbudsanmodning sendt!</h1>
          <p className="mb-6 text-muted-foreground">
            Vi matcher dig med relevante serviceydere. Du modtager op til 3 tilbud på e-mail.
          </p>
          <div className="flex gap-3 justify-center">
            <Link to="/">
              <Button variant="outline">Tilbage til forsiden</Button>
            </Link>
            <Button onClick={() => setSubmitted(false)} className="bg-accent text-accent-foreground hover:bg-accent/90">
              Send ny anmodning
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent/10 to-background">
      <nav className="border-b border-border bg-card/95 backdrop-blur">
        <div className="container mx-auto flex items-center gap-3 px-4 py-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Link to="/">
            <img src="/serviceydere-logo.png" alt="Serviceydere" className="h-8" />
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-lg">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/20">
              <MessageSquarePlus className="h-7 w-7 text-accent" />
            </div>
            <h1 className="mb-2 text-3xl font-bold text-foreground">Indhent 3 tilbud</h1>
            <p className="text-muted-foreground">
              Beskriv dit projekt og modtag op til 3 tilbud fra verificerede serviceydere – helt gratis.
            </p>
          </div>

          <Card className="border-border/60">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Dit navn *</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Fulde navn" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">E-mail *</label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="din@email.dk" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Telefon</label>
                  <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+45 00 00 00 00" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Kategori *</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue placeholder="Vælg kategori" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Beskriv dit projekt *</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Fortæl os hvad du har brug for hjælp til, omfang, tidsramme mm."
                    className="min-h-[120px]"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={createRequest.isPending}
                  className="w-full h-13 bg-accent text-accent-foreground hover:bg-accent/90 text-base font-semibold"
                >
                  {createRequest.isPending ? "Sender..." : "Send tilbudsanmodning"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RequestQuote;
