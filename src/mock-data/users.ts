import { Roles } from './enums';

export const mockUsers = [
  { id: 'u_admin1', role: Roles.ADMIN, name: 'Admin Pusat', username: 'admin', email: 'admin@pharmsita.edu' },
  { id: 'u_coord1', role: Roles.COORDINATOR, name: 'Dr. Koordinator TA', username: 'coord', email: 'coord@pharmsita.edu' },
  // Lecturers
  { id: 'd1', role: Roles.LECTURER, name: 'Dr. Ahmad Sutanto, M.Kom.', username: 'ahmad', email: 'ahmad@pharmsita.edu' },
  { id: 'd2', role: Roles.LECTURER, name: 'Prof. Dr. Ir. Budi Rahardjo, M.Sc.', username: 'budi', email: 'budi@pharmsita.edu' },
  { id: 'd3', role: Roles.LECTURER, name: 'Siti Nurhaliza, S.T., M.T.', username: 'siti', email: 'siti@pharmsita.edu' },
  { id: 'd4', role: Roles.LECTURER, name: 'Bambang Pamungkas, S.Kom., M.Kom.', username: 'bambang', email: 'bambang@pharmsita.edu' },
  { id: 'd5', role: Roles.LECTURER, name: 'Dr. Eng. Rina Marlina', username: 'rina', email: 'rina@pharmsita.edu' },
  { id: 'd6', role: Roles.LECTURER, name: 'Dr. Citra Sasmita', username: 'citra', email: 'citra@pharmsita.edu' },
  // Students
  { id: '1', role: Roles.STUDENT, name: "Budi Santoso", username: "budi", email: "budi@student.edu" },
  { id: '2', role: Roles.STUDENT, name: "Siti Aminah", username: "siti", email: "siti@student.edu" },
  { id: '3', role: Roles.STUDENT, name: "Andi Wijaya", username: "andi", email: "andi@student.edu" },
  { id: '4', role: Roles.STUDENT, name: "Rina Marlina", username: "rina", email: "rina@student.edu" },
  { id: '5', role: Roles.STUDENT, name: "Dodi Permana", username: "dodi", email: "dodi@student.edu" },
  { id: '10', role: Roles.STUDENT, name: "Alif Fikri", username: "alif", email: "alif@student.edu" },
  { id: '11', role: Roles.STUDENT, name: "Ratna Sari", username: "ratna", email: "ratna@student.edu" }
];
