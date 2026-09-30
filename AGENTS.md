# Project architecture rules

- All authenticated business, employee, and platform-admin surfaces use the shared `service-panel-*` shell, navigation, card, overlay, and semantic state system so visual behavior stays consistent across roles.
- Employee route driving must resolve checklist versus map guide before mounting Leaflet or continuous GPS, preventing map flashes and unnecessary battery use.
- Branded panel illustrations are resolved through the shared `PanelIcon` registry; familiar utility controls keep standard interface symbols so iconography stays consistent without reducing usability.