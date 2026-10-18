# Project architecture rules

- Appointment details share `AppointmentDetailsHeader` and `appointment-details-overlay` so portals retain the planner theme.
- Checkout seats use server allocation/active-seat floors and period-matched prices to prevent underpayment.
- Validate suggestion stops against the route and employees against its business before RLS-protected writes.

- Business/employee navigation shares `PanelShell`/`SidebarParts`; admin keeps compatibility exports and `service-panel-*`. Never duplicate role layouts.
- Resolve checklist versus map guide before mounting Leaflet or continuous GPS to prevent map flashes and battery waste.
- Header/session icons use monochrome `PanelIcon`; compact artwork uses `UiArtwork`. Filled-button artwork uses a light contrast chip.
- Illustrations use `BrandedIllustration`; `PanelIcon`/customer variants reuse assets to avoid duplicates.
- Service VAT wording is presentation-only; service emails share `_service-price.ts`, while stored amounts and server pricing stay unchanged to avoid double taxation or changing platform-plan pricing.
- Official profile URLs use `src/lib/social-links.ts` for consistent links and organization data.
- Public SEO uses registries and seo-prerender-head; client tags preserve full text and public-origin canonicals unless a business supplies its domain.
- Leads normalize into `quote_requests`/`quote_request_matches`; provider connections/credentials stay server-side and business-scoped for one secure source of truth.
- Meta source selection groups linked Instagram and lead forms under Facebook Pages, since Meta exposes Instagram leads through the Page.
- Meta OAuth uses `https://serviceydere.dk/meta/callback`, forwarding authorization to the server callback to keep preview/production configuration stable.
- Restarted employee workdays preserve prior elapsed seconds in `accumulated_seconds` and open a new active interval, so completed appointments and precise time history remain intact.
- Employee pages share `EmployeePage`; driving is full-screen; profiles share `ProfileEditSheetLayout`, with employee self-edits limited to name/avatar. Account saves upsert by user ID to repair missing rows; auth metadata is secondary.
- Archived routes cannot remain recurrence anchors or enter projection queries, preventing deleted routes from resurfacing as ghost routes.
- Route printing consumes the loaded calendar route collection and applies date and content selection inside the print workspace, keeping one source of truth for preview and paper output.
- Authenticated employee geocoding prefers the business Google server key then Maps connector; server calls protect keys and distinguish key, service and unmatched-address errors.
- Address suggestions share debounce, deduplication and bounded caching; signed-in users use the private Google proxy, guests an unmetered provider with bounded requests and exact postal towns.

- Business tab fallbacks share eagerly imported registry skeletons, preventing blank lazy fallbacks; empty customer lists use shared `NoItemsIcon`.

- Local Vite proxies hosted asset-pointer paths to the public app domain so original CDN icons render in sandbox checks without replacing user artwork.

- Mobile/touch field font rules cover portals; prevent focus zoom, preserve pinch zoom.

- Route weather shares stop-cell forecast averages across staff/calendar; no country fallback.
- Employee cards, next-route actions and locks share scheduled-start ordering with stable fallbacks.
- Compact planning uses a bounded calendar, scrollable drawer and tap assignment; desktop retains drag. Dialogs share names/employees and scrolling; density/detail persist independently.
- Employee edits send pricing inputs; RPCs compute prices and put recurring orders in the unassigned pool.
- BlueFlowBackground is lazy, token-based, pointer-free and pauses when hidden; heroLight/heroDark variants isolate CTA contrast from brand gradients.
- Panel headers share `PageHeader`/`.panel-page-hero` styling.
- Public navigation persists outside suspense; local headers defer to avoid duplicates.
- Driving/HUD rules live in `src/components/employee-route/AGENTS.md`.
- City landing pages for new trades come from `src/pages/cities/branchRegistry.ts` + shared `cityFacts.ts`; sitemap, prerender titles and `/by` hubs derive from it so one registry drives every trade-city page.
- Database-triggered accounting kicks authenticate with the DB-only server token (never the anon key) and use letter-prefixed setting names, so instant sync works for every business id; failures log a warning and the scheduled run is the safety net.
- Accounting document emails use private signed PDF links; credit retries reuse the stored credit ID to avoid issuing duplicate credits.
- Employee cancellation validates assigned stops server-side. Business cancellation probes credit capabilities; credit must succeed before cancellation, preventing uncredited invoices.
- Temporary hourly tests use the exact isolated test key and legacy completed-order cycles; normal calendar-day recurrence safeguards remain unchanged.
