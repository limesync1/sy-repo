# Project architecture rules

- Appointment details share `AppointmentDetailsHeader` and `appointment-details-overlay` so portals retain the planner theme.
- Checkout seats use server allocation/active-seat floors and period-matched prices to prevent underpayment.
- Validate suggestion stops against the route and employees against its business before RLS-protected writes.

- Business/employee navigation shares `PanelShell`/`SidebarParts`; admin keeps compatibility exports and `service-panel-*`. Never duplicate role layouts.
- Resolve checklist versus map guide before mounting Leaflet or continuous GPS to prevent map flashes and battery waste.
- Header/session icons use monochrome `PanelIcon`; compact artwork uses `UiArtwork`. Filled-button artwork uses a light contrast chip.
- Illustrations use `BrandedIllustration`; `PanelIcon`/customer variants reuse assets to avoid duplicates.
- Official profile URLs use `src/lib/social-links.ts` for consistent links and organization data.
- Public SEO uses registries and seo-prerender-head; client tags preserve full text and public-origin canonicals unless a business supplies its domain.
- Leads normalize into `quote_requests`/`quote_request_matches`; provider connections/credentials stay server-side and business-scoped for one secure source of truth.
- Meta source selection groups linked Instagram and lead forms under Facebook Pages, since Meta exposes Instagram leads through the Page.
- Meta OAuth uses `https://serviceydere.dk/meta/callback`, forwarding authorization to the server callback to keep preview/production configuration stable.
- Restarted employee workdays preserve prior elapsed seconds in `accumulated_seconds` and open a new active interval, so completed appointments and precise time history remain intact.
- Employee pages share `EmployeePage`; driving is full-screen; profiles share `ProfileEditSheetLayout`, with employee self-edits limited to name/avatar.
- Archived routes cannot remain recurrence anchors or enter projection queries, preventing deleted routes from resurfacing as ghost routes.
- Route printing consumes the loaded calendar route collection and applies date and content selection inside the print workspace, keeping one source of truth for preview and paper output.
- Authenticated employee geocoding prefers the business Google server key then Maps connector; server calls protect keys and distinguish key, service and unmatched-address errors.
- Address suggestions share debounce, deduplication and bounded caching; signed-in users use the private Google proxy, guests an unmetered provider with bounded requests and exact postal towns.

- Business tab fallbacks share eagerly imported registry skeletons, preventing blank lazy fallbacks; empty customer lists use shared `NoItemsIcon`.

- Leaflet reserve uses synchronized motion/rotation; mobile actions stay below the map. Google stop/start pins use imported AdvancedMarkerElement with geographic anchors and id-based updates to move with the camera, not the car.
- Arrival is immediate for accurate slow fixes, otherwise uses short dwell; timers and completion stay manual to avoid false hours.
- Route lines preserve road geometry; Google shows active leg OR overview, without raw GPS trails, to avoid competing paths. Google/Leaflet share car artwork.
- Route theme owns guide/checklist/portals; toasts observe root. Manual choices reset at automatic switch, avoiding mixed themes.
- Re-optimization never reorders within 250 m of the next stop to protect arrival.
- Guide and checklist share metrics, expiring stop-scoped GPS ETA, actual arrival and summary; merge customer intervals to prevent double-counting and never substitute scheduled time for ETA.
- Local Vite proxies hosted asset-pointer paths to the public app domain so original CDN icons render in sandbox checks without replacing user artwork.
- Driving: vector Google map (runtime key/Map ID) and Google Routes only for signed-in nav legs; OSRM/Leaflet fallbacks bound cost. PWA: manifest only.

- HUD uses compact tiles, a tablet-left dock and shared 44px-minimum recenter sizing to preserve touch access. Portals stay above HUD; Undo stays visible and timing manual.
- Mobile/touch field font rules cover portals; prevent focus zoom, preserve pinch zoom.

- Route weather shares stop-cell forecast averages across staff/calendar; no country fallback.
- Employee cards, next-route actions and locks share scheduled-start ordering with stable fallbacks.
- Compact planning uses a bounded calendar, scrollable drawer and tap assignment; desktop retains drag. Dialogs share names/employees and scrolling; density/detail persist independently.
- Employee edits send pricing inputs; RPCs compute prices and put recurring orders in the unassigned pool.
- BlueFlowBackground is lazy, token-based, pointer-free and pauses when hidden; heroLight/heroDark variants isolate CTA contrast from brand gradients.
- Panel headers share `PageHeader`/`.panel-page-hero` styling.
- Public navigation persists outside suspense; local headers defer to avoid duplicates.
