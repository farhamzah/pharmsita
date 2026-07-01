import React, { useEffect, useState } from 'react';
import ContentWrapper from '../../../components/ContentWrapper';
import MainLayout from '../../../layouts/MainLayout';
import { SectionCard } from '../../../components/ui/SectionCard';
import Button from '../../../components/ui/Button';
import { PencilLine, Check, X } from 'lucide-react';
import { coordinatorWorkflowApi, type LecturerDirectoryItem } from '../../../core/api/domain';

type LecturerQuotaRow = {
  id: string;
  name: string;
  nidn: string;
  kuotaPembimbing1: number;
  kuotaPembimbing2: number;
  kuotaTerpakaiPembimbing1: number;
  kuotaTerpakaiPembimbing2: number;
  kuotaTersediaPembimbing1: number;
  kuotaTersediaPembimbing2: number;
};

const mapLecturerQuotaRow = (lecturer: LecturerDirectoryItem): LecturerQuotaRow => {
  const limit = Number(lecturer.quotaLimit || 0);
  const p1Active = Number(lecturer.p1Active || 0);
  const p2Active = Number(lecturer.p2Active || 0);

  return {
    id: lecturer.id,
    name: lecturer.name,
    nidn: lecturer.nidn || lecturer.identifier,
    kuotaPembimbing1: limit,
    kuotaPembimbing2: limit,
    kuotaTerpakaiPembimbing1: p1Active,
    kuotaTerpakaiPembimbing2: p2Active,
    kuotaTersediaPembimbing1: Math.max(0, limit - p1Active),
    kuotaTersediaPembimbing2: Math.max(0, limit - p2Active),
  };
};

const AdminSystemSettingsPage: React.FC = () => {
  const [globalPb1, setGlobalPb1] = useState(10);
  const [globalPb2, setGlobalPb2] = useState(10);

  const [lecturers, setLecturers] = useState<LecturerQuotaRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPb1, setEditPb1] = useState(0);
  const [editPb2, setEditPb2] = useState(0);

  useEffect(() => {
    let mounted = true;

    coordinatorWorkflowApi
      .listLecturers()
      .then((response) => {
        if (!mounted) return;
        setLecturers(response.data.map(mapLecturerQuotaRow));
        setLoadError(null);
      })
      .catch(() => {
        if (!mounted) return;
        setLecturers([]);
        setLoadError('Data kuota dosen belum bisa dimuat dari backend.');
      });

    return () => {
      mounted = false;
    };
  }, []);

  const startEdit = (lecturer: LecturerQuotaRow) => {
    setEditingId(lecturer.id);
    setEditPb1(lecturer.kuotaPembimbing1);
    setEditPb2(lecturer.kuotaPembimbing2);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = (id: string) => {
    setLecturers(lecturers.map(l => {
      if (l.id === id) {
        return {
          ...l,
          kuotaPembimbing1: editPb1,
          kuotaTersediaPembimbing1: Math.max(0, editPb1 - l.kuotaTerpakaiPembimbing1),
          kuotaPembimbing2: editPb2,
          kuotaTersediaPembimbing2: Math.max(0, editPb2 - l.kuotaTerpakaiPembimbing2)
        };
      }
      return l;
    }));
    setEditingId(null);
  };

  const applyGlobalQuotas = () => {
    setLecturers(lecturers.map(l => ({
      ...l,
      kuotaPembimbing1: globalPb1,
      kuotaTersediaPembimbing1: Math.max(0, globalPb1 - l.kuotaTerpakaiPembimbing1),
      kuotaPembimbing2: globalPb2,
      kuotaTersediaPembimbing2: Math.max(0, globalPb2 - l.kuotaTerpakaiPembimbing2)
    })));
  };

  return (
    <MainLayout>
      <ContentWrapper
        title="Pengaturan Sistem"
        description="Konfigurasi parameter global dan modul sistem."
        headerRight={<Button>Simpan Perubahan</Button>}
      >
        {loadError && (
          <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {loadError}
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SectionCard title="Pengaturan Pendaftaran TA">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">Buka Pendaftaran TA</h4>
                  <p className="text-xs text-muted-foreground">Mengizinkan mahasiswa mendaftar TA di periode aktif</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" value="" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Pengaturan Notifikasi Email">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">Notifikasi Pendaftaran Baru</h4>
                  <p className="text-xs text-muted-foreground">Kirim email ke Koordinator saat ada pendaftaran</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" value="" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">Notifikasi Jadwal Sidang</h4>
                  <p className="text-xs text-muted-foreground">Email otomatis bagi mahasiswa dan penguji</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" value="" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Pengaturan Kuota Bimbingan" className="md:col-span-2">
            <div className="space-y-6">
              {/* Global Setting */}
              <div>
                <h4 className="text-sm font-semibold mb-3 border-b pb-2">Tetapkan Kuota Default Global</h4>
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 w-full">
                    <label className="text-xs text-muted-foreground font-medium mb-1 block">Maksimal Pembimbing 1</label>
                    <input 
                      type="number" 
                      value={globalPb1}
                      onChange={(e) => setGlobalPb1(parseInt(e.target.value) || 0)}
                      className="border w-full px-3 py-2 rounded-lg focus:ring-1 focus:ring-primary outline-none" 
                    />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="text-xs text-muted-foreground font-medium mb-1 block">Maksimal Pembimbing 2</label>
                    <input 
                      type="number" 
                      value={globalPb2}
                      onChange={(e) => setGlobalPb2(parseInt(e.target.value) || 0)}
                      className="border w-full px-3 py-2 rounded-lg focus:ring-1 focus:ring-primary outline-none" 
                    />
                  </div>
                  <Button onClick={applyGlobalQuotas} variant="outline" className="w-full md:w-auto h-10 border-primary text-primary hover:bg-primary/10">
                    Terapkan Massal
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Tombol "Terapkan Massal" akan menimpa seluruh kapasitas kuota semua dosen sekaligus dengan nilai global tesebut.</p>
              </div>

              {/* Lecturer Quota Table */}
              <div>
                <h4 className="text-sm font-semibold mb-3 border-b pb-2">Daftar Kapasitas Kuota Per Dosen</h4>
                <div className="border rounded-xl overflow-hidden shadow-sm overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground text-xs uppercase whitespace-nowrap">
                      <tr>
                        <th className="px-4 py-3 font-medium">Nama Dosen</th>
                        <th className="px-4 py-3 font-medium text-center">Pembimbing 1 (Isi/Maks)</th>
                        <th className="px-4 py-3 font-medium text-center">Sisa PB 1</th>
                        <th className="px-4 py-3 font-medium text-center">Pembimbing 2 (Isi/Maks)</th>
                        <th className="px-4 py-3 font-medium text-center">Sisa PB 2</th>
                        <th className="px-4 py-3 font-medium text-center w-24">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-foreground bg-card">
                      {lecturers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                            Belum ada data dosen.
                          </td>
                        </tr>
                      ) : lecturers.map(lecturer => {
                        const isEditing = editingId === lecturer.id;
                        
                        // Calculated remaining capacity specifically for UI 
                        const sisaColor1 = isEditing 
                          ? ((editPb1 - lecturer.kuotaTerpakaiPembimbing1) > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700') 
                          : (lecturer.kuotaTersediaPembimbing1 > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700');
                          
                        const sisaColor2 = isEditing 
                          ? ((editPb2 - lecturer.kuotaTerpakaiPembimbing2) > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700') 
                          : (lecturer.kuotaTersediaPembimbing2 > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700');

                        return (
                          <tr key={lecturer.id} className="hover:bg-muted/50 transition-colors">
                            <td className="px-4 py-3 font-medium whitespace-nowrap">
                              <div>
                                <p>{lecturer.name}</p>
                                <p className="text-xs text-muted-foreground font-normal">{lecturer.nidn}</p>
                              </div>
                            </td>
                            
                            {/* PB 1 */}
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              {isEditing ? (
                                <div className="flex items-center justify-center gap-1">
                                  <span className="text-muted-foreground mr-1">{lecturer.kuotaTerpakaiPembimbing1} / </span>
                                  <input 
                                    type="number" 
                                    value={editPb1} 
                                    onChange={e => setEditPb1(parseInt(e.target.value) || 0)} 
                                    className="w-16 border border-primary/50 focus:ring-1 focus:ring-primary rounded px-2 py-1 text-center font-semibold bg-blue-50/50" 
                                    min={lecturer.kuotaTerpakaiPembimbing1} 
                                  />
                                </div>
                              ) : (
                                <span className="font-medium whitespace-nowrap">
                                  {lecturer.kuotaTerpakaiPembimbing1} / <span className="text-blue-600 font-semibold">{lecturer.kuotaPembimbing1}</span>
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1.5 rounded-md font-semibold text-xs inline-block min-w-[32px] ${sisaColor1}`}>
                                {isEditing ? Math.max(0, editPb1 - lecturer.kuotaTerpakaiPembimbing1) : lecturer.kuotaTersediaPembimbing1}
                              </span>
                            </td>
                            
                            {/* PB 2 */}
                             <td className="px-4 py-3 text-center whitespace-nowrap">
                              {isEditing ? (
                                <div className="flex items-center justify-center gap-1">
                                  <span className="text-muted-foreground mr-1">{lecturer.kuotaTerpakaiPembimbing2} / </span>
                                  <input 
                                    type="number" 
                                    value={editPb2} 
                                    onChange={e => setEditPb2(parseInt(e.target.value) || 0)} 
                                    className="w-16 border border-primary/50 focus:ring-1 focus:ring-primary rounded px-2 py-1 text-center font-semibold bg-green-50/50" 
                                    min={lecturer.kuotaTerpakaiPembimbing2} 
                                  />
                                </div>
                              ) : (
                                <span className="font-medium whitespace-nowrap">
                                  {lecturer.kuotaTerpakaiPembimbing2} / <span className="text-green-600 font-semibold">{lecturer.kuotaPembimbing2}</span>
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1.5 rounded-md font-semibold text-xs inline-block min-w-[32px] ${sisaColor2}`}>
                                {isEditing ? Math.max(0, editPb2 - lecturer.kuotaTerpakaiPembimbing2) : lecturer.kuotaTersediaPembimbing2}
                              </span>
                            </td>

                            {/* Aksi */}
                            <td className="px-4 py-3 text-center">
                              {isEditing ? (
                                <div className="flex justify-center gap-2">
                                  <button onClick={() => saveEdit(lecturer.id)} className="text-green-600 bg-green-50 hover:bg-green-100 p-1.5 rounded-lg transition-colors border border-green-200" title="Simpan">
                                    <Check size={16} />
                                  </button>
                                  <button onClick={cancelEdit} className="text-red-600 bg-red-50 hover:bg-red-100 p-1.5 rounded-lg transition-colors border border-red-200" title="Batal">
                                    <X size={16} />
                                  </button>
                                </div>
                              ) : (
                                <button onClick={() => startEdit(lecturer)} className="text-blue-600 bg-blue-50 hover:bg-blue-100 p-1.5 rounded-lg transition-colors border border-blue-200" title="Edit Kuota">
                                  <PencilLine size={16} />
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </ContentWrapper>
    </MainLayout>
  );
};
export default AdminSystemSettingsPage;
