import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-muted/30 py-12">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <img src="/serviceydere-logo.png" alt="Serviceydere" className="mb-4 h-8" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              Find og sammenlign serviceydere i hele Danmark – hurtigt, nemt og gratis.
            </p>
          </div>
          <div>
            <h4 className="mb-3 font-semibold text-foreground">Genveje</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/search" className="transition-colors hover:text-foreground">Søg services</Link></li>
              <li><Link to="/quote" className="transition-colors hover:text-foreground">Indhent tilbud</Link></li>
              <li><Link to="/search" className="transition-colors hover:text-foreground">Kategorier</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 font-semibold text-foreground">Kontakt</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>kontakt@serviceydere.dk</li>
              <li>Danmark</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Serviceydere. Alle rettigheder forbeholdes.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
