# Telefonappen til både virksomhedsejere og medarbejdere

## Det oplever brugeren
1. **Startskærm:** Når appen åbner, vises Serviceydere-logoet på hvid baggrund, og derefter toner appen blødt frem.
2. **Velkomstside, første gang:** «Hvem er du?» med to store kort:
   - **Virksomhedsejer** – planlæg ruter, kunder og aftaler
   - **Medarbejder** – se din rute og registrér tid
3. **Log ind:** En login-side tilpasset appen, med valget øverst og «Skift» for at gå tilbage. Den har ingen menu og intet indhold fra den offentlige hjemmeside.
4. **Næste gang:** Appen husker valget og hvem der er logget ind, og åbner direkte i virksomhedspanelet eller medarbejderdelen.
5. **Skift mellem roller:** I profilmenuen kan man vælge «Skift rolle» eller «Log ud», så man kommer tilbage til velkomstsiden.
6. **Opret virksomhed:** Ejere uden konto kan trykke «Opret virksomhed». Det bruger det eksisterende forløb med bekræftelseskode på mail.

## Fungerer som en app og passer til alle skærme
- Ingen offentlig topmenu, bundtekst, cookiebanner eller chatboble inde i appen.
- Ens luft om iPhone-notch, Dynamic Island, Androids statuslinje, navigationsknapper og hjemmelinjen. Det gælder også i virksomhedspanelets topbjælke, bundmenu, sidevinduer, dialoger og faste knapper.
- Androids tilbage-knap går et trin tilbage. På velkomstsiden lukker den appen.
- Telefonens statuslinje får farve, der passer til hver side.
- Hvis der ikke er net, vises en dansk besked med «Prøv igen» i stedet for en tom side.
- Ingen automatisk zoom i felter. Touchflader er mindst 44 px.

## Gennemtjek
- Afprøves i forhåndsvisningen på 360×640, 390×844 (notch-simulering), 412×915 og tablet 820×1180 i begge roller: velkomst, log ind, overblik, ruter, vinduer, medarbejderens køreskærm.
- Tests for valg af rolle, husket valg og hvilken side appen åbner.

## Det skal du gøre bagefter
Fordi appen indlæser den live hjemmeside, kommer de fleste ændringer ud med det samme, når du udgiver. Startskærmen, tilbage-knappen og statuslinjen er derimod en del af selve appen. Derfor skal der bygges en ny app (APK og iPhone-build via Codemagic), og udgivelsesguiden opdateres. Appens navn i butikkerne ændres fra kun medarbejder til «Serviceydere».

## Tekniske detaljer
- `capacitor.config.ts`: start-URL `/app` i stedet for `/medarbejder`; tilføj `@capacitor/splash-screen` (launchAutoHide false, hides once React is ready), `@capacitor/status-bar` og `@capacitor/app` (backButton).
- Ny rute `/app` (`NativeAppEntry`): rollevalg gemt i `src/lib/native-role.ts` (localStorage med fallback ved blokeret lager); har brugeren en session, vælges `/virksomhed` eller `/medarbejder` ud fra den eksisterende rolleopslag, ellers vises valget.
- `main.tsx`: fjern omdirigering `/` til `/medarbejder`; native sender `/` til `/app`. Tilføj `native-app`-klasse på `<html>`, som skjuler offentlige elementer.
- Login (`Auth`) får `?rolle=ejer|medarbejder` og en kompakt app-visning; efter login går man til den valgte rolles panel, eller får en dansk besked hvis kontoen ikke har den rolle.
- Safe-area: fælles CSS-variabler (`--sat/--sab`) brugt af `PanelShell`, `AdminShell`s bundmenu, Sheet/Dialog-footers og `EmployeePage`; viewport-fit håndteres som i dag med native insets.
- Native splash- og ikonressourcer genereres for Android/iOS (hvid baggrund + logo, også i mørk tilstand).
- `AGENTS.md`-reglen om at "native app er medarbejderpanelet" erstattes; `app-install.ts`/`AppInstallCard` og publishing-guiden opdateres til begge roller.
