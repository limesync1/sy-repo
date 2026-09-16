---
name: Testfase-besked og venteliste
description: Platformen er i testfase — stor besked på alle offentlige sider med e-mail-tilmelding, styres fra adminpanelets fane "Venteliste".
type: feature
---
Serviceydere er ikke åbnet for kunder eller virksomheder endnu.

- Beskeden vises via `src/components/BetaNotice.tsx` i App.tsx på alle offentlige sider (skjult i paneler: /admin, /virksomhed, /medarbejder, /min-konto).
- Tekst + til/fra ligger i `platform_settings.beta_notice_enabled/_title/_body`, læses offentligt via RPC `public_beta_notice()`.
- Tilmelding sker via RPC `join_beta_waitlist(email, role)` → tabellen `beta_signups` (kun admins kan læse).
- Adminfanen "Venteliste" (`PlatformWaitlistTab.tsx`) redigerer beskeden, slår den fra og sender åbnings-mailen.
- Åbnings-mailen: edge function `beta-launch-announce` + skabelonen `beta-launch`. Én mail pr. person, `notified_at` forhindrer gentagelser.
