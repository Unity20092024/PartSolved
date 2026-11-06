import Image from "next/image";
import type { PartFamily } from "@/types/assistance";

// Original schematic illustrations: family shapes, never exact product drawings.
export function FamilyImage({ family }: { family: PartFamily }) {
  if (family.image)
    return (
      <Image
        src={family.image}
        alt={`Example of ${family.name.toLowerCase()}, not an exact replacement`}
        width={560}
        height={260}
        sizes="(max-width: 600px) 100vw, 430px"
        className="assist-family-image"
      />
    );
  return (
    <svg
      className="assist-family-image"
      viewBox="0 0 360 180"
      role="img"
      aria-label={`${family.name} schematic illustration, not to scale`}
    >
      <rect width="360" height="180" fill="#f7f7f7" />
      <g fill="#dedfdf" stroke="#34383b" strokeWidth="4" strokeLinejoin="round">
        {family.id === "operators" && (
          <>
            <rect x="75" y="112" width="140" height="35" rx="12" />
            <path d="M145 112 265 47 276 62 164 130Z" />
            <circle cx="153" cy="126" r="13" />
            <path d="M106 111V83h36" fill="none" />
            <circle cx="148" cy="83" r="9" />
          </>
        )}
        {family.id === "patio-locks" && (
          <>
            <rect x="113" y="29" width="112" height="127" rx="5" />
            <rect x="101" y="19" width="16" height="146" rx="3" />
            <path d="M116 81h-22v28h22" />
            <circle cx="166" cy="91" r="13" />
            <circle cx="109" cy="38" r="3" />
            <circle cx="109" cy="145" r="3" />
          </>
        )}
        {family.id === "closers" && (
          <>
            <rect x="69" y="71" width="145" height="37" rx="15" />
            <path d="M214 89h72" />
            <path d="M52 65v48h17M287 67v45" fill="none" />
            <circle cx="287" cy="89" r="6" />
          </>
        )}
        {family.id === "hinges" && (
          <>
            <rect x="86" y="35" width="88" height="115" rx="4" />
            <rect x="186" y="35" width="88" height="115" rx="4" />
            <rect x="173" y="29" width="15" height="126" rx="6" />
            {[58, 93, 128].map((y) => (
              <g key={y}>
                <circle cx="120" cy={y} r="6" />
                <circle cx="240" cy={y} r="6" />
              </g>
            ))}
          </>
        )}
        {family.id === "screen-latches" && (
          <>
            <rect x="112" y="27" width="60" height="130" rx="12" />
            <circle cx="142" cy="56" r="15" />
            <path d="M145 88h116v20H145Z" />
            <circle cx="142" cy="142" r="4" />
          </>
        )}
      </g>
      <text x="180" y="175" textAnchor="middle" fontSize="12" fill="#4b5054">
        Family illustration · not to scale
      </text>
    </svg>
  );
}
export function LocationDiagram({
  location,
  selected,
  onSelect,
}: {
  location: string;
  selected?: string;
  onSelect?: (area: string) => void;
}) {
  const window = location === "window";
  const sliding = location === "sliding-patio-door";
  const regions = window
    ? [
        { id: "handle", label: "Handle or crank", x: 200, y: 167 },
        { id: "lock", label: "Lock or latch", x: 180, y: 111 },
        { id: "side", label: "Side of the window", x: 72, y: 99 },
        { id: "bottom", label: "Bottom track", x: 150, y: 199 },
        { id: "frame", label: "Inside frame", x: 265, y: 55 },
      ]
    : sliding
      ? [
          { id: "handle", label: "Handle", x: 170, y: 111 },
          { id: "lock", label: "Lock", x: 170, y: 150 },
          { id: "bottom", label: "Bottom rollers", x: 130, y: 190 },
          { id: "track", label: "Track", x: 230, y: 205 },
          { id: "frame", label: "Door frame", x: 275, y: 50 },
        ]
      : [
          { id: "handle", label: "Handle or latch", x: 220, y: 111 },
          { id: "lock", label: "Lock", x: 220, y: 76 },
          { id: "side", label: "Hinges", x: 100, y: 145 },
          { id: "frame", label: "Door frame", x: 252, y: 55 },
          ...(location === "storm-screen-door"
            ? [{ id: "top", label: "Closer near the top", x: 170, y: 41 }]
            : []),
        ];
  return (
    <svg
      viewBox="0 0 360 235"
      className="assist-location-diagram"
      role={onSelect ? "group" : "img"}
      aria-hidden={!onSelect || undefined}
      aria-label={
        window ? "Simplified window diagram" : "Simplified door diagram"
      }
    >
      <rect width="360" height="235" rx="15" fill="#f3f4f4" />
      <g fill="#e0e9ed" stroke="#42474b" strokeWidth="4">
        <rect
          x={window || sliding ? 65 : 98}
          y="23"
          width={window || sliding ? 220 : 154}
          height="181"
          fill="white"
        />
        <rect
          x={window || sliding ? 77 : 110}
          y="35"
          width={window || sliding ? 196 : 130}
          height="157"
        />
        {window ? (
          <>
            <path d="M77 113h196M175 35v157" />
            <path d="M150 113h28" strokeWidth="8" />
          </>
        ) : sliding ? (
          <>
            <path d="M178 35v157" />
            <path d="M169 91v32" strokeWidth="7" />
          </>
        ) : (
          <>
            <circle cx="222" cy="111" r="5" />
            <path d="M222 111h-20" />
            <path d="M99 65h12M99 148h12" />
          </>
        )}
        {location === "storm-screen-door" && (
          <path d="m132 42 71 0" strokeWidth="10" />
        )}
      </g>
      {onSelect &&
        regions.map((region, index) => (
          <g key={region.id}>
            <circle
              cx={region.x}
              cy={region.y}
              r="16"
              fill={selected === region.id ? "#c30009" : "white"}
              stroke="#c30009"
              strokeWidth="2"
            />
            <text
              x={region.x}
              y={region.y + 5}
              fill={selected === region.id ? "white" : "#a90008"}
              textAnchor="middle"
              fontSize="15"
              fontWeight="bold"
              aria-hidden="true"
            >
              {index + 1}
            </text>
            <rect
              x={region.x - 22}
              y={region.y - 22}
              width="44"
              height="44"
              rx="12"
              fill="transparent"
              role="button"
              tabIndex={0}
              aria-label={`Select ${region.label}`}
              aria-pressed={selected === region.id}
              onClick={() => onSelect(region.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(region.id);
                }
              }}
            />
          </g>
        ))}
    </svg>
  );
}
