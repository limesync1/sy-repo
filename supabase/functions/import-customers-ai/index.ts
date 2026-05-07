// AI-baseret feltmapping for CSV-import af kunder.
// Modtager headers + et lille sample af rækker fra CSV'en og returnerer
// en mapping fra Serviceydere-felter → CSV-kolonne (eller null hvis ikke fundet).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIELD_SETS: Record<string, { key: string; desc: string }[]> = {
  customers: [
    { key: "type", desc: "'private' eller 'business' — om kunden er privat eller en virksomhed" },
    { key: "name", desc: "Privatkundens fulde navn (kun for type=private)" },
    { key: "company_name", desc: "Virksomhedsnavn (kun for type=business)" },
    { key: "cvr", desc: "CVR-nummer (8 cifre, dansk virksomhed)" },
    { key: "contact_name", desc: "Kontaktperson hos virksomheden" },
    { key: "email", desc: "E-mail adresse" },
    { key: "phone", desc: "Telefonnummer" },
    { key: "address", desc: "Vej + husnummer" },
    { key: "zip_code", desc: "Postnummer (4 cifre i DK)" },
    { key: "city", desc: "By" },
    { key: "notes", desc: "Fritekst noter" },
    { key: "customer_number", desc: "Internt kundenummer" },
    { key: "ean_number", desc: "EAN-nummer (13 cifre, offentlige kunder)" },
    { key: "payment_terms_days", desc: "Betalingsbetingelser i dage" },
  ],
  services: [
    { key: "name", desc: "Produkt- eller service-navn" },
    { key: "description", desc: "Beskrivelse af produkt/service" },
    { key: "base_price", desc: "Pris pr. stk eller timepris (tal)" },
    { key: "unit", desc: "Enhed: stk, time, m², kg osv." },
    { key: "product_number", desc: "Produktnummer / varenummer" },
    { key: "service_category", desc: "Hovedkategori (fx Rengøring, VVS)" },
    { key: "subcategory", desc: "Underkategori" },
    { key: "default_vat_rate", desc: "Momssats i procent (typisk 25)" },
    { key: "accounting_account_number", desc: "Bogføringskonto" },
  ],
  orders: [
    { key: "external_order_number", desc: "Ordre-/faktura-nummer fra kildesystemet" },
    { key: "customer_email", desc: "Kundens e-mail" },
    { key: "customer_name", desc: "Kundens navn" },
    { key: "customer_phone", desc: "Kundens telefon" },
    { key: "company_name", desc: "Virksomhedsnavn" },
    { key: "cvr", desc: "CVR-nummer" },
    { key: "address", desc: "Adresse" },
    { key: "zip_code", desc: "Postnummer" },
    { key: "city", desc: "By" },
    { key: "service_name", desc: "Navn på solgt produkt/service (linje)" },
    { key: "quantity", desc: "Antal" },
    { key: "unit_price", desc: "Stykpris ekskl. moms" },
    { key: "total_amount", desc: "Beløb i alt (inkl. eller ekskl. moms)" },
    { key: "preferred_date", desc: "Aftaledato / leveringsdato (YYYY-MM-DD)" },
    { key: "status", desc: "Ordrestatus (pending, confirmed, completed)" },
    { key: "payment_terms_days", desc: "Betalingsfrist i dage" },
    { key: "notes", desc: "Noter til ordren" },
  ],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { headers, sample, defaultType, entityType } = await req.json();
    const type = (entityType as string) || "customers";
    const TARGET_FIELDS = FIELD_SETS[type] || FIELD_SETS.customers;
    if (!Array.isArray(headers) || headers.length === 0) {
      return new Response(JSON.stringify({ error: "headers påkrævet" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY mangler" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fieldList = TARGET_FIELDS.map((f) => `- ${f.key}: ${f.desc}`).join("\n");
    const sampleStr = JSON.stringify((sample || []).slice(0, 5), null, 2);

    const entityLabel = type === "services" ? "produkter/services"
      : type === "orders" ? "ordrer/aftaler"
      : "kundedata";
    const systemPrompt = `Du hjælper en dansk SaaS-platform (Serviceydere) med at importere ${entityLabel} fra CSV-filer eksporteret fra fx SkvizBiz, Fenster, Billy, Dinero, e-conomic, Excel m.fl.

Du skal mappe CSV-kolonner til Serviceydere's standardfelter:
${fieldList}

Returnér KUN gyldig JSON med formatet:
{
  "mapping": { "<serviceydere_felt>": "<csv_kolonnenavn eller null>" },
  ${type === "customers" ? `"default_type": "private" | "business",` : ""}
  "confidence": 0-100,
  "notes": "kort dansk forklaring"
}

${type === "customers" ? `Brug 'default_type' = 'business' hvis kolonner som CVR, virksomhedsnavn, EAN, kontaktperson tyder på erhvervskunder. Ellers 'private'.\n` : ""}Kolonnenavne skal matche EKSAKT som de står i CSV-headers (case-sensitive).`;

    const userPrompt = `CSV-headers: ${JSON.stringify(headers)}

Eksempel-rækker:
${sampleStr}

${defaultType ? `Brugeren har angivet default-type = ${defaultType}.` : ""}

Returnér feltmapping som JSON.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      return new Response(JSON.stringify({ error: "AI fejlede", details: txt }), {
        status: aiResp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const content = aiJson.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = { mapping: {}, confidence: 0 }; }

    return new Response(JSON.stringify(parsed), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Ukendt fejl" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});