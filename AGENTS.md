# Project architecture rules

- Appointment details use `AppointmentDetailsHeader`/`appointment-details-overlay`; creation uses `SheetHeaderBlock`/`Section`/`SheetFooterBar`; planner utilities use `PlannerDialogHeader` with fixed footer and scrolling body for consistent artwork and clearance.
- Checkout seats use server allocation/active-seat floors and period-matched prices to prevent underpayment.
- Validate suggestion stops against the route and employees against its business before RLS-protected writes.

- Role shells share `PanelShell`/`SidebarParts` and registry-based top navigation (no bottom bar); PanelShell owns bottom clearance. Keep admin compatibility exports.
- Resolve checklist versus map guide before mounting Leaflet or continuous GPS to prevent map flashes and battery waste.
- Header/session icons use monochrome `PanelIcon`; compact artwork uses `UiArtwork`. Filled-button artwork uses a light contrast chip.
- Illustrations use `BrandedIllustration`; `PanelIcon`/customer variants reuse assets to avoid duplicates.
- Service VAT wording is presentation-only; service emails share `_service-price.ts`, while stored amounts and server pricing stay unchanged to avoid double taxation or changing platform-plan pricing.
- Official profile URLs come from `src/lib/social-links.ts`.
- Public SEO uses shared registries (including garden hub metadata) and seo-prerender-head to prevent snippet drift; canonicals use public origin unless a business supplies its domain.
- Leads normalize into `quote_requests`/`quote_request_matches`; provider connections/credentials stay server-side and business-scoped for one secure source of truth.
- Meta source selection groups linked Instagram and lead forms under Facebook Pages, since Meta exposes Instagram leads through the Page.
- Meta OAuth uses `https://serviceydere.dk/meta/callback`, forwarding authorization to the server callback to keep preview/production configuration stable.
- Restarted employee workdays preserve prior elapsed seconds in `accumulated_seconds` and open a new active interval, so completed appointments and precise time history remain intact.
- Employee pages share `EmployeePage`; driving is full-screen; profiles share `ProfileEditSheetLayout`, with employee self-edits limited to name/avatar. Account saves upsert by user ID to repair missing rows; auth metadata is secondary.
- Archived routes are never recurrence anchors or projection inputs, preventing ghost routes.
- Printing filters loaded calendar routes so preview and paper match.
- Authenticated employee geocoding prefers the business Google server key then Maps connector; server calls protect keys and distinguish key, service and unmatched-address errors.
- Address suggestions share debounce, deduplication and bounded caching; signed-in users use the private Google proxy, guests an unmetered provider with bounded requests and exact postal towns.

- Business tab fallbacks share eagerly imported registry skeletons, preventing blank lazy fallbacks; empty customer lists use shared `NoItemsIcon`.

- Mobile/touch field font rules cover portals; prevent focus zoom, preserve pinch zoom.

- Route weather shares stop-cell forecast averages across staff/calendar; no country fallback.
- Employee cards, next-route actions and locks share scheduled-start ordering with stable fallbacks.
- Compact planning uses a day agenda and tap assignment; desktop retains drag. Cards share state, spacing and portal styles; density excludes appointment content. Dialogs share scrolling; hover cards portal; planner actions sit in one toolbar; density/detail persist independently.
- Employee edits send pricing inputs; RPCs compute prices and put recurring orders in the unassigned pool.
- BlueFlowBackground is lazy, token-based, pointer-free and pauses when hidden; heroLight/heroDark variants isolate CTA contrast from brand gradients.
- Panel headers share `PageHeader`/`.panel-page-hero`; public navigation stays outside suspense without duplicate local headers.
- Driving/HUD rules live in `src/components/employee-route/AGENTS.md`.
- Trade-city pages, sitemap, prerender titles and `/by` hubs derive from `branchRegistry.ts` and `cityFacts.ts` for consistency.
- Database-triggered accounting kicks authenticate with the DB-only server token (never the anon key) and use letter-prefixed setting names, so instant sync works for every business id; failures log a warning and the scheduled run is the safety net.
- Accounting document emails use private signed PDF links; credit retries reuse the stored credit ID to avoid issuing duplicate credits.
- Employee cancellation uses a caller-JWT SECURITY DEFINER preflight before crediting. Business cancellation probes credit capabilities; credit must succeed before cancellation.
- Hourly tests stay isolated; order progress uses recurrence sequence and only the active subscription owner shows a next date.
- Owner e-mails queue in `business_owner_alerts`, drained by `customer-notifications-dispatch` with send-time setting checks; reminder lead time resolves agreement > customer > business in the queue trigger.
