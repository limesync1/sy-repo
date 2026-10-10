# Route driving rules

- Leaflet reserve uses synchronized motion/rotation; mobile actions stay below the map. Google stop/start pins use imported AdvancedMarkerElement with geographic anchors and id-based updates to move with the camera, not the car.
- Arrival is immediate for accurate slow fixes, otherwise uses short dwell; timers and completion stay manual to avoid false hours.
- Route lines preserve road geometry; Google shows active leg OR overview, without raw GPS trails, to avoid competing paths. Google/Leaflet share car artwork.
- Route theme owns guide/checklist/portals; toasts observe root. Manual choices reset at automatic switch, avoiding mixed themes.
- Re-optimization never reorders within 250 m of the next stop to protect arrival.
- Guide and checklist share metrics, expiring stop-scoped GPS ETA, actual arrival and summary; merge customer intervals to prevent double-counting and never substitute scheduled time for ETA.
- Driving: vector Google map (runtime key/Map ID) and Google Routes only for signed-in nav legs; OSRM/Leaflet fallbacks bound cost. PWA: manifest only.
- HUD uses compact tiles, a tablet-left dock and shared 44px-minimum recenter sizing to preserve touch access. Portals stay above HUD; Undo stays visible and timing manual.
- The position engine is the only source of the shown car position (map-matched to the active leg, hysteresis, outlier rejection, dead reckoning); camera, car, arrival and rerouting consume it so they never disagree.
- Navigation legs are refetched only at start, next-stop change or reroute, never per distance driven, to keep the line under the car stable and bound routing cost.
