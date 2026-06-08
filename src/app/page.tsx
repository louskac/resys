import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  return (
    <div className="flex-1 bg-background text-foreground flex flex-col font-sans transition-colors duration-150">
      <header className="border-b border-border bg-card sticky top-0 z-50 transition-colors shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 select-none">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 500 500"
              className="h-9 w-9 transition-transform hover:scale-105"
              fill="none"
            >
              <defs>
                <linearGradient id="resysGradientInline" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="50%" stopColor="#6366F1" />
                  <stop offset="100%" stopColor="#14B8A6" />
                </linearGradient>
                <filter id="subtleGlowInline" x="-15%" y="-15%" width="130%" height="130%">
                  <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="#6366F1" floodOpacity="0.3" />
                </filter>
              </defs>
              <g filter="url(#subtleGlowInline)">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M 110 150 L 155 105 H 315 C 385 105 405 145 405 205 C 405 255 380 285 325 295 L 385 395 H 320 L 265 305 H 175 V 395 H 120 V 170 L 110 150 Z M 175 160 V 255 H 275 C 325 255 345 235 345 205 C 345 175 325 160 275 160 H 175 Z"
                  fill="url(#resysGradientInline)"
                />
                <g fill="#FFFFFF" opacity="0.85">
                  <rect x="290" y="325" width="10" height="10" rx="2.5" />
                  <rect x="312" y="325" width="10" height="10" rx="2.5" />
                  <rect x="334" y="325" width="10" height="10" rx="2.5" />
                  <rect x="356" y="325" width="10" height="10" rx="2.5" />
                  <rect x="301" y="345" width="10" height="10" rx="2.5" />
                  <rect x="323" y="345" width="10" height="10" rx="2.5" />
                  <rect x="345" y="345" width="10" height="10" rx="2.5" />
                  <rect x="367" y="345" width="10" height="10" rx="2.5" />
                  <rect x="312" y="365" width="10" height="10" rx="2.5" />
                  <rect x="334" y="365" width="10" height="10" rx="2.5" />
                  <rect x="356" y="365" width="10" height="10" rx="2.5" />
                  <rect x="378" y="365" width="10" height="10" rx="2.5" />
                </g>
              </g>
            </svg>
            <span className="font-bold text-lg tracking-tight text-foreground">
              ReSys SaaS
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <a href="#features" className="hover:text-primary py-1.5 px-3 rounded-lg hover:bg-secondary transition-all">Features</a>
            <a href="#verticals" className="hover:text-primary py-1.5 px-3 rounded-lg hover:bg-secondary transition-all">Verticals</a>
            <a href="#integrations" className="hover:text-primary py-1.5 px-3 rounded-lg hover:bg-secondary transition-all">SSO & CRM</a>
          </nav>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-secondary border border-border text-muted-foreground font-semibold tracking-wide">
              v1.0.0
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden py-24 md:py-32 border-b border-border">
          {/* Subtle grid pattern without heavy radial gradients */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-15 dark:opacity-5" />

          <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
              Powered by OneiD SSO Identity provider
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-6 leading-tight">
              One Unified Engine for{" "}
              <span className="text-primary">
                Every Booking Need
              </span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              A modern, high-performance SaaS reservation engine. Tailored for municipal facilities, yoga capacity classes, interactive teaching modules, and massive scale events.
            </p>

            {/* Sandbox Quick Switcher */}
            <div className="card p-6 max-w-xl mx-auto bg-card shadow-sm">
              <h3 className="text-xs font-bold text-muted-foreground mb-4 uppercase tracking-wider">Local Development Tenant Sandbox</h3>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="http://sfera.localhost:3000"
                  className="btn-outline flex items-center justify-center gap-2 py-2"
                >
                  <span className="h-2 w-2 rounded-full bg-cyan-500"></span>
                  Sféra Portal
                </Link>
                <Link
                  href="http://umelka.localhost:3000"
                  className="btn-outline flex items-center justify-center gap-2 py-2"
                >
                  <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                  Umělka Portal
                </Link>
              </div>
              <p className="text-[10px] text-muted-foreground mt-3 font-mono">
                Note: Map subdomains in your local /etc/hosts to run sandbox portals.
              </p>
            </div>
          </div>
        </section>

        {/* Verticals Section */}
        <section id="verticals" className="py-20 max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-3">Architected for Diverse Verticals</h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              ReSys SaaS replaces legacy single-purpose portals with dynamic, template-driven scheduling schemas.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="card p-6 hover:border-primary/40 transition-all">
              <div className="h-8 w-8 rounded-lg bg-secondary text-primary font-bold text-xs flex items-center justify-center mb-5">01</div>
              <h3 className="font-bold text-base text-foreground mb-2">Sports Grounds</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Rent court slots, football fields, or gymnasiums. Configurable time intervals, custom pricing matrices, and reservation conflicts prevention.
              </p>
            </div>

            <div className="card p-6 hover:border-primary/40 transition-all">
              <div className="h-8 w-8 rounded-lg bg-secondary text-primary font-bold text-xs flex items-center justify-center mb-5">02</div>
              <h3 className="font-bold text-base text-foreground mb-2">Capacity Classes</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Perfect for yoga studios and workouts. Define maximum capacities per session, manage automatic waiting lists, and notify instructors.
              </p>
            </div>

            <div className="card p-6 hover:border-primary/40 transition-all">
              <div className="h-8 w-8 rounded-lg bg-secondary text-primary font-bold text-xs flex items-center justify-center mb-5">03</div>
              <h3 className="font-bold text-base text-foreground mb-2">Teaching & Labs</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Usecases like Sféra. Complex recurring curricula, school group bookings, lecturer assignment, and specialized lab equipment reservation.
              </p>
            </div>

            <div className="card p-6 hover:border-primary/40 transition-all">
              <div className="h-8 w-8 rounded-lg bg-secondary text-primary font-bold text-xs flex items-center justify-center mb-5">04</div>
              <h3 className="font-bold text-base text-foreground mb-2">Massive Events</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                For events like MotoGP or museum tickets (NZM). High transactional throughput, queue management, seat mapping, and offline scanner syncing.
              </p>
            </div>
          </div>
        </section>

        {/* Self check-in feature */}
        <section className="py-16 bg-secondary/30 border-y border-border">
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-primary font-semibold text-xs tracking-wide uppercase">IoT & Access Control</span>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mt-2 mb-4">Self-Checkin Turnstile APIs</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                ReSys provides a lightweight, cryptographically secure Device Check-in API. Physical turnstiles, gates, or reception tablets running QR scanners check booking status directly against the central server.
              </p>
              <ul className="space-y-2.5 text-xs">
                <li className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Hashed token verification for device authorization.
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Validation within user booking windows (e.g., 15 min early/late).
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Prevention of duplicate ticket entries (double-scanning).
                </li>
              </ul>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl font-mono text-xs text-zinc-400 shadow-xl">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                <span className="text-zinc-350 font-semibold">POST /api/v1/device/checkin</span>
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-350 text-[10px]">REST API</span>
              </div>
              <p className="text-zinc-500 mb-2">{"// Device sends QR payload"}</p>
              <pre className="text-zinc-300 mb-4 bg-black p-3 rounded-lg border border-zinc-900">
{`{
  "deviceId": "gate_north_001",
  "deviceToken": "sec_tok_xyz...",
  "qrPayload": "booking_uuid_12345"
}`}
              </pre>
              <p className="text-zinc-500 mb-2">{"// Server returns access payload"}</p>
              <pre className="text-zinc-300 bg-black p-3 rounded-lg border border-zinc-900">
{`{
  "status": "granted",
  "userName": "Josef Novák",
  "resourceName": "Chemistry Lab 1",
  "command": "open_gate"
}`}
              </pre>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-card text-muted-foreground text-xs transition-colors">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} ReSys SaaS. Built for the Enigoo & Relatoo ecosystem.</p>
          <div className="flex gap-6">
            <span className="text-muted-foreground">Standalone Identity Provider: OneiD SSO</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
