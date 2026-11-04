import type { CityGardenContent } from "./gardenCityData";

const kr = (n: number) => `${Math.round(n / 50) * 50}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** Regneeksempel og FAQ ud fra byens egne prisintervaller; deles af browser og prerender. */
export function gardenCityExample(city: CityGardenContent) {
  const visits = 14; // græsslåning hver 14. dag, april–oktober
  const hedgeMeters = 30;
  const low = visits * city.lawnLow + 2 * hedgeMeters * city.hedgeLow;
  const high = visits * city.lawnHigh + 2 * hedgeMeters * city.hedgeHigh;
  return { visits, hedgeMeters, low, high };
}

export function gardenCityFaq(city: CityGardenContent): [string, string][] {
  const ex = gardenCityExample(city);
  return [
    [`Hvad koster en havemand i ${city.name}?`, `En havemand i ${city.name} koster typisk ${city.hourlyLow}–${city.hourlyHigh} kr. i timen inkl. moms. Græsslåning af en almindelig parcelhushave koster ${city.lawnLow}–${city.lawnHigh} kr. pr. besøg, og hækklipning ${city.hedgeLow}–${city.hedgeHigh} kr. pr. løbende meter.`],
    [`Hvad koster fast havepasning i ${city.name} om året?`, `Med græsslåning hver 14. dag fra april til oktober (${ex.visits} besøg) og klipning af ${ex.hedgeMeters} meter hæk to gange om året lander et regneeksempel på ca. ${kr(ex.low)}–${kr(ex.high)} kr. om året før fradrag. Den endelige pris afhænger af havens størrelse og adgang.`],
    [`Hvilke områder dækker havefirmaer i ${city.name}?`, `Havefirmaer i ${city.name} kører typisk i postnumrene ${city.postalRange} og ofte i resten af ${city.region}. Kørsel uden for byen kan give et mindre tillæg.`],
    ["Kan jeg få fradrag for haveservice?", "Ja. Almindeligt havearbejde som græsslåning og hækklipning er omfattet af servicefradraget, når du betaler elektronisk og firmaet oplyser arbejdslønnen."],
    ["Er fast aftale billigere end enkeltbesøg?", "Ofte ja. Ved en fast aftale kan firmaet planlægge ruten, så prisen pr. besøg typisk bliver lavere end ved enkeltbestillinger."],
  ];
}

export function GardenCityExtras({ city }: { city: CityGardenContent }) {
  const ex = gardenCityExample(city);
  return <>
    <h2>Regneeksempel: fast havepasning i {city.name}</h2>
    <p>
      En almindelig parcelhushave med græsslåning hver 14. dag fra april til oktober ({ex.visits} besøg) og {ex.hedgeMeters} meter hæk klippet to gange om året
      koster i {city.name} ca. <strong>{kr(ex.low)}–{kr(ex.high)} kr. om året</strong> før fradrag, ud fra byens vejledende priser.
    </p>
    <h2>Spørgsmål om haveservice i {city.name}</h2>
    {gardenCityFaq(city).map(([q, a]) => <section key={q}><h3>{q}</h3><p>{a}</p></section>)}
  </>;
}
