import type { StudentStep, StepId, StepStatus } from "../types/progress";
import { isDemoModeEnabled } from "../../../lib/demo-mode";
import { storageService } from "../../../core/services/storage-service";

const LOCAL_STORAGE_KEY = "student_ta_progress_v1";

const DEFAULT_STEPS: Omit<StudentStep, "isLocked">[] = [
  {
    id: "pendaftaran-ta",
    order: 1,
    label: "Pendaftaran TA",
    description: "Lengkapi semua persyaratan berkas administratif dan ajukan judul Tugas Akhir Anda.",
    status: "active",
  },
  {
    id: "bimbingan-pra-proposal",
    order: 2,
    label: "Bimbingan Pra Proposal",
    description: "Lakukan proses bimbingan dengan dosen pembimbing untuk menyusun draf proposal.",
    status: "pending",
  },
  {
    id: "sidang-proposal",
    order: 3,
    label: "Sidang Proposal",
    description: "Presentasikan draf proposal Anda di depan dewan penguji.",
    status: "pending",
  },
  {
    id: "revisi-proposal",
    order: 4,
    label: "Revisi Proposal",
    description: "Perbaiki draf proposal berdasarkan catatan masukan dari dewan penguji sidang proposal.",
    status: "pending",
  },
  {
    id: "bimbingan-pra-sidang",
    order: 5,
    label: "Bimbingan Pra Sidang",
    description: "Lanjutkan bimbingan intensif untuk menyelesaikan seluruh naskah Tugas Akhir.",
    status: "pending",
  },
  {
    id: "sidang",
    order: 6,
    label: "Sidang",
    description: "Pertahankan hasil Tugas Akhir Anda di hadapan dewan penguji sidang akhir.",
    status: "pending",
  },
  {
    id: "revisi-sidang",
    order: 7,
    label: "Revisi Sidang",
    description: "Selesaikan perbaikan naskah final Tugas Akhir dan kumpulkan untuk finalisasi kelulusan.",
    status: "pending",
  },
];

export class ProgressService {
  /**
   * Mengambil semua steps dari storage mock atau menginisialisasi default jika belum ada.
   */
  getSteps(): StudentStep[] {
    const saved = storageService.get<Omit<StudentStep, "isLocked">[]>(LOCAL_STORAGE_KEY);
    let stepsData: Omit<StudentStep, "isLocked">[];

    if (saved) {
      stepsData = saved;
      // Migrasi/Reset jika ada format lama
      const hasOldFormat = stepsData.some(
        (step: any) => step.id === "persyaratan" || step.id === "pengajuan-judul"
      );
      if (hasOldFormat) {
        stepsData = DEFAULT_STEPS;
        this.saveSteps(stepsData);
      }
    } else {
      stepsData = DEFAULT_STEPS;
      this.saveSteps(stepsData);
    }

    return stepsData.map((step, index) => {
      const hasIncompletePreviousStep = stepsData
        .slice(0, index)
        .some((previousStep) => previousStep.status !== "completed");

      return {
        ...step,
        isLocked: isDemoModeEnabled ? false : hasIncompletePreviousStep,
      };
    });
  }

  /**
   * Menyimpan steps ke storage mock.
   */
  private saveSteps(steps: Omit<StudentStep, "isLocked">[]) {
    storageService.set(LOCAL_STORAGE_KEY, steps);
  }

  /**
   * Mengupdate status dari suatu step tertentu
   */
  updateStepStatus(stepId: StepId, status: StepStatus): StudentStep[] {
    const steps = this.getSteps();
    const targetIdx = steps.findIndex(s => s.id === stepId);
    
    if (targetIdx !== -1) {
      steps[targetIdx].status = status;
      
      // Auto-update step berikutnya jika step ini baru saja diselesaikan
      if (status === "completed" && targetIdx + 1 < steps.length) {
        // Jika step berikutnya masih pending, ubah jadi active
        if (steps[targetIdx + 1].status === "pending") {
          steps[targetIdx + 1].status = "active";
        }
      }
      
      // Auto-update step ini jika diubah menjadi active, pastikan yang sebelumnya sudah completed
      if (status === "active") {
        for (let i = 0; i < targetIdx; i++) {
          steps[i].status = "completed";
        }
      }
      
      // Bersihkan property isLocked sebelum disimpan
      const toSave = steps.map(({ isLocked, ...rest }) => rest);
      this.saveSteps(toSave);
    }

    return this.getSteps();
  }

  /**
   * Mereset progress ke state default untuk keperluan demo/testing
   */
  resetProgress(): StudentStep[] {
    storageService.remove(LOCAL_STORAGE_KEY);
    return this.getSteps();
  }
}
export const progressService = new ProgressService();
