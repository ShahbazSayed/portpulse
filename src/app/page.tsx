export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* Navbar */}
      <nav className="border-b border-slate-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Port
              <span className="text-blue-500">Pulse</span>
            </h1>

            <p className="mt-0.5 text-xs font-medium text-slate-500">
              Shipping Risk Intelligence
            </p>
          </div>

          <a
            href="/login"
            className="rounded-lg border border-slate-700 px-5 py-2 text-sm font-medium transition hover:border-slate-600 hover:bg-slate-800"
          >
            Login
          </a>

        </div>
      </nav>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-6 pb-20 pt-14 text-center">

        <div className="mx-auto max-w-5xl">

          <div className="mb-5 inline-flex rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-400">
            🚢 Smarter Shipping. Fewer Surprises.
          </div>

          <h2 className="text-5xl font-extrabold leading-[1.08] tracking-tight md:text-7xl">

            Know the delay

            <br />

            <span className="text-blue-500">
              before it becomes a problem.
            </span>

          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            PortPulse monitors shipments, vessels, ports and disruption risks
            to help you identify potential delays before they impact your
            supply chain.
          </p>

          {/* Buttons */}
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">

            <a
              href="/login"
              className="rounded-lg bg-blue-600 px-7 py-3.5 font-semibold transition hover:bg-blue-500"
            >
              Get Started →
            </a>

            <a
              href="/login"
              className="rounded-lg border border-slate-700 px-7 py-3.5 font-semibold transition hover:border-slate-600 hover:bg-slate-800"
            >
              Track a Shipment
            </a>

          </div>

        </div>

      </section>

      {/* Features */}
      <section className="border-y border-slate-800 bg-slate-900/40">

        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-14 md:grid-cols-3">

          <Feature
            icon="📊"
            title="Risk Intelligence"
            text="Understand the risk level of every shipment with a simple, actionable score."
          />

          <Feature
            icon="⚠️"
            title="Delay Prediction"
            text="Identify vessel delays, port congestion and route disruptions before they become costly."
          />

          <Feature
            icon="🔔"
            title="Smart Alerts"
            text="Get notified when something changes that could impact your shipment."
          />

        </div>

      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">

        <h3 className="text-3xl font-bold md:text-4xl">
          Your shipment shouldn't surprise you.
        </h3>

        <p className="mt-4 text-slate-400">
          Stay ahead of disruptions with PortPulse.
        </p>

        <a
          href="/login"
          className="mt-7 inline-block rounded-lg bg-blue-600 px-7 py-3.5 font-semibold transition hover:bg-blue-500"
        >
          Start Monitoring →
        </a>

      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-7 text-center text-sm text-slate-500">
        © 2026 PortPulse. Shipping Risk Intelligence.
      </footer>

    </main>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-7 transition hover:border-slate-700">

      <div className="text-3xl">
        {icon}
      </div>

      <h3 className="mt-5 text-xl font-semibold">
        {title}
      </h3>

      <p className="mt-3 leading-7 text-slate-400">
        {text}
      </p>

    </div>
  );
}