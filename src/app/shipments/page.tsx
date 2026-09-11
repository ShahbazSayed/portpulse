"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter, useSearchParams } from "next/navigation";

import {
  calculateRisk,
  riskFactors,
} from "@/lib/riskEngine";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type LiveVessel = {
  mmsi: number;
  ship_name: string | null;
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  last_seen: string;
};

type PortCoordinate = {
  lat: number;
  lon: number;
};

const PORT_COORDINATES: Record<string, PortCoordinate> = {
  shanghai: {
    lat: 31.2304,
    lon: 121.4737,
  },

  "nhava sheva": {
    lat: 18.9497,
    lon: 72.952,
  },

  nhavasheva: {
    lat: 18.9497,
    lon: 72.952,
  },

  mumbai: {
    lat: 18.9497,
    lon: 72.952,
  },

  singapore: {
    lat: 1.2644,
    lon: 103.8201,
  },

  rotterdam: {
    lat: 51.9244,
    lon: 4.4777,
  },

  dubai: {
    lat: 25.2867,
    lon: 55.3379,
  },

  "los angeles": {
    lat: 33.7405,
    lon: -118.271,
  },

  losangeles: {
    lat: 33.7405,
    lon: -118.271,
  },

  colombo: {
    lat: 6.9271,
    lon: 79.8612,
  },

  chennai: {
    lat: 13.0827,
    lon: 80.2707,
  },
};

function normalizePortName(port: string) {
  return port
    .trim()
    .toLowerCase()
    .replace(/port/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getPortCoordinates(
  port: string
): PortCoordinate | null {
  const normalized = normalizePortName(port);

  return PORT_COORDINATES[normalized] || null;
}

/*
 * Haversine distance.
 *
 * Returns nautical miles because vessel speed
 * from AIS is supplied in knots.
 */
function calculateDistanceNm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const earthRadiusKm = 6371;

  const toRadians = (value: number) =>
    (value * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) *
      Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  const distanceKm = earthRadiusKm * c;

  return distanceKm * 0.539957;
}

function getRiskColor(level: string) {
  if (level === "CRITICAL") {
    return "border-red-500/50 bg-red-500/10 text-red-400";
  }

  if (level === "HIGH") {
    return "border-orange-500/50 bg-orange-500/10 text-orange-400";
  }

  if (level === "MEDIUM") {
    return "border-yellow-500/50 bg-yellow-500/10 text-yellow-400";
  }

  return "border-green-500/50 bg-green-500/10 text-green-400";
}

function getRiskBarColor(level: string) {
  if (level === "CRITICAL") return "bg-red-500";
  if (level === "HIGH") return "bg-orange-500";
  if (level === "MEDIUM") return "bg-yellow-500";

  return "bg-green-500";
}

function getRiskBorderColor(level: string) {
  if (level === "CRITICAL") {
    return "border-red-500/40";
  }

  if (level === "HIGH") {
    return "border-orange-500/40";
  }

  if (level === "MEDIUM") {
    return "border-yellow-500/40";
  }

  return "border-green-500/40";
}

function getRiskInsight(level: string) {
  if (level === "CRITICAL") {
    return {
      title: "Critical Future Delay Risk",
      message:
        "Live vessel intelligence and selected operational factors indicate a strong possibility of significant schedule impact.",
      action:
        "Immediate attention is recommended. Review the shipment plan and prepare contingency actions.",
    };
  }

  if (level === "HIGH") {
    return {
      title: "High Future Delay Risk",
      message:
        "Current vessel conditions and operational factors indicate a strong possibility of schedule disruption.",
      action:
        "Monitor the shipment closely and prepare for possible schedule changes.",
    };
  }

  if (level === "MEDIUM") {
    return {
      title: "Shipment At Risk",
      message:
        "PortPulse has identified conditions that may affect the expected shipment schedule.",
      action:
        "Continue monitoring the shipment and review the active risk factors.",
    };
  }

  return {
    title: "Shipment Currently Stable",
    message:
      "No significant delay conditions have been detected from the current intelligence inputs.",
    action:
      "Continue normal shipment monitoring.",
  };
}

export default function AddShipment() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [shipmentNumber, setShipmentNumber] =
    useState("");

  const [vesselName, setVesselName] =
    useState("");

  const [vesselMmsi, setVesselMmsi] =
    useState<number | null>(null);

  const [originPort, setOriginPort] =
    useState("");

  const [destinationPort, setDestinationPort] =
    useState("");

  const [eta, setEta] =
    useState("");

  const [status, setStatus] =
    useState("ON_TIME");

  const [selectedFactors, setSelectedFactors] =
    useState<string[]>([]);

  const [liveVessel, setLiveVessel] =
    useState<LiveVessel | null>(null);

  const [loadingLiveData, setLoadingLiveData] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  /*
   * LIVE VESSEL FROM LIVE FLEET
   */
  useEffect(() => {
    const mmsi =
      searchParams.get("vesselMmsi");

    const name =
      searchParams.get("vesselName");

    if (mmsi) {
      const parsedMmsi = Number(mmsi);

      if (!Number.isNaN(parsedMmsi)) {
        setVesselMmsi(parsedMmsi);
      }
    }

    if (name) {
      setVesselName(name);
    }
  }, [searchParams]);

  /*
   * FETCH REAL AIS POSITION.
   */
  useEffect(() => {
    if (!vesselMmsi) {
      setLiveVessel(null);
      return;
    }

    let cancelled = false;

    async function loadLiveVessel() {
      setLoadingLiveData(true);

      try {
        const response = await fetch(
          `/api/live-vessels?mmsi=${vesselMmsi}`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            "Unable to load live vessel data."
          );
        }

        const result = await response.json();

        /*
         * Support either:
         * { vessel: {...} }
         * OR
         * { data: [...] }
         * OR
         * direct vessel object.
         */
        let vessel: LiveVessel | null =
          null;

        if (
          result?.vessel &&
          result.vessel.mmsi
        ) {
          vessel = result.vessel;
        } else if (
          Array.isArray(result?.data)
        ) {
          vessel =
            result.data.find(
              (item: LiveVessel) =>
                Number(item.mmsi) ===
                vesselMmsi
            ) || null;
        } else if (
          result?.mmsi
        ) {
          vessel = result;
        }

        if (!cancelled) {
          setLiveVessel(vessel);
        }
      } catch {
        if (!cancelled) {
          setLiveVessel(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingLiveData(false);
        }
      }
    }

    loadLiveVessel();

    /*
     * Refresh live AIS intelligence every 10 seconds.
     */
    const interval = setInterval(
      loadLiveVessel,
      10000
    );

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [vesselMmsi]);

  /*
   * DESTINATION COORDINATES
   */
  const destinationCoordinates =
    getPortCoordinates(destinationPort);

  /*
   * LIVE ETA CALCULATION
   */
  let remainingDistanceNm: number | null =
    null;

  let calculatedEta: Date | null =
    null;

  let calculatedDelayHours = 0;

  let etaStatus =
    "Waiting for live vessel data";

  if (
    liveVessel &&
    destinationCoordinates
  ) {
    remainingDistanceNm =
      calculateDistanceNm(
        liveVessel.latitude,
        liveVessel.longitude,
        destinationCoordinates.lat,
        destinationCoordinates.lon
      );

    /*
     * AIS speed can occasionally be 0 while
     * vessel is stopped/anchored.
     *
     * Use a conservative minimum planning
     * speed only for ETA calculation.
     */
    const effectiveSpeed =
      liveVessel.speed > 1
        ? liveVessel.speed
        : 8;

    const hoursRemaining =
      remainingDistanceNm /
      effectiveSpeed;

    calculatedEta = new Date(
      Date.now() +
        hoursRemaining *
          60 *
          60 *
          1000
    );

    if (eta) {
      const providedEtaDate =
        new Date(
          `${eta}T23:59:59`
        );

      calculatedDelayHours =
        Math.max(
          0,
          Math.round(
            (calculatedEta.getTime() -
              providedEtaDate.getTime()) /
              (1000 * 60 * 60)
          )
        );

      if (calculatedDelayHours > 24) {
        etaStatus =
          "LIVE ETA INDICATES POSSIBLE DELAY";
      } else if (
        calculatedDelayHours > 0
      ) {
        etaStatus =
          "LIVE ETA IS LATER THAN PROVIDED ETA";
      } else {
        etaStatus =
          "LIVE ETA IS WITHIN PROVIDED ETA";
      }
    }
  }

  /*
   * AUTOMATIC VESSEL DELAY DETECTION
   *
   * We DO NOT blindly mark vessel delay.
   * It is detected only when:
   *
   * 1. Live vessel exists
   * 2. Destination coordinates are known
   * 3. User provided ETA exists
   * 4. Calculated live ETA is later
   */
  const automaticVesselDelay =
    Boolean(
      liveVessel &&
        calculatedEta &&
        eta &&
        calculatedDelayHours > 0
    );

  /*
   * Combine manual operational factors
   * with actual live vessel evidence.
   */
  const intelligenceFactors =
    selectedFactors.filter(
      (factorId) =>
        factorId !== "vessel_delay"
    );

  if (
    automaticVesselDelay &&
    !intelligenceFactors.includes(
      "vessel_delay"
    )
  ) {
    intelligenceFactors.push(
      "vessel_delay"
    );
  }

  const riskResult =
    calculateRisk(
      intelligenceFactors
    );

  const riskScore =
    riskResult.score;

  const riskLevel =
    riskResult.level;

  const riskInsight =
    getRiskInsight(riskLevel);

  function toggleFactor(
    factorId: string
  ) {
    /*
     * Vessel Delay is intelligence-driven.
     *
     * Don't allow the checkbox to create
     * a fake delay when live evidence says
     * otherwise.
     */
    if (
      factorId === "vessel_delay" &&
      automaticVesselDelay
    ) {
      return;
    }

    setSelectedFactors(
      (current) =>
        current.includes(factorId)
          ? current.filter(
              (id) => id !== factorId
            )
          : [
              ...current,
              factorId,
            ]
    );
  }

  function formatCalculatedEta(
    date: Date | null
  ) {
    if (!date) return "—";

    return date.toLocaleString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setErrorMessage("");

    if (
      !shipmentNumber.trim() ||
      !vesselName.trim() ||
      !originPort.trim() ||
      !destinationPort.trim() ||
      !eta
    ) {
      setErrorMessage(
        "Please fill in all shipment details."
      );

      return;
    }

    setLoading(true);

    /*
     * Save the evidence-based factors.
     */
    const finalRiskFactors =
      riskResult.factors;

    const { error } =
      await supabase
        .from("shipments")
        .insert({
          shipment_number:
            shipmentNumber.trim(),

          vessel_name:
            vesselName.trim(),

          vessel_mmsi:
            vesselMmsi,

          origin_port:
            originPort.trim(),

          destination_port:
            destinationPort.trim(),

          /*
           * User's provided/carrier ETA
           * remains the stored shipment ETA.
           *
           * Detail page can independently
           * calculate live ETA.
           */
          eta,

          risk_score:
            riskScore,

          risk_level:
            riskLevel,

          risk_factors:
            finalRiskFactors.map(
              (factor) => factor.id
            ),

          status,
        });

    if (error) {
      setErrorMessage(
        error.message
      );

      setLoading(false);

      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* HEADER */}

      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold">
              Port
              <span className="text-blue-500">
                Pulse
              </span>
            </h1>

            <p className="text-xs text-slate-400">
              Shipping Risk Intelligence
            </p>
          </div>

          <a
            href="/dashboard"
            className="rounded-lg border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-cyan-500 hover:text-cyan-400"
          >
            ← Dashboard
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        {/* PAGE HEADING */}

        <div>
          <p className="text-sm font-medium text-cyan-400">
            Shipping Operations
          </p>

          <h2 className="mt-1 text-3xl font-bold">
            Add Shipment
          </h2>

          <p className="mt-2 text-slate-400">
            Add a shipment and let PortPulse
            analyze its live vessel movement,
            ETA and operational risk.
          </p>
        </div>

        {/* LIVE VESSEL */}

        {vesselMmsi && (
          <div className="mt-6 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-cyan-400">
                  LIVE AIS VESSEL SELECTED
                </p>

                <p className="mt-1 text-lg font-bold">
                  🚢{" "}
                  {vesselName ||
                    "Live Vessel"}
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  MMSI {vesselMmsi}
                </p>
              </div>

              <div
                className={`rounded-full border px-4 py-2 text-xs font-semibold ${
                  liveVessel
                    ? "border-green-500/20 bg-green-500/10 text-green-400"
                    : "border-yellow-500/20 bg-yellow-500/10 text-yellow-400"
                }`}
              >
                {loadingLiveData
                  ? "● CONNECTING AIS"
                  : liveVessel
                  ? "● AIS LIVE"
                  : "● WAITING FOR AIS"}
              </div>
            </div>

            {liveVessel && (
              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs text-slate-500">
                    Current Position
                  </p>

                  <p className="mt-2 text-sm font-semibold">
                    {liveVessel.latitude.toFixed(
                      4
                    )}
                    ,{" "}
                    {liveVessel.longitude.toFixed(
                      4
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs text-slate-500">
                    AIS Speed
                  </p>

                  <p className="mt-2 text-sm font-semibold text-cyan-400">
                    {liveVessel.speed.toFixed(
                      1
                    )}{" "}
                    kn
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs text-slate-500">
                    Course
                  </p>

                  <p className="mt-2 text-sm font-semibold">
                    {liveVessel.course.toFixed(
                      1
                    )}
                    °
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs text-slate-500">
                    AIS Last Seen
                  </p>

                  <p className="mt-2 text-sm font-semibold text-green-400">
                    LIVE
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-8"
        >
          <div className="grid gap-8 lg:grid-cols-3">
            {/* SHIPMENT DETAILS */}

            <div className="lg:col-span-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <h3 className="text-xl font-bold">
                  Shipment Details
                </h3>

                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  {/* SHIPMENT NUMBER */}

                  <div>
                    <label className="text-sm text-slate-400">
                      Shipment Number
                    </label>

                    <input
                      type="text"
                      value={shipmentNumber}
                      onChange={(e) =>
                        setShipmentNumber(
                          e.target.value
                        )
                      }
                      placeholder="PP-1008"
                      className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-500"
                    />
                  </div>

                  {/* VESSEL */}

                  <div>
                    <label className="text-sm text-slate-400">
                      Vessel Name
                    </label>

                    <input
                      type="text"
                      value={vesselName}
                      onChange={(e) =>
                        setVesselName(
                          e.target.value
                        )
                      }
                      placeholder="Select from Live Vessels"
                      readOnly={Boolean(
                        vesselMmsi
                      )}
                      className={`mt-2 w-full rounded-xl border px-4 py-3 text-white outline-none placeholder:text-slate-600 ${
                        vesselMmsi
                          ? "cursor-not-allowed border-cyan-500/30 bg-cyan-500/5"
                          : "border-slate-700 bg-slate-950 focus:border-cyan-500"
                      }`}
                    />

                    {vesselMmsi ? (
                      <p className="mt-2 text-xs text-cyan-400">
                        ✓ Linked to live AIS
                        vessel
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-slate-600">
                        Or enter a vessel
                        manually.
                      </p>
                    )}
                  </div>

                  {/* ORIGIN */}

                  <div>
                    <label className="text-sm text-slate-400">
                      Origin Port
                    </label>

                    <input
                      type="text"
                      value={originPort}
                      onChange={(e) =>
                        setOriginPort(
                          e.target.value
                        )
                      }
                      placeholder="Shanghai"
                      className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-500"
                    />
                  </div>

                  {/* DESTINATION */}

                  <div>
                    <label className="text-sm text-slate-400">
                      Destination Port
                    </label>

                    <input
                      type="text"
                      value={destinationPort}
                      onChange={(e) =>
                        setDestinationPort(
                          e.target.value
                        )
                      }
                      placeholder="NHAVA SHEVA"
                      className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-500"
                    />

                    {!destinationCoordinates &&
                      destinationPort && (
                        <p className="mt-2 text-xs text-yellow-500">
                          ⚠️ Port coordinates
                          unavailable for
                          live ETA calculation.
                        </p>
                      )}
                  </div>

                  {/* ETA */}

                  <div>
                    <label className="text-sm text-slate-400">
                      Provided ETA
                    </label>

                    <input
                      type="date"
                      value={eta}
                      onChange={(e) =>
                        setEta(
                          e.target.value
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
                    />

                    <p className="mt-2 text-xs text-slate-600">
                      Carrier / operational
                      ETA used as the
                      comparison baseline.
                    </p>
                  </div>

                  {/* STATUS */}

                  <div>
                    <label className="text-sm text-slate-400">
                      Current Status
                    </label>

                    <select
                      value={status}
                      onChange={(e) =>
                        setStatus(
                          e.target.value
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
                    >
                      <option value="ON_TIME">
                        On Time
                      </option>

                      <option value="DELAYED">
                        Delayed
                      </option>

                      <option value="MAJOR_DELAY">
                        Major Delay
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              {/* LIVE ETA INTELLIGENCE */}

              <div className="mt-6 rounded-2xl border border-cyan-900/50 bg-cyan-500/5 p-6">
                <p className="text-sm font-medium text-cyan-400">
                  Live ETA Intelligence
                </p>

                <h3 className="mt-1 text-xl font-bold">
                  PortPulse ETA Analysis
                </h3>

                {!liveVessel ? (
                  <p className="mt-4 text-sm text-slate-500">
                    Select a vessel with a
                    live AIS position to
                    calculate the current
                    estimated arrival.
                  </p>
                ) : !destinationCoordinates ? (
                  <p className="mt-4 text-sm text-yellow-400">
                    Destination coordinates
                    are not available yet
                    for this port.
                  </p>
                ) : (
                  <>
                    <div className="mt-5 grid gap-4 md:grid-cols-3">
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                        <p className="text-xs text-slate-500">
                          Remaining Distance
                        </p>

                        <p className="mt-2 text-xl font-bold">
                          {remainingDistanceNm
                            ? Math.round(
                                remainingDistanceNm
                              )
                            : "—"}{" "}
                          nm
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                        <p className="text-xs text-slate-500">
                          PortPulse ETA
                        </p>

                        <p className="mt-2 text-lg font-bold text-cyan-400">
                          {formatCalculatedEta(
                            calculatedEta
                          )}
                        </p>
                      </div>

                      <div
                        className={`rounded-xl border p-4 ${
                          calculatedDelayHours >
                          0
                            ? "border-orange-900/50 bg-orange-500/5"
                            : "border-green-900/50 bg-green-500/5"
                        }`}
                      >
                        <p className="text-xs text-slate-500">
                          ETA Assessment
                        </p>

                        <p
                          className={`mt-2 text-sm font-bold ${
                            calculatedDelayHours >
                            0
                              ? "text-orange-400"
                              : "text-green-400"
                          }`}
                        >
                          {calculatedDelayHours >
                          0
                            ? `+${calculatedDelayHours} hrs`
                            : "Within ETA"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Live Assessment
                      </p>

                      <p className="mt-2 text-sm font-semibold text-white">
                        {etaStatus}
                      </p>

                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        Calculated using the
                        vessel's latest AIS
                        position, current
                        speed and destination
                        port coordinates.
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* RISK FACTORS */}

              <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <p className="text-sm font-medium text-cyan-400">
                  Risk Intelligence
                </p>

                <h3 className="mt-1 text-xl font-bold">
                  Operational Risk Factors
                </h3>

                <p className="mt-1 text-sm text-slate-400">
                  PortPulse combines live
                  vessel evidence with
                  operational conditions.
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {riskFactors.map(
                    (factor) => {
                      const manuallySelected =
                        selectedFactors.includes(
                          factor.id
                        );

                      const automaticallyDetected =
                        factor.id ===
                          "vessel_delay" &&
                        automaticVesselDelay;

                      const selected =
                        manuallySelected ||
                        automaticallyDetected;

                      return (
                        <button
                          key={factor.id}
                          type="button"
                          onClick={() =>
                            toggleFactor(
                              factor.id
                            )
                          }
                          disabled={
                            factor.id ===
                              "vessel_delay" &&
                            automaticVesselDelay
                          }
                          className={`rounded-xl border p-5 text-left transition ${
                            selected
                              ? "border-cyan-500 bg-cyan-500/10"
                              : "border-slate-700 bg-slate-950 hover:border-slate-500"
                          } ${
                            factor.id ===
                              "vessel_delay" &&
                            automaticVesselDelay
                              ? "cursor-default"
                              : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold">
                                {factor.label}
                              </p>

                              <p className="mt-1 text-sm text-slate-500">
                                {factor.description}
                              </p>
                            </div>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${
                                selected
                                  ? "bg-cyan-500/20 text-cyan-400"
                                  : "bg-slate-800 text-slate-400"
                              }`}
                            >
                              +
                              {
                                factor.points
                              }
                            </span>
                          </div>

                          <div className="mt-4 text-xs font-semibold">
                            {automaticallyDetected ? (
                              <span className="text-green-400">
                                ✓ Automatically
                                detected from
                                live ETA
                              </span>
                            ) : selected ? (
                              <span className="text-cyan-400">
                                ✓ Selected
                              </span>
                            ) : (
                              <span className="text-slate-500">
                                Click to select
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            </div>

            {/* RISK ENGINE */}

            <div>
              <div className="sticky top-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <p className="text-sm font-medium text-slate-400">
                  PortPulse Risk Engine
                </p>

                <h3 className="mt-2 text-xl font-bold">
                  Evidence-Based Risk
                </h3>

                {/* SCORE */}

                <div className="mt-8 text-center">
                  <div
                    className={`mx-auto flex h-32 w-32 items-center justify-center rounded-full border-8 ${getRiskBorderColor(
                      riskLevel
                    )}`}
                  >
                    <div>
                      <p className="text-4xl font-bold">
                        {riskScore}
                      </p>

                      <p className="text-xs text-slate-500">
                        / 100
                      </p>
                    </div>
                  </div>

                  <div
                    className={`mx-auto mt-5 inline-flex rounded-full border px-4 py-2 text-sm font-bold ${getRiskColor(
                      riskLevel
                    )}`}
                  >
                    {riskLevel} RISK
                  </div>
                </div>

                {/* LIVE EVIDENCE */}

                <div className="mt-6 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-cyan-400">
                    Intelligence Source
                  </p>

                  <p className="mt-2 text-sm font-semibold">
                    {liveVessel
                      ? "✓ Live AIS + operational factors"
                      : "Manual operational factors"}
                  </p>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {liveVessel
                      ? "Risk assessment is using current vessel movement data."
                      : "Connect a live AIS vessel for evidence-based ETA analysis."}
                  </p>
                </div>

                {/* PROGRESS */}

                <div className="mt-8">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">
                      Risk Score
                    </span>

                    <span className="font-semibold">
                      {riskScore}/100
                    </span>
                  </div>

                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${getRiskBarColor(
                        riskLevel
                      )}`}
                      style={{
                        width: `${riskScore}%`,
                      }}
                    />
                  </div>
                </div>

                {/* ACTIVE FACTORS */}

                <div className="mt-8">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Active Risk Factors
                  </p>

                  {riskResult.factors
                    .length === 0 ? (
                    <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950 p-4">
                      <p className="text-sm text-slate-500">
                        No active risk factors.
                      </p>

                      <p className="mt-1 text-xs text-slate-600">
                        Current risk score is
                        0.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {riskResult.factors.map(
                        (factor) => (
                          <div
                            key={factor.id}
                            className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-slate-300">
                                {factor.label}
                              </span>

                              <span className="text-sm font-bold text-cyan-400">
                                +
                                {
                                  factor.points
                                }
                              </span>
                            </div>

                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              {factor.description}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* RISK INTERPRETATION */}

                <div className="mt-8 rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Risk Interpretation
                  </p>

                  <p className="mt-2 text-sm font-semibold text-white">
                    {riskInsight.title}
                  </p>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {riskInsight.message}
                  </p>

                  <p className="mt-3 text-xs leading-5 text-cyan-400">
                    💡{" "}
                    {riskInsight.action}
                  </p>
                </div>

                {/* AUTOMATIC DELAY */}

                {automaticVesselDelay && (
                  <div className="mt-6 rounded-xl border border-orange-500/30 bg-orange-500/5 p-4">
                    <p className="text-sm font-semibold text-orange-400">
                      ⚠️ Live Delay Detected
                    </p>

                    <p className="mt-2 text-xs leading-5 text-slate-400">
                      PortPulse calculated a
                      later arrival than the
                      provided ETA using the
                      vessel's live AIS
                      position and speed.
                    </p>

                    <p className="mt-3 text-sm font-bold text-orange-400">
                      +{calculatedDelayHours}{" "}
                      hours
                    </p>
                  </div>
                )}

                {/* THRESHOLDS */}

                <div className="mt-8 rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs font-semibold text-slate-400">
                    Risk Thresholds
                  </p>

                  <div className="mt-3 space-y-2 text-xs">
                    <p className="text-green-400">
                      0–29 → LOW
                    </p>

                    <p className="text-yellow-400">
                      30–59 → MEDIUM
                    </p>

                    <p className="text-orange-400">
                      60–79 → HIGH
                    </p>

                    <p className="text-red-400">
                      80–100 → CRITICAL
                    </p>
                  </div>
                </div>

                {/* ERROR */}

                {errorMessage && (
                  <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
                    {errorMessage}
                  </div>
                )}

                {/* SUBMIT */}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3.5 font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? "Analyzing Shipment..."
                    : vesselMmsi
                    ? "Track Live Vessel"
                    : "Add Shipment"}
                </button>

                <p className="mt-4 text-center text-xs leading-5 text-slate-600">
                  Live vessel position and
                  speed are sourced from the
                  PortPulse AIS pipeline.
                  ETA is calculated from the
                  latest available AIS data.
                </p>
              </div>
            </div>
          </div>
        </form>
      </section>
    </main>
  );
}