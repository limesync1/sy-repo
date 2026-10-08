# Project architecture rules

- Appointment details share `AppointmentDetailsHeader` and `appointment-details-overlay` so portals retain the planner theme.
- Checkout seats use server allocation/active-seat floors and period-matched prices to prevent underpayment.
- Validate suggestion stops against the route and employees against its business before RLS-protected writes.

- Business/employee navigation shares `PanelShell`/`SidebarParts`; admin keeps compatibility exports and `service-panel-*`. Never duplicate role layouts.
- Resolve checklist versus map guide before mounting Leaflet or continuous GPS to prevent map flashes and battery waste.
- Header/session icons use monochrome `PanelIcon`; compact artwork uses `UiArtwork`. Filled-button artwork uses a light contrast chip.
- Semantic illustrations use `BrandedIllustration`; `PanelIcon` and customer variants reuse matching assets to avoid duplicates.
- Official profile URLs use `src/lib/social-links.ts` for consistent links and organization data.
- Public SEO heads use content registries and seo-prerender-head for non-JS crawlers; client tags preserve full text and canonicalize to the public origin unless a business supplies its own domain.
- All lead sources normalize into `quote_requests`/`quote_request_matches`, while provider connections and credentials stay server-side and business-scoped, so the Leads workspace has one secure source of truth.
- Meta source selection models Facebook Pages as the parent source and surfaces their linked Instagram account and lead forms together, because Meta exposes Instagram lead access through the connected Page.
- Meta OAuth always uses the public `https://serviceydere.dk/meta/callback` URI, which forwards the authorization response to the server callback so Meta configuration remains stable across preview and production.
- Restarted employee workdays preserve prior elapsed seconds in `accumulated_seconds` and open a new active interval, so completed appointments and precise time history remain intact.
- Standard employee pages share `EmployeePage` for panel alignment; route-driving stays full-screen.
- Archived routes cannot remain recurrence anchors or enter projection queries, preventing deleted routes from resurfacing as ghost routes.
- Route printing consumes the loaded calendar route collection and applies date and content selection inside the print workspace, keeping one source of truth for preview and paper output.
- Authenticated employee geocoding prefers the business Google server key then Maps connector; server calls protect keys and distinguish key, service and unmatched-address errors.
- Address suggestions share debounce, deduplication and bounded caching; signed-in users use the private Google proxy, guests an unmetered provider with bounded requests and exact postal towns.

- Business tab fallbacks/loading states share eagerly imported registry skeletons (employee stats uses its strip skeleton), preventing blank lazy fallbacks.
- Customer list empty panels always use shared `NoItemsIcon` for consistency with employee lists.

- Driving maps use leaflet-rotate and synchronized motion-track heading/panning, integer zoom dwell and stop-selection suspension; mobile stop actions sit below the map to preserve its usable area.
- Arrival uses bounded accuracy-aware proximity, low-speed gating and dwell; work timers and completion require explicit actions to avoid false hours.
- Driving route lines preserve provider road geometry and render through the shared SVG brand-gradient layer, so decoration never moves a route off the road.
- One route theme owner controls guide, checklist and portals; manual night choices reset at the next automatic switch, preventing mixed themes.
- Live route re-optimization never reorders when the employee is within 250 m of the next stop, so the stop being arrived at cannot be pushed to the end.
- Guide and checklist share metrics, expiring stop-scoped GPS ETA, actual arrival and summary; merge customer intervals to prevent double-counting and never substitute scheduled time for ETA.
- Local Vite proxies hosted asset-pointer paths to the public app domain so original CDN icons render in sandbox checks without replacing user artwork.
- Night maps use token-themed OpenFreeMap vectors, dim raster fallback and errors. PWA uses manifest only; no offline cache to stale previews.

- Timelines stay fixed-height with explicit selection; semantic actions distinguish undo and completion.
- Global mobile/touch field font rules cover portals to prevent focus zoom while preserving pinch zoom.

- Route weather shares stop-cell forecast averages across staff/calendar; no country fallback.
- Employee cards, next-route actions and locks share scheduled-start ordering with stable fallbacks.
- Compact planning uses tap assignment/reorder. Route dialogs reuse calendar names/attached employees and bounded native scrolling to avoid clipping.
- Employee edits/new orders send pricing inputs only; server RPCs recompute prices and send recurring orders to the unassigned pool, preventing underpricing and misplaced series.
