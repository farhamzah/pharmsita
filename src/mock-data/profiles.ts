import { mockAngkatan } from './academic-periods';
import { Roles, AcademicStage } from './enums';

export interface BaseProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  photo?: string;
  role: typeof Roles[keyof typeof Roles];
  status: 'Aktif' | 'Nonaktif' | 'Cuti' | 'Lulus';
  tanggalLahir?: string; // gunakan format ISO: YYYY-MM-DD
  alamat?: string;
  gender?: 'Laki-laki' | 'Perempuan';
}

export interface StudentProfile extends BaseProfile {
  nim: string;
  programStudi: string;
  angkatan: string;
  kelas?: string;
  skemaTA: 'Skripsi' | 'Non Skripsi';
  jenisTA?: string; // Penelitian, Studi Pustaka, MBKM, Publikasi Ilmiah, dll
  judulTA?: string;
  pembimbing1?: string;
  pembimbing2?: string;
  tahapanAktif: typeof AcademicStage[keyof typeof AcademicStage];
  statusPengajuan?: 'Belum Mengajukan' | 'Menunggu Validasi' | 'Disetujui' | 'Ditolak';
  linkBerkas?: string;
}

export interface LecturerProfile extends BaseProfile {
  nidn: string;
  programStudi: string;
  bidangKeahlian: string[];
  jabatanAkademik: string;
  kuotaPembimbing1: number;
  kuotaTerpakaiPembimbing1: number;
  kuotaTersediaPembimbing1: number;
  kuotaPembimbing2: number;
  kuotaTerpakaiPembimbing2: number;
  kuotaTersediaPembimbing2: number;
  peranSistem: ('Pembimbing' | 'Penguji' | 'Ketua Sidang')[];
}

export interface CoordinatorProfile extends BaseProfile {
  jabatan: string;
  programStudi: string;
  hakAksesUtama: string[];
}

export interface AdminProfile extends BaseProfile {
  divisi: string;
  tingkatAkses: 'Superadmin' | 'Admin Prodi';
  cakupanAkses?: string[];
}

// ==========================================
// MOCK DATA
// ==========================================

export const mockStudentProfiles: StudentProfile[] = [
  {
    id: 's_prof_1',
    name: 'Dimas Indra Jaya',
    email: 'dimas@student.pharmsita.ac.id',
    phone: '087737780221',
    photo: 'https://ui-avatars.com/api/?name=Dimas+Indra+Jaya&background=random',
    role: Roles.STUDENT,
    status: 'Aktif',
    tanggalLahir: '2002-10-05',
    alamat: 'Jl. Raya Puspiptek No. 45, Tangerang Selatan',
    gender: 'Laki-laki',
    nim: '221011400215',
    programStudi: 'S1 Farmasi',
    angkatan: mockAngkatan.find(a => a === '2022') || '2022',
    kelas: 'FA-22-01',
    skemaTA: 'Skripsi',
    jenisTA: 'Penelitian',
    judulTA: 'Formulasi dan Uji Stabilitas Sediaan Gel Ekstrak Daun Sirih',
    pembimbing1: 'Dr. Apt. Rina Marlina, M.Farm.',
    pembimbing2: 'Dr. Apt. Budi Santoso, M.Si.',
    tahapanAktif: AcademicStage.BIMBINGAN,
    statusPengajuan: 'Disetujui',
    linkBerkas: 'https://drive.google.com/file/d/mock-berkas-1/view'
  },
  {
    id: 's_prof_2',
    name: 'Aulia Rahma',
    email: 'aulia.rahma@student.pharmsita.ac.id',
    phone: '081298765432',
    photo: 'https://ui-avatars.com/api/?name=Aulia+Rahma&background=random',
    role: Roles.STUDENT,
    status: 'Aktif',
    tanggalLahir: '2001-07-11',
    alamat: 'Perumahan Serpong Indah Blok C3/12, Tangerang',
    gender: 'Perempuan',
    nim: '221011400216',
    programStudi: 'S1 Farmasi',
    angkatan: mockAngkatan.find(a => a === '2022') || '2022',
    kelas: 'FA-22-01',
    skemaTA: 'Non Skripsi',
    jenisTA: 'MBKM',
    judulTA: 'Analisis Implementasi MBKM pada Industri Farmasi',
    pembimbing1: 'Dr. Apt. Siti Nurhayati, M.Farm.',
    tahapanAktif: AcademicStage.SEMINAR_PROPOSAL,
    statusPengajuan: 'Menunggu Validasi',
    linkBerkas: 'https://drive.google.com/file/d/mock-berkas-2/view'
  }
];

export const mockLecturerProfiles: LecturerProfile[] = [
  {
    id: 'l_prof_1',
    name: 'Dr. Apt. Rina Marlina, M.Farm.',
    email: 'rina.marlina@pharmsita.ac.id',
    phone: '082121212121',
    photo: 'https://ui-avatars.com/api/?name=Rina+Marlina&background=random',
    role: Roles.LECTURER,
    status: 'Aktif',
    tanggalLahir: '1980-08-10',
    alamat: 'Komp. Dosen UNPAD Blok A No. 1, Bandung',
    gender: 'Perempuan',
    nidn: '0123456789',
    programStudi: 'S1 Farmasi',
    bidangKeahlian: ['Farmasetika', 'Teknologi Sediaan Farmasi'],
    jabatanAkademik: 'Lektor',
    kuotaPembimbing1: 8,
    kuotaTerpakaiPembimbing1: 5,
    kuotaTersediaPembimbing1: 3,
    kuotaPembimbing2: 8,
    kuotaTerpakaiPembimbing2: 2,
    kuotaTersediaPembimbing2: 6,
    peranSistem: ['Pembimbing', 'Penguji']
  },
  {
    id: 'l_prof_2',
    name: 'Dr. Apt. Budi Santoso, M.Si.',
    email: 'budi.santoso@pharmsita.ac.id',
    phone: '083434343434',
    photo: 'https://ui-avatars.com/api/?name=Budi+Santoso&background=random',
    role: Roles.LECTURER,
    status: 'Aktif',
    tanggalLahir: '1978-03-15',
    alamat: 'Perumahan Pamulang Elok Blok E9/4, Tangerang Selatan',
    gender: 'Laki-laki',
    nidn: '0987654321',
    programStudi: 'S1 Farmasi',
    bidangKeahlian: ['Farmakologi', 'Kimia Farmasi'],
    jabatanAkademik: 'Lektor Kepala',
    kuotaPembimbing1: 6,
    kuotaTerpakaiPembimbing1: 4,
    kuotaTersediaPembimbing1: 2,
    kuotaPembimbing2: 6,
    kuotaTerpakaiPembimbing2: 1,
    kuotaTersediaPembimbing2: 5,
    peranSistem: ['Pembimbing', 'Penguji', 'Ketua Sidang']
  }
];

export const mockCoordinatorProfiles: CoordinatorProfile[] = [
  {
    id: 'c_prof_1',
    name: 'Dr. Apt. Siti Nurhayati, M.Farm.',
    email: 'koordinator.ta@pharmsita.ac.id',
    phone: '089898989898',
    photo: 'https://ui-avatars.com/api/?name=Siti+Nurhayati&background=random',
    role: Roles.COORDINATOR,
    status: 'Aktif',
    tanggalLahir: '1975-05-20',
    alamat: 'Graha Bintaro GR9 No. 15, Tangerang Selatan',
    gender: 'Perempuan',
    jabatan: 'Koordinator Tugas Akhir Prodi Farmasi',
    programStudi: 'S1 Farmasi',
    hakAksesUtama: [
      'Validasi Pengajuan Tugas Akhir',
      'Pengaturan Kuota Dosen',
      'Manajemen Jadwal Seminar dan Sidang',
      'Penetapan Penguji'
    ]
  }
];

export const mockAdminProfiles: AdminProfile[] = [
  {
    id: 'a_prof_1',
    name: 'Admin Prodi Farmasi',
    email: 'admin@pharmsita.ac.id',
    phone: '081111111111',
    photo: 'https://ui-avatars.com/api/?name=Admin+Prodi&background=random',
    role: Roles.ADMIN,
    status: 'Aktif',
    tanggalLahir: '1990-12-01',
    alamat: 'Gedung Rektorat Lt. 1, Progam Studi Farmasi',
    gender: 'Laki-laki',
    divisi: 'Administrasi Akademik',
    tingkatAkses: 'Admin Prodi',
    cakupanAkses: [
      'Import Akun Mahasiswa',
      'Generate Akun Dosen',
      'Kelola Data User',
      'Kelola Syarat dan Ketentuan'
    ]
  }
];