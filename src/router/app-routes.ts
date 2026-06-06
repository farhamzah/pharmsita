import { registerRoute } from "./Router";
import { LoginPage } from "../features/auth/pages/LoginPage";

import DashboardPage from "../features/student/pages/DashboardPage";

import DetailProfilPage from "../features/student/pages/ProfileDetailPage";
import SeminarProposalPage from "../features/student/pages/ProposalSeminarPage";
import SidangAkhirPage from "../features/student/pages/FinalDefensePage";
import RevisiFinalisasiPage from "../features/student/pages/FinalizationRevisionPage";
import FormulirPendaftaranPage from "../features/thesis-form/pages/RegistrationFormPage";
import FormulirRevisiSkripsiPage from "../features/thesis-form/pages/ThesisRevisionFormPage";
import FormulirRevisiNonSkripsiPage from "../features/thesis-form/pages/NonThesisRevisionFormPage";
import FormulirPersonalPage from "../features/thesis-form/pages/PersonalFormPage";
import SyaratDanKetentuanPage from "../features/student/pages/TermsAndConditionsPage";

// Mahasiswa
registerRoute('mahasiswa', DashboardPage, ['mahasiswa']);
registerRoute('mahasiswa/detail-profil', DetailProfilPage, ['mahasiswa']);
registerRoute('mahasiswa/syarat-ketentuan', SyaratDanKetentuanPage, [
  'mahasiswa',
]);
registerRoute('mahasiswa/seminar-proposal', SeminarProposalPage, ['mahasiswa']);
registerRoute('mahasiswa/sidang-akhir', SidangAkhirPage, ['mahasiswa']);
registerRoute('mahasiswa/revisi-finalisasi', RevisiFinalisasiPage, [
  'mahasiswa',
]);

registerRoute('mahasiswa/pendaftaran/tugas-akhir', FormulirPendaftaranPage, [
  'mahasiswa',
]);
registerRoute('mahasiswa/pendaftaran/skripsi', FormulirRevisiSkripsiPage, [
  'mahasiswa',
]);
registerRoute(
  'mahasiswa/pendaftaran/non-skripsi',
  FormulirRevisiNonSkripsiPage,
  ['mahasiswa'],
);
registerRoute('mahasiswa/pendaftaran/personal', FormulirPersonalPage, [
  'mahasiswa',
]);

// login
registerRoute('login', LoginPage);

// Dosen
import LecturerDashboardPage from '../features/lecturer/pages/LecturerDashboardPage';
import LecturerStudentListPage from '../features/lecturer/pages/LecturerStudentListPage';
import LecturerProposalSeminarPage from '../features/lecturer/pages/LecturerProposalSeminarPage';
import LecturerFinalDefensePage from '../features/lecturer/pages/LecturerFinalDefensePage';
import LecturerRevisionFinalizationPage from '../features/lecturer/pages/LecturerRevisionFinalizationPage';
import LecturerSchedulePage from '../features/lecturer/pages/LecturerSchedulePage';
import LecturerAssessmentPage from '../features/lecturer/pages/LecturerAssessmentPage';
import LecturerDocumentPage from '../features/lecturer/pages/LecturerDocumentPage';
import LecturerMonitoringPage from '../features/lecturer/pages/LecturerMonitoringPage';
import LecturerProfilePage from '../features/lecturer/pages/LecturerProfilePage';
import LecturerRevisionGuidancePage from '../features/lecturer/pages/LecturerRevisionGuidancePage';

registerRoute('dosen', LecturerDashboardPage, ['dosen']);
registerRoute('dosen/mahasiswa-bimbingan', LecturerStudentListPage, ['dosen']);
registerRoute('dosen/mahasiswa-bimbingan/detail/:id', LecturerProposalSeminarPage, ['dosen']);
registerRoute('dosen/mahasiswa-bimbingan/sidang-akhir/:id', LecturerFinalDefensePage, ['dosen']);
registerRoute('dosen/mahasiswa-bimbingan/revisi/:id', LecturerRevisionFinalizationPage, ['dosen']);
registerRoute('dosen/bimbingan-revisi', LecturerRevisionGuidancePage, ['dosen']);
registerRoute('dosen/jadwal', LecturerSchedulePage, ['dosen']);
registerRoute('dosen/penilaian', LecturerAssessmentPage, ['dosen']);
registerRoute('dosen/dokumen', LecturerDocumentPage, ['dosen']);
registerRoute('dosen/monitoring', LecturerMonitoringPage, ['dosen']);
registerRoute('dosen/profil', LecturerProfilePage, ['dosen']);

// Koordinator
import CoordinatorDashboardPage from '../features/coordinator/pages/CoordinatorDashboardPage';
import CoordinatorSubmissionPage from '../features/coordinator/pages/CoordinatorSubmissionPage';
import CoordinatorSubmissionDetailPage from '../features/coordinator/pages/CoordinatorSubmissionDetailPage';
import CoordinatorMonitoringPage from '../features/coordinator/pages/CoordinatorMonitoringPage';
import CoordinatorStudentDetailPage from '../features/coordinator/pages/CoordinatorStudentDetailPage';
import CoordinatorSupervisorQuotaPage from '../features/coordinator/pages/CoordinatorSupervisorQuotaPage';
import CoordinatorAcademicStagePage from '../features/coordinator/pages/CoordinatorAcademicStagePage';
import CoordinatorSchedulingPage from '../features/coordinator/pages/CoordinatorSchedulingPage';
import CoordinatorNotificationPage from '../features/coordinator/pages/CoordinatorNotificationPage';
import CoordinatorProfilePage from '../features/coordinator/pages/CoordinatorProfilePage';

registerRoute('kordinator', CoordinatorDashboardPage, ['kordinator']);
registerRoute('kordinator/pengajuan', CoordinatorSubmissionPage, ['kordinator']);
registerRoute('kordinator/pengajuan/detail/sub-1', CoordinatorSubmissionDetailPage, ['kordinator']);
registerRoute('kordinator/pengajuan/detail/sub-2', CoordinatorSubmissionDetailPage, ['kordinator']);
registerRoute('kordinator/pengajuan/detail/sub-3', CoordinatorSubmissionDetailPage, ['kordinator']);
registerRoute('kordinator/pengajuan/detail/sub-4', CoordinatorSubmissionDetailPage, ['kordinator']);
registerRoute('kordinator/pengajuan/detail/:id', CoordinatorSubmissionDetailPage, ['kordinator']);

registerRoute('kordinator/monitoring', CoordinatorMonitoringPage, ['kordinator']);
registerRoute('kordinator/monitoring/detail/1', CoordinatorStudentDetailPage, ['kordinator']);
registerRoute('kordinator/monitoring/detail/2', CoordinatorStudentDetailPage, ['kordinator']);
registerRoute('kordinator/monitoring/detail/3', CoordinatorStudentDetailPage, ['kordinator']);
registerRoute('kordinator/monitoring/detail/4', CoordinatorStudentDetailPage, ['kordinator']);
registerRoute('kordinator/monitoring/detail/5', CoordinatorStudentDetailPage, ['kordinator']);
registerRoute('kordinator/monitoring/detail/:id', CoordinatorStudentDetailPage, ['kordinator']);

// Validasi Persyaratan Mahasiswa
import CoordinatorRequirementValidationPage from '../features/coordinator/pages/CoordinatorRequirementValidationPage';
import CoordinatorStudentRequirementDetailPage from '../features/coordinator/pages/CoordinatorStudentRequirementDetailPage';

registerRoute('kordinator/validasi-persyaratan', CoordinatorRequirementValidationPage, ['kordinator']);
registerRoute('kordinator/validasi-persyaratan/detail/s_prof_1', CoordinatorStudentRequirementDetailPage, ['kordinator']);
registerRoute('kordinator/validasi-persyaratan/detail/s_prof_2', CoordinatorStudentRequirementDetailPage, ['kordinator']);
registerRoute('kordinator/validasi-persyaratan/detail/s_prof_3', CoordinatorStudentRequirementDetailPage, ['kordinator']);
registerRoute('kordinator/validasi-persyaratan/detail/s_prof_4', CoordinatorStudentRequirementDetailPage, ['kordinator']);
registerRoute('kordinator/validasi-persyaratan/detail/s_prof_5', CoordinatorStudentRequirementDetailPage, ['kordinator']);
registerRoute('kordinator/validasi-persyaratan/detail/:id', CoordinatorStudentRequirementDetailPage, ['kordinator']);

registerRoute('kordinator/pembimbing-kuota', CoordinatorSupervisorQuotaPage, ['kordinator']);

// Kordinator Lainnya
registerRoute('kordinator/tahapan-akademik', CoordinatorAcademicStagePage, ['kordinator']);
registerRoute('kordinator/penjadwalan', CoordinatorSchedulingPage, ['kordinator']);
registerRoute('kordinator/notifikasi', CoordinatorNotificationPage, ['kordinator']);
registerRoute('kordinator/profil', CoordinatorProfilePage, ['kordinator']);

// Admin
import AdminDashboardPage from '../features/admin/pages/AdminDashboardPage';
import AdminUserManagementPage from '../features/admin/pages/AdminUserManagementPage';
import AdminMasterDataPage from '../features/admin/pages/AdminMasterDataPage';
import AdminTermsPage from '../features/admin/pages/AdminTermsPage';
import AdminInformationPage from '../features/admin/pages/AdminInformationPage';
import AdminDocumentPage from '../features/admin/pages/AdminDocumentPage';
import AdminSystemSettingsPage from '../features/admin/pages/AdminSystemSettingsPage';
import AdminMonitoringPage from '../features/admin/pages/AdminMonitoringPage';
import AdminProfilePage from '../features/admin/pages/AdminProfilePage';

registerRoute('admin', AdminDashboardPage, ['admin']);
registerRoute('admin/user', AdminUserManagementPage, ['admin']);
registerRoute('admin/master', AdminMasterDataPage, ['admin']);
registerRoute('admin/syarat', AdminTermsPage, ['admin']);
registerRoute('admin/informasi', AdminInformationPage, ['admin']);
registerRoute('admin/dokumen', AdminDocumentPage, ['admin']);
registerRoute('admin/pengaturan', AdminSystemSettingsPage, ['admin']);
registerRoute('admin/monitoring', AdminMonitoringPage, ['admin']);
registerRoute('admin/profil', AdminProfilePage, ['admin']);

// Admin — Reuse Coordinator Pages (Menu Akademik)
registerRoute('admin/validasi-persyaratan', CoordinatorRequirementValidationPage, ['admin']);
registerRoute('admin/validasi-persyaratan/detail/:id', CoordinatorStudentRequirementDetailPage, ['admin']);
registerRoute('admin/pengajuan', CoordinatorSubmissionPage, ['admin']);
registerRoute('admin/pengajuan/detail/:id', CoordinatorSubmissionDetailPage, ['admin']);
registerRoute('admin/tahapan-akademik', CoordinatorAcademicStagePage, ['admin']);
registerRoute('admin/penjadwalan', CoordinatorSchedulingPage, ['admin']);
registerRoute('admin/pembimbing-kuota', CoordinatorSupervisorQuotaPage, ['admin']);
