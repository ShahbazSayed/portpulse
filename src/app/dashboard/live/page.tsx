"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const LiveVesselMap = dynamic(
  () => import("../LiveVesselMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[500px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-slate-400">
        Loading live map...
      </div>
    ),
  }
);

type Vessel = {
  mmsi: number;
  ship_name: string | null;
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  navigational_status: number;
  last_seen: string;
};

function formatAge(dateString: string) {
  const seconds = Math.max(
    0,
    Math.floor(
      (Date.now() - new Date(dateString).getTime()) / 1000
    )
  );

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  return `${hours}h ago`;
}

function getVesselStatus(lastSeen: string) {
  const age =
    Date.now() - new Date(lastSeen).getTime();

  const minutes = age / 1000 / 60;

  if (minutes < 2) {
    return {
      label: "LIVE",
      text: "Receiving",
      className:
        "bg-green-500/10 text-green-400 border-green-500/20",
    };
  }

  if (minutes < 10) {
    return {
      label: "STALE",
      text: "Delayed update",
      className:
        "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    };
  }

  return {
    label: "OFFLINE",
    text: "No recent data",
    className:
      "bg-slate-800 text-slate-400 border-slate-700",
  };
}

export default function LiveVesselsPage() {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] =
    useState<Date | null>(null);

  const [, setTick] = useState(0);

  async function loadVessels() {
    try {
      const response = await fetch(
        "/api/live-vessels",
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to load live vessels"
        );
      }

      const data = await response.json();

      setVessels(data.vessels || []);
      setLastRefresh(new Date());
    } catch (error) {
      console.error(
        "Live vessel error:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVessels();

    const refreshInterval = setInterval(
      loadVessels,
      10000
    );

    const clockInterval = setInterval(() => {
      setTick((value) => value + 1);
    }, 1000);

    return () => {
      clearInterval(refreshInterval);
      clearInterval(clockInterval);
    };
  }, []);

  const liveCount = vessels.filter((vessel) => {
    const age =
      Date.now() -
      new Date(vessel.last_seen).getTime();

    return age < 2 * 60 * 1000;
  }).length;

  const staleCount = vessels.filter((vessel) => {
    const age =
      Date.now() -
      new Date(vessel.last_seen).getTime();

    return (
      age >= 2 * 60 * 1000 &&
      age < 10 * 60 * 1000
    );
  }).length;

  const offlineCount =
    vessels.length - liveCount - staleCount;

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* HEADER */}
      <header className="border-b border-slate-800 bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

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

          <Link
            href="/dashboard"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
          >
            ← Dashboard
          </Link>

        </div>
      </header>

      {/* MAIN */}
      <section className="mx-auto max-w-7xl px-6 py-8">

        {/* PAGE TITLE */}
        <div className="mb-8">

          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">

            <div>

              <p className="text-sm font-semibold tracking-wide text-cyan-400">
                PORTPULSE LIVE NETWORK
              </p>

              <h2 className="mt-2 text-4xl font-bold tracking-tight">
                Live Vessel Tracking
              </h2>

              <p className="mt-2 max-w-2xl text-slate-400">
                Monitor real-time vessel activity
                received directly from the live AIS
                stream.
              </p>

            </div>

            <div className="flex flex-wrap items-center gap-3">

              <div className="rounded-full border border-green-500/20 bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-400">
                🟢 {liveCount} LIVE
              </div>

              {lastRefresh && (
                <div className="rounded-full border border-slate-800 bg-slate-900 px-4 py-2 text-xs text-slate-400">
                  Dashboard refreshed{" "}
                  {formatAge(
                    lastRefresh.toISOString()
                  )}
                </div>
              )}

            </div>

          </div>

        </div>

        {/* KPI CARDS */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {/* TOTAL */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

            <p className="text-xs font-semibold text-slate-500">
              TOTAL VESSELS
            </p>

            <p className="mt-2 text-3xl font-bold">
              {vessels.length}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              AIS positions stored
            </p>

          </div>

          {/* LIVE */}
          <div className="rounded-2xl border border-green-500/20 bg-slate-900 p-5">

            <p className="text-xs font-semibold text-slate-500">
              LIVE
            </p>

            <p className="mt-2 text-3xl font-bold text-green-400">
              {liveCount}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Updated within 2 minutes
            </p>

          </div>

          {/* STALE */}
          <div className="rounded-2xl border border-yellow-500/20 bg-slate-900 p-5">

            <p className="text-xs font-semibold text-slate-500">
              STALE
            </p>

            <p className="mt-2 text-3xl font-bold text-yellow-400">
              {staleCount}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Last update 2–10 minutes ago
            </p>

          </div>

          {/* AIS */}
          <div className="rounded-2xl border border-cyan-500/20 bg-slate-900 p-5">

            <p className="text-xs font-semibold text-slate-500">
              AIS STATUS
            </p>

            <p className="mt-2 text-xl font-bold text-cyan-400">
              CONNECTED
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Live data stream
            </p>

          </div>

        </div>

        {/* LIVE MAP */}
        <div className="rounded-2xl border border-cyan-500/20 bg-slate-900 p-1">
          <LiveVesselMap />
        </div>

        {/* FLEET */}
        <div className="mt-10">

          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">

            <div>

              <p className="text-xs font-semibold tracking-wide text-cyan-400">
                FLEET MONITORING
              </p>

              <h3 className="mt-1 text-2xl font-bold">
                Live Vessel Network
              </h3>

              <p className="mt-1 text-sm text-slate-400">
                Current vessels received from the
                AIS stream
              </p>

            </div>

            <p className="text-xs text-slate-500">
              Automatically refreshed every 10 seconds
            </p>

          </div>

          {/* LOADING */}
          {loading ? (

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-slate-400">
              Loading live vessel network...
            </div>

          ) : vessels.length === 0 ? (

            /* EMPTY */
            <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-8">

              <p className="font-semibold text-yellow-400">
                No live vessels available
              </p>

              <p className="mt-2 text-sm text-slate-400">
                Waiting for AIS vessel data...
              </p>

            </div>

          ) : (

            /* VESSEL CARDS */
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">

              {vessels.map((vessel) => {

                const vesselStatus =
                  getVesselStatus(
                    vessel.last_seen
                  );

                return (

                  <div
                    key={vessel.mmsi}
                    className="group rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:-translate-y-1 hover:border-cyan-500/40 hover:bg-slate-900/90"
                  >

                    {/* CARD HEADER */}
                    <div className="flex items-start justify-between gap-3">

                      <div className="min-w-0">

                        <h4 className="truncate text-xl font-bold">
                          🚢{" "}
                          {vessel.ship_name ||
                            "Unknown Vessel"}
                        </h4>

                        <p className="mt-1 text-xs text-slate-500">
                          MMSI {vessel.mmsi}
                        </p>

                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${vesselStatus.className}`}
                      >
                        ● {vesselStatus.label}
                      </span>

                    </div>

                    {/* POSITION */}
                    <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-4">

                      <p className="text-xs font-semibold text-slate-500">
                        CURRENT POSITION
                      </p>

                      <p className="mt-2 font-mono text-sm text-cyan-400">
                        {vessel.latitude.toFixed(5)}
                        {" , "}
                        {vessel.longitude.toFixed(5)}
                      </p>

                    </div>

                    {/* TELEMETRY */}
                    <div className="mt-4 grid grid-cols-2 gap-3">

                      <div className="rounded-xl bg-slate-950 p-4">

                        <p className="text-xs text-slate-500">
                          SPEED
                        </p>

                        <p className="mt-1 text-lg font-bold">
                          {vessel.speed}{" "}
                          <span className="text-xs font-normal text-slate-500">
                            kn
                          </span>
                        </p>

                      </div>

                      <div className="rounded-xl bg-slate-950 p-4">

                        <p className="text-xs text-slate-500">
                          COURSE
                        </p>

                        <p className="mt-1 text-lg font-bold">
                          {vessel.course}°
                        </p>

                      </div>

                    </div>

                    {/* LAST UPDATE */}
                    <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-4">

                      <div>

                        <p className="text-xs text-slate-500">
                          LAST AIS UPDATE
                        </p>

                        <p className="mt-1 text-sm text-slate-300">
                          {formatAge(
                            vessel.last_seen
                          )}
                        </p>

                      </div>

                      <div className="text-right">

                        <p className="text-xs text-slate-500">
                          STATUS
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-300">
                          {vesselStatus.text}
                        </p>

                      </div>

                    </div>

                    {/* TRACK THIS VESSEL */}
                    <Link
                      href={`/shipments?vesselName=${encodeURIComponent(
                        vessel.ship_name ||
                          "Unknown Vessel"
                      )}&vesselMmsi=${
                        vessel.mmsi
                      }`}
                      className="mt-5 flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                    >
                      Track This Vessel →
                    </Link>

                  </div>

                );
              })}

            </div>

          )}

        </div>

        {/* DATA STATUS */}
        <div className="mt-10 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6">

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

            <div>

              <p className="text-sm font-semibold text-cyan-400">
                AIS DATA STATUS
              </p>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                PortPulse receives vessel position
                data from the live AIS stream and
                continuously updates the vessel
                network.
              </p>

            </div>

            <div className="w-fit rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3">

              <p className="text-xs text-slate-500">
                STREAM
              </p>

              <p className="mt-1 text-sm font-bold text-green-400">
                ● ACTIVE
              </p>

            </div>

          </div>

        </div>

      </section>

    </main>
  );
}