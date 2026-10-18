import { ArrowUpRight, BedDouble, CalendarDays, CheckCircle2, Code2, ShieldCheck, Users } from "lucide-react";

const capabilities = [
  {
    icon: BedDouble,
    title: "Inventory-aware reservations",
    description: "Build availability checks around room inventory, stay dates, and explicit reservation states.",
    tag: "CORE DOMAIN",
  },
  {
    icon: ShieldCheck,
    title: "Correctness before convenience",
    description: "Design for duplicate-booking prevention, safe retries, and server-side validation.",
    tag: "RELIABILITY",
  },
  {
    icon: Code2,
    title: "Engineering-first foundation",
    description: "Strict TypeScript, API boundaries, environment validation, linting, and CI checks.",
    tag: "CODE QUALITY",
  },
];

function App() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#080d18] text-slate-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[540px] bg-[radial-gradient(ellipse_at_top,rgba(69,94,145,0.22),transparent_65%)]" />
      <div className="relative mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <a href="#" className="flex items-center gap-3" aria-label="StayPilot home">
            <span className="grid size-10 place-items-center rounded-xl border border-amber-200/20 bg-amber-100/10 text-amber-200">
              <BedDouble size={21} />
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-[0.18em]">STAYPILOT</span>
              <span className="mt-1 block text-xs text-slate-500">Reservation platform</span>
            </span>
          </a>
          <div className="hidden items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/5 px-3 py-2 text-xs text-emerald-200 sm:flex">
            <span className="size-1.5 rounded-full bg-emerald-300" />
            Engineering preview
          </div>
        </header>

        <section className="grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-300">
              <span className="text-amber-200">✦</span>
              Built for reliability, not just bookings
            </div>
            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
              Hospitality meets{" "}
              <span className="bg-gradient-to-r from-amber-100 via-amber-200 to-orange-300 bg-clip-text text-transparent">
                engineering.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-400 sm:text-lg">
              A serious foundation for hotel reservations: reliable inventory, clear APIs,
              secure workflows, and measurable system quality.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a
                href="#capabilities"
                className="inline-flex items-center gap-2 rounded-xl bg-amber-200 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-100"
              >
                Explore the platform <ArrowUpRight size={16} />
              </a>
              <a
                href="http://localhost:5000/api/v1/health"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/5"
              >
                API health check
              </a>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-xs text-slate-500">
              <span className="flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-300" /> Type-safe foundation</span>
              <span className="flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-300" /> API-first design</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-5 rounded-[2rem] bg-amber-200/[0.04] blur-2xl" />
            <div className="relative rounded-[1.75rem] border border-white/10 bg-[#101827]/90 p-5 shadow-2xl shadow-black/30 sm:p-7">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">System overview</p>
                  <h2 className="mt-2 text-xl font-semibold">Reservation core</h2>
                </div>
                <span className="rounded-lg border border-white/10 bg-white/5 p-2 text-amber-200"><CalendarDays size={19} /></span>
              </div>
              <div className="mt-7 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                  <p className="text-xs text-slate-500">Inventory target</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight">10,000</p>
                  <p className="mt-1 text-xs text-slate-500">Rooms in scope</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                  <p className="text-xs text-slate-500">Primary goal</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight">Correctness</p>
                  <p className="mt-1 text-xs text-slate-500">No duplicate confirmed stays</p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-[#0b1220] p-4">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-medium">Core request flow</span>
                  <span className="text-xs text-slate-500">Planned architecture</span>
                </div>
                <div className="space-y-2">
                  {["Search availability", "Validate inventory on server", "Create reservation safely", "Confirm payment and status"].map((step, index) => (
                    <div key={step} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-3">
                      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-amber-100/10 text-xs font-semibold text-amber-200">{String(index + 1).padStart(2, "0")}</span>
                      <span className="text-sm text-slate-300">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500">
                Inventory and workflow shown here are design targets; booking and payment flows are not implemented in this starter yet.
              </p>
            </div>
          </div>
        </section>

        <section id="capabilities" className="pb-20 pt-4 sm:pb-28">
          <div className="mb-8 flex items-end justify-between gap-5">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-amber-200">ENGINEERING PRINCIPLES</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Designed to grow the right way.</h2>
            </div>
            <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex"><Users size={15} /> Single-hotel platform</div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {capabilities.map(({ icon: Icon, title, description, tag }) => (
              <article key={title} className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 transition hover:border-amber-200/25 hover:bg-white/[0.04]">
                <div className="grid size-11 place-items-center rounded-xl border border-amber-200/15 bg-amber-100/[0.06] text-amber-200">
                  <Icon size={20} />
                </div>
                <p className="mt-6 text-[10px] font-semibold tracking-[0.2em] text-amber-200/80">{tag}</p>
                <h3 className="mt-2 text-lg font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="flex flex-col justify-between gap-3 border-t border-white/10 py-6 text-xs text-slate-500 sm:flex-row">
          <span>StayPilot · Hotel Reservation System</span>
          <span>React · TypeScript · Express · MongoDB</span>
        </footer>
      </div>
    </main>
  );
}

export default App;
