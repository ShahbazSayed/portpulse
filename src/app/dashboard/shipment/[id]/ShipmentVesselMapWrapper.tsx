"use client";

import dynamic from "next/dynamic";

const ShipmentVesselMap = dynamic(
  () => import("./ShipmentVesselMap"),
  {
    ssr: false,
  }
);

type Vessel = {
  mmsi: number;
  ship_name: string | null;
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  last_seen: string;
};

export default function ShipmentVesselMapWrapper({
  vessel,
}: {
  vessel: Vessel;
}) {
  return <ShipmentVesselMap vessel={vessel} />;
}