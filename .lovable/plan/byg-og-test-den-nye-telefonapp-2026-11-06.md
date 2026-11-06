# Byg og test den nye telefonapp

## Det kan jeg ikke selv
- **Starte Codemagic:** bygningen startes fra din Codemagic-konto. Den kræver dit Apple-login og din App Store-nøgle, og dem har jeg ikke adgang til.
- **Teste på en rigtig iPhone eller Android-telefon:** jeg har ingen telefon eller iPhone-simulator. En Android-emulator kan ikke køre her.

Derfor gør jeg alt det andet. Til sidst får du en kort tjekliste til 5 minutters test på din egen telefon.

## Det gør jeg
1. **Gør appen klar til at blive bygget**
   - Lægger startskærm, statuslinje og tilbage-knap ind i Android- og iPhone-projektet.
   - Retter Codemagic-opsætningen, så den også bygger en Android-app, der kan installeres. Den bliver mailet til dig sammen med iPhone-testversionen via TestFlight.
   - Appens navn og beskrivelse siger «Serviceydere» for ejere og medarbejdere, ikke kun medarbejdere.
2. **Bygger selv Android-appen her**
   - Jeg bygger en rigtig installérbar Android-fil i sandkassen. Så finder jeg byggefejl, før Codemagic gør. Du får filen i Filer, så du kan installere den direkte på en Android-telefon.
3. **Tester alt, hvad der kan testes uden telefon, på telefonstørrelser (360, 390 med notch, 412 og tablet 820)**
   - Valgsiden «Hvem er du?» → log ind som ejer med testkontoen Klar Vinduer → virksomhedspanelet åbner.
   - Valget huskes ved genåbning. «Log ud» fører tilbage til valgsiden.
   - Medarbejder-valg → medarbejderens login.
   - Notch og bundlinje dækker ingen knapper i topbjælke, bundmenu, vinduer og køreskærm.
   - Tilbage-knappen: lukker først åbent vindue, går så et trin tilbage, lukker appen fra valgsiden (automatisk test af logikken).
   - Offline-besked og «Prøv igen».
   - Startskærmen skjules, når siden er klar, og senest efter 4 sekunder.
4. **Retter alle fejl, jeg finder** undervejs, og kører testene igen.

## Det skal du gøre bagefter
1. Udgiv, så valgsiden ligger på serviceydere.dk.
2. Start Codemagic-bygningen med ét klik. Jeg skriver præcis hvor.
3. Følg tjeklisten på telefonen: startskærm, valg, log ind, tilbage-knap, notch og log ud. Sig til, hvis noget ser forkert ud, så retter jeg det.

## Tekniske detaljer
- `bun run build` + `npx cap sync android ios` for at registrere SplashScreen/StatusBar/App-plugins i native-projekterne; tjek `android/app/src/main/res` splash-ressourcer og iOS `LaunchScreen`.
- Android SDK via nix (cmdline-tools, platform 35, build-tools) og `./gradlew assembleDebug` i sandkassen; APK kopieres til `/mnt/documents/`.
- Tilføj `android-apk`-workflow i `codemagic.yaml` (linux-instans, debug-APK som artefakt, mail til william@serviceydere.dk).
- Flyt back-button-beslutningen til en ren funktion i `native-shell.ts` med vitest-test; Playwright-scripts med simulerede safe-area-insets.
