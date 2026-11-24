import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { HardHat, Mail, Phone, MapPin, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useSiteContent, siteText, getContentValue } from "@/hooks/use-site-content";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";

const navKeys = ["home", "about", "services", "projects", "contact"] as const;
const navPaths = ["/", "/about", "/services", "/projects", "/contact"] as const;

export function SiteHeader() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <img src="/logo.png" alt="HYCO SARLU" className="h-10 w-10" />
          <span className="text-lg tracking-tight">HYCO <span className="text-primary">SARLU</span></span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 md:flex">
          {navKeys.map((key, i) => (
            <Link
              key={navPaths[i]}
              to={navPaths[i]}
              className="text-sm text-muted-foreground hover:text-foreground"
              activeProps={{ className: "text-foreground font-medium" }}
              activeOptions={{ exact: navPaths[i] === "/" }}
            >
              {t(`nav.${key}`)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Link to="/auth" className="hidden sm:block"><Button variant="ghost" size="sm">{t("nav.dashboard")}</Button></Link>
          <Link to="/contact" search={{ type: "quote" }} className="hidden sm:block"><Button size="sm">{t("hero.cta_quote")}</Button></Link>

          {/* Mobile hamburger */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
              <div className="flex flex-col">
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                  <Link to="/" className="flex items-center gap-2 font-semibold" onClick={() => setOpen(false)}>
                    <img src="/logo.png" alt="HYCO SARLU" className="h-8 w-8" />
                    <span className="text-sm">HYCO <span className="text-primary">SARLU</span></span>
                  </Link>
                  <SheetClose asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <X className="h-4 w-4" />
                    </Button>
                  </SheetClose>
                </div>
                <nav className="flex flex-col px-6 py-4">
                  {navKeys.map((key, i) => (
                    <Link
                      key={navPaths[i]}
                      to={navPaths[i]}
                      className="py-3 text-sm text-muted-foreground hover:text-foreground border-b border-border last:border-0"
                      activeProps={{ className: "text-foreground font-medium" }}
                      activeOptions={{ exact: navPaths[i] === "/" }}
                      onClick={() => setOpen(false)}
                    >
                      {t(`nav.${key}`)}
                    </Link>
                  ))}
                </nav>
                <div className="flex flex-col gap-2 px-6 pb-6">
                  <Link to="/auth" onClick={() => setOpen(false)}>
                    <Button variant="outline" className="w-full">{t("nav.dashboard")}</Button>
                  </Link>
                  <Link to="/contact" search={{ type: "quote" }} onClick={() => setOpen(false)}>
                    <Button className="w-full">{t("hero.cta_quote")}</Button>
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

type FooterCms = {
  description?: string;
  copyright?: string;
  legal?: { rccm?: string; tax_number?: string; id_nat?: string; numero?: string; inpp?: string; onem?: string };
  contact?: { phone?: string; email?: string; address?: string };
};

export function SiteFooter() {
  const { t, i18n } = useTranslation();
  const { data: content } = useSiteContent();
  const cms = (getContentValue(content, "cms", "footer", {}) as FooterCms) ?? {};

  // CMS content always takes priority over i18n fallbacks
  const description = siteText(content, "footer", "description", cms.description || t("footer.description"));
  const copyright = siteText(content, "footer", "copyright", cms.copyright || t("footer.copyright"));
  const phone = cms.contact?.phone?.trim() || siteText(content, "contact", "phone", "+243 825 913 789");
  const email = cms.contact?.email?.trim() || siteText(content, "contact", "email", "hello@scer-lconstruct.com");
  const address = cms.contact?.address?.trim() || siteText(content, "contact", "address", "Boulevard Mobutu N°6, Réf. Résidence Equateur, commune Makiso");
  const legal = [
    cms.legal?.rccm || "CD/KIS/RCCM/21.8-00068",
    cms.legal?.tax_number ? `Numéro Impôt : ${cms.legal.tax_number}` : "Numéro Impôt : A2213934W",
    cms.legal?.id_nat ? `ID NAT : ${cms.legal.id_nat}` : "ID NAT : 25-F4200-N84176G",
    cms.legal?.numero ? `NUMERO : ${cms.legal.numero}` : "NUMERO : 1015361000",
  ];
  const certs = [
    cms.legal?.inpp || "Certificat d'immatriculation à l'INPP N° DG/DF/DIREC/GU/7022/2021",
    cms.legal?.onem ? `ONEM : ${cms.legal.onem}` : "ONEM : 060255A21",
  ];

  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 font-semibold">
            <img src="/logo.png" alt="HYCO SARLU" className="h-8 w-8" />
            HYCO SARLU
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        <div>
          <div className="text-sm font-semibold">{t("footer.company")}</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/about" className="hover:text-foreground">{t("nav.about")}</Link></li>
            <li><Link to="/services" className="hover:text-foreground">{t("nav.services")}</Link></li>
            <li><Link to="/projects" className="hover:text-foreground">{t("nav.projects")}</Link></li>
            <li><Link to="/contact" className="hover:text-foreground">{t("nav.contact")}</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-semibold">{t("footer.get_in_touch")}</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> {phone}</li>
            <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> {email}</li>
            <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-primary" /> {address}</li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-semibold">{t("footer.start_project")}</div>
          <p className="mt-3 text-sm text-muted-foreground">{t("footer.start_project_desc")}</p>
          <Link to="/contact" search={{ type: "quote" }}><Button size="sm" className="mt-3">{t("hero.cta_quote")}</Button></Link>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="grid gap-6 text-xs text-muted-foreground md:grid-cols-2 lg:grid-cols-3">
            <div>
              <div className="font-semibold text-foreground">Informations légales</div>
              <ul className="mt-2 space-y-1">
                {legal.map((l) => <li key={l}>{l}</li>)}
              </ul>
            </div>
            <div>
              <div className="font-semibold text-foreground">Certifications</div>
              <ul className="mt-2 space-y-1">
                {certs.map((c) => <li key={c}>{c}</li>)}
              </ul>
            </div>
            <div>
              <div className="font-semibold text-foreground">Coordonnées</div>
              <ul className="mt-2 space-y-1">
                <li>{phone}</li>
                <li>{email}</li>
                <li>{address}</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
          {copyright}
        </div>
      </div>
    </footer>
  );
}
