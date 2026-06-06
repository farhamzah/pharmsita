import {
  dbStudents,
  dbLecturers,
  dbLecturerStudentRoles,
  dbAgendas,
  dbNotes,
  dbAssessments,
  dbValidations
} from '../../../mock-data/lecturer-ui-mocks';

// Saat ini kita akan mengasumsikan ID Dosen yang login adalah "d1"
// Nantinya bisa diambil dari session auth backend.
export const CURRENT_LECTURER_ID = "d1";

// Mapping ID Role internal pembimbing vs penguji ke grup besar
export const getRoleGroup = (role: string): 'pembimbing' | 'penguji' => {
  if (role.toLowerCase().includes('pembimbing')) return 'pembimbing';
  return 'penguji'; // penguji1, penguji2, ketuaSidang dianggap kubu penguji
};

export const getStudentById = (mahasiswaId: string) => {
  return dbStudents.find(s => s.id === mahasiswaId) || null;
};

export const getLecturerRoleForStudent = (mahasiswaId: string, dosenId: string) => {
  const rel = dbLecturerStudentRoles.find(r => r.mahasiswaId === mahasiswaId && r.dosenId === dosenId);
  return rel ? rel.role : null;
};

// --- DATA ACCESS HUB ---

export const getAgendaByStage = (mahasiswaId: string, tahap: string) => {
  const agenda = dbAgendas.find(a => a.mahasiswaId === mahasiswaId && a.tahap === tahap);
  
  if (!agenda) {
    return { date: '-', time: '-', room: '-', location: '-', roleLabel: 'N/A', exists: false };
  }

  return {
    date: agenda.tanggal,
    time: agenda.waktu,
    room: agenda.ruang,
    location: agenda.lokasi,
    exists: true
  };
};

export const getNotesByStage = (mahasiswaId: string, tahap: string) => {
  // Hanya ambil catatan milik dosen tersebut di tahap yang spesifik, 
  // Atau bisa ambil semua catatan publik. 
  // Sesuai prinsip "revisi" kita bisa filter berdasarkan tahap saja agar lebih terlihat interaksinya.
  const allNotes = dbNotes.filter(n => n.mahasiswaId === mahasiswaId && n.tahap === tahap);
  
  return allNotes.map(n => {
    const author = dbLecturers.find(l => l.id === n.dibuatOlehId)?.nama || "Unknown";
    return {
      id: parseInt(n.id.replace('n', ''), 10) || Math.floor(Math.random() * 1000),
      date: n.tanggal,
      author: `${author} (${n.rolePembuat})`,
      topic: n.topik,
      note: n.isiCatatan,
      status: n.statusCatatan as any
    };
  });
};

export const getValidationByStageAndRole = (mahasiswaId: string, tahap: string, dosenId: string) => {
  return dbValidations.find(v => v.mahasiswaId === mahasiswaId && v.tahap === tahap && v.dosenId === dosenId) || null;
};

export const getAssessmentByStageAndRole = (mahasiswaId: string, tahap: string, dosenId: string) => {
  return dbAssessments.find(a => a.mahasiswaId === mahasiswaId && a.tahap === tahap && a.dosenId === dosenId) || null;
};

// --- LOGIC HELPERS ---

export const shouldShowAssessmentButton = (roleGroup: 'pembimbing' | 'penguji', stage: string) => {
  // Hanya Penguji yang bisa menilai
  if (roleGroup === 'pembimbing') return false;
  // Penilaian hanya dilakukan pada saat Seminar atau Sidang benar-benar aktif (bukan fase revisi final)
  if (stage === 'Seminar Proposal' || stage === 'Sidang Akhir') return true;
  return false;
};

export const formatAgendaLabel = (role: string) => {
  if (role === 'ketuaSidang') return 'Ketua Sidang';
  if (role === 'pembimbing1') return 'Pembimbing 1';
  if (role === 'pembimbing2') return 'Pembimbing 2';
  if (role === 'penguji1') return 'Penguji 1';
  if (role === 'penguji2') return 'Penguji 2';
  return 'Dosen';
}
