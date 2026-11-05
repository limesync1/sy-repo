import QuickAnswer from "@/components/content/QuickAnswer";
import type { Branch, BranchCity } from "./branchRegistry";

export default function BranchQuickAnswer({ branch, city }: { branch: Branch; city: BranchCity }) {
  const format = (value: number) => value.toLocaleString("da-DK");

  return <QuickAnswer facts={[
    <>Typisk pris i {city.name}: <strong>{format(city.unitLow)}–{format(city.unitHigh)} {branch.unit}</strong>.</>,
    <>Andre priseksempler: <strong>{format(city.refLow)}–{format(city.refHigh)} {branch.ref}</strong>.</>,
    <>Postnumre i området: <strong>{city.postalRange}</strong>.</>,
  ]} note="Vejledende prisintervaller inkl. moms. Den endelige pris afhænger af opgaven og virksomhedens tilbud." />;
}