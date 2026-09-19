import { Check } from "lucide-react";

/**
 * Vertical timeline. `steps`: [{ name, date, description, state }]
 * where state is "done" | "current" | "upcoming".
 */
export default function Stepper({ steps }) {
  return (
    <ol>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        return (
          <li key={step.name} className="relative flex gap-4 pb-8 last:pb-0">
            {!isLast && (
              <span
                className={`absolute left-[15px] top-8 h-full w-0.5 ${
                  step.state === "done" ? "bg-forest" : "bg-slate-200"
                }`}
              />
            )}
            <span
              className={[
                "z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold",
                step.state === "done" && "border-forest bg-forest text-white",
                step.state === "current" && "border-gold bg-gold text-forest",
                step.state === "upcoming" && "border-slate-300 bg-white text-slate-300",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {step.state === "done" ? (
                <Check size={16} strokeWidth={3} />
              ) : step.state === "current" ? (
                <span className="h-2 w-2 rounded-full bg-forest" />
              ) : null}
            </span>
            <div className="pt-0.5">
              <p className="font-semibold text-slate-900">{step.name}</p>
              {step.date && <p className="text-xs text-slate-400">{step.date}</p>}
              {step.description && <p className="mt-1 text-sm text-slate-500">{step.description}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
