# Project architecture rules

- Appointment detail surfaces share `AppointmentDetailsHeader` and the self-scoped `appointment-details-overlay` theme so portal rendering and full-screen employee driving cannot lose the planner window design.

- Business and employee surfaces compose navigation through `PanelShell` and shared `SidebarParts`; platform admin retains compatibility exports while using the shared `service-panel-*` visual system, so role-specific logic cannot duplicate layout behavior.
- Employee route driving must resolve checklist versus map guide before mounting Leaflet or continuous GPS, preventing map flashes and unnecessary battery use.
- Header role and session icons resolve through `PanelIcon` and the simple monochrome asset set; compact custom UI artwork resolves through `UiArtwork`, keeping icon sizing and contrast consistent.
- Semantic content illustrations resolve through `BrandedIllustration`, while `PanelIcon` and customer variants reuse those assets when meanings match, preventing stale duplicate icon sets.
- Official external profile URLs are centralized in `src/lib/social-links.ts` so visible links and page-level organization data stay consistent.
- Public SEO routes get a build-time static <head> (title, description, canonical, og:*) generated from the content registries via the sitemap script and the seo-prerender-head Vite plugin, so non-JS crawlers see page-specific metadata.
- All lead sources normalize into `quote_requests`/`quote_request_matches`, while provider connections and credentials stay server-side and business-scoped, so the Leads workspace has one secure source of truth.
- Meta source selection models Facebook Pages as the parent source and surfaces their linked Instagram account and lead forms together, because Meta exposes Instagram lead access through the connected Page.
- Meta OAuth always uses the public `https://serviceydere.dk/meta/callback` URI, which forwards the authorization response to the server callback so Meta configuration remains stable across preview and production.
- Restarted employee workdays preserve prior elapsed seconds in `accumulated_seconds` and open a new active interval, so completed appointments and precise time history remain intact.
- Standard employee pages use the shared `EmployeePage` container, keeping their width and vertical rhythm aligned with the business panel while route-driving remains full-screen.
- Archived routes cannot remain recurrence anchors or enter projection queries, preventing deleted routes from resurfacing as ghost routes.
- Route printing consumes the loaded calendar route collection and applies date and content selection inside the print workspace, keeping one source of truth for preview and paper output.
- Employee route geocoding uses an authenticated server function that prefers the business-owned Google server key and falls back to the linked Google Maps connector, keeping billable credentials off the browser and distinguishing key, service and unmatched-address failures.
- Address forms share server-resolved suggestions with debouncing, in-flight deduplication and short-lived bounded caching; signed-in users use the private Google proxy, while guest checkout uses an unmetered provider with bounded requests and exact known postal towns.

- Business tab fallbacks and data-loading states share eagerly imported skeletons from the common panel registry; employee statistics uses its matching strip skeleton, preventing blank lazy fallbacks and outdated loading layouts.
- Customer list empty panels always render the shared `NoItemsIcon` instead of accepting per-page icons, keeping favorites, subscriptions, reviews, and orders consistent with employee empty lists.

- Driving maps use leaflet-rotate and synchronized motion-track heading/panning, integer zoom dwell and stop-selection suspension; mobile stop actions sit below the map to preserve its usable area.
- Arrival uses bounded accuracy-aware proximity, low-speed gating and dwell; work timers and completion require explicit actions to avoid false hours.
- Driving route lines preserve provider road geometry and render through the shared SVG brand-gradient layer, so decoration never moves a route off the road.
- One route theme owner controls guide, checklist and portals; manual night choices reset at the next automatic switch, preventing mixed themes.
- Live route re-optimization never reorders when the employee is within 250 m of the next stop, so the stop being arrived at cannot be pushed to the end.
- Guide and checklist share route metrics and the completion summary; customer intervals are merged per employee and transport is explicitly estimated, preventing double-counting or automatic exit.
- Local Vite proxies hosted asset-pointer paths to the public app domain so original CDN icons render in sandbox checks without replacing user artwork.
