import React, { useState, useEffect } from 'react';
import ContentWrapper from '../../../components/ContentWrapper';
import MainLayout from '../../../layouts/MainLayout';
import { SectionCard } from '../../../components/ui/SectionCard';
import DataTable from '../../../components/ui/DataTable';
import Button from '../../../components/ui/Button';
import BaseModal from '../../../components/ui/BaseModal';
import { SharedStudentDetail } from '../../../components/shared/SharedStudentDetail';
import { 
  Plus, Search, ArrowLeft, Eye, EyeOff, CheckCircle2, Lock, Unlock, UserCircle
} from 'lucide-react';
import { adminApi } from '../../../core/api/domain';
import {
  loadAcademicPeriods,
  loadAdminAccounts,
  loadJenisTAList,
  loadRequirementDefinitions,
  loadSupportingDocuments,
  saveAcademicPeriods,
  saveAdminAccounts,
  saveJenisTAList,
  saveRequirementDefinitions,
  saveSupportingDocuments,
} from '../../../core/services/admin-data-service';

const TABS = [
  'Periode Akademik', 
  'Kelola Akun', 
  'Jenis TA', 
  'Dokumen Pendukung', 
  'Item Persyaratan'
];

const AdminMasterDataPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [searchTerm, setSearchTerm] = useState('');

  // Dropdown filter states
  const [roleFilter, setRoleFilter] = useState('Semua Akun');
  const [requirementFilter, setRequirementFilter] = useState('Semua Persyaratan');

  // Drill-down states
  const [selectedDosen, setSelectedDosen] = useState<any>(null);
  const [selectedMahasiswa, setSelectedMahasiswa] = useState<any>(null);

  // Success toast notice state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // States for Master Data Lists
  const [accounts, setAccounts] = useState<any[]>([]);
  const [academicPeriods, setAcademicPeriods] = useState<any[]>([]);
  const [jenisTAList, setJenisTAList] = useState<any[]>([]);
  const [documentsList, setDocumentsList] = useState<any[]>([]);
  const [requirementsList, setRequirementsList] = useState<any[]>([]);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // Custom Form fields state
  const [showPassword, setShowPassword] = useState(false);
  const [formFields, setFormFields] = useState<any>({});

  // Initialize data on component mount
  useEffect(() => {
    let mounted = true;

    Promise.all([
      adminApi.listUsers().catch(() => ({ data: loadAdminAccounts() })),
      adminApi.listRequirementDefinitions().catch(() => ({ data: loadRequirementDefinitions() })),
      adminApi.listAcademicPeriods().catch(() => ({ data: loadAcademicPeriods() })),
      adminApi.listThesisTypes().catch(() => ({ data: loadJenisTAList() })),
      adminApi.listSupportingDocuments().catch(() => ({ data: loadSupportingDocuments() })),
    ]).then(([users, requirements, periods, thesisTypes, documents]) => {
      if (!mounted) return;

      setAccounts(users.data);
      setRequirementsList(requirements.data);
      setAcademicPeriods(periods.data);
      setJenisTAList(thesisTypes.data);
      setDocumentsList(documents.data);
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Save list state modifications through the admin data boundary.
  const saveAccountsState = async (updated: any[]) => {
    const sanitized = saveAdminAccounts(updated);
    setAccounts(sanitized);
    try {
      const response = await adminApi.replaceUsers(sanitized);
      const synced = saveAdminAccounts(response.data);
      setAccounts(synced);
      return synced;
    } catch {
      return sanitized;
    }
  };

  const savePeriodsState = async (updated: any[]) => {
    saveAcademicPeriods(updated);
    setAcademicPeriods(updated);
    try {
      const response = await adminApi.replaceAcademicPeriods(updated);
      saveAcademicPeriods(response.data);
      setAcademicPeriods(response.data);
      return response.data;
    } catch {
      return updated;
    }
  };

  const saveJenisTAState = async (updated: any[]) => {
    saveJenisTAList(updated);
    setJenisTAList(updated);
    try {
      const response = await adminApi.replaceThesisTypes(updated);
      saveJenisTAList(response.data);
      setJenisTAList(response.data);
      return response.data;
    } catch {
      return updated;
    }
  };

  const saveDocumentsState = async (updated: any[]) => {
    saveSupportingDocuments(updated);
    setDocumentsList(updated);
    try {
      const response = await adminApi.replaceSupportingDocuments(updated);
      saveSupportingDocuments(response.data);
      setDocumentsList(response.data);
      return response.data;
    } catch {
      return updated;
    }
  };

  const saveRequirementsState = async (updated: any[]) => {
    saveRequirementDefinitions(updated);
    setRequirementsList(updated);
    try {
      const response = await adminApi.replaceRequirementDefinitions(updated);
      saveRequirementDefinitions(response.data);
      setRequirementsList(response.data);
      return response.data;
    } catch {
      return updated;
    }
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchTerm('');
    setSelectedDosen(null);
    setSelectedMahasiswa(null);
  };

  const renderStatusBadge = (val: string) => {
    let color = 'bg-slate-100 border-slate-200 text-slate-700';
    if (val === 'Aktif' || val === 'Wajib') color = 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900';
    if (val === 'Selesai' || val === 'Lulus') color = 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-900';
    if (val === 'Nonaktif' || val === 'Opsional') color = 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-900';
    return <span className={`px-2.5 py-0.5 rounded border text-[10px] font-bold uppercase select-none whitespace-nowrap ${color}`}>{val}</span>;
  };

  // Open modal for Adding data
  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedRow(null);
    setShowPassword(false);
    
    // Initialize default fields based on active tab
    if (activeTab === 'Periode Akademik') {
      setFormFields({ name: '2025/2026', semester: 'Ganjil', startDate: '2025-09-01', endDate: '2026-02-28', status: 'Aktif' });
    } else if (activeTab === 'Kelola Akun') {
      // Default creation role is Mahasiswa, but dropdown lets them choose
      setFormFields({ role: 'Mahasiswa', name: '', identifier: '', email: '', password: '' });
    } else if (activeTab === 'Jenis TA') {
      setFormFields({ name: '', skema: 'Skripsi', desc: '', status: 'Aktif' });
    } else if (activeTab === 'Dokumen Pendukung') {
      setFormFields({ name: '', description: '', allowedTypes: 'PDF', isRequired: 'Wajib', status: 'Aktif' });
    } else if (activeTab === 'Item Persyaratan') {
      setFormFields({ namaPersyaratan: '', tahap: 'Persyaratan Awal', deskripsiAturan: '', status: 'Aktif' });
    }
    
    setIsModalOpen(true);
  };

  // Open modal for Editing data
  const handleOpenEdit = (row: any) => {
    setModalMode('edit');
    setSelectedRow(row);
    setShowPassword(false);
    
    if (activeTab === 'Periode Akademik') {
      setFormFields({ ...row });
    } else if (activeTab === 'Kelola Akun') {
      setFormFields({
        role: row.role,
        name: row.name,
        identifier: row.identifier,
        email: row.email || '',
        password: '',
      });
    } else if (activeTab === 'Jenis TA') {
      setFormFields({ ...row });
    } else if (activeTab === 'Dokumen Pendukung') {
      setFormFields({ ...row });
    } else if (activeTab === 'Item Persyaratan') {
      setFormFields({
        namaPersyaratan: row.namaPersyaratan,
        tahap: row.tahap,
        deskripsiAturan: row.deskripsiAturan || '',
        status: row.status || 'Aktif',
      });
    }
    
    setIsModalOpen(true);
  };

  const handleOpenDetail = (account: any) => {
    setSelectedRow(account);
    setIsDetailModalOpen(true);
  };

  const handleToggleAccountStatus = (account: any) => {
    const isDeactivating = account.status === 'Aktif';
    const updatedStatus = isDeactivating ? 'Nonaktif' : 'Aktif';
    
      void saveAccountsState(accounts.map(acc => {
      if (acc.id === account.id) {
        return { ...acc, status: updatedStatus };
      }
      return acc;
    }));

    triggerToast(`Akun ${account.name} berhasil ${isDeactivating ? 'dinonaktifkan' : 'diaktifkan kembali'}!`);
  };

  const handleDeleteRequirement = (req: any) => {
    if (confirm(`Apakah Anda yakin ingin menghapus persyaratan "${req.namaPersyaratan}"?`)) {
      void saveRequirementsState(requirementsList.filter(r => r.id !== req.id));
      triggerToast(`Persyaratan "${req.namaPersyaratan}" berhasil dihapus!`);
    }
  };

  // Submit Handler for all tabs
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === 'Periode Akademik') {
      if (!formFields.name || !formFields.startDate || !formFields.endDate) {
        alert('Mohon lengkapi data periode akademik!');
        return;
      }
      if (modalMode === 'create') {
        const newPeriod = { id: `per_${Date.now()}`, ...formFields };
        await savePeriodsState([newPeriod, ...academicPeriods]);
        triggerToast(`Periode akademik ${formFields.name} (${formFields.semester}) berhasil ditambahkan!`);
      } else {
        await savePeriodsState(academicPeriods.map(p => p.id === selectedRow.id ? { ...p, ...formFields } : p));
        triggerToast(`Periode akademik ${formFields.name} berhasil diperbarui!`);
      }
    } 
    
    else if (activeTab === 'Kelola Akun') {
      if (!formFields.name || !formFields.identifier) {
        alert('Nama Lengkap dan Username / ID Pengguna wajib diisi!');
        return;
      }

      if (modalMode === 'create') {
        const hasInitialPassword = (formFields.password || '').trim().length > 0;

        const newAccount = {
          id: `acc_${Date.now()}`,
          name: formFields.name,
          identifier: formFields.identifier,
          email: formFields.email,
          role: formFields.role,
          passwordStatus: hasInitialPassword ? 'Diatur awal' : 'Perlu aktivasi/reset',
          passwordUpdatedAt: hasInitialPassword ? new Date().toISOString() : null,
          status: 'Aktif',
          phone: '',
          gender: formFields.role === 'Mahasiswa' ? 'Laki-laki' : 'Perempuan',
          tanggalLahir: '2000-01-01',
          alamat: '',
          programStudi: 'S1 Farmasi',
          ...(formFields.role === 'Mahasiswa' ? {
            angkatan: '2022',
            kelas: 'FA-22-01',
            skemaTA: 'Skripsi',
            jenisTA: 'Penelitian',
            tahapanAktif: 'Bimbingan',
          } : formFields.role === 'Dosen' ? {
            jabatanAkademik: 'Lektor',
            bidangKeahlian: 'Farmasetika',
            kuotaPembimbing1: 8,
            kuotaPembimbing2: 8,
            kuotaTerpakaiPembimbing1: 0,
            kuotaTerpakaiPembimbing2: 0,
            peranSistem: ['Pembimbing'],
          } : {
            jabatan: 'Koordinator Tugas Akhir',
            hakAksesUtama: ['Validasi Pengajuan Tugas Akhir'],
          })
        };

        await saveAccountsState([newAccount, ...accounts]);
        triggerToast(`Akun ${formFields.name} (${formFields.role}) berhasil ditambahkan. Password tidak disimpan atau ditampilkan ulang.`);
      } else {
        const shouldResetPassword = (formFields.password || '').trim().length > 0;
        await saveAccountsState(accounts.map(acc => {
          if (acc.id === selectedRow.id) {
            return {
              ...acc,
              name: formFields.name,
              identifier: formFields.identifier,
              email: formFields.email,
              ...(shouldResetPassword
                ? {
                    passwordStatus: 'Reset diminta',
                    passwordUpdatedAt: new Date().toISOString(),
                  }
                : {}),
            };
          }
          return acc;
        }));
        triggerToast(
          shouldResetPassword
            ? `Data akun ${formFields.name} berhasil diperbarui dan password ditandai untuk reset.`
            : `Data akun ${formFields.name} berhasil diperbarui!`
        );
      }
    } 
    
    else if (activeTab === 'Jenis TA') {
      if (!formFields.name) {
        alert('Nama Jenis TA wajib diisi!');
        return;
      }
      if (modalMode === 'create') {
        const newJenis = { id: `jta_${Date.now()}`, ...formFields };
        await saveJenisTAState([newJenis, ...jenisTAList]);
        triggerToast(`Jenis TA "${formFields.name}" berhasil ditambahkan!`);
      } else {
        await saveJenisTAState(jenisTAList.map(j => j.id === selectedRow.id ? { ...j, ...formFields } : j));
        triggerToast(`Jenis TA "${formFields.name}" berhasil diperbarui!`);
      }
    } 
    
    else if (activeTab === 'Dokumen Pendukung') {
      if (!formFields.name) {
        alert('Nama Dokumen wajib diisi!');
        return;
      }
      if (modalMode === 'create') {
        const newDoc = { id: `doc_${Date.now()}`, ...formFields };
        await saveDocumentsState([newDoc, ...documentsList]);
        triggerToast(`Dokumen pendukung "${formFields.name}" berhasil ditambahkan!`);
      } else {
        await saveDocumentsState(documentsList.map(d => d.id === selectedRow.id ? { ...d, ...formFields } : d));
        triggerToast(`Dokumen pendukung "${formFields.name}" berhasil diperbarui!`);
      }
    }

    else if (activeTab === 'Item Persyaratan') {
      if (!formFields.namaPersyaratan) {
        alert('Nama Persyaratan wajib diisi!');
        return;
      }
      if (modalMode === 'create') {
        const newReq = { 
          id: `req_custom_${Date.now()}`, 
          tahap: formFields.tahap,
          namaPersyaratan: formFields.namaPersyaratan,
          deskripsiAturan: formFields.deskripsiAturan,
          wajib: true,
          status: formFields.status || 'Aktif'
        };
        await saveRequirementsState([newReq, ...requirementsList]);
        triggerToast(`Item persyaratan "${formFields.namaPersyaratan}" berhasil ditambahkan!`);
      } else {
        await saveRequirementsState(requirementsList.map(r => r.id === selectedRow.id ? { 
          ...r, 
          tahap: formFields.tahap,
          namaPersyaratan: formFields.namaPersyaratan,
          deskripsiAturan: formFields.deskripsiAturan,
          status: formFields.status
        } : r));
        triggerToast(`Persyaratan "${formFields.namaPersyaratan}" berhasil diperbarui!`);
      }
    }

    setIsModalOpen(false);
  };

  const renderSearchAndAction = (placeholder: string) => {
    let addBtnText = "Tambah Data";
    if (activeTab === 'Periode Akademik') addBtnText = "Tambah Periode Akademik";
    else if (activeTab === 'Kelola Akun') addBtnText = "Tambah Akun";
    else if (activeTab === 'Jenis TA') addBtnText = "Tambah Jenis TA";
    else if (activeTab === 'Dokumen Pendukung') addBtnText = "Tambah Dokumen Pendukung";
    else if (activeTab === 'Item Persyaratan') addBtnText = "Tambah Persyaratan";

    return (
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto flex-1">
          {/* Main Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input 
              type="text" 
              placeholder={placeholder}
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground bg-background transition"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Tab specific dropdown filters */}
          {activeTab === 'Kelola Akun' && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase whitespace-nowrap">Filter Role:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="text-xs border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary text-foreground bg-background font-semibold"
              >
                <option value="Semua Akun">Semua Akun</option>
                <option value="Mahasiswa">Mahasiswa</option>
                <option value="Dosen">Dosen</option>
                <option value="Koordinator">Koordinator</option>
              </select>
            </div>
          )}

          {activeTab === 'Item Persyaratan' && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase whitespace-nowrap">Filter Kategori:</span>
              <select
                value={requirementFilter}
                onChange={(e) => setRequirementFilter(e.target.value)}
                className="text-xs border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary text-foreground bg-background font-semibold"
              >
                <option value="Semua Persyaratan">Semua Persyaratan</option>
                <option value="Persyaratan Awal">Persyaratan Awal</option>
                <option value="Seminar Proposal">Persyaratan Seminar Proposal</option>
                <option value="Sidang Akhir">Persyaratan Sidang Akhir</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-2 w-full md:w-auto justify-end">
          <Button className="flex items-center gap-2 text-xs" onClick={handleOpenCreate}>
            <Plus size={14} /> {addBtnText}
          </Button>
        </div>
      </div>
    );
  };

  const renderDosenDetail = () => {
    const mentoredStudents = accounts.filter(s => s.role === 'Mahasiswa' && (s.pembimbing1 === selectedDosen.name || s.pembimbing2 === selectedDosen.name));

    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b">
          <button 
            onClick={() => setSelectedDosen(null)} 
            className="p-2 hover:bg-muted rounded-full transition-colors flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              Detail Otoritas Dosen
              {renderStatusBadge(selectedDosen.status)}
            </h3>
            <p className="text-xs text-muted-foreground">Profil dosen dan daftar bimbingan aktif</p>
          </div>
        </div>

        {/* Lecturer Quick Summary */}
        <div className="border border-border/80 shadow-sm bg-card rounded-2xl p-5 mb-6 flex flex-col md:flex-row gap-5 items-center">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 shrink-0 flex items-center justify-center border-2 border-emerald-500/20 font-bold text-lg text-emerald-600">
             {selectedDosen.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 text-center md:text-left">
             <h4 className="text-sm font-bold text-foreground">{selectedDosen.name}</h4>
             <p className="text-xs text-muted-foreground font-mono mt-0.5">{selectedDosen.identifier}</p>
             <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 mt-2">
               {(selectedDosen.bidangKeahlian || '').split(',').map((k: string) => {
                 const trimK = k.trim();
                 if (!trimK) return null;
                 return <span key={trimK} className="text-[9px] font-bold bg-muted px-2 py-0.5 border border-border/60 rounded text-foreground/80">{trimK}</span>;
               })}
             </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto text-center text-xs">
            <div className="bg-blue-50 border border-blue-100/50 p-2.5 rounded-xl flex-1 min-w-[100px]">
              <p className="text-[10px] text-blue-600 font-bold mb-0.5 uppercase tracking-wide">Kuota PB 1</p>
              <p className="text-base font-extrabold text-blue-700">{selectedDosen.kuotaTerpakaiPembimbing1 || 0} <span className="text-xs text-blue-400 font-normal">/ {selectedDosen.kuotaPembimbing1 || 8}</span></p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100/50 p-2.5 rounded-xl flex-1 min-w-[100px]">
              <p className="text-[10px] text-emerald-600 font-bold mb-0.5 uppercase tracking-wide">Kuota PB 2</p>
              <p className="text-base font-extrabold text-emerald-700">{selectedDosen.kuotaTerpakaiPembimbing2 || 0} <span className="text-xs text-emerald-400 font-normal">/ {selectedDosen.kuotaPembimbing2 || 8}</span></p>
            </div>
          </div>
        </div>

        <SectionCard title={`Mahasiswa Bimbingan Aktif (${mentoredStudents.length})`}>
          <DataTable 
            data={mentoredStudents}
            columns={[
              { key: 'identifier', label: 'NIM', render: (row: any) => <span className="font-mono text-xs">{row.identifier}</span> },
              { key: 'name', label: 'Nama Mahasiswa', render: (row: any) => <span className="font-medium">{row.name}</span> },
              { key: 'role', label: 'Peran', render: (row: any) => {
                if (row.pembimbing1 === selectedDosen.name) {
                  return <span className="text-[10px] bg-blue-50 border border-blue-200 text-blue-700 px-2 py-0.5 rounded font-bold whitespace-nowrap">Pembimbing 1</span>
                }
                if (row.pembimbing2 === selectedDosen.name) {
                  return <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded font-bold whitespace-nowrap">Pembimbing 2</span>
                }
                return '-'
              }},
              { key: 'tahapanAktif', label: 'Tahapan Saat Ini', render: (row: any) => <span className="text-xs font-semibold text-foreground/80">{row.tahapanAktif || 'Bimbingan'}</span> },
              { key: 'actions', label: 'Aksi', render: (row: any) => (
                <button 
                  onClick={() => setSelectedMahasiswa(row)}
                  className="px-2.5 py-1 bg-primary/10 text-primary rounded-md text-xs font-semibold hover:bg-primary/20 transition-colors whitespace-nowrap cursor-pointer"
                >
                  Lihat Detail
                </button>
              )}
            ]}
          />
        </SectionCard>
      </div>
    );
  };

  const renderContent = () => {
    const term = searchTerm.toLowerCase();

    switch (activeTab) {
      case 'Periode Akademik':
        return (
          <>
            {renderSearchAndAction("Cari tahun akademik...")}
            <DataTable 
              data={academicPeriods.filter(d => d.name.toLowerCase().includes(term) || d.semester.toLowerCase().includes(term))}
              columns={[
                { key: 'name', label: 'Tahun Akademik', render: (row: any) => <span className="font-semibold">{row.name}</span> },
                { key: 'semester', label: 'Semester' },
                { key: 'startDate', label: 'Tgl Mulai', render: (row: any) => <span className="font-mono text-xs">{row.startDate}</span> },
                { key: 'endDate', label: 'Tgl Selesai', render: (row: any) => <span className="font-mono text-xs">{row.endDate}</span> },
                { key: 'status', label: 'Status', render: (row: any) => renderStatusBadge(row.status) },
                { key: 'actions', label: 'Aksi', render: (row: any) => (
                  <Button variant="outline" size="sm" onClick={() => handleOpenEdit(row)} className="text-primary hover:bg-primary/5 font-semibold">
                    Edit
                  </Button>
                )}
              ]}
            />
          </>
        );

      case 'Kelola Akun':
        if (selectedMahasiswa) return renderMahasiswaDetail();
        if (selectedDosen) return renderDosenDetail();

        const filteredAccounts = accounts.filter(acc => {
          const matchesRole = roleFilter === 'Semua Akun' || acc.role === roleFilter;
          const matchesSearch = acc.name.toLowerCase().includes(term) || acc.identifier.includes(term) || (acc.email && acc.email.toLowerCase().includes(term));
          return matchesRole && matchesSearch;
        });

        return (
          <>
            {renderSearchAndAction("Cari nama, email, NIM atau NIP...")}
            <DataTable 
              data={filteredAccounts}
              columns={[
                { key: 'name', label: 'Nama Lengkap', render: (row: any) => (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-primary shrink-0">
                      {row.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-xs leading-snug">{row.name}</p>
                      <p className="text-[10px] text-muted-foreground">{row.email || 'Email belum diatur'}</p>
                    </div>
                  </div>
                )},
                { key: 'identifier', label: 'NIM / NIP', render: (row: any) => <span className="font-mono text-xs font-semibold">{row.identifier}</span> },
                { key: 'role', label: 'Role', render: (row: any) => {
                  let themeClasses = "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900";
                  if (row.role === 'Mahasiswa') {
                    themeClasses = "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-900";
                  } else if (row.role === 'Dosen') {
                    themeClasses = "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900";
                  } else if (row.role === 'Koordinator') {
                    themeClasses = "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900";
                  }
                  return <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${themeClasses}`}>{row.role}</span>;
                }},
                { key: 'status', label: 'Status', render: (row: any) => renderStatusBadge(row.status) },
                { key: 'actions', label: 'Aksi', render: (row: any) => (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleOpenDetail(row)}
                      className="flex items-center gap-1 text-slate-600 border-slate-200 hover:bg-slate-50 text-xs"
                    >
                      Detail
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleOpenEdit(row)}
                      className="flex items-center gap-1 text-primary border-primary/20 hover:bg-primary/5 text-xs"
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleToggleAccountStatus(row)}
                      className={`flex items-center gap-1 border text-xs transition-colors ${
                        row.status === 'Aktif' 
                          ? 'border-red-200 text-red-600 hover:bg-red-50' 
                          : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                      }`}
                    >
                      {row.status === 'Aktif' ? <Lock size={12} /> : <Unlock size={12} />}
                      <span>{row.status === 'Aktif' ? 'Kunci' : 'Buka'}</span>
                    </Button>
                  </div>
                )}
              ]}
            />
          </>
        );

      case 'Jenis TA':
        return (
          <>
            {renderSearchAndAction("Cari jenis TA...")}
            <DataTable 
              data={jenisTAList.filter(d => d.name.toLowerCase().includes(term))}
              columns={[
                { key: 'name', label: 'Kategori Jenis TA', render: (row: any) => <span className="font-semibold">{row.name}</span> },
                { key: 'skema', label: 'Skema TA', render: (row: any) => <span className={`px-2 py-0.5 border rounded text-[10px] font-bold ${row.skema === 'Skripsi' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-purple-50 border-purple-200 text-purple-700'}`}>{row.skema}</span> },
                { key: 'desc', label: 'Deskripsi', render: (row: any) => <span className="text-xs text-muted-foreground line-clamp-1 max-w-sm">{row.desc || 'Deskripsi jenis TA belum diisi.'}</span> },
                { key: 'status', label: 'Status', render: (row: any) => renderStatusBadge(row.status) },
                { key: 'actions', label: 'Aksi', render: (row: any) => (
                  <Button variant="outline" size="sm" onClick={() => handleOpenEdit(row)} className="text-primary hover:bg-primary/5">
                    Edit
                  </Button>
                )}
              ]}
            />
          </>
        );

      case 'Dokumen Pendukung':
        return (
          <>
            {renderSearchAndAction("Cari dokumen...")}
            <DataTable 
              data={documentsList.filter(d => d.name.toLowerCase().includes(term) || d.allowedTypes.toLowerCase().includes(term))}
              columns={[
                { key: 'name', label: 'Nama Dokumen', render: (row: any) => <span className="font-semibold">{row.name}</span> },
                { key: 'allowedTypes', label: 'Jenis File', render: (row: any) => <span className="font-mono text-xs">{row.allowedTypes}</span> },
                { key: 'isRequired', label: 'Sifat Dokumen', render: (row: any) => renderStatusBadge(row.isRequired) },
                { key: 'status', label: 'Status', render: (row: any) => renderStatusBadge(row.status) },
                { key: 'actions', label: 'Aksi', render: (row: any) => (
                  <Button variant="outline" size="sm" onClick={() => handleOpenEdit(row)} className="text-primary hover:bg-primary/5">
                    Edit
                  </Button>
                )}
              ]}
            />
          </>
        );

      case 'Item Persyaratan':
        const filteredReqs = requirementsList.filter(req => {
          const matchesCategory = requirementFilter === 'Semua Persyaratan' || req.tahap === requirementFilter || (requirementFilter === 'Seminar Proposal' && req.tahap === 'Seminar Proposal');
          const matchesSearch = req.namaPersyaratan.toLowerCase().includes(term) || (req.deskripsiAturan && req.deskripsiAturan.toLowerCase().includes(term));
          return matchesCategory && matchesSearch;
        });

        return (
          <>
            {renderSearchAndAction("Cari persyaratan...")}
            <DataTable 
              data={filteredReqs}
              columns={[
                { key: 'namaPersyaratan', label: 'Nama Persyaratan', render: (row: any) => (
                  <div>
                    <p className="font-semibold text-foreground/90">{row.namaPersyaratan}</p>
                    {row.deskripsiAturan && <p className="text-[10px] text-muted-foreground mt-0.5">{row.deskripsiAturan}</p>}
                  </div>
                )},
                { key: 'tahap', label: 'Kategori', render: (row: any) => (
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded uppercase">{row.tahap}</span>
                )},
                { key: 'status', label: 'Status', render: (row: any) => renderStatusBadge(row.status || 'Aktif') },
                { key: 'actions', label: 'Aksi', render: (row: any) => (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenEdit(row)} className="text-primary border-primary/20 hover:bg-primary/5">
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDeleteRequirement(row)} className="text-red-500 border-red-200 hover:bg-red-50">
                      Hapus
                    </Button>
                  </div>
                )}
              ]}
            />
          </>
        );

      default:
        return <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">Data untuk {activeTab} belum tersedia.</div>;
    }
  };

  const renderMahasiswaDetail = () => {
    return (
      <SharedStudentDetail 
        student={selectedMahasiswa} 
        onBack={() => setSelectedMahasiswa(null)} 
        showValidationPanel={false} 
      />
    );
  };

  return (
    <MainLayout>
      {/* Success Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-2.5 max-w-sm border border-slate-800 dark:border-slate-200 animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 stroke-[2.5]" />
          <p className="text-xs font-semibold leading-relaxed">{toastMessage}</p>
        </div>
      )}

      <ContentWrapper
        title="Data Master Akademik"
        description="Kelola data referensi khusus Prodi Farmasi untuk kegiatan Tugas Akhir."
      >
        {/* Navigation Tabs (Hide if deep linking into detail) */}
        {!selectedDosen && !selectedMahasiswa && (
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-3 mb-6 border-b border-border">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`px-4 py-2 text-xs font-bold whitespace-nowrap rounded-xl transition-all border shadow-3xs cursor-pointer select-none ${
                  activeTab === tab 
                    ? 'bg-primary text-primary-foreground border-primary/20 font-extrabold' 
                    : 'bg-card text-muted-foreground border-border/80 hover:bg-muted/80'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}

        {/* Content Box */}
        {selectedDosen || selectedMahasiswa ? (
          <div className="bg-transparent">
            {renderContent()}
          </div>
        ) : (
          <SectionCard 
            title={`Daftar ${activeTab}`} 
            className="p-6 border border-border/80 shadow-xs rounded-2xl bg-card"
          >
            {renderContent()}
          </SectionCard>
        )}
      </ContentWrapper>

      {/* ==================================== MODAL TAMBAH & EDIT SPESIFIK TAB ==================================== */}
      <BaseModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          modalMode === 'create'
            ? `Tambah ${activeTab} Baru`
            : `Edit ${activeTab}`
        }
        maxWidth="lg"
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border hover:bg-muted text-foreground font-semibold rounded-xl text-xs transition"
            >
              Batal
            </button>
            <button
              onClick={handleFormSubmit}
              className="px-5 py-2 bg-primary text-primary-foreground hover:opacity-90 font-bold rounded-xl text-xs transition"
            >
              {modalMode === 'create' ? 'Tambah Data' : 'Simpan Perubahan'}
            </button>
          </div>
        }
      >
        <form className="space-y-4">
          
          {/* ======================== FORM: PERIODE AKADEMIK ======================== */}
          {activeTab === 'Periode Akademik' && (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Tahun Akademik</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 2025/2026"
                  value={formFields.name || ''}
                  onChange={(e) => setFormFields((prev: any) => ({ ...prev, name: e.target.value }))}
                  className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Semester</label>
                <select
                  value={formFields.semester || 'Ganjil'}
                  onChange={(e) => setFormFields((prev: any) => ({ ...prev, semester: e.target.value }))}
                  className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                >
                  <option value="Ganjil">Ganjil</option>
                  <option value="Genap">Genap</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Tanggal Mulai</label>
                  <input
                    type="date"
                    required
                    value={formFields.startDate || ''}
                    onChange={(e) => setFormFields((prev: any) => ({ ...prev, startDate: e.target.value }))}
                    className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Tanggal Selesai</label>
                  <input
                    type="date"
                    required
                    value={formFields.endDate || ''}
                    onChange={(e) => setFormFields((prev: any) => ({ ...prev, endDate: e.target.value }))}
                    className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Status</label>
                <select
                  value={formFields.status || 'Aktif'}
                  onChange={(e) => setFormFields((prev: any) => ({ ...prev, status: e.target.value }))}
                  className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition font-semibold"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Selesai">Selesai</option>
                </select>
              </div>
            </>
          )}

          {/* ======================== FORM: KELOLA AKUN ======================== */}
          {activeTab === 'Kelola Akun' && (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Role Akun</label>
                <select
                  value={formFields.role || 'Mahasiswa'}
                  disabled={modalMode === 'edit'}
                  onChange={(e) => setFormFields((prev: any) => ({ ...prev, role: e.target.value }))}
                  className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition font-semibold"
                >
                  <option value="Mahasiswa">Mahasiswa</option>
                  <option value="Dosen">Dosen</option>
                  <option value="Koordinator">Koordinator</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  placeholder="Ketik nama lengkap..."
                  value={formFields.name || ''}
                  onChange={(e) => setFormFields((prev: any) => ({ ...prev, name: e.target.value }))}
                  className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">
                  {formFields.role === 'Mahasiswa' ? 'Username / ID Pengguna (NIM)' : formFields.role === 'Dosen' ? 'Username / ID Pengguna (NIDN / NIP)' : 'Username / ID Pengguna (NIP / ID)'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={formFields.role === 'Mahasiswa' ? 'Ketik NIM...' : 'Ketik NIP/ID...'}
                  value={formFields.identifier || ''}
                  onChange={(e) => setFormFields((prev: any) => ({ ...prev, identifier: e.target.value }))}
                  className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition font-mono font-semibold"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Email</label>
                  <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Opsional</span>
                </div>
                <input
                  type="email"
                  placeholder="username@pharmsita.ac.id"
                  value={formFields.email || ''}
                  onChange={(e) => setFormFields((prev: any) => ({ ...prev, email: e.target.value }))}
                  className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">
                  {modalMode === 'create' ? 'Password Awal' : 'Reset Password'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={modalMode === 'create' ? "Opsional: isi password awal..." : "Opsional: isi password reset..."}
                    value={formFields.password || ''}
                    onChange={(e) => setFormFields((prev: any) => ({ ...prev, password: e.target.value }))}
                    className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl pl-3 pr-10 py-2.5 text-foreground bg-background transition font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition cursor-pointer select-none"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p className="text-[9px] text-muted-foreground leading-relaxed mt-1">
                  Demi keamanan, password tidak disimpan atau ditampilkan ulang di frontend. Kosongkan jika tidak ingin mengatur/reset password.
                </p>
              </div>
            </>
          )}

          {/* ======================== FORM: JENIS TA ======================== */}
          {activeTab === 'Jenis TA' && (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Nama Jenis TA</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Penelitian Klinik, Review Jurnal, dll."
                  value={formFields.name || ''}
                  onChange={(e) => setFormFields((prev: any) => ({ ...prev, name: e.target.value }))}
                  className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Skema TA</label>
                <select
                  value={formFields.skema || 'Skripsi'}
                  onChange={(e) => setFormFields((prev: any) => ({ ...prev, skema: e.target.value }))}
                  className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition font-semibold"
                >
                  <option value="Skripsi">Skripsi</option>
                  <option value="Non Skripsi">Non Skripsi</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Deskripsi</label>
                <textarea
                  rows={2}
                  placeholder="Tulis penjelasan singkat mengenai cakupan tugas akhir ini..."
                  value={formFields.desc || ''}
                  onChange={(e) => setFormFields((prev: any) => ({ ...prev, desc: e.target.value }))}
                  className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Status</label>
                <select
                  value={formFields.status || 'Aktif'}
                  onChange={(e) => setFormFields((prev: any) => ({ ...prev, status: e.target.value }))}
                  className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Nonaktif">Nonaktif</option>
                </select>
              </div>
            </>
          )}

          {/* ======================== FORM: DOKUMEN PENDUNGUNG ======================== */}
          {activeTab === 'Dokumen Pendukung' && (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Nama Dokumen</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Surat Izin Instansi, Sertifikat Uji, dll."
                  value={formFields.name || ''}
                  onChange={(e) => setFormFields((prev: any) => ({ ...prev, name: e.target.value }))}
                  className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Deskripsi</label>
                <textarea
                  rows={2}
                  placeholder="Tulis rincian atau fungsi berkas lampiran ini..."
                  value={formFields.description || ''}
                  onChange={(e) => setFormFields((prev: any) => ({ ...prev, description: e.target.value }))}
                  className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Jenis File yang Diizinkan</label>
                <input
                  type="text"
                  placeholder="Contoh: PDF, Image, ZIP"
                  value={formFields.allowedTypes || ''}
                  onChange={(e) => setFormFields((prev: any) => ({ ...prev, allowedTypes: e.target.value }))}
                  className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Sifat Dokumen</label>
                  <select
                    value={formFields.isRequired || 'Wajib'}
                    onChange={(e) => setFormFields((prev: any) => ({ ...prev, isRequired: e.target.value }))}
                    className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                  >
                    <option value="Wajib">Wajib</option>
                    <option value="Opsional">Opsional</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Status Aktif</label>
                  <select
                    value={formFields.status || 'Aktif'}
                    onChange={(e) => setFormFields((prev: any) => ({ ...prev, status: e.target.value }))}
                    className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* ======================== FORM: ITEM PERSYARATAN ======================== */}
          {activeTab === 'Item Persyaratan' && (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Nama Persyaratan</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Mengisi KRS Tugas Akhir, Uji Bebas Pustaka..."
                  value={formFields.namaPersyaratan || ''}
                  onChange={(e) => setFormFields((prev: any) => ({ ...prev, namaPersyaratan: e.target.value }))}
                  className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Kategori Persyaratan</label>
                <select
                  value={formFields.tahap || 'Persyaratan Awal'}
                  onChange={(e) => setFormFields((prev: any) => ({ ...prev, tahap: e.target.value }))}
                  className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition font-semibold"
                >
                  <option value="Persyaratan Awal">Persyaratan Awal</option>
                  <option value="Seminar Proposal">Persyaratan Seminar Proposal</option>
                  <option value="Sidang Akhir">Persyaratan Sidang Akhir</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Deskripsi Aturan</label>
                <textarea
                  rows={2}
                  placeholder="Ketik keterangan petunjuk pengisian bagi mahasiswa..."
                  value={formFields.deskripsiAturan || ''}
                  onChange={(e) => setFormFields((prev: any) => ({ ...prev, deskripsiAturan: e.target.value }))}
                  className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Status</label>
                <select
                  value={formFields.status || 'Aktif'}
                  onChange={(e) => setFormFields((prev: any) => ({ ...prev, status: e.target.value }))}
                  className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Nonaktif">Nonaktif</option>
                </select>
              </div>
            </>
          )}

        </form>
      </BaseModal>

      {/* ==================================== MODAL: DETAIL USER (KELOLA AKUN) ==================================== */}
      <BaseModal
        open={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Detail Profil Pengguna"
        maxWidth="lg"
      >
        {selectedRow && activeTab === 'Kelola Akun' && (
          <div className="space-y-6">
            {/* Identitas Card */}
            <div className="bg-muted/30 border border-border/80 rounded-2xl p-5 flex flex-col items-center text-center shadow-3xs relative overflow-hidden">
              <div className={`absolute top-3 right-3 text-[9px] font-extrabold uppercase px-2 py-0.5 border rounded-md tracking-wider ${
                selectedRow.role === 'Mahasiswa' 
                  ? 'bg-blue-50 border-blue-200 text-blue-700' 
                  : selectedRow.role === 'Dosen'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-700'
              }`}>
                {selectedRow.role}
              </div>

              <div className="relative mb-3.5 mt-2">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center font-extrabold text-2xl text-white shadow-md overflow-hidden bg-gradient-to-br ${
                  selectedRow.role === 'Mahasiswa'
                    ? 'from-blue-600 to-indigo-600'
                    : selectedRow.role === 'Dosen'
                      ? 'from-emerald-600 to-teal-600'
                      : 'from-indigo-600 to-purple-600'
                }`}>
                  {selectedRow.name.substring(0, 2).toUpperCase()}
                </div>
              </div>

              <h3 className="text-base font-bold text-foreground leading-snug">{selectedRow.name}</h3>
              
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border select-none ${
                  selectedRow.status === 'Aktif' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  {selectedRow.status}
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold">
                  Prodi: {selectedRow.programStudi || 'S1 Farmasi'}
                </span>
              </div>

              <div className="w-full mt-4 pt-3.5 border-t border-border/60">
                <div className="bg-card border rounded-xl p-2.5 flex flex-col gap-0.5 text-center text-xs">
                  <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
                    {selectedRow.role === 'Mahasiswa' ? 'NIM' : selectedRow.role === 'Dosen' ? 'NIP / NIDN' : 'NIP / ID'}
                  </span>
                  <strong className="text-foreground/90 font-mono text-sm tracking-wide">{selectedRow.identifier}</strong>
                </div>
              </div>
            </div>

            {/* Detail Kontak & Data Diri */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-widest border-b pb-2 flex items-center gap-1.5">
                <UserCircle size={14} className="text-primary" /> Kontak & Informasi Personal
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-muted/20 border rounded-xl space-y-1">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Email Terdaftar</span>
                  <strong className="text-foreground/90 font-semibold block truncate">{selectedRow.email || '-'}</strong>
                </div>

                <div className="p-3 bg-muted/20 border rounded-xl space-y-1">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">No. HP / WhatsApp</span>
                  <strong className="text-foreground/90 font-semibold block">{selectedRow.phone || '-'}</strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </BaseModal>

    </MainLayout>
  );
};

export default AdminMasterDataPage;
