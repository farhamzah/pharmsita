import React from "react";
import { Check, Lock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StudentStep } from "../../types/progress";

interface InteractiveStepperProps {
  steps: StudentStep[];
  activeStepId: string;
  onStepClick: (step: StudentStep) => void;
}

export const InteractiveStepper: React.FC<InteractiveStepperProps> = ({
  steps,
  activeStepId,
  onStepClick,
}) => {
  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 px-1">
        Tahapan Tugas Akhir
      </div>
      
      <div className="flex flex-col gap-2">
        {steps.map((step) => {
          const isSelected = step.id === activeStepId;
          const isCompleted = step.status === "completed";
          const isActive = step.status === "active";
          const isPending = step.status === "pending";
          const isLocked = step.isLocked;

          return (
            <button
              key={step.id}
              disabled={false} // Diperbolehkan klik untuk melihat, tapi kita tampilkan lock screen di detail jika terkunci
              onClick={() => onStepClick(step)}
              className={cn(
                "relative flex items-center justify-between text-left p-3.5 rounded-xl border transition-all duration-300 w-full group",
                // Background & border state
                isSelected
                  ? "bg-card border-primary/45 shadow-sm ring-1 ring-primary/10"
                  : "bg-card/50 border-border/80 hover:bg-card hover:border-border hover:shadow-2xs",
                isLocked && "opacity-85"
              )}
            >
              {/* Left Color Indicator Bar */}
              <div
                className={cn(
                  "absolute left-0 top-3 bottom-3 w-1 rounded-r-md transition-all duration-300",
                  isSelected ? "h-6" : "h-3 opacity-0 group-hover:opacity-100",
                  isCompleted && "bg-emerald-500",
                  isActive && "bg-amber-500",
                  isPending && "bg-slate-350"
                )}
              />

              <div className="flex items-center gap-3 pl-1.5 min-w-0">
                {/* Step Circle Status Icon */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold transition-all duration-300 shrink-0",
                    isCompleted && "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:bg-emerald-950/30",
                    isActive && "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:bg-amber-950/30 ring-4 ring-amber-100/30 dark:ring-amber-950/15",
                    isPending && "bg-slate-500/5 border-slate-200 text-slate-400 dark:bg-slate-800/40 dark:border-slate-700"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : isLocked ? (
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    step.order
                  )}
                </div>

                {/* Step Text Info */}
                <div className="flex flex-col min-w-0">
                  <span
                    className={cn(
                      "text-xs font-semibold truncate transition-colors",
                      isSelected ? "text-foreground font-bold" : "text-foreground/80 group-hover:text-foreground",
                      isActive && "text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {step.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate max-w-[180px] sm:max-w-none">
                    Langkah ke-{step.order}
                  </span>
                </div>
              </div>

              {/* Right Side Status Badge & Chevron */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Status Badge */}
                <span
                  className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full border shadow-2xs select-none shrink-0 capitalize",
                    isCompleted && "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/20",
                    isActive && "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 dark:bg-amber-950/20",
                    isPending && "bg-slate-500/10 border-slate-500/20 text-slate-550 dark:text-slate-400 dark:bg-slate-900/40"
                  )}
                >
                  {isCompleted ? "Selesai" : isActive ? "Aktif" : isLocked ? "Terkunci" : "Antrean"}
                </span>

                <ChevronRight
                  className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform duration-300",
                    isSelected ? "translate-x-0.5 text-foreground" : "opacity-0 group-hover:opacity-100"
                  )}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
