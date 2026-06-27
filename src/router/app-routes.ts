import React from "react";
import { registerRoute } from "./Router";
import { LoginPage } from "../features/auth/pages/LoginPage";

const lazyRoute = (
  loader: () => Promise<{ default: React.ComponentType }>,
) => React.lazy(loader);

const DashboardPage = lazyRoute(() => import("../features/student/pages/DashboardPage"));
const DetailProfilPage = lazyRoute(() => import("../features/student/pages/ProfileDetailPage"));
const SeminarProposalPage = lazyRoute(() => import("../features/student/pages/ProposalSeminarPage"));
const SidangAkhirPage = lazyRoute(() => import("../features/student/pages/FinalDefensePage"));
const RevisiFinalisasiPage = lazyRoute(() => import("../features/student/pages/FinalizationRevisionPage"));
const FormulirPendaftaranPage = lazyRoute(() => import("../features/thesis-form/pages/RegistrationFormPage"));
const FormulirRevisiSkripsiPage = lazyRoute(() => import("../features/thesis-form/pages/ThesisRevisionFormPage"));
const FormulirRevisiNonSkripsiPage = lazyRoute(() => import("../features/thesis-form/pages/NonThesisRevisionFormPage"));
const FormulirPersonalPage = lazyRoute(() => import("../features/thesis-form/pages/PersonalFormPage"));
const SyaratDanKetentuanPage = lazyRoute(() => import("../features/student/pages/TermsAndConditionsPage"));

registerRoute("mahasiswa", DashboardPage, ["mahasiswa"]);
registerRoute("mahasiswa/detail-profil", DetailProfilPage, ["mahasiswa"]);
registerRoute("mahasiswa/syarat-ketentuan", SyaratDanKetentuanPage, ["mahasiswa"]);
registerRoute("mahasiswa/seminar-proposal", SeminarProposalPage, ["mahasiswa"]);
registerRoute("mahasiswa/sidang-akhir", SidangAkhirPage, ["mahasiswa"]);
registerRoute("mahasiswa/revisi-finalisasi", RevisiFinalisasiPage, ["mahasiswa"]);
registerRoute("mahasiswa/pendaftaran/tugas-akhir", FormulirPendaftaranPage, ["mahasiswa"]);
registerRoute("mahasiswa/pendaftaran/skripsi", FormulirRevisiSkripsiPage, ["mahasiswa"]);
registerRoute("mahasiswa/pendaftaran/non-skripsi", FormulirRevisiNonSkripsiPage, ["mahasiswa"]);
registerRoute("mahasiswa/pendaftaran/personal", FormulirPersonalPage, ["mahasiswa"]);

registerRoute("login", LoginPage);

const LecturerDashboardPage = lazyRoute(() => import("../features/lecturer/pages/LecturerDashboardPage"));
const LecturerStudentListPage = lazyRoute(() => import("../features/lecturer/pages/LecturerStudentListPage"));
const LecturerProposalSeminarPage = lazyRoute(() => import("../features/lecturer/pages/LecturerProposalSeminarPage"));
const LecturerFinalDefensePage = lazyRoute(() => import("../features/lecturer/pages/LecturerFinalDefensePage"));
const LecturerRevisionFinalizationPage = lazyRoute(() => import("../features/lecturer/pages/LecturerRevisionFinalizationPage"));
const LecturerSchedulePage = lazyRoute(() => import("../features/lecturer/pages/LecturerSchedulePage"));
const LecturerAssessmentPage = lazyRoute(() => import("../features/lecturer/pages/LecturerAssessmentPage"));
const LecturerDocumentPage = lazyRoute(() => import("../features/lecturer/pages/LecturerDocumentPage"));
const LecturerMonitoringPage = lazyRoute(() => import("../features/lecturer/pages/LecturerMonitoringPage"));
const LecturerProfilePage = lazyRoute(() => import("../features/lecturer/pages/LecturerProfilePage"));
const LecturerRevisionGuidancePage = lazyRoute(() => import("../features/lecturer/pages/LecturerRevisionGuidancePage"));

registerRoute("dosen", LecturerDashboardPage, ["dosen"]);
registerRoute("dosen/mahasiswa-bimbingan", LecturerStudentListPage, ["dosen"]);
registerRoute("dosen/mahasiswa-bimbingan/detail/:id", LecturerProposalSeminarPage, ["dosen"]);
registerRoute("dosen/mahasiswa-bimbingan/sidang-akhir/:id", LecturerFinalDefensePage, ["dosen"]);
registerRoute("dosen/mahasiswa-bimbingan/revisi/:id", LecturerRevisionFinalizationPage, ["dosen"]);
registerRoute("dosen/bimbingan-revisi", LecturerRevisionGuidancePage, ["dosen"]);
registerRoute("dosen/jadwal", LecturerSchedulePage, ["dosen"]);
registerRoute("dosen/penilaian", LecturerAssessmentPage, ["dosen"]);
registerRoute("dosen/dokumen", LecturerDocumentPage, ["dosen"]);
registerRoute("dosen/monitoring", LecturerMonitoringPage, ["dosen"]);
registerRoute("dosen/profil", LecturerProfilePage, ["dosen"]);

const CoordinatorDashboardPage = lazyRoute(() => import("../features/coordinator/pages/CoordinatorDashboardPage"));
const CoordinatorSubmissionPage = lazyRoute(() => import("../features/coordinator/pages/CoordinatorSubmissionPage"));
const CoordinatorSubmissionDetailPage = lazyRoute(() => import("../features/coordinator/pages/CoordinatorSubmissionDetailPage"));
const CoordinatorMonitoringPage = lazyRoute(() => import("../features/coordinator/pages/CoordinatorMonitoringPage"));
const CoordinatorStudentDetailPage = lazyRoute(() => import("../features/coordinator/pages/CoordinatorStudentDetailPage"));
const CoordinatorSupervisorQuotaPage = lazyRoute(() => import("../features/coordinator/pages/CoordinatorSupervisorQuotaPage"));
const CoordinatorAcademicStagePage = lazyRoute(() => import("../features/coordinator/pages/CoordinatorAcademicStagePage"));
const CoordinatorSchedulingPage = lazyRoute(() => import("../features/coordinator/pages/CoordinatorSchedulingPage"));
const CoordinatorNotificationPage = lazyRoute(() => import("../features/coordinator/pages/CoordinatorNotificationPage"));
const CoordinatorProfilePage = lazyRoute(() => import("../features/coordinator/pages/CoordinatorProfilePage"));
const CoordinatorRequirementValidationPage = lazyRoute(() => import("../features/coordinator/pages/CoordinatorRequirementValidationPage"));
const CoordinatorStudentRequirementDetailPage = lazyRoute(() => import("../features/coordinator/pages/CoordinatorStudentRequirementDetailPage"));

registerRoute("kordinator", CoordinatorDashboardPage, ["kordinator"]);
registerRoute("kordinator/pengajuan", CoordinatorSubmissionPage, ["kordinator"]);
registerRoute("kordinator/pengajuan/detail/sub-1", CoordinatorSubmissionDetailPage, ["kordinator"]);
registerRoute("kordinator/pengajuan/detail/sub-2", CoordinatorSubmissionDetailPage, ["kordinator"]);
registerRoute("kordinator/pengajuan/detail/sub-3", CoordinatorSubmissionDetailPage, ["kordinator"]);
registerRoute("kordinator/pengajuan/detail/sub-4", CoordinatorSubmissionDetailPage, ["kordinator"]);
registerRoute("kordinator/pengajuan/detail/:id", CoordinatorSubmissionDetailPage, ["kordinator"]);
registerRoute("kordinator/monitoring", CoordinatorMonitoringPage, ["kordinator"]);
registerRoute("kordinator/monitoring/detail/1", CoordinatorStudentDetailPage, ["kordinator"]);
registerRoute("kordinator/monitoring/detail/2", CoordinatorStudentDetailPage, ["kordinator"]);
registerRoute("kordinator/monitoring/detail/3", CoordinatorStudentDetailPage, ["kordinator"]);
registerRoute("kordinator/monitoring/detail/4", CoordinatorStudentDetailPage, ["kordinator"]);
registerRoute("kordinator/monitoring/detail/5", CoordinatorStudentDetailPage, ["kordinator"]);
registerRoute("kordinator/monitoring/detail/:id", CoordinatorStudentDetailPage, ["kordinator"]);
registerRoute("kordinator/validasi-persyaratan", CoordinatorRequirementValidationPage, ["kordinator"]);
registerRoute("kordinator/validasi-persyaratan/detail/s_prof_1", CoordinatorStudentRequirementDetailPage, ["kordinator"]);
registerRoute("kordinator/validasi-persyaratan/detail/s_prof_2", CoordinatorStudentRequirementDetailPage, ["kordinator"]);
registerRoute("kordinator/validasi-persyaratan/detail/s_prof_3", CoordinatorStudentRequirementDetailPage, ["kordinator"]);
registerRoute("kordinator/validasi-persyaratan/detail/s_prof_4", CoordinatorStudentRequirementDetailPage, ["kordinator"]);
registerRoute("kordinator/validasi-persyaratan/detail/s_prof_5", CoordinatorStudentRequirementDetailPage, ["kordinator"]);
registerRoute("kordinator/validasi-persyaratan/detail/:id", CoordinatorStudentRequirementDetailPage, ["kordinator"]);
registerRoute("kordinator/pembimbing-kuota", CoordinatorSupervisorQuotaPage, ["kordinator"]);
registerRoute("kordinator/tahapan-akademik", CoordinatorAcademicStagePage, ["kordinator"]);
registerRoute("kordinator/penjadwalan", CoordinatorSchedulingPage, ["kordinator"]);
registerRoute("kordinator/notifikasi", CoordinatorNotificationPage, ["kordinator"]);
registerRoute("kordinator/profil", CoordinatorProfilePage, ["kordinator"]);

const AdminDashboardPage = lazyRoute(() => import("../features/admin/pages/AdminDashboardPage"));
const AdminUserManagementPage = lazyRoute(() => import("../features/admin/pages/AdminUserManagementPage"));
const AdminMasterDataPage = lazyRoute(() => import("../features/admin/pages/AdminMasterDataPage"));
const AdminTermsPage = lazyRoute(() => import("../features/admin/pages/AdminTermsPage"));
const AdminInformationPage = lazyRoute(() => import("../features/admin/pages/AdminInformationPage"));
const AdminDocumentPage = lazyRoute(() => import("../features/admin/pages/AdminDocumentPage"));
const AdminSystemSettingsPage = lazyRoute(() => import("../features/admin/pages/AdminSystemSettingsPage"));
const AdminMonitoringPage = lazyRoute(() => import("../features/admin/pages/AdminMonitoringPage"));
const AdminProfilePage = lazyRoute(() => import("../features/admin/pages/AdminProfilePage"));

registerRoute("admin", AdminDashboardPage, ["admin"]);
registerRoute("admin/user", AdminUserManagementPage, ["admin"]);
registerRoute("admin/master", AdminMasterDataPage, ["admin"]);
registerRoute("admin/syarat", AdminTermsPage, ["admin"]);
registerRoute("admin/informasi", AdminInformationPage, ["admin"]);
registerRoute("admin/dokumen", AdminDocumentPage, ["admin"]);
registerRoute("admin/pengaturan", AdminSystemSettingsPage, ["admin"]);
registerRoute("admin/monitoring", AdminMonitoringPage, ["admin"]);
registerRoute("admin/profil", AdminProfilePage, ["admin"]);
registerRoute("admin/validasi-persyaratan", CoordinatorRequirementValidationPage, ["admin"]);
registerRoute("admin/validasi-persyaratan/detail/:id", CoordinatorStudentRequirementDetailPage, ["admin"]);
registerRoute("admin/pengajuan", CoordinatorSubmissionPage, ["admin"]);
registerRoute("admin/pengajuan/detail/:id", CoordinatorSubmissionDetailPage, ["admin"]);
registerRoute("admin/tahapan-akademik", CoordinatorAcademicStagePage, ["admin"]);
registerRoute("admin/penjadwalan", CoordinatorSchedulingPage, ["admin"]);
registerRoute("admin/pembimbing-kuota", CoordinatorSupervisorQuotaPage, ["admin"]);
