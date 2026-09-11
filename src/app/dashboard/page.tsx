import { createClient } from "@supabase/supabase-js";
import SearchFilter from "./SearchFilter";
import LiveVesselCard from "./LiveVesselCard";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default async function Dashboard() {
  const { data: shipments, error } = await supabase
    .from("shipments")
    .select("*")
    .order("created_at", { ascending: false });

  const { count: unreadNotifications } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("is_read", false);

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        <h1 className="text-3xl font-bold">
          Port<span className="text-blue-500">Pulse</span>
        </h1>

        <p className="mt-4 text-red-400">
          Database Error: {error.message}
        </p>
      </main>
    );
  }

  const allShipments = shipments ?? [];

  const activeShipments = allShipments.length;

  const highRisk = allShipments.filter(
    (shipment) =>
      shipment.risk_level === "HIGH" ||
      shipment.risk_level === "CRITICAL"
  ).length;

  const delayed = allShipments.filter(
    (shipment) =>
      shipment.status === "DELAYED" ||
      shipment.status === "MAJOR_DELAY"
  ).length;

  const onTime = allShipments.filter(
    (shipment) => shipment.status === "ON_TIME"
  ).length;

  const lowRisk = allShipments.filter(
    (shipment) => shipment.risk_level === "LOW"
  ).length;

  const mediumRisk = allShipments.filter(
    (shipment) => shipment.risk_level === "MEDIUM"
  ).length;

  const highRiskOnly = allShipments.filter(
    (shipment) => shipment.risk_level === "HIGH"
  ).length;

  const criticalRisk = allShipments.filter(
    (shipment) => shipment.risk_level === "CRITICAL"
  ).length;

  // Fixed: HIGH/CRITICAL risk OR any shipment delay
  const urgentShipments = allShipments.filter(
    (shipment) =>
      shipment.risk_level === "HIGH" ||
      shipment.risk_level === "CRITICAL" ||
      shipment.status === "DELAYED" ||
      shipment.status === "MAJOR_DELAY"
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold">
              Port<span className="text-blue-500">Pulse</span>
            </h1>

            <p className="text-xs text-slate-400">
              Shipping Risk Intelligence
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/notifications"
              className="rounded-lg border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-cyan-500 hover:text-cyan-400"
            >
              🔔 Notifications
              {unreadNotifications
                ? ` (${unreadNotifications})`
                : ""}
            </a>

            <a
              href="/shipments"
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold transition hover:bg-blue-500"
            >
              + Add Shipment
            </a>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">
        {/* Page Heading */}
        <div>
          <p className="text-sm font-medium text-cyan-400">
            Shipping Operations
          </p>

          <h2 className="mt-1 text-3xl font-bold">
            Dashboard
          </h2>

          <p className="mt-2 text-slate-400">
            Monitor your shipments and identify potential delays
            before they become problems.
          </p>
        </div>

        {/* Critical Alert */}
        {urgentShipments.length > 0 && (
          <div className="mt-8 rounded-2xl border border-red-900/60 bg-red-500/5 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-xl">
                  🚨
                </div>

                <div>
                  <h3 className="font-semibold text-red-400">
                    Attention Required
                  </h3>

                  <p className="mt-1 text-sm text-slate-400">
                    {urgentShipments.length} shipment
                    {urgentShipments.length === 1 ? "" : "s"} require
                    immediate risk monitoring due to high or critical
                    risk, or a shipment delay.
                  </p>
                </div>
              </div>

              <a
                href="/notifications"
                className="rounded-lg border border-red-900/60 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/10"
              >
                View Alerts →
              </a>
            </div>
          </div>
        )}

        {/* Main Stats */}
        <div className="mt-8 grid gap-5 md:grid-cols-4">
          <Stat
            title="Active Shipments"
            value={activeShipments}
            description="Currently monitored"
          />

          <Stat
            title="High Risk"
            value={highRisk}
            description="Needs attention"
            valueClass={
              highRisk > 0
                ? "text-orange-400"
                : "text-white"
            }
          />

          <Stat
            title="Delayed"
            value={delayed}
            description="Schedule impacted"
            valueClass={
              delayed > 0
                ? "text-red-400"
                : "text-white"
            }
          />

          <Stat
            title="On Time"
            value={onTime}
            description="Operating normally"
            valueClass="text-green-400"
          />
        </div>

        {/* Search and Filter */}
        <SearchFilter shipments={allShipments} />

        {/* LIVE VESSEL NETWORK */}
        <LiveVesselCard />

        {/* Risk Overview */}
        <div className="mt-10">
          <div>
            <p className="text-sm font-medium text-cyan-400">
              Risk Intelligence
            </p>

            <h3 className="mt-1 text-2xl font-bold">
              Risk Overview
            </h3>

            <p className="mt-1 text-sm text-slate-400">
              Current risk distribution across your shipments.
            </p>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-4">
            <RiskCard
              title="LOW"
              count={lowRisk}
              description="Normal operating conditions"
              badgeClass="bg-green-500/10 text-green-400"
              borderClass="border-green-900/50"
            />

            <RiskCard
              title="MEDIUM"
              count={mediumRisk}
              description="Monitor for changes"
              badgeClass="bg-yellow-500/10 text-yellow-400"
              borderClass="border-yellow-900/50"
            />

            <RiskCard
              title="HIGH"
              count={highRiskOnly}
              description="Potential disruption"
              badgeClass="bg-orange-500/10 text-orange-400"
              borderClass="border-orange-900/50"
            />

            <RiskCard
              title="CRITICAL"
              count={criticalRisk}
              description="Immediate attention required"
              badgeClass="bg-red-500/10 text-red-400"
              borderClass="border-red-900/50"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-10">
          <div>
            <p className="text-sm font-medium text-cyan-400">
              Operations
            </p>

            <h3 className="mt-1 text-2xl font-bold">
              Quick Actions
            </h3>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <QuickAction
              href="/shipments"
              icon="📦"
              title="Add Shipment"
              description="Start monitoring a new shipment."
            />

            <QuickAction
              href="/notifications"
              icon="🔔"
              title="View Notifications"
              description="Review shipment risk and delay alerts."
              badge={
                unreadNotifications
                  ? unreadNotifications
                  : undefined
              }
            />

            <QuickAction
              href="/dashboard/live"
              icon="🚢"
              title="Live Vessel Tracking"
              description="Monitor real-time AIS vessel positions."
            />
          </div>
        </div>

        {/* Bottom Product Message */}
        <div className="mt-10 rounded-2xl border border-blue-900/40 bg-blue-500/5 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-400">
                PortPulse Intelligence
              </p>

              <h3 className="mt-1 text-xl font-bold">
                Know the delay before it becomes a problem.
              </h3>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                PortPulse combines shipment risk factors, ETA
                predictions and automated alerts to help logistics
                teams act before disruptions become costly.
              </p>
            </div>

            <a
              href="/shipments"
              className="shrink-0 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500"
            >
              Track a Shipment →
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

function Stat({
  title,
  value,
  description,
  valueClass = "text-white",
}: {
  title: string;
  value: number;
  description: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-slate-700">
      <p className="text-sm text-slate-400">
        {title}
      </p>

      <p
        className={
          "mt-3 text-3xl font-bold " + valueClass
        }
      >
        {value}
      </p>

      <p className="mt-2 text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
}

function RiskCard({
  title,
  count,
  description,
  badgeClass,
  borderClass,
}: {
  title: string;
  count: number;
  description: string;
  badgeClass: string;
  borderClass: string;
}) {
  return (
    <div
      className={
        "rounded-2xl border bg-slate-900 p-6 transition hover:bg-slate-800/70 " +
        borderClass
      }
    >
      <div className="flex items-center justify-between">
        <span
          className={
            "rounded-full px-3 py-1 text-xs font-bold " +
            badgeClass
          }
        >
          {title}
        </span>

        <span className="text-3xl font-bold">
          {count}
        </span>
      </div>

      <p className="mt-5 text-sm text-slate-400">
        {description}
      </p>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  description,
  badge,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
  badge?: number;
}) {
  return (
    <a
      href={href}
      className="group rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-cyan-900 hover:bg-slate-800/70"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 text-xl transition group-hover:bg-slate-700">
          {icon}
        </div>

        {badge !== undefined && (
          <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-400">
            {badge} new
          </span>
        )}
      </div>

      <h4 className="mt-5 font-semibold">
        {title}
      </h4>

      <p className="mt-2 text-sm leading-6 text-slate-400">
        {description}
      </p>

      <p className="mt-4 text-sm font-semibold text-cyan-400">
        Open →
      </p>
    </a>
  );
}