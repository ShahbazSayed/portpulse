"use client";

import { useEffect, useMemo, useState } from "react";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
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
  last_seen: string;
};

type HistoryPoint = {
  latitude: number;
  longitude: number;
  recorded_at: string;
};

type VesselStatus = "LIVE" | "STALE" | "OFFLINE";

function getVesselStatus(
  lastSeen: string,
  now = Date.now()
): VesselStatus {
  const timestamp = new Date(lastSeen).getTime();

  if (!Number.isFinite(timestamp)) {
    return "OFFLINE";
  }

  const ageMinutes = Math.max(
    0,
    (now - timestamp) / 1000 / 60
  );

  if (ageMinutes < 2) return "LIVE";
  if (ageMinutes < 10) return "STALE";

  return "OFFLINE";
}

function createVesselIcon(course: number) {
  return L.divIcon({
    className: "vessel-marker",
    html: `
      <div style="
        transform: rotate(${course}deg);
        font-size: 32px;
        width: 42px;
        height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));
      ">
        🚢
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -21],
  });
}

export default function ShipmentVesselMap({
  vessel,
}: {
  vessel: Vessel;
}) {
  const [history, setHistory] = useState<
    HistoryPoint[]
  >([]);

  const [historyLoadedAt, setHistoryLoadedAt] =
    useState<Date | null>(null);

  const [now, setNow] = useState(Date.now());

  async function loadHistory() {
    try {
      const response = await fetch(
        `/api/vessel-history?mmsi=${vessel.mmsi}`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Unable to load vessel history"
        );
      }

      const data = await response.json();

      setHistory(data.history || []);
      setHistoryLoadedAt(new Date());
    } catch (error) {
      console.error(
        "Vessel history error:",
        error
      );
    }
  }

  // Load history immediately and refresh every 10 seconds
  useEffect(() => {
    loadHistory();

    const interval = setInterval(
      loadHistory,
      10000
    );

    return () => clearInterval(interval);
  }, [vessel.mmsi]);

  // Refresh local clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const vesselStatus = useMemo(
    () => getVesselStatus(vessel.last_seen, now),
    [vessel.last_seen, now]
  );

  const statusConfig = useMemo(() => {
    if (vesselStatus === "LIVE") {
      return {
        label: "LIVE",
        icon: "🟢",
        textClass: "text-green-400",
        bgClass: "bg-green-500/10",
        borderClass: "border-green-500/20",
      };
    }

    if (vesselStatus === "STALE") {
      return {
        label: "STALE",
        icon: "🟡",
        textClass: "text-yellow-400",
        bgClass: "bg-yellow-500/10",
        borderClass: "border-yellow-500/20",
      };
    }

    return {
      label: "OFFLINE",
      icon: "🔴",
      textClass: "text-red-400",
      bgClass: "bg-red-500/10",
      borderClass: "border-red-500/20",
    };
  }, [vesselStatus]);

  const secondsSinceAIS = useMemo(() => {
    const timestamp = new Date(
      vessel.last_seen
    ).getTime();

    if (!Number.isFinite(timestamp)) {
      return null;
    }

    return Math.max(
      0,
      Math.floor(
        (now - timestamp) / 1000
      )
    );
  }, [vessel.last_seen, now]);

  function formatAISAge() {
    if (secondsSinceAIS === null) {
      return "Unknown";
    }

    if (secondsSinceAIS < 60) {
      return secondsSinceAIS <= 1
        ? "Just now"
        : `${secondsSinceAIS} seconds ago`;
    }

    const minutes = Math.floor(
      secondsSinceAIS / 60
    );

    if (minutes < 60) {
      return `${minutes} ${
        minutes === 1
          ? "minute"
          : "minutes"
      } ago`;
    }

    const hours = Math.floor(
      minutes / 60
    );

    return `${hours} ${
      hours === 1 ? "hour" : "hours"
    } ago`;
  }

  // Build actual AIS movement trail
  const trail: [number, number][] =
    history.map((point) => [
      point.latitude,
      point.longitude,
    ]);

  // Always keep current vessel position at the end
  if (
    trail.length === 0 ||
    trail[trail.length - 1][0] !==
      vessel.latitude ||
    trail[trail.length - 1][1] !==
      vessel.longitude
  ) {
    trail.push([
      vessel.latitude,
      vessel.longitude,
    ]);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-slate-800 bg-slate-950 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-wide text-cyan-400">
            LIVE AIS MAP
          </p>

          <p className="mt-1 text-sm text-slate-400">
            Real-time vessel position and movement trail
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`rounded-full ${statusConfig.bgClass} px-3 py-1 text-xs font-semibold ${statusConfig.textClass}`}
          >
            {statusConfig.icon} {statusConfig.label}
          </span>

          <span className="text-xs text-slate-500">
            Auto-refresh 10 sec
          </span>
        </div>
      </div>

      {/* Map */}
      <div className="relative h-[420px] w-full">
        <MapContainer
          center={[
            vessel.latitude,
            vessel.longitude,
          ]}
          zoom={13}
          scrollWheelZoom={true}
          className="h-full w-full"
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Historical movement trail */}
          {trail.length > 1 && (
            <>
              <Polyline
                positions={trail}
                pathOptions={{
                  color: "#06b6d4",
                  weight: 5,
                  opacity: 0.85,
                }}
              />

              {history.map(
                (point, index) => (
                  <CircleMarker
                    key={`${point.recorded_at}-${index}`}
                    center={[
                      point.latitude,
                      point.longitude,
                    ]}
                    radius={3}
                    pathOptions={{
                      color: "#67e8f9",
                      fillColor: "#06b6d4",
                      fillOpacity: 0.9,
                      weight: 1,
                    }}
                  >
                    <Popup>
                      <div className="min-w-[180px]">
                        <p className="font-semibold">
                          AIS Position
                        </p>

                        <p className="mt-2 text-sm">
                          Lat:{" "}
                          {point.latitude.toFixed(
                            5
                          )}
                        </p>

                        <p className="text-sm">
                          Lng:{" "}
                          {point.longitude.toFixed(
                            5
                          )}
                        </p>

                        <p className="mt-2 text-xs text-gray-500">
                          {new Date(
                            point.recorded_at
                          ).toLocaleString()}
                        </p>
                      </div>
                    </Popup>
                  </CircleMarker>
                )
              )}
            </>
          )}

          {/* Current vessel */}
          <Marker
            position={[
              vessel.latitude,
              vessel.longitude,
            ]}
            icon={createVesselIcon(
              vessel.course
            )}
          >
            <Popup>
              <div className="min-w-[210px]">
                <p className="text-base font-bold">
                  🚢{" "}
                  {vessel.ship_name ||
                    "Unknown Vessel"}
                </p>

                <div className="mt-3 space-y-1 text-sm">
                  <p>
                    <strong>Status:</strong>{" "}
                    {statusConfig.icon}{" "}
                    {statusConfig.label}
                  </p>

                  <p>
                    <strong>Speed:</strong>{" "}
                    {vessel.speed} kn
                  </p>

                  <p>
                    <strong>Course:</strong>{" "}
                    {vessel.course}°
                  </p>

                  <p>
                    <strong>MMSI:</strong>{" "}
                    {vessel.mmsi}
                  </p>

                  <p>
                    <strong>Position:</strong>{" "}
                    {vessel.latitude.toFixed(5)},{" "}
                    {vessel.longitude.toFixed(5)}
                  </p>

                  <p>
                    <strong>AIS Update:</strong>{" "}
                    {formatAISAge()}
                  </p>
                </div>

                <p
                  className={`mt-3 text-xs font-semibold ${statusConfig.textClass}`}
                >
                  {statusConfig.icon}{" "}
                  AIS {statusConfig.label}
                </p>
              </div>
            </Popup>
          </Marker>
        </MapContainer>

        {/* Vessel status overlay */}
        <div
          className={`pointer-events-none absolute bottom-4 left-4 z-[1000] rounded-lg border ${statusConfig.borderClass} ${statusConfig.bgClass} bg-slate-950/95 px-4 py-3 shadow-lg`}
        >
          <p
            className={`text-xs font-semibold ${statusConfig.textClass}`}
          >
            {statusConfig.icon} AIS{" "}
            {statusConfig.label}
          </p>

          <p className="mt-1 text-sm font-semibold text-white">
            {vessel.ship_name ||
              "Unknown Vessel"}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {vessel.speed} kn •{" "}
            {vessel.course}°
          </p>
        </div>

        {/* Actual AIS timestamp */}
        <div className="pointer-events-none absolute bottom-4 right-4 z-[1000] rounded-lg border border-slate-700 bg-slate-950/95 px-4 py-3 shadow-lg">
          <p className="text-xs text-slate-500">
            LAST AIS UPDATE
          </p>

          <p
            className={`mt-1 text-sm font-semibold ${statusConfig.textClass}`}
          >
            {formatAISAge()}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {formatDateTime(
              vessel.last_seen
            )}
          </p>
        </div>
      </div>

      {/* Movement information */}
      <div className="border-t border-slate-800 bg-slate-950 px-5 py-4">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              AIS STATUS
            </p>

            <p
              className={`mt-1 text-sm font-semibold ${statusConfig.textClass}`}
            >
              {statusConfig.icon}{" "}
              {statusConfig.label}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500">
              MOVEMENT TRAIL
            </p>

            <p className="mt-1 text-sm text-slate-300">
              {history.length > 0
                ? `${history.length} AIS positions recorded`
                : "Collecting AIS data..."}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500">
              CURRENT SPEED
            </p>

            <p className="mt-1 text-sm font-semibold text-white">
              {vessel.speed} kn
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500">
              CURRENT POSITION
            </p>

            <p className="mt-1 text-sm font-semibold text-cyan-400">
              {vessel.latitude.toFixed(5)},{" "}
              {vessel.longitude.toFixed(5)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDateTime(date: string | null) {
  if (!date) return "—";

  return new Date(date).toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}