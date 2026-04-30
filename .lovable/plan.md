
# Forbind Billy med én knap

## Det vigtigste først (lidt dårligt nyt)

Billys API understøtter **ikke** rigtigt OAuth endnu (de skriver selv: *"We plan to support a 3-legged OAuth solution eventually"*). Det betyder vi **ikke** kan lave en knap af typen "Log ind med Billy" som åbner et Billy-popup-vindue og kommer tilbage med en token, sådan som man kender det fra fx Google eller Stripe.

Men vi kan komme **meget tæt på en 1-klik-oplevelse** ved at bruge Billys anden indlogningsmetode: brugerens almindelige Billy-email og -password. Vi sender det én gang til Billy, opretter en access-token automatisk på deres konto, gemmer kun token'en, og smider passwordet væk med det samme.

## Hvordan det kommer til at se ud for brugeren

Når man vælger Billy som regnskabssystem, ser man **ikke længere** felter til "API Access Token" eller links til Billys indstillinger. Man ser i stedet:

```text
┌─────────────────────────────────────────────┐
│  [Billy-logo]                               │
│                                             │
│  Forbind din Billy-konto                    │
│  Log ind med din Billy-konto, så klarer    │
│  vi resten — du behøver ikke kopiere noget. │
│                                             │
│  Email     [____________________]           │
│  Password  [____________________]           │
│                                             │
│  [ Forbind Billy ]                          │
│                                             │
│  Vi gemmer aldrig dit password. Vi bruger  │
│  det kun én gang til at oprette en sikker  │
│  forbindelse, som du kan slå fra når som   │
│  helst inde i Billy.                        │
└─────────────────────────────────────────────┘
```

Når man klikker **Forbind Billy**:
1. Knappen viser "Forbinder..."
2. Hvis brugeren har flere virksomheder i Billy, kommer der en lille dialog: *"Hvilken virksomhed vil du forbinde?"* med en liste.
3. Token'en gemmes automatisk, forbindelsen testes, og man ser: *"Forbundet til [virksomhedsnavn] ✓"*

Hele oplevelsen er ét felt-par + ét klik. Ingen Billy-faner åbnes. Ingen kopiering.

## Hvad ændres i koden

### Ny edge function: `accounting-billy-connect`
- Modtager `{ business_id, email, password, organization_id? }`.
- Kalder `GET https://api.billysbilling.com/v2/organizations` med Basic Auth → får liste af virksomheder brugeren har adgang til.
- Hvis flere → returnerer listen til UI så brugeren vælger.
- Hvis én (eller valgt) → kalder `POST /v2/accessTokens` med Basic Auth for at oprette en navngiven token (`"Serviceydere"`).
- Gemmer token + organization_id i `accounting_integrations`-tabellen via service-role.
- Returnerer kun `{ ok, organization_name }` — aldrig token eller password.
- Password holdes kun i RAM under requesten; logges aldrig.

### `src/components/admin/AccountingTab.tsx`
- Billy-providerens `fields`-array fjernes (ingen flere `api_token`-inputs).
- I stedet rendres en ny komponent `<BillyConnectCard />` når `provider === "billy"` og der ikke allerede er en aktiv integration.
- Når der **er** en aktiv Billy-integration vises bare *"Forbundet til X · Afbryd forbindelsen"* (afbryd = sletter rækken; brugeren kan også selv slette token i Billy).
- E-conomic og Dinero rører vi ikke i denne omgang.

### Ingen DB-ændringer
- Vi bruger eksisterende `accounting_integrations`-felter (`api_token`, `organization_id`, `is_active`).

## Sikkerhed

- Passwordet sendes over HTTPS direkte til vores edge function og videresendes kun til Billys API i samme request — det skrives aldrig til database, log eller fil.
- Edge function tjekker `verify_jwt = true` så kun den indloggede virksomhedsejer kan bruge den, og verificerer `business.owner_id === user.id` før noget gemmes.
- Brugeren kan til enhver tid se og slette token'en inde i Billy under **Indstillinger → Access tokens** (vi navngiver den `"Serviceydere"` så den er nem at finde).

## Hvad skiftet *ikke* løser

- Hvis brugeren har slået 2-faktor-login til på Billy, virker Basic Auth ikke. Vi viser i så fald en pæn fejlbesked og falder tilbage til en "Indsæt token manuelt"-knap som genskaber det nuværende felt — så ingen bliver låst ude.
- Den dag Billy frigiver rigtig OAuth, kan vi udskifte selve edge-funktionens indre uden at ændre noget i UI'et.

## Næste skridt efter dette

Når Billy er på plads og virker, gør vi præcis det samme for Dinero (de **har** ægte OAuth, så det bliver endnu pænere) og bagefter e-conomic (kræver vores developer-app som vi allerede er ved at sætte op).
