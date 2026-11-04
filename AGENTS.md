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
- Profile URLs use `src/lib/social-links.ts`.
- Service VAT wording is presentation-only; service emails share `_service-price.ts`, while stored amounts and server pricing stay unchanged to avoid double taxation or changing platform-plan pricing.
- Public SEO uses shared registries (including garden hub metadata) and seo-prerender-head to prevent snippet drift; canonicals use public origin unless a business supplies its domain.
- Public topic recommendations and legacy city metadata share `src/seo` sources between browser and initial HTML; article prerendering fails on missing content, and client navigation removes prior prerender entities to prevent stale page attribution.
- Leads normalize into `quote_requests`/`quote_request_matches`; provider connections/credentials stay server-side and business-scoped for one secure source of truth.
- Meta source selection groups linked Instagram and lead forms under Facebook Pages, since Meta exposes Instagram leads through the Page.
- Meta OAuth uses `https://serviceydere.dk/meta/callback`, forwarding authorization to the server callback to keep preview/production configuration stable.
- Restarted employee workdays preserve prior elapsed seconds in `accumulated_seconds` and open a new active interval, so completed appointments and precise time history remain intact.
- Employee pages share `EmployeePage`; driving is full-screen; profiles share `ProfileEditSheetLayout`, with employee self-edits limited to name/avatar. Account saves upsert by user ID to repair missing rows; auth metadata is secondary.
- Open employee stop details resolve IDs against current query data; chat messages and drafts are conversation-scoped and cancelled loads cannot overwrite another conversation, preventing stale details and misdirected replies.
- Archived routes are never recurrence anchors or projection inputs, preventing ghost routes.
- Printing filters loaded calendar routes so preview and paper match.
- Authenticated employee geocoding prefers the business Google server key then Maps connector; server calls protect keys and distinguish key, service and unmatched-address errors.
- Address suggestions share debounce, deduplication and bounded caching; signed-in users use the private Google proxy, guests an unmetered provider with bounded requests and exact postal towns.
- CVR auto-lookup requires direct field input, never prefilled customer values; pending responses are invalidated on value changes/unmount so registry data cannot overwrite another customer's service address.

- Business fallbacks use immediate destination-tab registry skeletons; empty customers use `NoItemsIcon`. Shared skeletons constrain widths, wrap filters, and skip offscreen painting; public placeholders never mount WebGL. Lazy customer/order hosts isolate modal state and keep values through exit.

- Mobile/touch field font rules cover portals; prevent focus zoom, preserve pinch zoom.

- Route weather shares stop-cell forecast averages across staff/calendar; no country fallback.
- Employee cards, next-route actions and locks share scheduled-start ordering with stable fallbacks.
- Compact planning uses a day agenda and tap assignment; desktop retains drag. Cards share state, spacing and portal styles; density excludes appointment content. Dialogs share scrolling; hover cards portal; planner actions sit in one toolbar; density/detail persist independently.
- Employee edits send pricing inputs; RPCs compute prices and put recurring orders in the unassigned pool.
- Public/auth BlueFlowBackground uses a lightweight native WebGL shader (not the 3D scene engine), token phases, bounded resolution, visibility/motion pausing and a first-painted-frame reveal over a color-matched fallback to keep public-page JavaScript small; nearby homepage sections render eagerly while distant sections mount ahead of the viewport.
- Homepage photos share CDN WebP variants and JSON metadata across images, SEO and sitemaps. Normalize photo canvases without cropping subjects to one ratio; DOM/WebGL keep a fixed frame to prevent layout movement and inner bars. Static homepage head preloads only the first responsive photo and route heads remove that preload; runtime preloads only the next photo and pauses hidden/reduced-motion timers to prioritize visible content.
- Panel headers share `PageHeader`/`.panel-page-hero` (and the overview hero) with the homepage's `BlueFlowBackground` over the same fallback, so panel and public heroes look identical. Persistent public navigation shares audience groups and account actions and publishes its measured height for sticky public filters, preventing overlap across tablet sizes.
- Driving/HUD rules live in `src/components/employee-route/AGENTS.md`.
- Trade-city pages, sitemap, prerender titles and `/by` hubs derive from `branchRegistry.ts` and `cityFacts.ts` for consistency.
- Database-triggered accounting kicks authenticate with the DB-only server token (never the anon key) and use letter-prefixed setting names, so instant sync works for every business id; failures log a warning and the scheduled run is the safety net.
- Accounting document emails use private signed PDF links; credit retries reuse the stored credit ID to avoid issuing duplicate credits.
- Employee cancellation uses a caller-JWT SECURITY DEFINER preflight before crediting. Business cancellation probes credit capabilities; credit must succeed before cancellation.
- Sub-hourly/hourly test cadences share an explicit minute registry and isolated server recurrence exceptions; normal daily caps remain unchanged. Recurrence requires completion and a series lock plus outstanding-order guard; test previews start at the exact next due time (one interval after open work) and repeat to the calendar range end. Order progress uses recurrence sequence and only the active subscription owner shows a next date.
- Owner alerts queue with send-time checks; reminder lead time resolves agreement > customer > business. `customer-visit-date.ts` formats dates without internal arrival/start estimates to avoid false promises.
- Route-target pickers filter through `src/lib/route-planner/selectable-routes.ts` (Danish today, no archived/virtual/fully-done routes) so every planner dialog offers the same valid routes.
- Consolidated invoicing routes every order invoice job through a BEFORE INSERT trigger on `accounting_sync_queue` into `invoice_batches` (interval resolves order > customer > business via `resolve_invoice_interval`), closed hourly into one `invoice_batch` job, so no enqueue path can bypass the chosen interval.
- Manual order creation uses the shared invoice interval picker and payload helper for every created service order; null retains live customer/business inheritance rather than freezing the displayed default.
- Cross-device freshness comes from one global unfiltered Realtime listener (`RealtimeSync`) that debounces active-query invalidation and publishes table-specific refresh events for local-state screens; recovery refreshes both. New synced tables need publication membership and REPLICA IDENTITY FULL. Accounting status refreshes preserve draft settings/wizards; credential-bearing integration rows are never added to Realtime.
- Creation UIs wait for essential persisted data, not list refetches or confirmation-email delivery; confirmed customer cache merges preserve order statistics, and calculator retries reuse the persisted service ID to prevent duplicates after partial saves.
- Onboarding keeps its action footer outside the scrolling step body, so short screens can reach all requirements without hiding navigation; next-step hints tolerate blocked session storage.
- Manual order saves retain immutable order/item IDs in the mounted form and reconcile uncertain inserts before retrying; completed stages are skipped and edits/closure remain locked until completion to avoid duplicate groups or mismatched prices.
- Route creation preserves the queued idempotent per-stop RPC, joins default-employee lookup and defers local invalidation until the batch settles; partial retries reuse the route and original sequences so no second route or misleading success is produced.
- Prerendered public HTML reads `seoConfig` from blog/guide/software factories and the branch/city registries; shared content renderers preserve tables, sections and contextual links without JS. Factory metadata overrides static snippets, and article dates/breadcrumbs come from registries to prevent crawler/runtime drift.
- Native apps wrap the live site via Capacitor `server.url` (capacitor.config.ts) with native system-bar insets and viewport-fit=contain, so CDN asset paths resolve, fixes ship without a new APK and phone bars never cover buttons; the employee panel is the start route.
- The employee APK is a CDN asset pointer in `src/assets/downloads/`; Min dag's `AppInstallCard` picks options via `src/lib/app-install.ts` and hides when running native/standalone. Replace the pointer when a new APK is built.
- Offline employee stop completions queue in `src/lib/offline-stop-queue.ts` (flushed on reconnect, overlaid on cached route data); stop photos live in private `stop-photos` bucket under `{business}/{stop}/` gated by `can_access_stop`; obstacles are `obstacle`-kind notes that delete only that stop (photos survive, no FK) so the visit returns to the unassigned pool while the series keeps its preferred route.
- The monthly SEO report (`seo-monthly-report`) has a fixed owner recipient, reads Search Console via the connector gateway, and uses a month-based idempotency key so the monthly schedule or repeat calls never send duplicates.
- Automatic SEO articles live in `seo_articles` (plain-text blocks, never HTML) and render via `DynamicBlogPost` through the shared `BlogArticleLayout`; the `seo-engine` function runs one daily idempotent tick (run-key locks, quality gate, pause on AI credit/policy errors) so content grows without code deploys.
- /software/branche/:slug pages, sitemap and prerender derive from `industryRegistry.ts`; add trades only there for consistency.
- SEO: last daily slot favors least-covered trades; articles link parent; build adds published `seo_articles` to sitemap/prerender.
- Article covers: queued `article_images`; never block publishing.
- Blog posts use one lazy `BlogPostRoute`; keep `blogPosts.ts`/zod out of eager code for a small startup bundle.
