"use client";

import { useEffect, useState } from "react";

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

export default function LiveVesselPage() {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadVessels() {
    try {
      const response = await fetch("/api/live-vessels");
      const data = await response.json();

      setVessels(data.vessels || []);
    } catch (error) {
      console.error("Failed to load vessels:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVessels();

    const interval = setInterval(loadVessels, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-cyan-400">
            PORTPULSE LIVE
          </p>

          <h1 className="mt-2 text-4xl font-bold">
            Live Vessel Tracking
          </h1>

          <p className="mt-2 text-slate-400">
            Real-time AIS vessel positions
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            Loading live vessels...
          </div>
        ) : vessels.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            No live vessels available yet.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {vessels.map((vessel) => (
              <div
                key={vessel.mmsi}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold">
                      🚢 {vessel.ship_name || "Unknown Vessel"}
                    </h2>

                    <p className="mt-1 text-sm text-slate-400">
                      MMSI: {vessel.mmsi}
                    </p>
                  </div>

                  <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400">
                    LIVE
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Latitude</p>
                    <p className="font-semibold">
                      {vessel.latitude.toFixed(5)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Longitude</p>
                    <p className="font-semibold">
                      {vessel.longitude.toFixed(5)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Speed</p>
                    <p className="font-semibold">
                      {vessel.speed} knots
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Course</p>
                    <p className="font-semibold">
                      {vessel.course}°
                    </p>
                  </div>
                </div>

                <p className="mt-6 text-xs text-slate-500">
                  Last update:{" "}
                  {new Date(vessel.last_seen).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}