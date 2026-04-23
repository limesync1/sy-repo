
Mål: rydde op på forsiden, forbedre lokationsdetektering på forsiden og `/virksomheder`, og gøre bestillingsflowet på virksomhedssider enklere, tydeligere og mere fejltolerant.

1. Rydde forsiden for unødvendige elementer
- Gennemgå `HeroSection.tsx` og de første landingssektioner for små UI-elementer, badges og ekstra tekstblokke som fylder uden at hjælpe brugeren.
- Stramme heroen ind, så fokus bliver:
  - tydelig overskrift
  - søgefelt
  - én enkel lokationslinje
  - få, klare handlinger
- Fjerne eller nedtone “quick signals”, overflødige chips og sekundære forklaringer, hvis de kun skaber visuel støj.
- Gennemgå især:
  - `src/components/landing/HeroSection.tsx`
  - `src/components/landing/Categories.tsx`
  - `src/components/landing/HowItWorks.tsx`
  - `src/components/landing/RecentBusinesses.tsx`

2. Forbedre lokationsdetektering på forsiden og `/virksomheder`
- Erstatte eller omprioritere den nuværende IP-baserede strategi i `LocationContext.tsx`, så systemet finder den mest præcise by/postnummer muligt i stedet for brede kommune-/regionsnavne.
- Indføre en bedre kæde for detektering:
  - først automatisk browser-geolocation ved første besøg, hvis muligt
  - derefter reverse geocoding mod en mere præcis adresse/lokalitetskilde
  - fallback til IP-baseret lokation hvis brugeren afviser eller browseren ikke kan levere koordinater
- Sikre at resultatet foretrækker et præcist format som `7540 Haderup` frem for kommune/navne på større administrative områder.
- Opdatere `LocationChip.tsx`, så “Fang min lokation” ikke længere er nødvendig som primær handling, men kun er en fallback/redigeringsmulighed.
- Opdatere søgefeltets mikrocopy i både hero og søgeside, så det tydeligt viser den fundne by/postnummer.

3. Sikre at søgning bruger den forbedrede lokation begge steder
- Koble den nye lokationslogik tydeligt til:
  - `src/components/landing/SearchSuggest.tsx`
  - `src/pages/Search.tsx`
- Beholde automatisk lokal søgning, men sikre at “nær” og afstands-/relevanslogikken bruger den korrekte by/postkode.
- Forbedre fallback-adfærd, så søgningen stadig virker pænt hvis lokation ikke kan findes.

4. Gøre bestillingsprocessen enklere ved at fjerne “Planlægning”
- Fjerne hele planlægningssektionen i `CartSheet.tsx` fra kundens bestillingsflow.
- Fjerne “anslået varighed” og “ønsket tidsrum” som synlige trin i checkout, så flowet bliver lettere og hurtigere.
- Rydde op i tilhørende state og UI-afhængigheder, så der ikke ligger overflødig logik tilbage.
- Beholde kun det, der er nødvendigt for at gennemføre en bestilling.

5. Forbedre adressefeltet i bestillingsflowet
- Gøre adresseoplevelsen mere komplet, så brugeren ikke kun ser vej/husnummer men også by/postnummer som en tydelig del af inputoplevelsen.
- Opdatere `AddressAutocomplete.tsx` og brugen i `CartSheet.tsx`, så:
  - valg fra autocomplete udfylder adresse, postnummer og by automatisk
  - by vises tydeligt i UI’et og ikke kun gemmes i state
  - der gives klar feedback på, at adressen er fuldt udfyldt og verificeret
- Forbedre visning af den valgte adresse, så den føles mere komplet og tryg for brugeren.

6. Gøre fejlmeddelelserne mere specifikke og hjælpsomme
- Erstatte generiske fejlbeskeder i bestillingsflowet med felt-specifik feedback.
- Validere trinvis, fx:
  - mangler navn
  - ugyldig e-mail
  - mangler telefon
  - adressen er ikke valgt fra forslag / kunne ikke verificeres
  - by/postnummer mangler
- Vise fejl tættere på de relevante felter og ikke kun som generiske toasts.
- Sørge for at fejlteksterne er korte, konkrete og skrevet på klart dansk.

7. Generel UX-opstramning af checkout på virksomhedssider
- Forenkle layoutet i `CartSheet.tsx`, så formularen får bedre hierarki og mindre støj.
- Gøre opsummering, kontaktoplysninger og service-adresse mere overskuelige.
- Justere spacing, sektionstitler og hjælpetekster, så flowet føles hurtigere og mere intuitivt.
- Sikre at brugerens vej fra “Tilføj til bestilling” til “Send bestilling” bliver mere enkel og mindre tung.

Tekniske detaljer
- Primære filer:
  - `src/contexts/LocationContext.tsx`
  - `src/components/LocationChip.tsx`
  - `src/components/landing/HeroSection.tsx`
  - `src/components/landing/SearchSuggest.tsx`
  - `src/pages/Search.tsx`
  - `src/components/business/CartSheet.tsx`
  - `src/components/shared/AddressAutocomplete.tsx`
  - eventuelt mindre oprydning i relevante landingssektioner
- Hovedændringer:
  - mere præcis og automatisk lokationsdetektering
  - enklere hero og landingssektioner
  - checkout uden planlægningssektion
  - tydeligere adresse- og valideringsflow

Acceptkriterier
- Forsiden føles lettere og mindre rodet, med færre småting der fylder unødigt.
- Lokation findes automatisk uden at brugeren skal trykke “Fang min lokation”.
- Lokationen vises mere præcist som rigtig by/postnummer i stedet for kommune-agtige navne.
- Søgning på både forside og `/virksomheder` bruger den forbedrede lokation.
- “Planlægning”-sektionen er fjernet fra bestillingsflowet på virksomhedssider.
- Adressefeltet udfylder og viser adresse, postnummer og by tydeligt.
- Bestillingsflowet har mere konkrete fejlmeddelelser og er generelt lettere at bruge.
