import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/marketing/SiteHeader";
import { Button } from "@/components/ui/button";
import {
  Building2, Home, Factory, Hammer, Ruler, Truck,
  ArrowRight, CheckCircle2, ShieldCheck,
} from "lucide-react";

const services = [
  {
    icon: Building2,
    title: "Commercial Construction",
    desc: "Office towers, retail centres, hotels and mixed-use developments delivered turnkey.",
    points: ["Ground-up construction", "Tenant fit-outs", "LEED & green building", "Design-build delivery"],
  },
  {
    icon: Home,
    title: "Residential Builds",
    desc: "Custom homes, multi-family residences and high-end renovations crafted to your vision.",
    points: ["Custom luxury homes", "Multi-family housing", "Whole-home renovations", "Additions & extensions"],
  },
  {
    icon: Factory,
    title: "Industrial & Infrastructure",
    desc: "Warehouses, manufacturing plants, civil works and heavy infrastructure projects.",
    points: ["Warehouses & distribution", "Manufacturing facilities", "Roads, bridges & utilities", "Site development"],
  },
  {
    icon: Hammer,
    title: "Renovation & Restoration",
    desc: "Adaptive reuse, heritage restoration and full interior refits with minimal disruption.",
    points: ["Heritage restoration", "Adaptive reuse", "Interior remodelling", "Seismic upgrades"],
  },
  {
    icon: Ruler,
    title: "Design-Build & Pre-Construction",
    desc: "From concept and feasibility to permits and budgeting — one team, one accountable contract.",
    points: ["Feasibility & site selection", "Architectural coordination", "Permitting & approvals", "Cost & value engineering"],
  },
  {
    icon: Truck,
    title: "Project & Construction Management",
    desc: "Full-service CM, owner's representation and on-site supervision for complex programmes.",
    points: ["Schedule & cost control", "Subcontractor management", "Quality & safety oversight", "Closeout & handover"],
  },
];

const process = [
  { n: "01", t: "Consult", d: "We meet on-site, listen to your goals and assess constraints." },
  { n: "02", t: "Design & price", d: "Drawings, specifications and a transparent itemised proposal." },
  { n: "03", t: "Build", d: "Daily logs, weekly reports and a dedicated PM through completion." },
  { n: "04", t: "Handover & care", d: "Punch-list, warranty and a 24-month post-build support plan." },
];

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Construction Services — BuildFlow Construction" },
      { name: "description", content: "Commercial, residential, industrial and renovation construction services. Design-build, CM and pre-construction expertise." },
    ],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border bg-gradient-to-b from-primary/5 to-transparent">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-accent" /> Licensed · Bonded · Insured
              </div>
              <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">Construction services, end to end.</h1>
              <p className="mt-4 text-lg text-muted-foreground">
                From a single-family renovation to a multi-tower campus, our integrated team handles design, pre-construction, build and handover under one roof.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/contact" search={{ type: "quote" }}><Button size="lg">Request a quote <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
                <Link to="/projects"><Button size="lg" variant="outline">See completed projects</Button></Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <div key={s.title} className="group rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary/10 text-primary">
                  <s.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
                <ul className="mt-4 space-y-2 text-sm">
                  {s.points.map((p) => (
                    <li key={p} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> <span>{p}</span></li>
                  ))}
                </ul>
                <Link to="/contact" search={{ type: "quote" }} className="mt-5 inline-flex items-center text-sm font-medium text-primary group-hover:underline">
                  Get a quote for this <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-card/40">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">How we deliver</h2>
              <p className="mt-3 text-muted-foreground">A predictable, transparent process refined over 25 years and 500+ completed builds.</p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-4">
              {process.map((p) => (
                <div key={p.n} className="rounded-xl border border-border bg-card p-6">
                  <div className="text-sm font-mono text-primary">{p.n}</div>
                  <div className="mt-3 font-semibold">{p.t}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{p.d}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6">
          <h2 className="text-3xl font-bold md:text-4xl">Have a project in mind?</h2>
          <p className="mt-3 text-muted-foreground">Send us the brief — we'll respond within 24 hours with next steps and a no-obligation budget range.</p>
          <Link to="/contact" search={{ type: "quote" }}><Button size="lg" className="mt-6">Request a quote <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
