Fjern boksen "Mere med fuldt system" med knappen "Opgradér" fra virksomhedspanelets sidemenu (vises for "Kun profil"-virksomheder).

Teknisk: slet blokken `{!flags.operations && !ctx.collapsed && (...)}` i `src/components/admin/shared/AdminShell.tsx` og fjern ubrugte imports. Opgradering er stadig mulig under Indstillinger › Pris og betaling samt kortet øverst i panelet.
