const Footer = () => {
  return (
    <footer className="border-t border-border bg-card py-12">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="mb-3 text-lg font-bold text-foreground">Serviceydere</h3>
            <p className="text-sm text-muted-foreground">
              Find og sammenlign serviceydere i hele Danmark – hurtigt, nemt og gratis.
            </p>
          </div>
          <div>
            <h4 className="mb-3 font-semibold text-foreground">Genveje</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="cursor-pointer transition-colors hover:text-foreground">Søg services</li>
              <li className="cursor-pointer transition-colors hover:text-foreground">Indhent tilbud</li>
              <li className="cursor-pointer transition-colors hover:text-foreground">Kategorier</li>
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
