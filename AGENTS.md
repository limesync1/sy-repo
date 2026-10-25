# Project architecture rules

- Platform signup alerts use a fixed server-side recipient/template and event-ID idempotency; waitlist inserts occur in the dedicated signup function and business alerts read authorized persisted records, so browsers cannot choose recipients or forge signup details.

- Auth entry points share normalized email, safe signup outcomes and Danish errors; never infer account existence from obfuscated signup users, and only recovery links/events authorize the public password-reset form, to avoid false success and ordinary-session resets.
- Public sections prewarm their chunks separately from mounting effects; both section and staggered page prefetch respect data-saving connections, so visible content and navigation retain priority.
- Loading fallbacks consume browser-storage hints once and tolerate blocked storage; chunk reload guards last for the session because elapsed time does not prove successful loading.

- Appointment details use `AppointmentDetailsHeader`/`appointment-details-overlay`; creation uses `SheetHeaderBlock`/`Section`/`SheetFooterBar`; planner utilities use `PlannerDialogHeader` with fixed footer and scrolling body for consistent artwork and clearance.
- Checkout seats use server allocation/active-seat floors and period-matched prices to prevent underpayment.
- Validate suggestion stops against the route and employees against its business before RLS-protected writes.

- Role shells share `PanelShell`/`SidebarParts` and registry-based top navigation (no bottom bar); PanelShell owns bottom clearance. Keep admin compatibility exports.
- Resolve checklist versus map guide before mounting Leaflet or continuous GPS to prevent map flashes and battery waste.
- Header/session icons use monochrome `PanelIcon`; compact artwork uses `UiArtwork`. Filled-button artwork uses a light contrast chip.
- Illustrations use `BrandedIllustration`; `PanelIcon`/customer variants reuse assets to avoid duplicates.
- Service VAT wording is presentation-only; service emails share `_service-price.ts`, while stored amounts and server pricing stay unchanged to avoid double taxation or changing platform-plan pricing.
- Profile URLs use `src/lib/social-links.ts`.
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

- Business fallbacks use immediate destination-tab registry skeletons; empty customers use `NoItemsIcon`. Shared skeletons constrain widths, wrap filters, and skip offscreen painting; public placeholders never mount WebGL. Lazy customer/order hosts isolate modal state and keep values through exit.

- Mobile/touch field font rules cover portals; prevent focus zoom, preserve pinch zoom.

- Route weather shares stop-cell forecast averages across staff/calendar; no country fallback.
- Employee cards, next-route actions and locks share scheduled-start ordering with stable fallbacks.
- Compact planning uses a day agenda and tap assignment; desktop retains drag. Cards share state, spacing and portal styles; density excludes appointment content. Dialogs share scrolling; hover cards portal; planner actions sit in one toolbar; density/detail persist independently.
- Employee edits send pricing inputs; RPCs compute prices and put recurring orders in the unassigned pool.
- Public/auth BlueFlowBackground uses a lightweight native WebGL shader (not the 3D scene engine), token phases, bounded resolution, visibility/motion pausing and a first-painted-frame reveal over a color-matched fallback to keep public-page JavaScript small; nearby homepage sections render eagerly while distant sections mount ahead of the viewport.
- Homepage photos share CDN WebP variants and JSON metadata across images, SEO and sitemaps. Normalize photo canvases without cropping subjects to one ratio; DOM/WebGL keep a fixed frame to prevent layout movement and inner bars. Static homepage head preloads only the first responsive photo and route heads remove that preload; runtime preloads only the next photo and pauses hidden/reduced-motion timers to prioritize visible content.
- Panel headers share `PageHeader`/`.panel-page-hero`. Persistent public navigation shares audience groups and account actions and publishes its measured height for sticky public filters, preventing overlap across tablet sizes.
- Driving/HUD rules live in `src/components/employee-route/AGENTS.md`.
- Trade-city pages, sitemap, prerender titles and `/by` hubs derive from `branchRegistry.ts` and `cityFacts.ts` for consistency.
- Database-triggered accounting kicks authenticate with the DB-only server token (never the anon key) and use letter-prefixed setting names, so instant sync works for every business id; failures log a warning and the scheduled run is the safety net.
- Accounting document emails use private signed PDF links; credit retries reuse the stored credit ID to avoid issuing duplicate credits.
- Employee cancellation uses a caller-JWT SECURITY DEFINER preflight before crediting. Business cancellation probes credit capabilities; credit must succeed before cancellation.
- Hourly tests stay isolated; order progress uses recurrence sequence and only the active subscription owner shows a next date.
- Owner alerts queue with send-time checks; reminder lead time resolves agreement > customer > business. `customer-visit-date.ts` formats dates without internal arrival/start estimates to avoid false promises.
