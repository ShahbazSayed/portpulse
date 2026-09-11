"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Vessel = {
  mmsi: number;
  ship_name: string | null;
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
};

function createVesselIcon(course: number) {
  return L.divIcon({
    className: "vessel-marker",
    html: `
      <div style="
        transform: rotate(${course}deg);
        font-size: 28px;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
      ">
        🚢
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

function MapUpdater({ vessels }: { vessels: Vessel[] }) {
  const map = useMap();

  useEffect(() => {
    if (vessels.length === 0) return;

    const bounds = vessels.map(
      (vessel) =>
        [vessel.latitude, vessel.longitude] as [number, number]
    );

    map.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 13,
    });
  }, [vessels, map]);

  return null;
}

export default function LiveVesselMap() {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadVessels() {
    try {
      const response = await fetch("/api/live-vessels");
      const data = await response.json();

      setVessels(data.vessels || []);
    } catch (error) {
      console.error("Map vessel error:", error);
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
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-cyan-400">
            LIVE AIS MAP
          </p>

          <p className="mt-1 text-sm text-slate-400">
            Real-time vessel positions
          </p>
        </div>

        <div className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400">
          🟢 {vessels.length} LIVE
        </div>
      </div>

      <div className="relative h-[500px] w-full">
        {loading ? (
          <div className="flex h-full items-center justify-center text-slate-400">
            Loading live map...
          </div>
        ) : (
          <MapContainer
            center={[13.101, 80.302]}
            zoom={13}
            scrollWheelZoom={true}
            className="h-full w-full"
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapUpdater vessels={vessels} />

            {vessels.map((vessel) => (
              <Marker
                key={vessel.mmsi}
                position={[
                  vessel.latitude,
                  vessel.longitude,
                ]}
                icon={createVesselIcon(vessel.course)}
              >
                <Popup>
                  <div className="min-w-[190px]">
                    <p className="text-base font-bold">
                      🚢 {vessel.ship_name || "Unknown Vessel"}
                    </p>

                    <p className="mt-2 text-sm">
                      <strong>Speed:</strong>{" "}
                      {vessel.speed} kn
                    </p>

                    <p className="text-sm">
                      <strong>Course:</strong>{" "}
                      {vessel.course}°
                    </p>

                    <p className="text-sm">
                      <strong>MMSI:</strong>{" "}
                      {vessel.mmsi}
                    </p>

                    <p className="mt-2 text-xs text-gray-500">
                      Position:{" "}
                      {vessel.latitude.toFixed(5)},{" "}
                      {vessel.longitude.toFixed(5)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}

        <div className="pointer-events-none absolute bottom-4 left-4 z-[1000] rounded-lg bg-slate-950/90 px-3 py-2 text-xs text-slate-300 shadow-lg">
          🔄 Live updates every 10 seconds
        </div>
      </div>
    </div>
  );
}