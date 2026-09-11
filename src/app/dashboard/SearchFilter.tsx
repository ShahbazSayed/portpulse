"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Shipment = {
  id: string;
  shipment_number: string;
  vessel_name: string | null;
  origin_port: string | null;
  destination_port: string | null;
  eta: string | null;
  risk_score: number;
  risk_level: string;
  status: string;
};

export default function SearchFilter({
  shipments,
}: {
  shipments: Shipment[];
}) {
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filteredShipments = useMemo(() => {
    return shipments.filter((shipment) => {
      const query = search.toLowerCase().trim();

      const matchesSearch =
        !query ||
        shipment.shipment_number
          .toLowerCase()
          .includes(query) ||
        (shipment.vessel_name || "")
          .toLowerCase()
          .includes(query) ||
        (shipment.origin_port || "")
          .toLowerCase()
          .includes(query) ||
        (shipment.destination_port || "")
          .toLowerCase()
          .includes(query);

      const matchesRisk =
        riskFilter === "ALL" ||
        shipment.risk_level === riskFilter;

      const matchesStatus =
        statusFilter === "ALL" ||
        shipment.status === statusFilter;

      return (
        matchesSearch &&
        matchesRisk &&
        matchesStatus
      );
    });
  }, [shipments, search, riskFilter, statusFilter]);

  function formatDate(date: string | null) {
    if (!date) return "—";

    return date;
  }

  function getRiskClass(level: string) {
    if (level === "CRITICAL") {
      return "bg-red-500/10 text-red-400";
    }

    if (level === "HIGH") {
      return "bg-orange-500/10 text-orange-400";
    }

    if (level === "MEDIUM") {
      return "bg-yellow-500/10 text-yellow-400";
    }

    return "bg-green-500/10 text-green-400";
  }

  function getStatusClass(status: string) {
    if (status === "MAJOR_DELAY") {
      return "bg-red-500/10 text-red-400";
    }

    if (status === "DELAYED") {
      return "bg-orange-500/10 text-orange-400";
    }

    return "bg-green-500/10 text-green-400";
  }

  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      {/* Filters */}
      <div className="border-b border-slate-800 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-bold">
              Shipments
            </h3>

            <p className="mt-1 text-sm text-slate-400">
              Showing {filteredShipments.length} of{" "}
              {shipments.length} shipments
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              placeholder="Search shipment, vessel or port..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-500 sm:w-64"
            />

            <select
              value={riskFilter}
              onChange={(e) =>
                setRiskFilter(e.target.value)
              }
              className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500"
            >
              <option value="ALL">
                All Risk Levels
              </option>
              <option value="LOW">
                Low Risk
              </option>
              <option value="MEDIUM">
                Medium Risk
              </option>
              <option value="HIGH">
                High Risk
              </option>
              <option value="CRITICAL">
                Critical Risk
              </option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
              className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500"
            >
              <option value="ALL">
                All Statuses
              </option>
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

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px]">
          <thead className="border-b border-slate-800 bg-slate-950/50">
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="px-5 py-4">
                Shipment
              </th>

              <th className="px-5 py-4">
                Vessel
              </th>

              <th className="px-5 py-4">
                Route
              </th>

              <th className="px-5 py-4">
                ETA
              </th>

              <th className="px-5 py-4">
                Risk
              </th>

              <th className="px-5 py-4">
                Status
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800">
            {filteredShipments.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-12 text-center text-sm text-slate-500"
                >
                  No shipments match the selected
                  filters.
                </td>
              </tr>
            ) : (
              filteredShipments.map((shipment) => (
                <tr
                  key={shipment.id}
                  className="transition hover:bg-slate-800/40"
                >
                  <td className="px-5 py-4">
                    <Link
                      href={`/dashboard/shipment/${encodeURIComponent(
                        shipment.shipment_number
                      )}`}
                      className="font-bold text-cyan-400 hover:text-cyan-300 hover:underline"
                    >
                      {shipment.shipment_number}
                    </Link>
                  </td>

                  <td className="px-5 py-4 text-sm font-medium text-slate-200">
                    {shipment.vessel_name || "—"}
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-400">
                    {shipment.origin_port || "—"} →{" "}
                    {shipment.destination_port || "—"}
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-400">
                    {formatDate(shipment.eta)}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={
                        "rounded-full px-3 py-1 text-xs font-bold " +
                        getRiskClass(
                          shipment.risk_level
                        )
                      }
                    >
                      {shipment.risk_level}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={
                        "rounded-full px-3 py-1 text-xs font-bold " +
                        getStatusClass(
                          shipment.status
                        )
                      }
                    >
                      {shipment.status.replace(
                        /_/g,
                        " "
                      )}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}