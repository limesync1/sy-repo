import type { CityCleaningContent } from "./cleaningCityData";
import type { CityMovingContent } from "./movingCityData";
import type { CityHandymanContent } from "./handymanCityData";

export type LocalCityKind = "rengoering" | "flyttehjaelp" | "haandvaerker";
type AnyCity = CityCleaningContent | CityMovingContent | CityHandymanContent;

const kr = (n: number) => `${Math.round(n / 50) * 50}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** Regneeksempel ud fra byens egne prisintervaller; deles af browser og prerender. */
export function localCityExample(kind: LocalCityKind, city: AnyCity): { title: string; text: string } {
  if (kind === "rengoering" && "flatLow" in city) {
    const visits = 26;
    return {
      title: `Regneeksempel: fast rengøring i ${city.name} i et år`,
      text: `Fast rengøring af en bolig på ca. 75 m² hver 14. dag (${visits} besøg) koster i ${city.name} ca. ${kr(visits * city.flatLow)}–${kr(visits * city.flatHigh)} kr. om året før fradrag, ud fra byens vejledende priser på ${city.flatLow}–${city.flatHigh} kr. pr. besøg.`,
    };
  }
  if (kind === "flyttehjaelp" && "smallMoveLow" in city) {
    const hours = 5;
    return {
      title: `Regneeksempel: flytning med timepris i ${city.name}`,
      text: `En mindre flytning, hvor to mænd og bil arbejder i ${hours} timer, koster i ${city.name} ca. ${kr(hours * city.hourlyLow)}–${kr(hours * city.hourlyHigh)} kr. Til sammenligning ligger fast pris for en lejlighed på 1–2 værelser på ${city.smallMoveLow}–${city.smallMoveHigh} kr. Fast pris er ofte tryggest, når mængden af ting er kendt.`,
    };
  }
  if (kind === "haandvaerker" && "carpenterLow" in city) {
    const hours = 4;
    return {
      title: `Regneeksempel: mindre tømreropgave i ${city.name}`,
      text: `En tømreropgave på ${hours} timer plus ét udkald koster i ${city.name} ca. ${kr(hours * city.carpenterLow + city.callOutLow)}–${kr(hours * city.carpenterHigh + city.callOutHigh)} kr. før fradrag. Materialer kommer oveni.`,
    };
  }
  return { title: "", text: "" };
}

export function localCityFaq(kind: LocalCityKind, city: AnyCity): [string, string][] {
  const ex = localCityExample(kind, city);
  const area: [string, string] = [`Hvilke områder dækker firmaerne i ${city.name}?`, `Firmaer i ${city.name} kører typisk i postnumrene ${city.postalRange} og ofte i resten af ${city.region}. Kørsel uden for byen kan give et mindre tillæg.`];
  if (kind === "rengoering" && "flatLow" in city) return [
    [`Hvad koster rengøring i ${city.name}?`, `Rengøring i ${city.name} koster typisk ${city.hourlyLow}–${city.hourlyHigh} kr. i timen inkl. moms. Fast rengøring af en bolig på ca. 75 m² koster ${city.flatLow}–${city.flatHigh} kr. pr. besøg hver 14. dag.`],
    [`Hvad koster fast rengøring i ${city.name} om året?`, ex.text],
    area,
    ["Kan jeg få fradrag for rengøring?", "Ja. Almindelig rengøring i hjemmet er omfattet af servicefradraget, når du betaler elektronisk og firmaet oplyser arbejdslønnen."],
    [`Hvordan finder jeg et godt rengøringsfirma i ${city.name}?`, `Indhent flere tilbud, læs anmeldelser og spørg, hvad der er med i prisen. Bed om referencer fra lignende boliger i ${city.name}.`],
  ];
  if (kind === "flyttehjaelp" && "smallMoveLow" in city) return [
    [`Hvad koster flyttehjælp i ${city.name}?`, `To mænd og bil koster typisk ${city.hourlyLow}–${city.hourlyHigh} kr. i timen inkl. moms i ${city.name}. En lejlighed på 1–2 værelser koster ${city.smallMoveLow}–${city.smallMoveHigh} kr. til fast pris, og en villa på 4–5 værelser ${city.villaMoveLow}–${city.villaMoveHigh} kr.`],
    ["Er fast pris eller timepris bedst?", ex.text],
    area,
    ["Hvornår skal jeg bestille flyttehjælp?", "Bestil gerne i god tid, især omkring månedsskifte og i sommerferien, hvor mange flytter."],
    [`Hvordan finder jeg et godt flyttefirma i ${city.name}?`, `Indhent flere tilbud, spørg om forsikring under flytningen og få skriftligt, hvad prisen dækker.`],
  ];
  if (kind === "haandvaerker" && "carpenterLow" in city) return [
    [`Hvad koster en håndværker i ${city.name}?`, `En håndværker i ${city.name} koster typisk ${city.hourlyLow}–${city.hourlyHigh} kr. i timen inkl. moms. Tømrer ${city.carpenterLow}–${city.carpenterHigh} kr., elektriker ${city.electricianLow}–${city.electricianHigh} kr. i timen og udkald ${city.callOutLow}–${city.callOutHigh} kr.`],
    [`Hvad koster en mindre opgave i ${city.name}?`, ex.text],
    area,
    ["Kan jeg få fradrag for håndværkerarbejde?", "Visse opgaver er omfattet af håndværkerfradraget. Tjek de gældende regler hos Skattestyrelsen, og bed firmaet oplyse arbejdslønnen på fakturaen."],
    [`Hvordan finder jeg en god håndværker i ${city.name}?`, `Indhent flere tilbud på samme opgave, spørg om materialer er med i prisen, og få en skriftlig aftale.`],
  ];
  return [area];
}

export function localCityFaqSchema(kind: LocalCityKind, city: AnyCity) {
  return localCityFaq(kind, city).map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } }));
}

export function LocalCityExtras({ kind, city }: { kind: LocalCityKind; city: AnyCity }) {
  const ex = localCityExample(kind, city);
  return <>
    {ex.title && <><h2>{ex.title}</h2><p>{ex.text}</p></>}
    <h2>Spørgsmål og svar om {city.name}</h2>
    {localCityFaq(kind, city).map(([q, a]) => <section key={q}><h3>{q}</h3><p>{a}</p></section>)}
  </>;
}
