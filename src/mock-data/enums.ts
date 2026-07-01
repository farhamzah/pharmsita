// enums.ts
export const AcademicStage = {
  PENGAJUAN: 'Pengajuan TA',
  BIMBINGAN: 'Bimbingan',
  SEMINAR_PROPOSAL: 'Seminar Proposal',
  SIDANG_AKHIR: 'Sidang Akhir',
  REVISI_FINALISASI: 'Revisi & Finalisasi',
  SELESAI: 'Selesai',
} as const;

export type AcademicStageType = typeof AcademicStage[keyof typeof AcademicStage];

export const Roles = {
  ADMIN: 'Admin',
  COORDINATOR: 'Koordinator',
  HEAD_OF_PROGRAM: 'Kaprodi',
  DEAN: 'Dekan',
  LECTURER: 'Dosen',
  STUDENT: 'Mahasiswa',
} as const;

export const ThesisRole = {
  PEMBIMBING_1: 'Pembimbing 1',
  PEMBIMBING_2: 'Pembimbing 2',
  PENGUJI_1: 'Penguji 1',
  PENGUJI_2: 'Penguji 2',
  KETUA_SIDANG: 'Ketua Sidang',
} as const;

export type ThesisRoleType = typeof ThesisRole[keyof typeof ThesisRole];
