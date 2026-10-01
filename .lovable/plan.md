# Ret Meta-domænefejlen

## Resultat
Virksomheder sendes gennem Meta med `serviceydere.dk` som den synlige returadresse, så forbindelsen ikke afhænger af et teknisk backend-domæne.

## Ændringer
- Tilføj en enkel retur-side på `https://serviceydere.dk/meta/callback`, som færdiggør forbindelsen og sender virksomheden tilbage til Leads.
- Opdatér Meta-start og callback til at bruge præcis samme offentlige returadresse og bevare sikker validering af forbindelsen.
- Vis en konkret forklaring på Leads-siden ved afvist domæne eller forkert Meta-opsætning i stedet for en generisk fejlkode.
- Kontrollér flowet, udgiv de berørte funktioner og teste siden på mobil og desktop.

## Meta-indstilling, som skal matche
Meta-appen skal have `serviceydere.dk` under **Appdomæner** og `https://serviceydere.dk/meta/callback` under **Gyldige OAuth-omdirigerings-URI'er**. Koden kan ikke ændre disse to felter i Metas kontrolpanel, men løsningen gør dem enkle og stabile.
