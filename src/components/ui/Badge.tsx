import { cn } from "@/lib/utils";

type BadgeColor =
  | "green" | "red" | "yellow" | "blue" | "purple"
  | "orange" | "teal" | "gray" | "pink";

const colorMap: Record<BadgeColor, string> = {
  green:  "bg-green-50 text-green-700 border-green-200",
  red:    "bg-red-50 text-red-700 border-red-200",
  yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
  blue:   "bg-blue-50 text-blue-700 border-blue-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  orange: "bg-orange-50 text-orange-700 border-orange-200",
  teal:   "bg-teal-50 text-teal-700 border-teal-200",
  gray:   "bg-gray-100 text-gray-600 border-gray-200",
  pink:   "bg-pink-50 text-pink-700 border-pink-200",
};

interface BadgeProps {
  color?: BadgeColor;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ color = "gray", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "badge border",
        colorMap[color],
        className
      )}
    >
      {children}
    </span>
  );
}

// Transport type badges
export function TransportBadge({ type }: { type: string | null | undefined }) {
  if (!type) return null;
  const map: Record<string, { label: string; color: BadgeColor }> = {
    bus:           { label: "Bus", color: "green" },
    charter:       { label: "Charter", color: "purple" },
    scheduled_air: { label: "Scheduled Air", color: "blue" },
    hospitality:   { label: "Hospitality", color: "yellow" },
    mixed:         { label: "Mixed", color: "teal" },
  };
  const t = map[type.toLowerCase()] ?? { label: type, color: "gray" as BadgeColor };
  return <Badge color={t.color}>{t.label}</Badge>;
}

// Priority badge
export function PriorityBadge({ rating }: { rating: number | null | undefined }) {
  if (!rating) return <Badge color="gray">Unknown</Badge>;
  if (rating >= 5) return <Badge color="red">Critical</Badge>;
  if (rating >= 4) return <Badge color="orange">High</Badge>;
  if (rating >= 3) return <Badge color="yellow">Medium</Badge>;
  if (rating >= 2) return <Badge color="blue">Low</Badge>;
  return <Badge color="gray">Minimal</Badge>;
}

// Confidence badge
export function ConfidenceBadge({ level }: { level: string | null | undefined }) {
  if (!level) return null;
  const map: Record<string, BadgeColor> = {
    high: "green",
    medium: "yellow",
    low: "orange",
    unverified: "gray",
  };
  const color = map[level.toLowerCase()] ?? "gray";
  return <Badge color={color}>{level.charAt(0).toUpperCase() + level.slice(1)}</Badge>;
}

// Status badge
export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return null;
  const map: Record<string, { label: string; color: BadgeColor }> = {
    identified:  { label: "Identified", color: "blue" },
    researching: { label: "Researching", color: "yellow" },
    contacted:   { label: "Contacted", color: "orange" },
    active:      { label: "Active", color: "green" },
    closed:      { label: "Closed", color: "gray" },
    needs_review: { label: "Needs Review", color: "red" },
    archived:    { label: "Archived", color: "gray" },
    complete:    { label: "Complete", color: "green" },
    error:       { label: "Error", color: "red" },
    processing:  { label: "Processing", color: "blue" },
    pending:     { label: "Pending", color: "gray" },
  };
  const t = map[status.toLowerCase()] ?? { label: status, color: "gray" as BadgeColor };
  return <Badge color={t.color}>{t.label}</Badge>;
}
