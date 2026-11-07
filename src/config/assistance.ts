import type { PartFamily } from "@/types/assistance";
export const assistanceLocations = [
  { id: "window", label: "A window" },
  { id: "sliding-patio-door", label: "A sliding patio door" },
  { id: "entry-door", label: "A regular hinged door" },
  { id: "storm-screen-door", label: "A storm or screen door" },
  { id: "other", label: "Something else" },
  { id: "not-sure", label: "I'm not sure" },
];
export function problemAreas(location: string) {
  const areas =
    location === "window"
      ? [
          ["handle", "Handle or crank"],
          ["lock", "Lock or latch"],
          ["side", "Side of the window"],
          ["bottom", "Bottom track"],
          ["frame", "Inside the window frame"],
          ["entire", "Entire window"],
        ]
      : location === "sliding-patio-door"
        ? [
            ["handle", "Handle"],
            ["lock", "Lock"],
            ["bottom", "Bottom rollers"],
            ["track", "Track"],
            ["frame", "Door frame"],
          ]
        : location === "storm-screen-door"
          ? [
              ["handle", "Handle or latch"],
              ["top", "Closer near the top"],
              ["side", "Hinges at the side"],
              ["frame", "Door frame"],
            ]
          : location === "entry-door"
            ? [
                ["handle", "Handle"],
                ["lock", "Lock or latch"],
                ["side", "Hinges at the side"],
                ["frame", "Door frame"],
              ]
            : [["entire", "The whole window or door"]];
  return [
    ...areas.map(([id, label]) => ({ id, label })),
    { id: "not-sure", label: "Not sure" },
  ];
}
export function symptomChoices(location: string) {
  const items = [
    ["wont-open", "It won't open."],
    ["wont-close", "It won't close."],
    ["wont-lock", "It won't lock."],
    ...(["window", "sliding-patio-door", "not-sure", "other", ""].includes(
      location,
    )
      ? [["hard-slide", "It's hard to slide."]]
      : []),
    ["handle-spins", "The handle turns but nothing happens."],
    ...(location === "window"
      ? [["wont-stay", "The window won't stay open."]]
      : []),
    ["broken", "Something broke or fell off."],
    ["scraping", "It makes a scraping noise."],
    ["missing", "A piece is missing."],
    ["not-sure", "I'm not sure what's wrong."],
    ["other", "Something else."],
  ];
  return items.map(([id, label]) => ({ id, label }));
}
export const stuckChoices = [
  { id: "bottom", label: "Near the bottom" },
  { id: "top", label: "Near the top" },
  { id: "handle", label: "Around the handle" },
  { id: "entire", label: "The entire door feels difficult to move" },
  { id: "not-sure", label: "Not sure" },
];
export const families: PartFamily[] = [
  {
    id: "balances",
    name: "Window balances",
    category: "window-parts",
    partType: "not-sure",
    description:
      "Hidden springs or channels that help support a movable window.",
    problem: "A window that drops or will not stay open.",
    check:
      "Keep the window safely supported. Look for a spring or metal channel at the side; record markings and end fittings without removing a loaded spring.",
    guide: "window-balances",
    image: "/images/part-families/window-balances.webp",
  },
  {
    id: "window-locks",
    name: "Window locks",
    category: "window-hardware",
    partType: "sash-cam-lock",
    description: "A small lock and keeper that hold a window shut.",
    problem: "A window that will not lock or a broken latch.",
    check:
      "Check whether the lock and keeper line up. Photograph both pieces and measure screw-hole centers.",
    guide: "screw-spacing",
    image: "/images/part-families/window-sash-lock.webp",
  },
  {
    id: "operators",
    name: "Casement crank operators",
    category: "window-hardware",
    partType: "casement-operator",
    description:
      "A crank and arm mechanism that opens an outward-swinging window.",
    problem: "A crank that turns without moving the window.",
    check:
      "Check whether your window swings outward. Photograph the handle, base and arm; note orientation without forcing the mechanism.",
    guide: "orientation",
    image: "/images/part-families/casement-crank-operator.webp",
  },
  {
    id: "rollers",
    name: "Patio door rollers",
    category: "door-parts",
    partType: "patio-roller",
    description: "Wheels in a housing beneath a sliding patio door.",
    problem: "A patio door that drags or is hard to slide.",
    check:
      "Inspect the track for debris first. If the roller is safely accessible, record wheel diameter and housing dimensions. Do not lift a heavy door alone.",
    guide: "roller-housing",
    image: "/images/part-families/patio-door-rollers.webp",
  },
  {
    id: "patio-locks",
    name: "Patio door locks",
    category: "door-hardware",
    partType: "patio-mortise-lock",
    description: "A lock mechanism inside the edge of a sliding patio door.",
    problem: "A sliding door that will not latch or lock.",
    check:
      "Look at the door edge and keeper alignment. Photograph the faceplate and note the screw spacing and backset.",
    guide: "lock-backset",
    image: "/images/part-families/patio-door-mortise-lock.webp",
  },
  {
    id: "handles",
    name: "Door handles",
    category: "door-hardware",
    partType: "other",
    description: "The grip or lever used to open and latch a door.",
    problem: "A loose, broken or ineffective door handle.",
    check:
      "Photograph both sides and the door edge. Note whether the door slides or swings and measure mounting-hole spacing.",
    guide: "screw-spacing",
    image: "/images/part-families/patio-door-handle-set.webp",
  },
  {
    id: "closers",
    name: "Storm door closers",
    category: "door-parts",
    partType: "storm-closer",
    description: "A cylinder and rod that control a storm door as it closes.",
    problem: "A storm door that will not close smoothly.",
    check:
      "Look for the cylinder attached between the door and frame. Photograph the brackets and record overall dimensions without disconnecting it.",
    guide: "overall-size",
    image: "/images/part-families/storm-door-closer.webp",
  },
  {
    id: "hinges",
    name: "Hinges",
    category: "door-parts",
    partType: "other",
    description: "Pivoting plates that connect a swinging door to its frame.",
    problem: "A sagging, rubbing or scraping hinged door.",
    check:
      "Check for loose fasteners without removing the door. Note hinge shape, overall size and hole locations.",
    guide: "overall-size",
    image: "/images/part-families/door-hinges.webp",
  },
  {
    id: "screen-latches",
    name: "Screen door latches",
    category: "door-hardware",
    partType: "push-button-latch",
    description: "A push-button or lever latch for a storm or screen door.",
    problem: "A screen door that will not latch or a broken push button.",
    check:
      "Photograph inside and outside handles and the keeper. Measure screw-hole spacing and note door thickness.",
    guide: "screw-spacing",
    image: "/images/part-families/screen-door-push-button-latch.webp",
  },
  {
    id: "track-fin-locks",
    name: "Sliding window track/fin locks",
    category: "window-hardware",
    partType: "track-fin-lock",
    description:
      "A small lock or stop that helps secure a sliding window along its track or fin.",
    problem:
      "A sliding window that will not stay secured or a broken track lock.",
    check:
      "Photograph the lock and the track or fin where it attaches. Record its dimensions and mounting method without forcing the part.",
    guide: "overall-size",
    image: "/images/part-families/sliding-window-fin-lock.webp",
  },
];
export const familyById = (id: string) =>
  families.find((family) => family.id === id);
