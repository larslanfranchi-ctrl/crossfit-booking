export type CapacityTone = "available" | "full" | "booked" | "past";

const RING_STYLES: Record<CapacityTone, { track: string; progress: string }> = {
  available: { track: "stroke-white/30", progress: "stroke-white" },
  booked: { track: "stroke-white/30", progress: "stroke-white" },
  full: { track: "stroke-white/20", progress: "stroke-error-200" },
  past: { track: "stroke-stone-300", progress: "stroke-stone-500" },
};

export function CapacityRing({
  booked,
  capacity,
  tone,
}: {
  booked: number;
  capacity: number;
  tone: CapacityTone;
}) {
  const radius = 13;
  const circumference = 2 * Math.PI * radius;
  const fraction = capacity > 0 ? Math.min(booked / capacity, 1) : 0;
  const offset = circumference * (1 - fraction);
  const styles = RING_STYLES[tone];

  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 34 34"
      className="shrink-0"
      aria-hidden="true"
    >
      <circle
        cx="17"
        cy="17"
        r={radius}
        fill="none"
        strokeWidth="3"
        className={styles.track}
      />
      <circle
        cx="17"
        cy="17"
        r={radius}
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 17 17)"
        className={styles.progress}
      />
      <text
        x="17"
        y="20"
        textAnchor="middle"
        fontSize="9"
        className={tone === "past" ? "fill-stone-600" : "fill-white"}
      >
        {booked}/{capacity}
      </text>
    </svg>
  );
}
