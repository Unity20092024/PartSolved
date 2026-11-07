import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import type { ReactNode } from "react";
export function WorkflowShell({
  title,
  description,
  step,
  completedSteps,
  optionalPhoto = false,
  back,
  onBack,
  children,
}: {
  title: string;
  description: string;
  step?: number;
  completedSteps?: number[];
  optionalPhoto?: boolean;
  back: string;
  onBack?: () => void;
  children: ReactNode;
}) {
  const steps = [
    { label: "Photo", href: "/find-part/preview" },
    { label: "Details", href: "/find-part/details" },
    { label: "Review", href: "/find-part/review" },
  ];
  return (
    <main id="main-content" className="workflow-page">
      <div className="workflow-top">
        {onBack ? (
          <button
            type="button"
            className="back-link text-button"
            onClick={onBack}
          >
            <ArrowLeft size={20} aria-hidden="true" />
            Back
          </button>
        ) : (
          <Link href={back} className="back-link">
            <ArrowLeft size={20} aria-hidden="true" />
            Back
          </Link>
        )}
        {step !== undefined && (
          <nav aria-label="Identification progress">
            <ol className="workflow-progress">
              {steps.map((item, index) => (
                <li
                  key={item.label}
                  aria-current={index === step ? "step" : undefined}
                  className={
                    index === step ||
                    (completedSteps?.includes(index) ?? index < step)
                      ? "reached"
                      : ""
                  }
                >
                  {index < step ? (
                    <Link href={item.href}>
                      <span>
                        {(completedSteps?.includes(index) ?? true) ? (
                          <Check size={16} aria-hidden="true" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      {item.label}
                      <span className="sr-only">
                        {(completedSteps?.includes(index) ?? true)
                          ? " completed, edit"
                          : index === 0 && optionalPhoto
                            ? " optional, not added"
                            : " not completed, edit"}
                      </span>
                    </Link>
                  ) : (
                    <div>
                      <span>{index + 1}</span>
                      {item.label}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
      </div>
      <h1>{title}</h1>
      <p className="workflow-description">{description}</p>
      {children}
      <p className="workflow-privacy">
        Your photo and answers stay in this tab’s memory. Refreshing or closing
        the tab clears this workflow. Nothing is uploaded or submitted for
        matching.
      </p>
    </main>
  );
}
