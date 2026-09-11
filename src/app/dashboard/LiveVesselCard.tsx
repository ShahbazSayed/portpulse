"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Vessel = {
  mmsi: number;
  ship_name: string | null;
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  last_seen: string;
};

type VesselStatus = "LIVE" | "STALE" | "OFFLINE";

function getVesselStatus(lastSeen: string): VesselStatus {
  const age = Date.now() - new Date(lastSeen).getTime();
  const minutes = age / 1000 / 60;

  if (minutes < 2) return "LIVE";
  if (minutes < 10) return "STALE";
  return "OFFLINE";
}

function getStatusStyle(status: VesselStatus) {
  if (status === "LIVE") {
    return "bg-green-500/10 text-green-400";
  }

  if (status === "STALE") {
    return "bg-yellow-500/10 text-yellow-400";
  }

  return "bg-red-500/10 text-red-400";
}

function getStatusDot(status: VesselStatus) {
  if (status === "LIVE") return "🟢";
  if (status === "STALE") return "🟡";
  return "🔴";
}

export default function LiveVesselCard() {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [, setTick] = useState(0);

  async function loadVessels() {
    try {
      const response = await fetch("/api/live-vessels", {
        cache: "no-store",
      });

      const data = await response.json();

      setVessels(data.vessels || []);
    } catch (error) {
      console.error("Live vessel error:", error);
    }
  }

  useEffect(() => {
    loadVessels();

    const dataInterval = setInterval(loadVessels, 10000);

    const clockInterval = setInterval(() => {
      setTick((value) => value + 1);
    }, 1000);

    return () => {
      clearInterval(dataInterval);
      clearInterval(clockInterval);
    };
  }, []);

  const liveCount = vessels.filter(
    (vessel) => getVesselStatus(vessel.last_seen) === "LIVE"
  ).length;

  const staleCount = vessels.filter(
    (vessel) => getVesselStatus(vessel.last_seen) === "STALE"
  ).length;

  const offlineCount = vessels.filter(
    (vessel) => getVesselStatus(vessel.last_seen) === "OFFLINE"
  ).length;

  return (
    <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-cyan-400">
            PORTPULSE LIVE
          </p>

          <h2 className="mt-1 text-2xl font-bold text-white">
            Live Vessel Network
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Real-time AIS vessel activity
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-full bg-green-500/10 px-3 py-1 text-sm font-semibold text-green-400">
            🟢 {liveCount} LIVE
          </div>

          {staleCount > 0 && (
            <div className="rounded-full bg-yellow-500/10 px-3 py-1 text-sm font-semibold text-yellow-400">
              🟡 {staleCount} STALE
            </div>
          )}

          {offlineCount > 0 && (
            <div className="rounded-full bg-red-500/10 px-3 py-1 text-sm font-semibold text-red-400">
              🔴 {offlineCount} OFFLINE
            </div>
          )}
        </div>
      </div>

      {vessels.length > 0 && (
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {vessels.slice(0, 3).map((vessel) => {
            const status = getVesselStatus(vessel.last_seen);

            return (
              <div
                key={vessel.mmsi}
                className="rounded-xl border border-slate-800 bg-slate-950 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-white">
                    🚢 {vessel.ship_name || "Unknown Vessel"}
                  </p>

                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-bold ${getStatusStyle(
                      status
                    )}`}
                  >
                    {getStatusDot(status)} {status}
                  </span>
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  {vessel.latitude.toFixed(4)},{" "}
                  {vessel.longitude.toFixed(4)}
                </p>

                <p className="mt-2 text-sm text-slate-400">
                  Speed:{" "}
                  <span className="text-white">
                    {vessel.speed} kn
                  </span>
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  Course:{" "}
                  <span className="text-white">
                    {vessel.course}°
                  </span>
                </p>
              </div>
            );
          })}
        </div>
      )}

      {vessels.length === 0 && (
        <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-5 text-sm text-slate-400">
          No AIS vessel data available.
        </div>
      )}

      <div className="mt-5 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          🔄 AIS data refreshes every 10 seconds
        </p>

        <Link
          href="/dashboard/live"
          className="text-sm font-semibold text-cyan-400 hover:text-cyan-300"
        >
          View all vessels →
        </Link>
      </div>
    </div>
  );
}