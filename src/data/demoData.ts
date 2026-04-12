import { Service, BusinessInfo } from "@/types/service";

export const demoBusiness: BusinessInfo = {
  name: "Rent & Pænt",
  slug: "rent-og-paent",
  tagline: "Professionel rengøring til private og erhverv",
  description: "Vi tilbyder professionel rengøring i hele Sjælland. Med over 10 års erfaring leverer vi altid en grundig og pålidelig service.",
  heroImage: "",
  logo: "/serviceydere-ikon.png",
  openingHours: [
    { day: "Mandag", open: "08:00", close: "17:00" },
    { day: "Tirsdag", open: "08:00", close: "17:00" },
    { day: "Onsdag", open: "08:00", close: "17:00" },
    { day: "Torsdag", open: "08:00", close: "17:00" },
    { day: "Fredag", open: "08:00", close: "16:00" },
    { day: "Lørdag", open: "09:00", close: "13:00" },
    { day: "Søndag", open: "", close: "" },
  ],
  faq: [
    { question: "Skal jeg selv skaffe rengøringsmidler?", answer: "Nej, vi medbringer alt udstyr og miljøvenlige rengøringsmidler." },
    { question: "Hvor lang tid tager en rengøring?", answer: "Det afhænger af størrelsen. En standard 2-værelses lejlighed tager ca. 2 timer." },
    { question: "Kan jeg booke online?", answer: "Ja! Brug prisberegneren og bestil direkte her på siden." },
    { question: "Har I forsikring?", answer: "Ja, vi er fuldt forsikret for alle typer skader under rengøring." },
  ],
  contact: { email: "kontakt@rentogpaent.dk", phone: "+45 12 34 56 78", address: "Vesterbrogade 123, 1620 København V" },
};

export const demoServices: Service[] = [
  {
    id: "1",
    name: "Vinduespudsning",
    description: "Professionel vinduespudsning – indvendig og udvendig.",
    image: "",
    priceType: "fixed",
    fixedPrice: 299,
  },
  {
    id: "2",
    name: "Erhvervsrengøring",
    description: "Professionel rengøring af kontor, klinik eller butik.",
    image: "",
    priceType: "hourly",
    hourlyRate: 350,
    minHours: 2,
    maxHours: 10,
  },
  {
    id: "3",
    name: "Privat rengøring",
    description: "Komplet hjemmerengøring tilpasset dit behov. Vælg omfang, antal værelser og tilvalg.",
    image: "",
    priceType: "calculator",
    basePrice: 0,
    calculatorSteps: [
      {
        id: "s1",
        label: "Boligtype",
        type: "choice",
        options: [
          { id: "o1", label: "Lejlighed", priceAdjustment: 0 },
          { id: "o2", label: "Rækkehus", priceAdjustment: 200 },
          { id: "o3", label: "Villa", priceAdjustment: 400 },
        ],
      },
      {
        id: "s2",
        label: "Boligareal",
        type: "number",
        unit: "m²",
        pricePerUnit: 12,
        min: 30,
        max: 400,
      },
      {
        id: "s3",
        label: "Antal badeværelser",
        type: "number",
        unit: "stk",
        pricePerUnit: 150,
        min: 1,
        max: 5,
      },
      {
        id: "s4",
        label: "Tilvalg",
        type: "multi-choice",
        options: [
          { id: "t1", label: "Ovnrengøring", priceAdjustment: 199 },
          { id: "t2", label: "Køleskab indvendig", priceAdjustment: 149 },
          { id: "t3", label: "Vinduer indvendig", priceAdjustment: 249 },
          { id: "t4", label: "Strygning af tøj", priceAdjustment: 199 },
        ],
      },
      {
        id: "s5",
        label: "Har du husdyr?",
        type: "yes-no",
        yesPrice: 100,
      },
    ],
  },
];
