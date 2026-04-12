

# Fix: Layout, bredde og responsivt design

## Identificerede problemer

1. **App.css `#root` styles** — Vite's standard `max-width: 1280px`, `padding: 2rem` og `text-align: center` begrænser hele sidens layout og tilføjer uønsket padding
2. **`h-13` er ikke en standard Tailwind-klasse** — Knapperne i Hero og GetQuotes bruger `h-13` som ikke findes i Tailwind v3, så de får forkert højde
3. **Pile i "Sådan virker det"** — `absolute -right-3` clipper uden for kortet og vises forkert
4. **Sektionsbredder er uens** — Nogle sektioner bruger `max-w-4xl`, andre `max-w-5xl`, og hero bruger `max-w-3xl`/`max-w-xl`

## Plan

### 1. Fjern App.css default styles
Ryd `#root`-blokkken i `src/App.css` (fjern max-width, padding, text-align) så landing page'n fylder fuld bredde.

### 2. Fix knaphøjde
Tilføj `h-13` spacing i `tailwind.config.ts` under `extend.spacing` (eller erstat `h-13` med `h-[3.25rem]` i HeroSection og GetQuotes).

### 3. Fix pile i HowItWorks
Flyt pilene så de placeres korrekt mellem kortene ved at bruge `gap`-baseret layout i stedet for `absolute -right-3`, eller juster positionen til `-right-6` med `overflow-visible` på containeren.

### 4. Ensret sektionsbredder
Sørg for at alle sektioner bruger konsistent `max-w`-bredde og at container-padding er ens på tværs af sektionerne.

### 5. Mobil-responsivitet
- Reducer heading-størrelse på mobil (allerede delvist gjort med `md:text-4xl`)
- Sørg for at kategori-grid går fra 2 kolonner på mobil til 4 på desktop
- Juster padding/margins til mobil

### Filer der ændres
- `src/App.css` — Fjern #root constraints
- `tailwind.config.ts` — Tilføj h-13 spacing
- `src/components/landing/HowItWorks.tsx` — Fix pileplacering
- `src/components/landing/HeroSection.tsx` — Juster knap/input højde
- `src/components/landing/GetQuotes.tsx` — Juster knaphøjde

