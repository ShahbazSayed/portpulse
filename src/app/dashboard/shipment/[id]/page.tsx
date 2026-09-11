import { createClient } from "@supabase/supabase-js";
import ShipmentVesselMapWrapper from "./ShipmentVesselMapWrapper";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Shipment = {
  id: string;
  shipment_number: string;
  vessel_name: string | null;
  origin_port: string | null;
  destination_port: string | null;
  eta: string;
  risk_score: number;
  risk_level: string;
  status: string;
  risk_factors: string[] | null;
  vessel_mmsi?: number | null;
};

type Vessel = {
  mmsi: number;
  ship_name: string | null;
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  last_seen: string;
};

const factorDetails: Record<
  string,
  {
    icon: string;
    title: string;
    score: number;
    description: string;
  }
> = {
  vessel_delay: {
    icon: "🚢",
    title: "Vessel Delay",
    score: 30,
    description:
      "Vessel schedule indicates a potential delay affecting the shipment ETA.",
  },
  port_congestion: {
    icon: "🏗️",
    title: "Port Congestion",
    score: 25,
    description:
      "Congestion at the origin or destination port may increase waiting and handling time.",
  },
  weather: {
    icon: "🌧️",
    title: "Weather Risk",
    score: 20,
    description:
      "Weather conditions may affect vessel speed, port operations, or the planned route.",
  },
  route_disruption: {
    icon: "🛳️",
    title: "Route Disruption",
    score: 25,
    description:
      "A route disruption may require slower navigation, rerouting, or additional transit time.",
  },
};

function getRiskClasses(risk: string) {
  if (risk === "CRITICAL") {
    return {
      badge: "bg-red-500/10 text-red-400",
      border: "border-red-900/50",
      bar: "bg-red-500",
    };
  }

  if (risk === "HIGH") {
    return {
      badge: "bg-orange-500/10 text-orange-400",
      border: "border-orange-900/50",
      bar: "bg-orange-500",
    };
  }

  if (risk === "MEDIUM") {
    return {
      badge: "bg-yellow-500/10 text-yellow-400",
      border: "border-yellow-900/50",
      bar: "bg-yellow-500",
    };
  }

  return {
    badge: "bg-green-500/10 text-green-400",
    border: "border-green-900/50",
    bar: "bg-green-500",
  };
}

function calculatePredictedDelay(
  riskFactors: string[],
  riskScore: number
) {
  let delay = 0;

  if (riskFactors.includes("vessel_delay")) {
    delay += 1;
  }

  if (riskFactors.includes("port_congestion")) {
    delay += 1;
  }

  if (riskFactors.includes("weather")) {
    delay += 1;
  }

  if (riskFactors.includes("route_disruption")) {
    delay += 2;
  }

  if (delay === 0 && riskScore >= 80) {
    delay = 3;
  } else if (delay === 0 && riskScore >= 60) {
    delay = 2;
  }

  return delay;
}

function formatDate(dateString: string) {
  const date = new Date(dateString + "T00:00:00");

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getAdjustedEta(
  dateString: string,
  delayDays: number
) {
  const date = new Date(dateString + "T00:00:00");

  date.setDate(date.getDate() + delayDays);

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/*
  Approximate monitored AIS corridor progress.

  This is NOT exact voyage completion.
  It represents the vessel's position inside the
  monitored corridor used for the MVP demo.
*/
function getRouteProgress(vessel: Vessel | null) {
  if (!vessel) {
    return 0;
  }

  const startLat = 13.0;
  const endLat = 13.35;

  const progress =
    ((vessel.latitude - startLat) /
      (endLat - startLat)) *
    100;

  return Math.min(
    95,
    Math.max(5, Math.round(progress))
  );
}

function formatCoordinate(value: number) {
  return Number.isFinite(value)
    ? value.toFixed(5)
    : "—";
}

export default async function ShipmentDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  /*
    Dashboard sends shipment number:
    /dashboard/shipment/PP-1001

    First search by shipment_number.
    UUID remains a fallback.
  */

  let { data: shipment, error } = await supabase
    .from("shipments")
    .select("*")
    .eq("shipment_number", id)
    .maybeSingle();

  if (!shipment) {
    const fallback = await supabase
      .from("shipments")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    shipment = fallback.data;
    error = fallback.error;
  }

  if (error || !shipment) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        <h1 className="text-3xl font-bold">
          Port<span className="text-blue-500">Pulse</span>
        </h1>

        <p className="mt-4 text-red-400">
          Shipment not found.
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Shipment reference: {id}
        </p>

        <a
          href="/dashboard"
          className="mt-6 inline-block text-cyan-400 hover:underline"
        >
          ← Back to Dashboard
        </a>
      </main>
    );
  }

  const data = shipment as Shipment;

  const riskFactors = Array.isArray(data.risk_factors)
    ? data.risk_factors
    : [];

  const riskClasses = getRiskClasses(
    data.risk_level
  );

  const predictedDelay =
    calculatePredictedDelay(
      riskFactors,
      data.risk_score
    );

  const adjustedEta = getAdjustedEta(
    data.eta,
    predictedDelay
  );

  let confidence = "Low";

  let confidenceDescription =
    "Current conditions indicate limited schedule disruption risk.";

  if (data.risk_level === "MEDIUM") {
    confidence = "Medium";

    confidenceDescription =
      "Some risk factors are present and may affect the expected arrival.";
  }

  if (data.risk_level === "HIGH") {
    confidence = "High";

    confidenceDescription =
      "Current risk factors indicate a significant possibility of schedule impact.";
  }

  if (data.risk_level === "CRITICAL") {
    confidence = "High";

    confidenceDescription =
      "Multiple disruption factors indicate a strong possibility of schedule impact.";
  }

  /*
    Load the live AIS vessel using the shipment MMSI.
  */

  let vessel: Vessel | null = null;

  if (data.vessel_mmsi) {
    const { data: vesselData } = await supabase
      .from("vessel_positions")
      .select(
        "mmsi, ship_name, latitude, longitude, speed, course, last_seen"
      )
      .eq("mmsi", data.vessel_mmsi)
      .maybeSingle();

    if (vesselData) {
      vessel = vesselData as Vessel;
    }
  }

  const routeProgress = getRouteProgress(vessel);

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* HEADER */}

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

          <a
            href="/dashboard"
            className="rounded-lg border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-semibold hover:border-cyan-500 hover:text-cyan-400"
          >
            ← Dashboard
          </a>

        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">

        {/* SHIPMENT HEADER */}

        <div>
          <p className="text-sm text-slate-500">
            Shipment
          </p>

          <h2 className="mt-1 text-3xl font-bold">
            {data.shipment_number}
          </h2>

          <p className="mt-2 text-slate-400">
            {data.origin_port} →{" "}
            {data.destination_port}
          </p>
        </div>

        {/* OVERVIEW */}

        <div className="mt-8 grid gap-5 md:grid-cols-4">

          <InfoCard
            title="Status"
            value={data.status.replace(
              /_/g,
              " "
            )}
            valueClass={
              data.status === "ON_TIME"
                ? "text-green-400"
                : "text-red-400"
            }
          />

          <InfoCard
            title="Vessel"
            value={
              data.vessel_name ||
              "Not available"
            }
          />

          <InfoCard
            title="Estimated Arrival"
            value={formatDate(data.eta)}
          />

          <div
            className={
              "rounded-2xl border bg-slate-900 p-6 " +
              riskClasses.border
            }
          >
            <p className="text-sm text-slate-400">
              Risk Level
            </p>

            <div className="mt-3">
              <span
                className={
                  "rounded-full px-3 py-1 text-xs font-bold " +
                  riskClasses.badge
                }
              >
                {data.risk_level}
              </span>
            </div>
          </div>

        </div>

        {/* ETA PREDICTION */}

        <div className="mt-8">

          <h3 className="text-2xl font-bold">
            ETA Delay Prediction
          </h3>

          <p className="mt-1 text-sm text-slate-400">
            Estimated schedule impact based on current
            risk factors.
          </p>

          <div className="mt-5 grid gap-5 md:grid-cols-3">

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

              <p className="text-sm text-slate-400">
                Current ETA
              </p>

              <p className="mt-3 text-2xl font-bold">
                {formatDate(data.eta)}
              </p>

            </div>

            <div className="rounded-2xl border border-orange-900/50 bg-slate-900 p-6">

              <p className="text-sm text-slate-400">
                Predicted Delay
              </p>

              <p className="mt-3 text-2xl font-bold text-orange-400">
                {predictedDelay === 0
                  ? "No delay"
                  : predictedDelay === 1
                  ? "1 Day"
                  : predictedDelay + " Days"}
              </p>

            </div>

            <div className="rounded-2xl border border-cyan-900/50 bg-slate-900 p-6">

              <p className="text-sm text-slate-400">
                Adjusted ETA
              </p>

              <p className="mt-3 text-2xl font-bold text-cyan-400">
                {adjustedEta}
              </p>

            </div>

          </div>

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

              <div>
                <p className="text-sm text-slate-400">
                  Prediction Confidence
                </p>

                <p className="mt-1 text-lg font-semibold">
                  {confidence}
                </p>
              </div>

              <p className="max-w-2xl text-sm leading-6 text-slate-400">
                {confidenceDescription}
              </p>

            </div>

          </div>

        </div>

        {/* LIVE AIS MAP */}

        <div className="mt-8">

          <h3 className="text-2xl font-bold">
            Vessel Tracking
          </h3>

          <p className="mt-1 text-sm text-slate-400">
            Real-time vessel movement from the PortPulse
            AIS monitoring pipeline.
          </p>

          <div className="mt-5">

            {vessel ? (
              <ShipmentVesselMapWrapper
                vessel={vessel}
              />
            ) : (

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">

                <p className="text-lg font-semibold">
                  AIS vessel position unavailable
                </p>

                <p className="mt-2 text-sm text-slate-400">
                  PortPulse has not received a current AIS
                  position for this shipment vessel yet.
                </p>

                {data.vessel_mmsi && (
                  <p className="mt-3 text-xs text-slate-500">
                    Monitoring MMSI{" "}
                    {data.vessel_mmsi}
                  </p>
                )}

              </div>

            )}

          </div>

        </div>

        {/* ROUTE INTELLIGENCE */}

        <div className="mt-8">

          <div className="rounded-2xl border border-cyan-900/50 bg-cyan-500/5 p-6">

            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">

              <div>

                <p className="text-sm font-semibold tracking-wide text-cyan-400">
                  ROUTE INTELLIGENCE
                </p>

                <h3 className="mt-1 text-2xl font-bold">
                  {data.origin_port} →{" "}
                  {data.destination_port}
                </h3>

                <p className="mt-2 text-sm text-slate-400">
                  Monitored AIS corridor for this shipment
                </p>

              </div>

              <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400">
                🟢 LIVE ROUTE
              </span>

            </div>

            <div className="mt-8">

              <div className="flex items-center justify-between text-xs text-slate-500">

                <span>
                  {data.origin_port}
                </span>

                <span>
                  AIS Route Progress {routeProgress}%
                </span>

                <span>
                  {data.destination_port}
                </span>

              </div>

              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-800">

                <div
                  className="h-full rounded-full bg-cyan-500 transition-all"
                  style={{
                    width: `${routeProgress}%`,
                  }}
                />

              </div>

            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">

              <RouteCard
                title="Current Vessel"
                value={
                  vessel?.ship_name ||
                  data.vessel_name ||
                  "Not available"
                }
              />

              <RouteCard
                title="MMSI"
                value={
                  vessel?.mmsi
                    ? String(vessel.mmsi)
                    : data.vessel_mmsi
                    ? String(data.vessel_mmsi)
                    : "Not available"
                }
              />

              <RouteCard
                title="Route Status"
                value={
                  vessel
                    ? "Vessel in transit"
                    : "AIS position unavailable"
                }
              />

              <RouteCard
                title="Current Position"
                value={
                  vessel
                    ? `${formatCoordinate(
                        vessel.latitude
                      )}, ${formatCoordinate(
                        vessel.longitude
                      )}`
                    : "Not available"
                }
              />

              <RouteCard
                title="Current Speed"
                value={
                  vessel
                    ? `${vessel.speed} kn`
                    : "Not available"
                }
              />

              <RouteCard
                title="Course"
                value={
                  vessel
                    ? `${vessel.course}°`
                    : "Not available"
                }
              />

            </div>

            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-5">

              <p className="text-sm font-semibold text-cyan-400">
                Operational Route Insight
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-400">

                {vessel
                  ? `${vessel.ship_name || "The vessel"} is actively transmitting AIS data. PortPulse is monitoring its movement along the ${data.origin_port} → ${data.destination_port} corridor.`
                  : "PortPulse is monitoring the shipment route and waiting for a fresh AIS position from the assigned vessel."}

              </p>

            </div>

            <div className="mt-4 rounded-xl border border-orange-900/50 bg-orange-500/5 p-5">

              <p className="text-sm font-semibold text-orange-400">
                ⚠️ Shipment Risk Connection
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-400">

                This monitored route is associated with the
                current{" "}
                <strong className="text-orange-400">
                  {data.risk_level}
                </strong>{" "}
                shipment risk level. Changes in vessel
                movement, port conditions, weather, or route
                disruptions may affect the predicted ETA.

              </p>

            </div>

            <p className="mt-5 text-xs text-slate-500">
              Data source: AIS monitoring pipeline • Vessel
              position refresh: 10 seconds • Route progress:
              approximate monitored corridor indicator
            </p>

          </div>

        </div>

        {/* TIMELINE */}

        <div className="mt-8">

          <h3 className="text-2xl font-bold">
            Shipment Timeline
          </h3>

          <p className="mt-1 text-sm text-slate-400">
            Shipment movement and monitoring checkpoints
          </p>

          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <TimelineItem
              icon="📦"
              title="Shipment Created"
              description="Shipment added to PortPulse monitoring."
            />

            <TimelineItem
              icon="🚢"
              title="Vessel Assigned"
              description={
                "Shipment assigned to " +
                (data.vessel_name ||
                  "the selected vessel") +
                "."
              }
            />

            <TimelineItem
              icon="🌊"
              title="Vessel in Transit"
              description={
                vessel
                  ? "Live AIS position is being monitored along the planned route."
                  : "Vessel movement is being monitored through PortPulse."
              }
            />

            <TimelineItem
              icon="🏁"
              title="Expected Arrival"
              description={
                "Estimated arrival: " +
                formatDate(data.eta)
              }
              last
            />

          </div>

        </div>

        {/* RISK SCORE */}

        <div className="mt-8">

          <h3 className="text-2xl font-bold">
            Risk Score
          </h3>

          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-4xl font-bold">
                  {data.risk_score}/100
                </p>

                <span
                  className={
                    "mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold " +
                    riskClasses.badge
                  }
                >
                  {data.risk_level}
                </span>

              </div>

              <p className="text-sm text-slate-400">
                Overall shipment risk
              </p>

            </div>

            <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-800">

              <div
                className={
                  "h-full rounded-full " +
                  riskClasses.bar
                }
                style={{
                  width:
                    Math.min(
                      Math.max(
                        data.risk_score,
                        0
                      ),
                      100
                    ) + "%",
                }}
              />

            </div>

          </div>

        </div>

        {/* RISK FACTORS */}

        <div className="mt-8">

          <h3 className="text-2xl font-bold">
            Why is this shipment at risk?
          </h3>

          <p className="mt-1 text-sm text-slate-400">
            PortPulse is monitoring this shipment for events
            that may affect its expected delivery schedule.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">

            {riskFactors.map((factor) => {

              const details =
                factorDetails[factor];

              if (!details) {
                return null;
              }

              return (

                <div
                  key={factor}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
                >

                  <div className="flex items-start gap-4">

                    <div className="text-2xl">
                      {details.icon}
                    </div>

                    <div className="flex-1">

                      <div className="flex items-center justify-between gap-4">

                        <h4 className="font-semibold">
                          {details.title}
                        </h4>

                        <span className="text-sm font-bold text-orange-400">
                          +{details.score}
                        </span>

                      </div>

                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        {details.description}
                      </p>

                    </div>

                  </div>

                </div>

              );
            })}

          </div>

          {riskFactors.length === 0 && (

            <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
              No specific risk factors have been recorded
              for this shipment.
            </div>

          )}

        </div>

        {/* PORTPULSE INTELLIGENCE */}

        <div className="mt-8">

          <div className="rounded-2xl border border-blue-900/50 bg-blue-500/5 p-6">

            <div className="flex items-center gap-3">

              <span className="text-2xl">
                🤖
              </span>

              <div>

                <p className="text-sm font-semibold text-blue-400">
                  PortPulse Intelligence
                </p>

                <h3 className="mt-1 text-xl font-bold">
                  Shipment Risk Analysis
                </h3>

              </div>

            </div>

            <p className="mt-5 leading-7 text-slate-300">

              This shipment is currently at{" "}
              <strong>
                {data.risk_level}
              </strong>{" "}
              risk. The selected risk factors may affect the
              expected arrival time and overall shipment
              reliability.

            </p>

            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-5">

              <p className="text-sm font-semibold text-cyan-400">
                💡 Recommended Action
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-400">

                {data.risk_level ===
                "CRITICAL"
                  ? "Immediate attention is recommended. Review the shipment plan and prepare contingency actions for possible significant delays."
                  : data.risk_level ===
                    "HIGH"
                  ? "Monitor the shipment closely and prepare contingency plans in case the current risk factors worsen."
                  : data.risk_level ===
                    "MEDIUM"
                  ? "Monitor the shipment closely for changes in vessel schedules, port conditions, weather, or route disruptions."
                  : "Continue normal monitoring. Current conditions indicate a relatively low probability of significant disruption."}

              </p>

            </div>

          </div>

        </div>

        {/* DEMO NOTICE */}

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-500">

          <strong className="text-slate-400">
            MVP Demo Notice:
          </strong>{" "}

          Shipment risk scoring and ETA prediction currently
          use PortPulse rule-based logic. Vessel position,
          speed, course and AIS freshness are sourced from
          the live AIS monitoring pipeline.

        </div>

      </section>

    </main>
  );
}

function InfoCard({
  title,
  value,
  valueClass = "text-white",
}: {
  title: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

      <p className="text-sm text-slate-400">
        {title}
      </p>

      <p
        className={
          "mt-3 text-xl font-bold " +
          valueClass
        }
      >
        {value}
      </p>

    </div>
  );
}

function RouteCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

      <p className="text-xs text-slate-500">
        {title}
      </p>

      <p className="mt-2 font-semibold text-slate-200">
        {value}
      </p>

    </div>
  );
}

function TimelineItem({
  icon,
  title,
  description,
  last = false,
}: {
  icon: string;
  title: string;
  description: string;
  last?: boolean;
}) {
  return (
    <div className="flex gap-4">

      <div className="flex flex-col items-center">

        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-lg">
          {icon}
        </div>

        {!last && (
          <div className="mt-2 h-12 w-px bg-slate-700" />
        )}

      </div>

      <div className="pb-6">

        <h4 className="font-semibold">
          {title}
        </h4>

        <p className="mt-1 text-sm text-slate-400">
          {description}
        </p>

      </div>

    </div>
  );
}