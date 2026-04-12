import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-foreground py-12">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <img src="/serviceydere-logo.png" alt="Serviceydere" className="mb-4 h-8 brightness-0 invert" />
            <p className="text-sm leading-relaxed text-white/50">
              Find og sammenlign serviceydere i hele Danmark – hurtigt, nemt og gratis.
            </p>
          </div>
          <div>
            <h4 className="mb-3 font-semibold text-white">Genveje</h4>
            <ul className="space-y-2 text-sm text-white/50">
              <li><Link to="/search" className="transition-colors hover:text-white">Søg services</Link></li>
              <li><Link to="/quote" className="transition-colors hover:text-white">Indhent tilbud</Link></li>
              <li><Link to="/search" className="transition-colors hover:text-white">Kategorier</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 font-semibold text-white">Kontakt</h4>
            <ul className="space-y-2 text-sm text-white/50">
              <li>kontakt@serviceydere.dk</li>
              <li>Danmark</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-white/10 pt-6 text-center text-sm text-white/40">
          © {new Date().getFullYear()} Serviceydere. Alle rettigheder forbeholdes.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
