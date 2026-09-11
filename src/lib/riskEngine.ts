export type RiskLevel =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

export type RiskFactor = {
  id: string;
  label: string;
  points: number;
  description: string;
};

export const riskFactors: RiskFactor[] = [
  {
    id: "vessel_delay",
    label: "Vessel Delay",
    points: 30,
    description: "Vessel is running behind schedule",
  },
  {
    id: "port_congestion",
    label: "Port Congestion",
    points: 25,
    description:
      "Origin or destination port has congestion",
  },
  {
    id: "weather",
    label: "Weather Disruption",
    points: 20,
    description:
      "Weather conditions may affect the route",
  },
  {
    id: "route_disruption",
    label: "Route Disruption",
    points: 25,
    description:
      "Route affected by operational or maritime disruption",
  },
];

export function getRiskLevel(
  score: number
): RiskLevel {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 30) return "MEDIUM";
  return "LOW";
}

export function calculateRisk(
  selectedFactorIds: string[]
) {
  const factors = riskFactors.filter((factor) =>
    selectedFactorIds.includes(factor.id)
  );

  const score = Math.min(
    factors.reduce(
      (total, factor) => total + factor.points,
      0
    ),
    100
  );

  return {
    score,
    level: getRiskLevel(score),
    factors,
  };
}