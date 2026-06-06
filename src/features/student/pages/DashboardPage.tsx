import React, { useState, useEffect } from "react";
import MainLayout from "../../../layouts/MainLayout";
import ContentWrapper from "../../../components/ContentWrapper";
import { InteractiveStepper } from "../components/dashboard/InteractiveStepper";
import { progressApi } from "../../../core/api/domain";
import type { StudentStep, StepId } from "../types/progress";

// Section imports
import { BimbinganWorkflow } from "../components/dashboard/BimbinganWorkflow";
import { SidangWorkflow } from "../components/dashboard/SidangWorkflow";
import { RevisiWorkflow } from "../components/dashboard/RevisiWorkflow";
import { PendaftaranTACombined } from "../components/dashboard/PendaftaranTACombined";

import { Lock, RefreshCw, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { isDemoModeEnabled } from "@/lib/demo-mode";

const DashboardPage: React.FC = () => {
  const [steps, setSteps] = useState<StudentStep[]>([]);
  const [activeStepId, setActiveStepId] = useState<StepId>("pendaftaran-ta");

  const applyLoadedSteps = (loaded: StudentStep[]) => {
    setSteps(loaded);

    // Default active step to the first non-completed / active step if possible
    const activeStep = loaded.find(s => s.status === "active");
    if (activeStep) {
      setActiveStepId(activeStep.id);
    } else {
      setActiveStepId("pendaftaran-ta");
    }
  };

  const refreshProgress = async () => {
    const response = await progressApi.getSteps();
    setSteps(response.data);
    return response.data;
  };

  // Load steps on mount
  useEffect(() => {
    progressApi.getSteps().then((response) => {
      applyLoadedSteps(response.data);
    });
  }, []);

  const handleStepClick = (step: StudentStep) => {
    setActiveStepId(step.id);
  };

  const handleCompleteCurrentStep = async (stepId: StepId) => {
    const response = await progressApi.updateStepStatus(stepId, "completed");
    const updated = response.data;
    setSteps(updated);
    
    // Automatically select the next active/available step
    const targetIdx = updated.findIndex(s => s.id === stepId);
    if (targetIdx !== -1 && targetIdx + 1 < updated.length) {
      setActiveStepId(updated[targetIdx + 1].id);
    }
  };

  const handleSetStepActive = async (stepId: StepId) => {
    const response = await progressApi.updateStepStatus(stepId, "active");
    setSteps(response.data);
  };

  const handleResetProgress = async () => {
    const response = await progressApi.resetProgress();
    applyLoadedSteps(response.data);
  };

  const currentStep = steps.find(s => s.id === activeStepId);

  // Helper render content detail
  const renderStepContent = (step: StudentStep) => {
    if (step.isLocked) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-muted/20 border border-dashed rounded-2xl text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 text-slate-400">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">Langkah Ini Terkunci</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            Anda belum menyelesaikan langkah-langkah sebelumnya. Silakan selesaikan tahapan sebelum <strong>{step.label}</strong> terlebih dahulu.
          </p>
          {isDemoModeEnabled && (
            <button
              onClick={() => {
                handleSetStepActive(step.id);
              }}
              className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Buka Kunci Paksa (Demo/Mock)
            </button>
          )}
        </div>
      );
    }

    switch (step.id) {
      case "pendaftaran-ta":
        return (
          <div className="space-y-6">
            <PendaftaranTACombined />
          </div>
        );
        
      case "bimbingan-pra-proposal":
        return (
          <BimbinganWorkflow
            stageId={step.id}
            role="mahasiswa"
            onStatusChange={() => {
              void refreshProgress();
            }}
          />
        );
        
      case "sidang-proposal":
        return (
          <SidangWorkflow
            stageId={step.id}
            role="mahasiswa"
            onStatusChange={() => {
              void refreshProgress();
            }}
          />
        );
        
      case "revisi-proposal":
        return (
          <RevisiWorkflow
            stageId={step.id}
            role="mahasiswa"
            onStatusChange={() => {
              void refreshProgress();
            }}
          />
        );
        
      case "bimbingan-pra-sidang":
        return (
          <BimbinganWorkflow
            stageId={step.id}
            role="mahasiswa"
            onStatusChange={() => {
              void refreshProgress();
            }}
          />
        );
        
      case "sidang":
        return (
          <SidangWorkflow
            stageId={step.id}
            role="mahasiswa"
            onStatusChange={() => {
              void refreshProgress();
            }}
          />
        );
        
      case "revisi-sidang":
        return (
          <RevisiWorkflow
            stageId={step.id}
            role="mahasiswa"
            onStatusChange={() => {
              void refreshProgress();
            }}
          />
        );
        
      default:
        return <div className="p-4 text-center text-muted-foreground">Pilih langkah di sebelah kiri untuk melihat detail.</div>;
    }
  };

  return (
    <MainLayout>
      <ContentWrapper
        title="Proses Tugas Akhir Mahasiswa"
        description="Pantau progres dan kelola seluruh berkas serta tahapan Tugas Akhir Anda di sini"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: STEPPER NAVIGATION */}
          <div className="lg:col-span-4 bg-card p-5 rounded-2xl border border-border/85 shadow-xs">
            <InteractiveStepper
              steps={steps}
              activeStepId={activeStepId}
              onStepClick={handleStepClick}
            />
            
            {isDemoModeEnabled && (
              <div className="mt-6 pt-4 border-t border-border/40 flex flex-col gap-2">
                <button
                  onClick={handleResetProgress}
                  className="px-4 py-2 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50/40 dark:hover:bg-red-950/20 text-xs font-medium rounded-xl transition inline-flex items-center justify-center gap-1.5 cursor-pointer w-full"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reset Progres Simulasi
                </button>
              </div>
            )}
          </div>

          {/* RIGHT: DETAIL TAHAPAN */}
          <div className="lg:col-span-8 flex flex-col gap-5">
            {currentStep && (
              <div className="bg-card rounded-2xl border border-border/85 shadow-xs p-5">
                {/* Step Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4 mb-5">
                  <div>
                    <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                      <span className="text-primary font-mono font-bold">#{currentStep.order}</span>
                      {currentStep.label}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      {currentStep.description}
                    </p>
                  </div>
                  
                  {/* Status Badge */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs select-none shrink-0 capitalize",
                        currentStep.status === "completed" && "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/20",
                        currentStep.status === "active" && "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 dark:bg-amber-950/20",
                        currentStep.status === "pending" && "bg-slate-500/10 border-slate-500/20 text-slate-550 dark:text-slate-400 dark:bg-slate-900/40"
                      )}
                    >
                      {currentStep.status === "completed" ? "Selesai" : currentStep.status === "active" ? "Sedang Diproses" : "Belum Mulai"}
                    </span>
                  </div>
                </div>

                {/* Step Body */}
                <div className="min-h-[200px]">
                  {renderStepContent(currentStep)}
                </div>

                {/* Step Actions (Simulate completion) */}
                {currentStep.status !== "completed" && !currentStep.isLocked && (
                  <div className="mt-8 pt-6 border-t border-border/40 flex justify-end">
                    <button
                      onClick={() => handleCompleteCurrentStep(currentStep.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Selesaikan Tahap Ini <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </ContentWrapper>
    </MainLayout>
  );
};

export default DashboardPage;
