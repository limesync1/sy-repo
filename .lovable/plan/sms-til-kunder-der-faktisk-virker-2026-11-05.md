# SMS til kunder, der faktisk virker

## Hvad der er galt i dag
- Systemet til SMS findes allerede: der er SMS-skabeloner i Indstillinger, og beskederne lægges i kø. Afsendelsen går gennem én fælles Twilio-konto.
- 19 SMS'er er fejlet med en uklar fejl, og 80 venter stadig i køen. Den rigtige fejlbesked fra Twilio bliver væk undervejs, så vi kan ikke se årsagen.
- Twilio er sat op til at sende fra et telefonnummer. Danske numre kræver godkendelse og er besværlige. Afsendernavnet er også fast "Serviceyder" og ikke virksomhedens eget navn.
- Ingen kan se, om en SMS er sendt, kommet frem eller fejlet. Der er heller ingen grænse for forbrug eller betaling for SMS.

## Anbefaling: Én fælles SMS-konto for hele Serviceydere
Virksomhederne skal **ikke** selv oprette Twilio eller noget andet. Serviceydere sender på deres vegne, og virksomheden slår bare SMS til med én knap.

Valg af udbyder:
- **GatewayAPI (dansk, anbefales):** ca. 0,25–0,35 kr. pr. SMS i Danmark og hurtig levering. Afsenderen kan være et navn uden telefonnummer, fx "JimmysVP". Kontoen tilknyttes lige så nemt som Twilio.
- **Twilio (bruges nu):** virker globalt, men er dyrere i Danmark (ca. 0,50+ kr.), og opsætningen af afsender er mere besværlig.

Twilio-kontoen beholdes som reserve, så vi kan skifte, hvis den ene udbyder fejler.

## Sådan bliver det for virksomheden
1. Indstillinger › Beskeder til kunder › "Send også SMS" – én knap.
2. Afsendernavnet udfyldes automatisk ud fra virksomhedens navn (højst 11 tegn) og kan rettes.
3. Knappen "Send test-SMS til mig selv".
4. En lille oversigt viser sendt, kommet frem og fejlet denne måned, og hvad det koster.
5. Dårlige telefonnumre markeres på kunden ("Nummeret ser forkert ud").

## Betaling
- Fuldt system: et antal gratis SMS pr. måned (fx 100), og derefter en fast pris pr. SMS på månedsregningen.
- Der er en loftgrænse pr. måned, som virksomheden selv kan sætte, så der aldrig kommer en overraskende regning.
- Kun profil: ingen SMS.

## Trin
1. **Ret fejlene nu:** Vis Twilios rigtige fejlbesked, find årsagen til de 19 fejl og ryd op i de 80 ventende (gamle beskeder sendes ikke).
2. **Fælles afsendelse:** Én afsendelse, der vælger udbyder (GatewayAPI først, Twilio som reserve), sender med virksomhedens navn og retter danske numre.
3. **Status:** Gem leveringsstatus fra udbyderen pr. SMS og vis den i oversigten.
4. **Indstillinger:** Knappen, afsendernavn, test-SMS, forbrug og loftgrænse.
5. **Betaling:** Tælle forbrug pr. måned og lægge det på regningen.
6. **Sikkerhed:** Kun danske og evt. nordiske numre, grænse pr. kunde pr. dag (mod misbrug), og importerede testkunder får stadig aldrig SMS.

## Hvad du skal gøre
- Vælge udbyder (GatewayAPI anbefales). Opret en gratis konto, og forbind den, når jeg viser et kort i chatten.
- Bestemme antal gratis SMS og prisen pr. SMS.

## Tekniske detaljer
- `send-sms` får en provider-adapter (GatewayAPI `/mobile/single` via connector gateway, Twilio fallback), afsender = alfanumerisk businessnavn, returnerer provider-status og fejltekst.
- Dispatcher læser `FunctionsHttpError`-body, så den rigtige fejl gemmes i `last_error`. Pending-jobs ældre end deres event annulleres.
- Ny tabel `sms_messages` (business_id, queue_id, provider, provider_id, status, segments, cost) plus leveringswebhook. Månedlig forbrugsvisning og loftgrænse håndhæves på serveren før afsendelse.
- Feltet `sms_sender_name` valideres server-side (3–11 tegn, A–Z/0–9).
