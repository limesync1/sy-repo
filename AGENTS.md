# Project architecture rules

- All authenticated business, employee, and platform-admin surfaces use the shared `service-panel-*` shell, navigation, card, overlay, and semantic state system so visual behavior stays consistent across roles.
- Employee route driving must resolve checklist versus map guide before mounting Leaflet or continuous GPS, preventing map flashes and unnecessary battery use.
- Branded panel illustrations are resolved through `PanelIcon` and only shown at readable sizes in meaningful headings, labels, empty states, or feature choices; navigation and compact action buttons keep standard Lucide symbols for instant recognition.