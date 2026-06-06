import { mockStudents } from './students';
import { mockTheses, mockLecturerStudentRoles } from './theses';
import { mockAgendas } from './agendas';
import { AcademicStage, ThesisRole } from './enums';

// Helper to join Student with Thesis
export const getStudentsWithThesisContext = () => {
  return mockStudents.map(student => {
    const thesis = mockTheses.find(t => t.mahasiswaId === student.id);
    const agenda = mockAgendas.find(a => a.mahasiswaId === student.id);
    
    return {
      id: student.id,
      name: student.nama,
      nim: student.nim,
      title: thesis?.judul || 'Belum Mengajukan Judul',
      status: thesis?.statusUmum || 'Bimbingan',
      tahapan: thesis?.tahapanAktif || AcademicStage.BIMBINGAN,
      scheduleDate: agenda?.tanggal,
      scheduleTime: agenda?.waktu,
      scheduleRoom: agenda?.ruang,
      scheduleLocation: agenda?.lokasi,
      scheduleStatus: agenda?.statusAgenda as 'Terjadwal' | 'Selesai' | 'Dibatalkan' | undefined,
      bimbinganMin: 8,
      bimbinganCount: Math.floor(Math.random() * 10),
      revisiCount: Math.floor(Math.random() * 5),
      approveCount: Math.floor(Math.random() * 10),
      layakLanjut: true,
      hasGrade: thesis?.statusUmum === 'Selesai Sidang',
      grade: 'A',
      // For coordinator supervisor
      supervisor1: mockLecturerStudentRoles.find(r => r.mahasiswaId === student.id && r.role === ThesisRole.PEMBIMBING_1)?.dosenId || undefined,
      supervisor2: mockLecturerStudentRoles.find(r => r.mahasiswaId === student.id && r.role === ThesisRole.PEMBIMBING_2)?.dosenId || undefined,
    };
  });
};

const allStudentViews = getStudentsWithThesisContext();

export const supervisorOneData = allStudentViews.slice(0, 3);
export const supervisorTwoData = allStudentViews.slice(3, 5);
export const examinerOneData = allStudentViews.slice(5, 7);
export const examinerTwoData = allStudentViews.slice(7, 9);
export const chairmanData = allStudentViews.slice(0, 1);
export const alumniData = allStudentViews.filter(s => s.tahapan === (AcademicStage.SELESAI as string));

export const coordinatorStudentMock = allStudentViews;

export const databaseMock = {
  dbStudents: mockStudents,
  dbLecturerStudentRoles: mockLecturerStudentRoles,
  dbAgendas: mockAgendas,
};
