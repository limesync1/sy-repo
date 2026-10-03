---
name: Enkel rutekørsel og telefonapp
description: PWA-valg, ordblindevenlige labels, fælles ankomst og arbejdskvittering
type: feature
---
Brugeren har valgt hjemmeskærmsapp (PWA), ikke native mobilapp. Ingen offlinefunktion er efterspurgt.
Rutekørslens HUD skal være ordblindevenligt: korte, velkendte ord og overskuelige tekster. “Stopoplysninger” skal hedde “Oplysninger”; “Fortryd udførsel” skal bevares.
Tjeklisten viser samme ankomst som kørselsguiden. Printkvitteringen skal vise start, køretid og medarbejderens indtjening med korrekt skelnen mellem registrerede og beregnede tider.
Natkort skal være enkelt og dæmpet uden at skjule veje eller ruter.
Manifest og Apple-tags er tilføjet uden service worker. En hjemmeskærmsapp bruger fortsat browserens lydmotor, ikke native lyd.
Kvitteringen bruger samme indtjeningskilde som statistik og fælles runMetrics. Start og faktisk ankomst er lokale og udløber efter 20 timer; historiske manglende data vises som ikke registreret. Køretid er et estimat inkl. pauser. Print blokeres ved indlæsningsfejl.
Natkort er tokenstyret OpenFreeMap-vektorstil med dæmpede flader og tydelige veje; 15-sekunders timeout og rasterreserve.
Mobilkontrol 393×852: vektorkort indlæst uden advarsel, samme start/køretid/ETA i guide og liste, kvittering/printvalg kontrolleret; 41 tests bestod. Ingen fysisk biltest, telefonlyd eller ny udført/fortryd-beløbstest udført.