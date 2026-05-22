## Mål
Gøre virksomhedspanelet (Admin) brugervenligt på mobil (≤640 px) og tablet (641–1024 px) — uden at ændre desktop-oplevelsen eller forretningslogik.

## Hvad jeg ændrer

### 1. AdminShell (rammen om alle sider)
- **Mobil topbar:** kompakt højde (h-12 på <sm), titel-trunkering forbedres, "Kundeservice"-knap bliver ikon-only på mobil (allerede halvvejs), `topbarRight` (fx Ruteplanlæggerens dato-nav) flyttes til en sekundær linje under headeren på <sm så den ikke kollidere med titlen.
- **Bottom tab bar på mobil (≤lg):** ligesom i medarbejderpanelet — 4 mest-brugte tabs (Overblik, Aftaler, Ruter, Kunder) i en sticky bund-bar med ikon + label. Resten åbnes via "Mere"-knap der trigger den eksisterende sidebar-drawer. Hamburger-knappen bevares men flyttes ind i topbar-venstre.
- **Sidebar-drawer:** bredere på små skærme (fra 264 → 84vw max 320 px), tilføj swipe-to-close gesture, blød backdrop-blur.

### 2. Aftaler (AftaleTab)
- Filter-chips: indpak i `overflow-x-auto` skuffe på <sm så de scroller vandret i stedet for at fylde 4 rækker.
- Aftale-kort header: stack info-blokke (kunde / status / beløb) lodret på <sm, action-menu bliver ikon-only.
- Sortér-dropdown: full-width på <sm.

### 3. Kunder (CustomersTab)
- Skjul Indtjening/Ordrer-kolonner på <sm; vis dem som små chips under kundenavnet i stedet.
- Filterbar wrap'er, søgefelt får fuld bredde på mobil.

### 4. Medarbejdere (EmployeesTab)
- Tabel-rækker bliver kort-layout på <sm (status + indtjening som linje 2).

### 5. Overblik (DashboardTab)
- KPI-grid: `grid-cols-2` på mobil (i stedet for 1), `lg:grid-cols-4` på desktop. Grafer fylder fuld bredde, akselabels skaleres ned på <sm.

### 6. Services (ServicesTab)
- Action-bar (Tilføj service + filtre): action-knappen flyttes ned under filtrene på mobil.
- Service-kort: kompakt mode på <sm (færre badges synlige, "vis mere" knap).

### 7. Indstillinger (SettingsTab)
- Lange sektion-kort: `p-4` på mobil (i stedet for `p-6`), inputs får fuld bredde, knapper stack lodret.

### 8. Regnskab (AccountingTab) + Data-import + Livechat
- Sikre `overflow-x-auto` på tabeller, dialoger bruger fuld højde/bredde på mobil (`max-w-full h-dvh`).

### 9. Dialoger generelt
- Tjek at alle redigeringsdialoger (CustomerEditDialog, LeadDetailDialog mv.) bruger `sm:max-w-lg` mønstret korrekt og at de er scrollbare på mobil.

## Tekniske detaljer
- Ny komponent: `AdminBottomNav` i `src/components/admin/shared/AdminBottomNav.tsx` — bottom-bar med 4 hovedtabs + "Mere".
- Opdaterer kun ramme + page-niveau layoutklasser; ingen ændring af data, queries eller business logic.
- Bruger eksisterende semantic tokens (`bg-background`, `border-border`, `text-foreground`).
- Følger samme mønster som det allerede etablerede `EmployeeShell.tsx` (top bar + bottom nav på <lg).

## Hvad jeg IKKE ændrer
- Desktop-layout (≥lg) bevares præcis som nu.
- Ruteplanlæggeren (`/virksomhed/ruter`) får kun topbar-justering — selve drag/drop og kalender-layout røres ikke i denne omgang.
- Ingen ændringer i ordrer, kunder, fakturering, regnskab-integration eller andre datalag.

Klar til at gå i gang?
