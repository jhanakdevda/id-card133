import { BadgeGenerator } from '@/components/badge-generator'

export default function Page() {
  return (
    <main className="relative min-h-screen overflow-x-hidden">

      {/* ── Sunrise background image, very low opacity ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: "url('/sunrise-bottom.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom',
          opacity: 0.08,
        }}
      />

      {/* ── Grid overlay ── */}
      <div aria-hidden="true" className="hh-grid pointer-events-none fixed inset-0 z-0" />

      <div className="relative z-10">

        {/* ══ NAVBAR ══ */}
        <nav className="flex items-center justify-between border-b border-border/40 px-5 py-4 md:px-10">
          {/* Left: 2:47 PM Studio logo */}
          <img
            src="https://hhgoa.com/assets/2-47.svg"
            alt="2:47 PM Studio"
            className="h-auto w-[clamp(56px,10vw,88px)]"
          />
          {/* Right: CREATE MY ID button */}
          <a
            href="#generator"
            className="inline-flex items-center gap-2 border-2 border-primary bg-primary px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-primary-foreground transition-colors hover:bg-transparent hover:text-primary md:text-sm"
          >
            CREATE MY ID →
          </a>
        </nav>

        {/* ══ HERO LOCKUP: full-width HACKER गोवा HOUSE ══ */}
        <section className="overflow-hidden px-4 pt-8 md:px-8 md:pt-10">
          {/* HACKER HOUSE — गोवा sits on R of HACKER and E of HOUSE */}
          <div className="relative flex w-full items-center justify-center">
            {/* HACKE + R (गोवा anchored to bottom-right of R) */}
            <span className="hh-hero-title font-serif text-[clamp(44px,10.5vw,130px)] font-black uppercase leading-none tracking-tight text-primary">HACKE</span>
            <span className="hh-hero-title relative font-serif text-[clamp(44px,10.5vw,130px)] font-black uppercase leading-none tracking-tight text-primary">
              R
              <span className="goa-float absolute z-20" style={{ right: '-28%', bottom: '-30%' }}>
                <img src="/goa_hindi.svg" alt="गोवा" className="block h-auto w-[clamp(60px,7vw,96px)]" />
              </span>
            </span>
            {/* space */}
            <span className="hh-hero-title font-serif text-[clamp(44px,10.5vw,130px)] font-black uppercase leading-none tracking-tight text-primary">&nbsp;</span>
            <span className="hh-hero-title font-serif text-[clamp(44px,10.5vw,130px)] font-black uppercase leading-none tracking-tight text-primary">HOUSE</span>
          </div>
          {/* Subline */}
          <div className="mt-2 flex items-center justify-between px-1 pb-4 md:pb-6">
            <p className="font-mono text-xs tracking-[0.22em] text-foreground/55 md:text-sm">
              GOA, INDIA · 28 – 31 OCT 2026
            </p>
            <p className="font-mono text-xs tracking-[0.22em] text-foreground/55 md:text-sm">
              2:47 PM STUDIO
            </p>
          </div>

          {/* YOUR BUILDER ID AWAITS */}
          <h1 className="hh-hero-title mb-5 font-serif text-[clamp(38px,7vw,82px)] font-black uppercase leading-[0.9] tracking-tight text-primary">
            YOUR BUILDER<br />ID AWAITS.
          </h1>
          <p className="mb-2 max-w-xl font-mono text-sm leading-relaxed text-foreground/75 md:text-base">
            Frame yourself as an HH Goa 2026 builder. Turn your photo into a Builder ID card built for the feed.
          </p>
          <p className="mb-5 font-mono text-xs tracking-[0.22em] text-accent md:text-sm">
            UPLOAD. PERSONALIZE. SHIP IT.
          </p>
          <p className="mb-8 font-mono text-xs tracking-[0.2em] text-foreground/40">
            NO LOGIN · NO CROPPING · #FRAMEINGOA
          </p>
        </section>

        {/* ══ HOW IT WORKS — above the generator ══ */}
        <section className="px-5 pb-14 md:px-10">
          <p className="mb-6 font-mono text-xs tracking-[0.3em] text-foreground/50">HOW IT WORKS</p>
          <div className="grid gap-px border border-border/60 bg-border/60 sm:grid-cols-3">
            {[
              { n: '01', title: 'UPLOAD',   body: 'Drop your photo. HEIC, JPG or PNG – we handle the crop.' },
              { n: '02', title: 'IDENTIFY', body: 'Name your stack. Claim your builder title.' },
              { n: '03', title: 'SHIP',     body: 'Download it. Share it. Get on the radar.' },
            ].map(({ n, title, body }) => (
              <div key={n} className="bg-background p-7">
                <p className="mb-3 font-serif text-3xl font-black text-accent">{n}</p>
                <p className="mb-2 font-serif text-xl font-black uppercase text-primary">{title}</p>
                <p className="font-mono text-sm leading-relaxed text-foreground/65">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ══ GENERATOR ══ */}
        <section id="generator" className="px-5 pb-16 md:px-10">
          <p className="mb-8 font-mono text-xs tracking-[0.3em] text-foreground/50">// BUILD YOUR ID</p>
          <BadgeGenerator />
        </section>

        {/* ══ FOOTER ══ */}
        <footer className="border-t border-border/40 px-5 py-6 md:px-10">
          <div className="flex flex-col gap-1 font-mono text-xs text-foreground/35 md:flex-row md:justify-between">
            <p>Use #FrameInGoa to get featured on the Radar.</p>
            <p>© 2026 HH-Goa · a #FrameInGoa community frame</p>
          </div>
        </footer>

      </div>
    </main>
  )
}
