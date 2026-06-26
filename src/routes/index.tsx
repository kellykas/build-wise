import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, Building2, Home, Factory, Hammer, ShieldCheck,
  Award, Quote, CheckCircle2, Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader, SiteFooter } from "@/components/marketing/SiteHeader";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BuildFlow Construction — Commercial, Residential & Industrial Builders" },
      { name: "description", content: "Full-service general contractor delivering commercial, residential, industrial and infrastructure projects on time and on budget. Request a free quote today." },
    ],
  }),
  component: Home_,
});

const services = [
  { icon: Building2, title: "Commercial", desc: "Offices, retail, hotels and mixed-use towers." },
  { icon: Home, title: "Residential", desc: "Custom homes, multi-family and renovations." },
  { icon: Factory, title: "Industrial", desc: "Warehouses, plants and distribution hubs." },
  { icon: Hammer, title: "Renovation", desc: "Restoration, refits and adaptive reuse." },
];

const featured = [
  { title: "Riverside Tower", tag: "Commercial · 480k sqft", img: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=900&q=70&auto=format&fit=crop" },
  { title: "Maple Heights Residences", tag: "Residential · 186 units", img: "https://images.unsplash.com/photo-1448630360428-65456885c650?w=900&q=70&auto=format&fit=crop" },
  { title: "Northgate Logistics Hub", tag: "Industrial · 620k sqft", img: "https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=900&q=70&auto=format&fit=crop" },
];

const stats = [
  { v: "500+", l: "Projects delivered" },
  { v: "25 yrs", l: "In business" },
  { v: "$2.4B", l: "Built value" },
  { v: "98%", l: "On-time milestones" },
];

const testimonials = [
  { q: "BuildFlow delivered our HQ two weeks early and under budget. Their PM kept us informed every single week.", a: "Sandra Hill, COO · Northwind Logistics" },
  { q: "Craftsmanship you can feel. Every detail of our home was thoughtful and built to last.", a: "Daniel & Mia Foster · Hillview Estates" },
  { q: "A safety record and quality discipline that's rare in this industry. We've awarded them three projects in a row.", a: "Robert Sanchez, Director · Civic Authority" },
];

function Home_() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 -z-10">
          <img
            src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1800&q=70&auto=format&fit=crop"
            alt="Construction crew on a high-rise site at sunrise"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/40" />
        </div>
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-24 sm:px-6 md:py-32">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5 text-accent" /> Licensed · Bonded · Insured · OSHA Compliant
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-6xl">
              Building landmarks of <span className="text-primary">trust</span> since 1998.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              We're BuildFlow Construction — a full-service general contractor delivering commercial, residential, industrial and infrastructure projects across the region. On time. On budget. Built to last.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/contact" search={{ type: "quote" }}>
                <Button size="lg">Request a free quote <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
              <Link to="/projects"><Button size="lg" variant="outline">View our projects</Button></Link>
            </div>
            <div className="mt-8 flex items-center gap-3 text-sm text-muted-foreground">
              <Phone className="h-4 w-4 text-primary" /> Speak to a project manager today: <span className="font-semibold text-foreground">+1 (555) 240-8800</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border bg-card/40">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:grid-cols-4 sm:px-6">
          {stats.map((s) => (
            <div key={s.l} className="text-center sm:text-left">
              <div className="text-3xl font-bold text-primary">{s.v}</div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">What we build</h2>
              <p className="mt-3 text-muted-foreground">From custom homes to multi-tower campuses, our self-perform teams cover every trade in-house.</p>
            </div>
            <Link to="/services" className="text-sm font-medium text-primary hover:underline">All services →</Link>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((f) => (
              <Link key={f.title} to="/services" className="group rounded-xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                <div className="grid h-11 w-11 place-items-center rounded-md bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <div className="mt-4 font-semibold">{f.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{f.desc}</div>
                <div className="mt-4 inline-flex items-center text-sm font-medium text-primary opacity-0 transition group-hover:opacity-100">
                  Learn more <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured projects */}
      <section className="border-b border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Featured projects</h2>
              <p className="mt-3 text-muted-foreground">A glimpse of recent builds. Explore the full portfolio for case studies and metrics.</p>
            </div>
            <Link to="/projects" className="text-sm font-medium text-primary hover:underline">See all projects →</Link>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {featured.map((p) => (
              <Link key={p.title} to="/projects" className="group overflow-hidden rounded-2xl border border-border bg-card">
                <div className="aspect-[4/3] overflow-hidden bg-muted">
                  <img src={p.img} alt={p.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                </div>
                <div className="p-5">
                  <div className="text-xs uppercase tracking-wide text-primary">{p.tag}</div>
                  <div className="mt-1 text-lg font-semibold">{p.title}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Why owners choose BuildFlow</h2>
            <p className="mt-4 text-muted-foreground">
              We're hands-on, transparent and predictable. The team that wins the work is the team that builds it — no hand-offs, no surprises.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                "Self-perform crews for concrete, framing, finishes and MEP coordination",
                "Weekly cost & schedule reports, with no hidden line items",
                "Dedicated project manager from kickoff to 24-month warranty",
                "Industry-leading safety record (EMR of 0.62)",
                "Owner-portal access to drawings, RFIs, invoices and photos",
              ].map((p) => (
                <li key={p} className="flex items-start gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> <span>{p}</span></li>
              ))}
            </ul>
          </div>
          <div className="grid gap-4">
            {testimonials.map((t) => (
              <figure key={t.a} className="rounded-2xl border border-border bg-card p-6">
                <Quote className="h-5 w-5 text-primary" />
                <blockquote className="mt-3 text-sm text-foreground">"{t.q}"</blockquote>
                <figcaption className="mt-3 text-xs text-muted-foreground">— {t.a}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Certifications */}
      <section className="border-b border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><Award className="h-4 w-4 text-primary" /> ENR Top 400 Contractor</div>
            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> OSHA SHARP Certified</div>
            <div className="flex items-center gap-2"><Award className="h-4 w-4 text-primary" /> LEED Gold Builder</div>
            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> ISO 9001:2015</div>
            <div className="flex items-center gap-2"><Award className="h-4 w-4 text-primary" /> AGC Member</div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-16 sm:px-6 md:grid-cols-[2fr_1fr] md:items-center">
          <div>
            <h2 className="text-3xl font-bold md:text-4xl">Ready to start your project?</h2>
            <p className="mt-3 opacity-90">Tell us about your build. You'll get a response from a project manager within 24 hours — and a no-obligation budget range.</p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <Link to="/contact" search={{ type: "quote" }}><Button size="lg" variant="secondary">Request a quote</Button></Link>
            <Link to="/contact"><Button size="lg" variant="outline" className="bg-transparent text-primary-foreground hover:bg-primary-foreground hover:text-primary">Just say hi</Button></Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
