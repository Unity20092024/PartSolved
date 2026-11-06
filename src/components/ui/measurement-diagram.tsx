export function MeasurementDiagram({
  kind,
}: {
  kind: "spacing" | "size" | "roller" | "balance" | "backset";
}) {
  const title = {
    spacing: "Measure between mounting-hole centers",
    size: "Record length and width separately",
    roller: "Measure wheel diameter through its center",
    balance: "Record metal body and end fittings separately",
    backset: "Record the backset reference points",
  }[kind];
  const id = `diagram-${kind}`;
  return (
    <svg
      viewBox="0 0 400 160"
      className="measurement-diagram"
      role="img"
      aria-labelledby={`${id}-title`}
    >
      <title id={`${id}-title`}>
        {title}. Conceptual diagram, not to scale.
      </title>
      <defs>
        <marker
          id={`${id}-arrow`}
          viewBox="0 0 10 10"
          refX="5"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#b90009" />
        </marker>
      </defs>
      {kind === "spacing" ? (
        <>
          <rect
            x="55"
            y="65"
            width="290"
            height="65"
            rx="12"
            fill="#e0e3e6"
            stroke="#59616a"
          />
          <circle cx="95" cy="97" r="14" fill="white" stroke="#59616a" />
          <circle cx="305" cy="97" r="14" fill="white" stroke="#59616a" />
          <path
            d="M95 97V34M305 97V34"
            stroke="#59616a"
            strokeDasharray="4 3"
          />
          <path
            d="M95 40H305"
            stroke="#b90009"
            strokeWidth="2"
            markerStart={`url(#${id}-arrow)`}
            markerEnd={`url(#${id}-arrow)`}
          />
          <text x="200" y="25" textAnchor="middle">
            Center to center
          </text>
        </>
      ) : kind === "size" ? (
        <>
          <rect
            x="80"
            y="58"
            width="240"
            height="65"
            rx="8"
            fill="#e0e3e6"
            stroke="#59616a"
          />
          <path
            d="M80 37H320M55 58V123"
            stroke="#b90009"
            strokeWidth="2"
            markerStart={`url(#${id}-arrow)`}
            markerEnd={`url(#${id}-arrow)`}
          />
          <text x="200" y="25" textAnchor="middle">
            Overall length
          </text>
          <text x="18" y="148">
            Width measured separately
          </text>
        </>
      ) : kind === "roller" ? (
        <>
          <rect
            x="62"
            y="48"
            width="170"
            height="78"
            rx="5"
            fill="#e0e3e6"
            stroke="#59616a"
          />
          <circle
            cx="155"
            cy="108"
            r="34"
            fill="white"
            stroke="#59616a"
            strokeWidth="2"
          />
          <circle cx="155" cy="108" r="6" fill="#59616a" />
          <path
            d="M121 108H189"
            stroke="#b90009"
            strokeWidth="2"
            markerStart={`url(#${id}-arrow)`}
            markerEnd={`url(#${id}-arrow)`}
          />
          <text x="250" y="80">
            Wheel diameter
          </text>
          <text x="250" y="102">
            through center
          </text>
        </>
      ) : kind === "balance" ? (
        <>
          <rect
            x="65"
            y="65"
            width="260"
            height="35"
            rx="4"
            fill="#e0e3e6"
            stroke="#59616a"
          />
          <path
            d="M48 56H65V108H48M325 56H347V108H325"
            fill="#fff"
            stroke="#59616a"
            strokeWidth="3"
          />
          <path
            d="M65 38H325"
            stroke="#b90009"
            strokeWidth="2"
            markerStart={`url(#${id}-arrow)`}
            markerEnd={`url(#${id}-arrow)`}
          />
          <text x="195" y="25" textAnchor="middle">
            Metal body
          </text>
          <text x="200" y="140" textAnchor="middle">
            Record end fittings separately
          </text>
        </>
      ) : (
        <>
          <rect
            x="130"
            y="58"
            width="185"
            height="70"
            rx="5"
            fill="#e0e3e6"
            stroke="#59616a"
          />
          <rect x="310" y="45" width="12" height="96" fill="#a9afb6" />
          <circle cx="205" cy="92" r="12" fill="white" stroke="#59616a" />
          <path
            d="M205 38H316M205 38V92M316 38V58"
            stroke="#b90009"
            strokeWidth="2"
          />
          <text x="260" y="25" textAnchor="middle">
            Backset reference
          </text>
          <text x="200" y="156" textAnchor="middle">
            Faceplate edge to operating center
          </text>
        </>
      )}
    </svg>
  );
}
