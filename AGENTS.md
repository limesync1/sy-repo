# Project architecture rules

- Business and employee surfaces compose navigation through `PanelShell`, `PanelBottomNav`, and shared `SidebarParts`; platform admin retains compatibility exports while using the shared `service-panel-*` visual system, so role-specific logic cannot duplicate layout behavior.
- Employee route driving must resolve checklist versus map guide before mounting Leaflet or continuous GPS, preventing map flashes and unnecessary battery use.
- Branded panel illustrations are resolved through `PanelIcon` and only shown at readable sizes in meaningful headings, labels, empty states, or feature choices; navigation and compact action buttons keep standard Lucide symbols for instant recognition.
- Official external profile URLs are centralized in `src/lib/social-links.ts` so visible links and page-level organization data stay consistent.
- Public SEO routes get a build-time static <head> (title, description, canonical, og:*) generated from the content registries via the sitemap script and the seo-prerender-head Vite plugin, so non-JS crawlers see page-specific metadata.
- All lead sources normalize into `quote_requests`/`quote_request_matches`, while provider connections and credentials stay server-side and business-scoped, so the Leads workspace has one secure source of truth.
- Restarted employee workdays preserve prior elapsed seconds in `accumulated_seconds` and open a new active interval, so completed appointments and precise time history remain intact.
- Standard employee pages use the shared `EmployeePage` container, keeping their width and vertical rhythm aligned with the business panel while route-driving remains full-screen.
