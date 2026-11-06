import { ImageIcon } from "lucide-react";

export function PhotographySlot({
  description,
  className = "",
}: {
  description: string;
  className?: string;
}) {
  return (
    <div
      className={`photography-slot ${className}`}
      role="img"
      aria-label={`Temporary image slot: ${description}. Approved real photography pending.`}
    >
      <ImageIcon aria-hidden="true" size={28} strokeWidth={1.25} />
      <span>{description}</span>
      <small>Temporary image · approved photo pending</small>
    </div>
  );
}
