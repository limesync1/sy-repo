import { Link } from "react-router-dom";
import { servicesForCity } from "./cityServices";

export function LocalServiceLinks({ slug, name, currentPath }: { slug: string; name: string; currentPath: string }) {
  const services = servicesForCity(slug, currentPath);
  return (
    <section>
      <h2>Andre services i {name}</h2>
      <nav aria-label={`Andre services i ${name}`} className="not-prose">
        <ul className="grid list-none grid-cols-1 gap-x-6 p-0 sm:grid-cols-2">
          {services.map(service => (
            <li key={service.href}>
              <Link to={service.href} className="flex min-h-11 items-center py-2 text-sm text-foreground underline underline-offset-4 hover:text-primary">
                {service.label} i {name}
              </Link>
            </li>
          ))}
        </ul>
        <Link to={`/by/${slug}`} className="inline-flex min-h-11 items-center py-2 text-sm font-semibold text-foreground underline underline-offset-4">
          Se alle services i {name}
        </Link>
      </nav>
    </section>
  );
}