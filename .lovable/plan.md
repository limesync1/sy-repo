# Gør «Opret bestilling» endnu bedre

## Hvad brugeren får
1. **Vælg eksisterende kunde** – søgefelt øverst i kundekassen («Søg kunde…»), der udfylder navn, email, telefon og adresse fra kundelisten. «Ny kunde» er stadig standard.
2. **Fejl vises ved feltet** – i stedet for kun en lille besked i hjørnet bliver manglende navn/email/service markeret med rød kant og kort tekst under feltet, og vinduet ruller hen til første fejl.
3. **Tydeligere knap** – «Opret bestilling» viser antal services og beløb («Opret · 2 services · 850 kr uden moms»); er noget mangler, står der hvad («Mangler email»).
4. **Advarsel ved lukning** – lukker man vinduet med udfyldte felter, spørges «Kassér bestilling?», så arbejde ikke tabes ved et fejlklik.
5. **Startdato smartere** – standard i dag/i morgen som hurtigknapper ved siden af datovælgeren; ved flere services kan én dato bruges for alle («Samme dato for alle»).
6. **Erhvervskunde-oprydning** – adressefeltet vises kun én gang (i dag står det dobbelt i koden for erhverv/privat), og CVR-boksen får samme stil som resten.
7. **Mørkt tema og mobil** – gennemgang af kontrast i mørkt tema (mærker, gul varenr., røde Fjern-knapper) og at bundlinjen ikke dækker indhold på 320–390 px.
8. **Hurtigtaster på computer** – Enter i søgefeltet tilføjer øverste service; Ctrl/Cmd+Enter opretter bestillingen.

## Ikke ændret
Priser beregnes stadig af serveren; «uden moms» bevares; ingen ændring af mails eller oprettelseslogik.

## Teknisk
- `CreateManualOrderDialog.tsx`: kundesøgning via eksisterende `customers`-forespørgsel (business-scoped), `errors`-state pr. felt med `aria-invalid` og `scrollIntoView`, `isDirty`-tjek + `AlertDialog` på `onOpenChange(false)`, samlet adressefelt, dynamisk knaptekst, Ctrl+Enter-handler.
- `ServicePicker.tsx`: Enter tilføjer første søgeresultat; dark-mode-tokens for mærker.
- Startdato: hurtigknapper + «Samme dato for alle»-toggle i dialogens state.
- Verifikation med Playwright som ejer af Jimmy's VP ved 390 og 1351 px, lyst og mørkt tema; ingen rigtig bestilling oprettes.
