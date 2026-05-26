
# Smartere ruteplanlægger

Seks forbedringer der hænger sammen: kapacitet/skills danner fundamentet, zoner og historik fodrer forslagsmotoren, og kalenderens UX-signaler viser resultatet. Alt er forslag — intet sker automatisk uden brugerens accept.

## 1) Forslagsmotor for nye ordrer (#2)

Når en ny ordre/aftale skal indplaceres, åbnes en "Foreslå rute"-dialog med top-3 ruter scoret efter:

- **Afstand**: nærmeste eksisterende stop på ruten (km, via haversine + zone-bonus)
- **Ledig kapacitet**: timer/km/stops tilbage ift. medarbejderens grænser (#4)
- **Skill-match**: kræver service X → kun medarbejdere med skill X scorer højt (#4)
- **Tidsvindue-fit**: ETA passer ind i kundens preferred-vindue
- **Vejr-egnethed**: udendørs service + regn = lavere score (#7)

Brugeren ser tre kort med score-breakdown ("Tæt på 3 andre stop · 4 t ledig · matcher skills") og vælger selv — eller springer over og placerer manuelt.

## 2) Kapacitet & skills pr. medarbejder (#4)

**Nyt schema**:
- `employees`: `max_hours_per_day`, `max_km_per_day`, `max_stops_per_day` (alle nullable, defaults virker som i dag)
- `employee_skills` (n:n): employee_id, service_id — hvilke services kan en medarbejder udføre
- UI i medarbejder-redigering: tre talfelter + skill-multiselect over alle aktive services

**Brug i planlæggeren**:
- Forslagsmotor + valideringer bruger faktiske grænser i stedet for hardcoded `capacityPerDay: 12`
- Når en rute overskrider en medarbejders grænse → orange advarsel + suggestion "Skift til [navn]" hvis anden ledig medarbejder har matchende skills
- Drop af stop hvor service ikke matcher medarbejderens skills → rød fejl med foreslået alternativ

## 3) Geografiske zoner (#5)

- Auto-grupperer kunder pr. postnummer-zone (eksisterer i `dk-postcodes`)
- Cacher zone på `customers.zone_key` (migration + trigger ved adresseændring)
- Forslagsmotor får zone-bonus: stop i samme zone som rutens tyngdepunkt scorer +20%
- Kalenderen kan farve stops efter zone (lille farveprik) så brugeren visuelt ser "rute der spreder sig over 4 zoner = ineffektiv"

## 4) Vejr-aware planlægning (#7)

- Eksisterende `WeatherBadge` udvides så `services` får et `weather_sensitive` boolean (default false)
- Brugeren markerer fx "Tagrensning", "Facaderens", "Vinduespudsning udvendigt" som vejrfølsomme
- Når en rute indeholder vejrfølsomme stops og vejrudsigten viser regn/storm → gul advarsel i kalenderen + suggestion "Foreslå flytning til [nærmeste tørre dag]"
- Indendørs services ignoreres helt

## 5) Læring fra historik (#8)

- Ny tabel `service_duration_history`: service_id, employee_id, estimated_min, actual_min, completed_at
- Trigger: ved stop-completion gemmes faktisk tid (departure - arrival)
- Cron-funktion (ugentlig): opdaterer `services.estimated_duration_minutes` mod rullende 30-dages gennemsnit (kun hvis >5 datapunkter, max ±30% justering pr. kørsel — undgår wild swings)
- UI: lille badge på service-edit "Justeret fra 45 → 52 min baseret på 23 udførelser"

## 6) UX-signaler i kalenderen (#9)

- **Kapacitetsbar pr. dag**: tynd bar i bunden af hver dag-celle, grøn→gul→rød efter timer brugt/max
- **Tom-kørsel mellem stops**: hvis to nabostops er >25 km fra hinanden, vis en lille grå linje i ruten med "↔ 32 km tom" 
- **Skill-mismatch ikon**: lille rødt advarselsikon på stop hvor tildelt medarbejder mangler skill
- **Zone-prik**: farveprik på stop-kortet for zone-tilhørsforhold
- **Dag-KPI**: ved hover på dag vises "8 stop · 6,2 t · 47 km · 1 advarsel"

## Implementationsrækkefølge (fordi de afhænger af hinanden)

1. **Schema**: employee capacity-felter, employee_skills, services.weather_sensitive, customers.zone_key, service_duration_history (én migration)
2. **Kapacitet/skills UI**: redigeringsdialog for medarbejdere + skill-multiselect
3. **Forslagsmotor (#2)**: ny RPC `suggest_route_for_stop` + frontend dialog
4. **Validering opgradering**: route-validation bruger faktiske grænser
5. **Zoner (#5)**: backfill zone_key + zone-bonus i forslagsmotor + visuel prik
6. **Vejr (#7)**: weather_sensitive checkbox + advarsel i kalender
7. **Historik (#8)**: trigger + cron + badge på service
8. **UX-signaler (#9)**: kapacitetsbar + tom-kørsel + KPI hover

## Teknisk

- Alt sker DB-side hvor muligt (RPCs) for at undgå race conditions
- Forslagsmotor returnerer top-3 med fuld breakdown — UI viser bare resultatet
- Skills lagres som n:n så en medarbejder kan have mange og en service mange medarbejdere
- Vejr-data caches 6 timer pr. postnummer (eksisterende `useWeather` hook)
- Historik-cron beskytter mod outliers (kun datapunkter inden for 2σ tæller)

## Hvad jeg IKKE bygger (med vilje)

- Trafik-API (kræver Mapbox-key/cost vurdering — vi bruger eksisterende OSRM)
- Fuld TSP-optimering (det er #1 fra listen, ikke bestilt)
- Automatisk tildeling uden brugerens accept (du sagde eksplicit nej til det)
