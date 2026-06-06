import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepStatus = "completed" | 'active' | 'pending';

export interface Step {
  title: string;
  status: StepStatus;
}

interface StepperProps {
  steps: Step[];
}

export function Stepper({ steps }: StepperProps) {
  const activeIndex = steps.findIndex((s) => s.status === "active");

  return (
    <div className="w-full">
      {/* DESKTOP HORIZONTAL */}
      <div className="hidden md:flex items-start w-full">
        {steps.map((step, index) => {
          const completed = step.status === 'completed';
          const active = step.status === 'active';
          // const isPassed = index <= activeIndex;

          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              {/* CIRCLE + LINE */}
              <div className="flex items-center w-full">
                {/* CIRCLE */}
                <div
                  className={cn(
                    'w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 shrink-0 bg-background',
                    completed &&
                      'bg-primary border-primary text-primary-foreground',
                    active &&
                      'border-primary text-primary ring-4 ring-primary/20',
                    step.status === 'pending' &&
                      'border-muted text-muted-foreground',
                  )}
                >
                  {completed ? <Check className="w-4 h-4" /> : index + 1}
                </div>

                {/* LINE */}
                {index !== steps.length - 1 && (
                  <div className="flex-1 h-0.5 mx-2 bg-gray-300 relative overflow-hidden">
                    <div
                      className="absolute left-0 top-0 h-full bg-primary transition-all duration-500"
                      style={{
                        width:
                          index < activeIndex
                            ? '100%'
                            : index === activeIndex
                              ? '50%'
                              : '0%',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* TEXT */}
              <div className="mt-4 text-center ">
                <p
                  className={cn(
                    'text-sm font-medium transition-colors',
                    completed || active
                      ? 'text-foreground'
                      : 'text-muted-foreground',
                  )}
                >
                  {step.title}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* MOBILE VERTICAL */}
      <div className="md:hidden flex flex-col">
        {steps.map((step, index) => {
          const completed = step.status === 'completed';
          const active = step.status === 'active';
          const isPassed = index <= activeIndex;

          return (
            <div key={index} className="flex items-start relative pb-8">
              {/* VERTICAL LINE */}
              {index !== steps.length - 1 && (
                <div className="absolute left-5 top-10 w-0.5 h-full bg-gray-300">
                  <div
                    className={cn(
                      'bg-primary transition-all duration-500',
                      isPassed ? 'h-full w-full' : 'h-0 w-full',
                    )}
                  />
                </div>
              )}

              {/* CIRCLE */}
              <div
                className={cn(
                  'w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 shrink-0 z-10 bg-background',
                  completed &&
                    'bg-primary border-primary text-primary-foreground',
                  active &&
                    'border-primary text-primary ring-4 ring-primary/20',
                  step.status === 'pending' &&
                    'border-muted text-muted-foreground',
                )}
              >
                {completed ? <Check className="w-4 h-4" /> : index + 1}
              </div>

              {/* TEXT */}
              <div className="ml-4 mt-1 min-h-8 flex items-center justify-center">
                <p
                  className={cn(
                    'text-sm font-medium',
                    completed || active
                      ? 'text-foreground'
                      : 'text-muted-foreground',
                  )}
                >
                  {step.title}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
