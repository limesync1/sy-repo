## Plan — 7 opgaver

### 1. Adresse-dropdown åbner ved scroll (virksomhedsindstillinger)
Bug: `AddressAutocomplete` (admin-versionen) genåbner dropdown via `useEffect` på `value` selv når brugeren ikke har interageret. Fix: kun fetch/åbn forslag når `value` ændres via brugerinput (track `hasFocus` / `userTypingRef`), ikke når feltet seedes/re-renderes ved scroll.

### 2. Kundepanel → Abonnementer: empty-state matcher Bestillinger/Engangskøb
Ensret empty-state-blokken i Abonnementer-fanen til samme `EmptyPanel`-komponent som de andre faner allerede bruger (ikon, titel, beskrivelse, CTA).

### 3. Kundepanel → Min profil: én samlet side + profilbillede
- Fjern fane-tabs (profilindstillinger / notifikationer / kontooplysninger)
- Saml alt på én scrollbar side med tydelige sektionskort
- Tilføj profilbillede-upload (Supabase Storage bucket `avatars`, public)
- Brug profilbilledet i anmeldelser (`reviews.customer_avatar_url` eller via join til `profiles.avatar_url`)
- Migration: tilføj `avatar_url` til `profiles` hvis ikke findes; bucket + RLS

### 4. Ny fane "Anmeldelser" i kundepanel
Tilføj `reviews` til `CustomerShell`-tabs. Viser alle anmeldelser brugeren har skrevet (forretning, dato, stjerner, tekst). Mulighed for at redigere/slette egen anmeldelse.

### 5. Notifikationsindstillinger der faktisk virker
- Sikr at `customer_notification_preferences` (eller felter på `profiles`) faktisk læses/skrives
- Ændre label "Ordrestatus" → "Aftale-status"
- Test at edge-functions (`customer-notifications-dispatch`) respekterer indstillingerne for hver kanal/type
- Gennemtest alle toggles ved at simulere events

### 6. Test pause/opsigelse af abonnementer
Verificér at `useUpdateSubscription` rent faktisk opdaterer `subscriptions.status` til `paused`/`cancelled`, at UI re-renderer, og at virksomheden ser den korrekte status. Fix evt. manglende `paused_at`/`cancelled_at` timestamps og RLS.

### 7. Forside: endnu mere premium-feel
Højn polish-niveau på alle sektioner:
- Større typografi-hierarki, finere `tracking`/`leading`
- Subtile gradient-baggrunde og glow-effekter i hero/CTA
- Bløde skygger med farve-tone (ikke ren sort)
- Mere generøs luft mellem sektioner
- Mikro-interaktioner ved hover på kort
- Eventuel introduktion af noise-texture/aurora i hero baggrund

### Tekniske detaljer
- Migration nødvendig for #3 (avatar_url + storage bucket) og evt. #5 (notification prefs schema check)
- Ingen breaking changes til eksisterende komponenter udenfor scope
- Genbruger eksisterende `EmptyPanel`, `PageHeader`, `STATUS_BADGE_CLASS`

### Rækkefølge
1+2+4 (UI-only, hurtige) → 3 (migration + UI) → 5 (notif-logik) → 6 (test/fix abonnement) → 7 (premium polish)

Skal jeg gå i gang med alle 7, eller vil du prioritere/spalte op?