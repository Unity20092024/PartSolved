import type {
  HardwareCategory,
  MeasurementRequirement,
  PartTypeDefinition,
} from "@/types/intake";
export const hardwareCategories: { id: HardwareCategory; label: string }[] = [
  { id: "window-hardware", label: "Window Hardware" },
  { id: "window-parts", label: "Window Parts" },
  { id: "door-hardware", label: "Door Hardware" },
  { id: "door-parts", label: "Door Parts" },
  { id: "not-sure", label: "Not Sure" },
];
const spacing: MeasurementRequirement = {
  id: "hole-spacing",
  label: "Screw-hole spacing",
  help: "Measure between the centers of the mounting holes, not their edges.",
  guide: "screw-spacing",
};
const length: MeasurementRequirement = {
  id: "overall-length",
  label: "Overall length",
  help: "Record the full length of the removed part without forcing or stretching it.",
  guide: "overall-size",
};
const width: MeasurementRequirement = {
  id: "overall-width",
  label: "Overall width",
  help: "Measure across the widest relevant portion and note what you included.",
  guide: "overall-size",
};
const backset: MeasurementRequirement = {
  id: "backset",
  label: "Lock backset",
  help: "Record the distance from the faceplate reference edge to the operating spindle/key center. Confirm the manufacturer’s reference points.",
  guide: "lock-backset",
};
// Provisional intake prompts, not compatibility specifications. Verify against manufacturer documents before matching.
export const partTypes: readonly PartTypeDefinition[] = [
  {
    id: "patio-mortise-lock",
    label: "Sliding patio door mortise lock",
    category: "door-hardware",
    description:
      "A narrow latch body fitted inside the edge of a sliding patio door.",
    locations: ["sliding-patio-door"],
    purposes: ["locks", "holds"],
    orientation: true,
    measurements: [
      length,
      width,
      spacing,
      backset,
      {
        id: "body-depth",
        label: "Lock body depth",
        help: "Measure the depth of the body behind the faceplate.",
        guide: "overall-size",
      },
    ],
  },
  {
    id: "spiral-balance",
    label: "Spiral window balance",
    category: "window-parts",
    description:
      "A tubular balance with a spiral rod used to support a window sash.",
    locations: ["window"],
    purposes: ["balances", "opens"],
    orientation: false,
    measurements: [
      {
        id: "tube-length",
        label: "Metal tube length",
        help: "Measure the metal tube separately from the rod and end fittings. Do not tension or dismantle a balance to measure it.",
        guide: "window-balances",
      },
      {
        id: "tube-diameter",
        label: "Tube diameter",
        help: "Measure across the outside of the tube without compressing it.",
        guide: "window-balances",
      },
      {
        id: "overall-length",
        label: "Overall assembly length",
        help: "Record the assembly length separately and describe which fittings are included.",
        guide: "balance-fittings",
      },
    ],
  },
  {
    id: "channel-balance",
    label: "Channel window balance",
    category: "window-parts",
    description:
      "A metal channel containing a spring, usually with shaped fittings at the ends.",
    locations: ["window"],
    purposes: ["balances", "opens"],
    orientation: false,
    measurements: [
      {
        id: "channel-length",
        label: "Metal channel length",
        help: "Measure the metal channel separately from plastic end fittings.",
        guide: "window-balances",
      },
      {
        id: "channel-width",
        label: "Channel width",
        help: "Record the outside width of the metal channel.",
        guide: "window-balances",
      },
      {
        id: "channel-depth",
        label: "Channel depth",
        help: "Record the outside depth and describe the channel shape.",
        guide: "window-balances",
      },
    ],
  },
  {
    id: "casement-operator",
    label: "Casement crank/operator",
    category: "window-hardware",
    description:
      "A crank mechanism with one or more arms that opens a hinged window.",
    locations: ["window"],
    purposes: ["opens", "holds"],
    orientation: true,
    measurements: [
      {
        id: "arm-length",
        label: "Arm length",
        help: "Record the arm length and the endpoints you measured; pivot-to-pivot conventions differ.",
        guide: "overall-size",
      },
      {
        id: "base-width",
        label: "Base width",
        help: "Measure the operator base separately from any removable cover.",
        guide: "overall-size",
      },
      spacing,
    ],
  },
  {
    id: "patio-handle-set",
    label: "Patio door handle set",
    category: "door-hardware",
    description:
      "An inside/outside grip or lever set mounted on a sliding patio door.",
    locations: ["sliding-patio-door"],
    purposes: ["opens", "locks"],
    orientation: true,
    measurements: [
      spacing,
      length,
      {
        id: "door-thickness",
        label: "Door thickness",
        help: "Measure the door thickness where the handle set mounts.",
        guide: "overall-size",
      },
    ],
  },
  {
    id: "sash-cam-lock",
    label: "Window sash cam lock and keeper",
    category: "window-hardware",
    description:
      "A small rotating cam latch and its matching catch on a window sash.",
    locations: ["window"],
    purposes: ["locks", "holds"],
    orientation: true,
    measurements: [
      spacing,
      {
        id: "keeper-spacing",
        label: "Keeper screw-hole spacing",
        help: "Measure the keeper mounting-hole centers separately from the lock.",
        guide: "screw-spacing",
      },
      width,
      {
        id: "keeper-height",
        label: "Keeper height",
        help: "Record keeper height and the surface you measured from.",
        guide: "overall-size",
      },
    ],
  },
  {
    id: "patio-roller",
    label: "Sliding patio door roller assembly",
    category: "door-parts",
    description:
      "One or more wheels in a metal housing beneath a sliding patio door.",
    locations: ["sliding-patio-door"],
    purposes: ["slides"],
    orientation: false,
    measurements: [
      {
        id: "roller-diameter",
        label: "Roller diameter",
        help: "Measure across the wheel through its center, excluding the housing.",
        guide: "roller-diameter",
      },
      {
        id: "housing-length",
        label: "Housing length",
        help: "Measure the metal housing and note whether mounting tabs are included.",
        guide: "roller-housing",
      },
      {
        id: "housing-width",
        label: "Housing width",
        help: "Measure the outside width of the housing.",
        guide: "roller-housing",
      },
      {
        id: "housing-height",
        label: "Housing height",
        help: "Measure the housing separately from any adjustable wheel extension.",
        guide: "roller-housing",
      },
      spacing,
    ],
  },
  {
    id: "storm-closer",
    label: "Storm door closer",
    category: "door-parts",
    description:
      "A cylinder and rod connecting a storm or screen door to its frame.",
    locations: ["storm-screen-door"],
    purposes: ["opens", "holds"],
    orientation: true,
    measurements: [
      {
        id: "body-length",
        label: "Cylinder body length",
        help: "Record the cylinder body without extending a spring-loaded rod.",
        guide: "overall-size",
      },
      {
        id: "body-diameter",
        label: "Cylinder diameter",
        help: "Measure across the body, clear of mounting brackets.",
        guide: "overall-size",
      },
      spacing,
    ],
  },
  {
    id: "track-fin-lock",
    label: "Sliding window track/fin lock",
    category: "window-hardware",
    description:
      "A small clamp or stop that secures a sliding window on its track or fin.",
    locations: ["window"],
    purposes: ["locks", "holds"],
    orientation: false,
    measurements: [
      {
        id: "track-width",
        label: "Track or fin width",
        help: "Measure the track/fin where the lock attaches, noting which surface was measured.",
        guide: "overall-size",
      },
      {
        id: "opening-width",
        label: "Lock opening width",
        help: "Record the opening without forcing or deforming the part.",
        guide: "overall-size",
      },
      length,
    ],
  },
  {
    id: "push-button-latch",
    label: "Storm or screen door push-button latch",
    category: "door-hardware",
    description:
      "A handle/latch operated by a push button, commonly on storm or screen doors.",
    locations: ["storm-screen-door"],
    purposes: ["locks", "opens", "holds"],
    orientation: true,
    measurements: [
      spacing,
      {
        id: "door-thickness",
        label: "Door thickness",
        help: "Measure the door where the latch mounts.",
        guide: "overall-size",
      },
      {
        id: "latch-reach",
        label: "Latch reach",
        help: "Record the latch projection and describe the reference edge used.",
        guide: "overall-size",
      },
    ],
  },
];
export function getPartType(id: string) {
  return partTypes.find((type) => type.id === id);
}
export function availablePartTypes(category: string) {
  return category === "not-sure"
    ? partTypes
    : partTypes.filter((type) => type.category === category);
}
export function categoryLabel(id: string) {
  return (
    hardwareCategories.find((category) => category.id === id)?.label ??
    "Not selected"
  );
}
export function partTypeLabel(id: string) {
  return id === "other"
    ? "Other"
    : id === "not-sure"
      ? "Not Sure"
      : (getPartType(id)?.label ?? "Not selected");
}
export const guideTitles = {
  "screw-spacing": "Measuring screw-hole spacing",
  "overall-size": "Measuring overall length and width",
  "roller-diameter": "Measuring roller diameter",
  "roller-housing": "Measuring roller housing dimensions",
  "window-balances": "Measuring window balances",
  "balance-fittings": "Identifying balance end fittings",
  "lock-backset": "Measuring lock backsets",
  orientation: "Identifying left/right orientation",
} as const;
