# Plan: Klogere dataimport + support-knap i header

## 1. AI-baseret felt-mapping med begrundelser

I `DataImportTab.tsx` udvides den eksisterende mapping-flow med en "Foreslå med AI"-knap, der kalder en ny edge function `suggest-field-mapping` (Lovable AI Gateway, `google/gemini-3-flash-preview`).

- Input til AI: kolonneoverskrifter + 3-5 eksempelværdier pr. kolonne + entitetstype (kunder, ordrer, abonnementer, medarbejdere).
- Output (struktureret JSON): `{ column: string, suggested_field: string|null, confidence: "høj"|"middel"|"lav", reason: string }[]`.
- UI:
  - Knap øverst i mapping-panelet: "✨ Foreslå mapping med AI".
  - Hver kolonne får en lille badge med konfidens-farve (grøn/gul/rød) og en tooltip/ikon med begrundelsen.
  - Lave-konfidens kolonner markeres tydeligt (gul kant) så brugeren kan vælge selv hurtigt.
  - Bruger kan acceptere alle forslag på én gang eller pr. felt.

## 2. Preview Diff før import

Inden den endelige import køres en "diff-analyse" lokalt der pr. entity viser:

- **Opret** (n rækker) — nye records.
- **Opdater** (n rækker) — eksisterende records (matchet via key fx email/CVR/ekstern id) der får nye felter.
- **Uændret** (n rækker) — exact match.
- **Fejl** (n rækker) — validation eller manglende krævede felter.

UI: Ny "Preview"-fane før "Importér", med:
- Sammenfatningskort pr. entitet (4 tal + bjælke).
- Klik på en kategori → tabel med de berørte rækker + felt-niveau diff (gammel → ny værdi for opdateringer).
- "Importér"-knappen disables hvis der er kritiske fejl, indtil brugeren har rettet eller eksplicit valgt "spring fejl over".

Matching-logik:
- Kunder: email eller CVR.
- Ordrer: ordrenummer eller (kunde + dato + service).
- Medarbejdere: email.
- Abonnementer: (kunde + service).

## 3. Trinvis validering med fejl pr. række/kolonne

Tilføj `validateRow()` der kører på hver række efter mapping og før preview:

- Påkrævede felter (per entitet) — fejl hvis tom.
- Type-validering (email, telefon, postnr, CVR 8 cifre, beløb numerisk, dato parsable).
- Reference-validering (fx kunde-email findes i kunder-arket eller i DB).

UI:
- Valideringspanel med fejlliste grupperet pr. kolonne, klik → scroll til celle i preview-tabellen.
- Cellen highlights rød med tooltip-fejl.
- Brugeren kan ændre mapping eller redigere cellen direkte (inline edit) og fejlen forsvinder.
- Tæller i toppen: "12 fejl i 4 kolonner — ret eller spring over".

## 4. Flyt "Serviceydere kundeservice"-knap til virksomhedspanel-headeren

I dag rendres `LiveChatWidget` floating i `/virksomhed/*` og kan overlappe andre knapper.

- Skjul den floating trigger-knap når `pathname.startsWith("/virksomhed")` (men behold selve chat-popup'en så den kan åbnes).
- Tilføj en kompakt "Support"-knap (`MessageCircle`-ikon + "Support"-label) i `PageHeader`/topbjælken på `/virksomhed`-siderne.
- Knappen sætter `sessionStorage.serviceydere_open_chat_key = platformKey()` og dispatcher event så widget'en åbner — samme mekanisme som allerede bruges andre steder.

## Tekniske detaljer

- Ny edge function: `supabase/functions/suggest-field-mapping/index.ts` med `verify_jwt = false` (mapping er ikke følsom data, men vi sender kun kolonnenavne + sample values).
- Diff- og valideringslogik kører klientside i ny modul: `src/components/admin/dataimport/diff.ts` og `validation.ts`.
- DataImportTab opsplittes lidt: nye komponenter `MappingPanel.tsx`, `PreviewDiffPanel.tsx`, `ValidationPanel.tsx` for at holde filen håndterbar.
- LiveChatWidget: udvid `HIDDEN_PREFIXES` med `/virksomhed` for trigger-knap, men eksporter en lille hook/funktion `openPlatformChat()` til brug fra header-knappen.

## Filer der ændres

- `src/components/admin/DataImportTab.tsx` (refactor + integration)
- `src/components/admin/dataimport/MappingPanel.tsx` (ny)
- `src/components/admin/dataimport/PreviewDiffPanel.tsx` (ny)
- `src/components/admin/dataimport/ValidationPanel.tsx` (ny)
- `src/components/admin/dataimport/diff.ts` (ny)
- `src/components/admin/dataimport/validation.ts` (ny)
- `supabase/functions/suggest-field-mapping/index.ts` (ny)
- `src/components/livechat/LiveChatWidget.tsx` (skjul trigger på /virksomhed, eksportér openPlatformChat)
- `src/pages/Admin.tsx` + evt. `RoutePlanner.tsx` (support-knap i header)
