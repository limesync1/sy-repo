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
    { key: "customer_group", desc: "Kundegruppe / segment (fx 'Erhverv', 'VIP', 'Standard')" },
    { key: "currency", desc: "Valutakode (fx DKK, EUR, USD, SEK, NOK)" },
    { key: "vat_zone", desc: "Momszone (fx DK/Indenlands, EU, Eksport)" },
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
    { key: "currency", desc: "Valutakode (fx DKK, EUR)" },
    { key: "interval", desc: "Interval (engangskøb, ugentligt, månedligt, …)" },
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
    { key: "customer_number", desc: "Internt kundenummer (på kunden bag ordren)" },
    { key: "ean_number", desc: "EAN-nummer på kunden" },
    { key: "customer_group", desc: "Kundegruppe / segment" },
    { key: "product_number", desc: "Varenummer på den solgte service" },
    { key: "currency", desc: "Valutakode (fx DKK, EUR)" },
    { key: "default_vat_rate", desc: "Momssats i procent" },
    { key: "unit", desc: "Enhed på linjen (stk, time, m²…)" },
    { key: "interval", desc: "Interval på aftalen (engangskøb, ugentligt, månedligt…)" },
  ],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY mangler" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- MODE: classify_services ----------
    // ---------- MODE: detect ----------
    // Auto-detektér hvad CSV-filen indeholder: kunder, services, ordrer/aftaler eller en blanding.
    if (body.mode === "detect") {
      const headers = Array.isArray(body.headers) ? body.headers : [];
      const sample = Array.isArray(body.sample) ? body.sample.slice(0, 5) : [];
      if (headers.length === 0) {
        return new Response(JSON.stringify({ error: "headers påkrævet" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const sys = `Du analyserer en CSV-fil eksporteret fra et dansk service-/håndværker-program (fx SkvizBiz, Fenster, Minuba, Ordrestyring) og afgør hvad filen indeholder.

Mulige indholdstyper:
- "customers": kundekartotek (navn, email, telefon, adresse, CVR osv.)
- "services": produkt-/prisliste (navn, pris, enhed, varenummer)
- "orders": ordrer / aftaler / fakturaer / serviceaftaler (linjer med kunde + ydelse + pris/dato/interval)

Mange brancheprogrammer (især SkvizBiz) eksporterer ALT på én række — både kunde- OG aftaledata. Det kalder vi "mixed".

Returnér KUN JSON med præcist denne form:
{
  "contains": { "customers": bool, "services": bool, "orders": bool },
  "primary": "customers" | "services" | "orders",
  "is_mixed": bool,
  "confidence": 0-100,
  "summary": "1-2 korte danske sætninger om hvad filen indeholder",
  "recommendations": ["customers", "orders"]
}

'primary' = det vigtigste indhold (typisk kunder hvis filen har både kunder og aftaler).
'is_mixed' = true hvis filen meningsfuldt kan importeres som mere end én entitetstype.
'recommendations' = liste af entitetstyper du anbefaler at importere fra denne fil (i prioriteret rækkefølge).`;

      const user = `CSV-headers (${headers.length}):
${JSON.stringify(headers)}

Eksempel-rækker:
${JSON.stringify(sample, null, 2)}`;

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "system", content: sys }, { role: "user", content: user }],
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
      let parsed: any = { contains: {}, primary: "customers", is_mixed: false, confidence: 0, recommendations: ["customers"] };
      try { parsed = JSON.parse(content); } catch { /* ignore */ }
      return new Response(JSON.stringify(parsed), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- MODE: classify_services (legacy duplicate label kept) ----------
    // Klassificér produkt-/service-rækker ind i virksomhedens eksisterende kategorier/underkategorier.
    if (body.mode === "classify_services") {
      const items = Array.isArray(body.items) ? body.items.slice(0, 300) : [];
      const existing = Array.isArray(body.existing) ? body.existing : [];
      if (items.length === 0) {
        return new Response(JSON.stringify({ classifications: [] }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const existingStr = existing.length
        ? existing.map((c: any) => `- ${c.category}${(c.subcategories || []).length ? ` → [${(c.subcategories || []).join(", ")}]` : ""}`).join("\n")
        : "(ingen kategorier oprettet endnu)";

      const sys = `Du klassificerer produkter/services for en dansk virksomhed på Serviceydere-platformen.
Virksomhedens EKSISTERENDE kategorier og underkategorier:
${existingStr}

For HVER række skal du vælge:
- service_category: helst en EKSISTERENDE hovedkategori. Kun hvis ingen passer godt, foreslå en ny på dansk.
- subcategory: helst en eksisterende underkategori under den valgte hovedkategori. Ellers foreslå en passende ny.
- is_new_category / is_new_subcategory: true hvis du foreslår noget der ikke findes i listen.
- confidence: 0-100. Sæt lavt (<50) hvis du er i tvivl.

Brug rækkens navn, beskrivelse, evt. rå kategori-tekst, varenummer m.m. Tænk på dansk service-branche (rengøring, VVS, elektriker, gartner, håndværker, transport mv.).
Returnér KUN JSON: { "classifications": [ { "service_category": "...", "subcategory": "..." | null, "is_new_category": bool, "is_new_subcategory": bool, "confidence": 0-100 } ] }
Array-længden skal være præcis ${items.length}, i samme rækkefølge som input.`;

      const user = `Rækker:\n${JSON.stringify(items, null, 2)}`;

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "system", content: sys }, { role: "user", content: user }],
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
      let parsed: any = { classifications: [] };
      try { parsed = JSON.parse(content); } catch { /* ignore */ }
      return new Response(JSON.stringify(parsed), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- MODE: match_orders ----------
    // Matcher importerede ordre-rækker mod virksomhedens eksisterende kunder + services.
    if (body.mode === "match_orders") {
      const items = Array.isArray(body.items) ? body.items.slice(0, 200) : [];
      const customers = Array.isArray(body.customers) ? body.customers.slice(0, 800) : [];
      const services = Array.isArray(body.services) ? body.services.slice(0, 400) : [];
      if (items.length === 0) {
        return new Response(JSON.stringify({ matches: [] }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const sys = `Du matcher importerede ordrer/aftaler mod en virksomheds eksisterende kunder og services.

EKSISTERENDE KUNDER (id, navn/firma, email, cvr, telefon):
${JSON.stringify(customers)}

EKSISTERENDE SERVICES/PRODUKTER (id, navn, varenummer, enhed, basispris):
${JSON.stringify(services)}

For HVER ordre-række skal du finde:
- customer_id: id på den bedste eksisterende kunde-match (email > CVR > navn+postnr > navn). null hvis ingen passer.
- customer_match_reason: kort dansk forklaring ("matchet på email", "matchet på CVR", "ny kunde" osv.).
- customer_confidence: 0-100.
- service_id: id på den bedste eksisterende service-match (varenummer > eksakt navn > fuzzy navn). null hvis ny.
- service_match_reason: kort dansk forklaring.
- service_confidence: 0-100.
- inferred_unit_price: hvis ordrelinjen mangler stykpris men matcher en kendt service, brug servicens basispris (ellers null).

Returnér KUN JSON: { "matches": [ { "customer_id": "..."|null, "customer_match_reason": "...", "customer_confidence": 0-100, "service_id": "..."|null, "service_match_reason": "...", "service_confidence": 0-100, "inferred_unit_price": number|null } ] }
Array-længden skal være præcis ${items.length} i samme rækkefølge.`;

      const user = `Ordre-rækker:\n${JSON.stringify(items, null, 2)}`;

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "system", content: sys }, { role: "user", content: user }],
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
      let parsed: any = { matches: [] };
      try { parsed = JSON.parse(content); } catch { /* ignore */ }
      return new Response(JSON.stringify(parsed), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- MODE: mapping (default) ----------
    const { headers, sample, defaultType, entityType } = body;
    const type = (entityType as string) || "customers";
    const TARGET_FIELDS = FIELD_SETS[type] || FIELD_SETS.customers;
    if (!Array.isArray(headers) || headers.length === 0) {
      return new Response(JSON.stringify({ error: "headers påkrævet" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fieldList = TARGET_FIELDS.map((f) => `- ${f.key}: ${f.desc}`).join("\n");
    const sampleStr = JSON.stringify((sample || []).slice(0, 5), null, 2);

    const entityLabel = type === "services" ? "produkter/services"
      : type === "orders" ? "ordrer/aftaler"
      : "kundedata";
    const systemPrompt = `Du hjælper en dansk SaaS-platform (Serviceydere) med at importere ${entityLabel} fra CSV-filer eksporteret fra brancheprogrammer for service- og håndværksvirksomheder — typisk SkvizBiz, Fenster, Ordrestyring, Minuba, Håndværkertilbud, Servicemind og lignende. Sjældnere fra rene regnskabsprogrammer.

Du skal mappe CSV-kolonner til Serviceydere's standardfelter:
${fieldList}

Returnér KUN gyldig JSON med formatet:
{
  "mapping": { "<serviceydere_felt>": "<csv_kolonnenavn eller null>" },
  ${type === "customers" ? `"default_type": "private" | "business",` : ""}
  "confidence": 0-100,
  "notes": "kort dansk forklaring"
}

${type === "customers" ? `Brug 'default_type' = 'business' hvis kolonner som CVR, virksomhedsnavn, EAN, kontaktperson tyder på erhvervskunder. Ellers 'private'.\n` : ""}Kolonnenavne skal matche EKSAKT som de står i CSV-headers (case-sensitive).

VIGTIGE HINTS for kendte eksport-formater:

SkvizBiz (semikolon-separeret, ofte Windows-1252):
- "Kundenummer" → customer_number
- "Navn" → name (firma- eller personnavn)
- "Kontaktperson" → contact_person
- "CVR-nummer" → cvr
- "EAN-nummer" → ean
- "Adresse" + "Adresselinje 2" → address (slå sammen hvis muligt; ellers brug "Adresse")
- "Postnummer" → postal_code, "By" → city
- "Email-adresse" → email
- "Telefonnummer" → phone, "Mobiltelefonnummer" → mobile (foretræk mobil hvis kun ét felt)
- "Faktureringsadresse"/"Faktureringsemail-adresse"/... → billing_*
- "Notat" → note (intern), "Notat - udskrives ikke" → internal_note
- "Kundegruppe" → customer_group/tag
- "Betalingsfrist" → payment_terms
- "Oprettet" → created_at (format dd-mm-yyyy hh:mm)
- For services/aftaler: "Opgavebeskrivelse" → name/description, "Pris ekskl. moms" eller "Pris per enhed" → price, "Enhed" → unit, "Antal" → quantity, "Faktureringsinterval"/"Interval" → recurrence, "Ruter" → route, "Moms-sats i %" → vat_rate, "Tidsforbrug" (sekunder) → duration_minutes (omregn /60).
- En SkvizBiz-eksport kan indeholde BÅDE kunde- OG aftalefelter på samme række — map kun de felter der hører til den valgte entitetstype.

Fenster / Ordrestyring / Minuba og lignende brancheprogrammer:
- Typisk danske kolonnenavne ("Kundenr", "Firmanavn"/"Navn", "Kontakt", "Adresse", "Postnr", "By", "Email"/"E-mail", "Telefon"/"Mobil", "CVR").
- Aftaler/opgaver: "Opgave", "Beskrivelse", "Interval"/"Frekvens", "Pris", "Enhed", "Antal", "Rute"/"Distrikt", "Næste besøg", "Sidste besøg", "Varighed".
- Hvis du er i tvivl mellem to lignende kolonnenavne, vælg den der har flest udfyldte værdier i sample-rækkerne.

Hvis et SkvizBiz-felt har værdien "Følg standard", "-", "Nej" eller tom — det er stadig OK at mappe kolonnen, vi filtrerer tomme værdier server-side.`;

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