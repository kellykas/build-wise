import { Link } from "@tanstack/react-router";
import { HardHat, Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/services", label: "Services" },
  { to: "/projects", label: "Projects" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <HardHat className="h-5 w-5" />
          </span>
          <span className="text-lg tracking-tight">BuildFlow<span className="text-accent"> Construction</span></span>
        </Link>
        <nav className="hidden items-center gap-7 md:flex">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="text-sm text-muted-foreground hover:text-foreground"
              activeProps={{ className: "text-foreground font-medium" }}
              activeOptions={{ exact: n.to === "/" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/auth"><Button variant="ghost" size="sm">Portal</Button></Link>
          <Link to="/contact" search={{ type: "quote" }}><Button size="sm">Request a quote</Button></Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
              <HardHat className="h-4 w-4" />
            </span>
            BuildFlow Construction
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Building landmarks of trust since 1998. Commercial, residential and industrial construction delivered on time, on budget.
          </p>
        </div>
        <div>
          <div className="text-sm font-semibold">Company</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/about" className="hover:text-foreground">About us</Link></li>
            <li><Link to="/services" className="hover:text-foreground">Our services</Link></li>
            <li><Link to="/projects" className="hover:text-foreground">Our projects</Link></li>
            <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-semibold">Get in touch</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> +1 (555) 240-8800</li>
            <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> hello@buildflow.co</li>
            <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-primary" /> 240 Riverside Ave, Suite 1100</li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-semibold">Start a project</div>
          <p className="mt-3 text-sm text-muted-foreground">Tell us about your build and our team will reply within 24 hours.</p>
          <Link to="/contact" search={{ type: "quote" }}><Button size="sm" className="mt-3">Request a quote</Button></Link>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} BuildFlow Construction Co. All rights reserved.
      </div>
    </footer>
  );
}
