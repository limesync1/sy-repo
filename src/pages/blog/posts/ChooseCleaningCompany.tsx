import BlogArticleLayout from "../BlogArticleLayout";
import { findBlogPost } from "../blogPosts";

const post = findBlogPost("saadan-vaelger-du-rengoeringsfirma")!;

const ChooseCleaningCompany = () => (
  <BlogArticleLayout
    post={post}
    keywords="vælg rengøringsfirma, rengøringsfirma tjekliste, rengøring kontrakt, rengøringsfirma anmeldelser, godt rengøringsfirma danmark"
    faq={[
      { q: "Hvad er det vigtigste at tjekke ved et rengøringsfirma?", a: "CVR-registrering, gyldig erhvervsansvarsforsikring, skriftlig aftale med klar opgavebeskrivelse, samt aktuelle anmeldelser fra kunder med opgaver der ligner din." },
      { q: "Skal jeg vælge timepris eller fast pris på rengøring?", a: "Til løbende fast rengøring (privat eller erhverv) giver fast pris mest budgetsikkerhed. Til enkeltopgaver som hovedrengøring eller flytterengøring er fast pris også oftest at foretrække, mens timepris egner sig til mindre eller uforudsigelige opgaver." },
      { q: "Hvor lang opsigelse er normal?", a: "Hos seriøse rengøringsfirmaer er 1 måneds opsigelse til udgangen af en måned standard for privatkunder. Erhvervsaftaler har typisk 3 måneders opsigelse." },
    ]}
  >
    <h2>1. Tjek CVR og forsikring først</h2>
    <p>
      Det første du bør gøre er at slå firmaet op på <em>cvr.dk</em>. Tjek at virksomheden eksisterer,
      har været aktiv i mindst 1–2 år, og at regnskaberne ser sunde ud. Bed dernæst om dokumentation
      for erhvervsansvarsforsikring — uden den hænger du selv på regningen, hvis noget bliver
      ødelagt under rengøringen.
    </p>

    <h2>2. Spørg ind til medarbejderne</h2>
    <p>
      Et professionelt firma har fastansatte medarbejdere (ikke kun underentreprenører),
      udbetaler overenskomstmæssig løn, og har skriftlige rutiner for sygdom og afløsning.
      Spørg konkret: hvem kommer hjem til mig? Får jeg samme person hver gang? Hvad sker der,
      hvis hun er syg?
    </p>

    <h2>3. Bed om en skriftlig opgavebeskrivelse</h2>
    <p>
      "Almindelig rengøring" betyder forskellige ting for forskellige firmaer. Bed om en liste med
      præcis hvad der gøres hver gang (støvsugning, gulvvask, badeværelser, køkken, støvaftørring osv.)
      og hvad der er tillægsydelser (vinduer, ovn, køleskab, hovedrengøring).
    </p>

    <h2>4. Forstå prisstrukturen</h2>
    <p>
      Sammenlign timepris vs. fast pris. Spørg om der er minimumstid, kørselstillæg, tillæg ved
      første gang (typisk dobbelt tid), tillæg for weekend, og hvad der sker hvis du afbestiller.
      Pris pr. m² er sjælden i privatrengøring — vær skeptisk hvis et firma bruger den uden at have
      set boligen.
    </p>

    <h2>5. Brug BoligJob-fradraget — kræver elektronisk betaling</h2>
    <p>
      Du kan trække op til 11.900 kr. fra på lønnen til rengøring i 2026 (kun arbejdsløn, ikke
      materialer). Det kræver, at du betaler elektronisk (MobilePay, bankoverførsel, kort) — ikke
      kontant. Firmaet skal kunne udstede en kvittering med CVR.
    </p>

    <h2>6. Læs anmeldelser med kritisk blik</h2>
    <p>
      Tjek både Trustpilot, Google og Facebook. Vær især opmærksom på, hvordan firmaet svarer på
      negative anmeldelser — det siger ofte mere om kulturen end de positive. Læg vægt på
      anmeldelser fra de seneste 12 måneder.
    </p>

    <h2>7. Bed om en prøverengøring</h2>
    <p>
      Mange firmaer tilbyder første rengøring som "prøve" med mulighed for at justere omfanget
      bagefter. Brug muligheden til at se kvaliteten, før du binder dig til en længere aftale.
    </p>

    <h2>8. Spørg om kvalitetskontrol</h2>
    <p>
      Hvordan sikrer firmaet, at kvaliteten er ensartet? Bruger de tjeklister? Foretages der
      stikprøver? Hvem kan du klage til, hvis noget ikke er som forventet? Gode firmaer har
      tydelige svar på alt dette.
    </p>

    <h2>9. Læs aftalen før du underskriver</h2>
    <p>
      Vær særligt opmærksom på: opsigelsesvarsel, prisreguleringer (typisk årligt efter
      lønindeks), ansvar ved skader, og fortrydelsesret (14 dage ved fjernsalg). Undgå aftaler
      med automatisk binding uden klar opsigelsesret.
    </p>

    <h2>Røde flag — vælg et andet firma</h2>
    <ul>
      <li>Vil kun aftale mundtligt eller insisterer på kontant betaling.</li>
      <li>Kan ikke fremvise CVR eller forsikring.</li>
      <li>Pris langt under markedet (typisk &lt; 200 kr./time inkl. moms).</li>
      <li>Ingen anmeldelser, og firmaet er &lt; 6 måneder gammelt.</li>
      <li>Presser dig til at underskrive på stedet eller binder dig i 12+ måneder uden opsigelsesret.</li>
    </ul>
  </BlogArticleLayout>
);

export default ChooseCleaningCompany;