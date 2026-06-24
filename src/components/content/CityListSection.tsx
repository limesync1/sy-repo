import { Link } from "react-router-dom";

interface Props {
  /** Sti-præfix, fx "/rengoering" eller "/flyttehjaelp". */
  base: string;
  /** Kategori-label til overskriften, fx "rengøring". */
  label: string;
  /** By-data; kun slug+name skal være sat. */
  cities: { slug: string; name: string }[];
}

/**
 * Synligt grid med alle by-sider for en kategori. Bruges af hub-siderne
 * for at give Google et statisk link til hver eneste by-slug i HTML
 * (RelatedContent og hardkodede "Lokal i din by"-lister rummer kun de
 * største). Fjerner ~30 orphan-pages i ét hug.
 */
const CityListSection = ({ base, label, cities }: Props) => (
  <section aria-labelledby="city-grid-heading" className="not-prose my-10">
    <h2 id="city-grid-heading" className="mb-4 text-2xl font-semibold text-foreground">
      Find {label} i din by
    </h2>
    <p className="mb-5 text-sm text-muted-foreground">
      Vi dækker {cities.length}+ byer i hele Danmark. Klik på din by for lokale priser og udbydere.
    </p>
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {cities.map((c) => (
        <li key={c.slug}>
          <Link
            to={`${base}/${c.slug}`}
            className="block rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition hover:border-foreground/40 hover:bg-muted"
          >
            {c.name}
          </Link>
        </li>
      ))}
    </ul>
  </section>
);

export default CityListSection;