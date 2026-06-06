import React, { useState, useEffect, useRef } from 'react';
import ContentWrapper from '../../../components/ContentWrapper';
import MainLayout from '../../../layouts/MainLayout';
import DataTable from '../../../components/ui/DataTable';
import Button from '../../../components/ui/Button';
import BaseModal from '../../../components/ui/BaseModal';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import { 
  Plus, Search, Lock, Unlock, Eye, EyeOff, Pencil, CheckCircle2, 
  UserCircle, Mail, Phone, MapPin, Calendar, Briefcase, BookOpen, Shield
} from 'lucide-react';
import {
  adminApi,
} from '../../../core/api/domain';
import {
  loadAdminAccounts,
  saveAdminAccounts,
} from '../../../core/services/admin-data-service';

// Default form data template (simplified)
const defaultFormData = {
  id: '',
  role: 'Mahasiswa',
  name: '',
  identifier: '',
  email: '',
  password: '',
  status: 'Aktif',
};

const AdminUserManagementPage: React.FC = () => {
  const hasLoadedAccounts = useRef(false);
  // Mapped accounts state
  const [accounts, setAccounts] = useState<any[]>(() => loadAdminAccounts());

  useEffect(() => {
    let mounted = true;

    adminApi
      .listUsers()
      .then((response) => {
        if (mounted) {
          setAccounts(response.data);
        }
      })
      .catch(() => {
        if (mounted) {
          setAccounts(loadAdminAccounts());
        }
      })
      .finally(() => {
        if (mounted) {
          hasLoadedAccounts.current = true;
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Keep account storage/API in sync whenever accounts change.
  useEffect(() => {
    if (!hasLoadedAccounts.current) return;

    adminApi.replaceUsers(accounts).catch(() => {
      saveAdminAccounts(accounts);
    });
  }, [accounts]);

  const [activeTab, setActiveTab] = useState<string>('Semua Akun');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  
  // Selection states
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [accountToToggleStatus, setAccountToToggleStatus] = useState<any>(null);
  const [formData, setFormData] = useState(defaultFormData);
  
  // Password visibility state
  const [showPassword, setShowPassword] = useState(false);
  
  // Success toast notice state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  // Filter accounts by active tab and search query
  const filteredAccounts = accounts.filter(acc => {
    const matchesTab = activeTab === 'Semua Akun' || acc.role === activeTab;
    const matchesSearch = 
      acc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      acc.identifier.includes(searchTerm) || 
      (acc.email && acc.email.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  // Calculate tab sizes dynamically
  const getCountForTab = (tab: string) => {
    if (tab === 'Semua Akun') return accounts.length;
    return accounts.filter(acc => acc.role === tab).length;
  };

  // Open creation modal
  const handleOpenCreate = () => {
    setFormData({
      ...defaultFormData,
      role: 'Mahasiswa',
    });
    setShowPassword(false);
    setIsCreateModalOpen(true);
  };

  // Open edit modal
  const handleOpenEdit = (account: any) => {
    setSelectedAccount(account);
    setFormData({
      id: account.id,
      role: account.role,
      name: account.name,
      identifier: account.identifier,
      email: account.email || '',
      password: '',
      status: account.status,
    });
    setShowPassword(false);
    setIsEditModalOpen(true);
  };

  // Open detail modal
  const handleOpenDetail = (account: any) => {
    setSelectedAccount(account);
    setIsDetailModalOpen(true);
  };

  // Confirm lock/unlock account status
  const handleConfirmToggleStatus = (account: any) => {
    setAccountToToggleStatus(account);
    setIsConfirmModalOpen(true);
  };

  // Perform active/inactive status toggle
  const handleToggleStatus = () => {
    if (!accountToToggleStatus) return;
    
    const isDeactivating = accountToToggleStatus.status === 'Aktif';
    const updatedStatus = isDeactivating ? 'Nonaktif' : 'Aktif';
    
    setAccounts(prev => prev.map(acc => {
      if (acc.id === accountToToggleStatus.id) {
        return { ...acc, status: updatedStatus };
      }
      return acc;
    }));

    setIsConfirmModalOpen(false);
    triggerToast(
      `Akun ${accountToToggleStatus.name} berhasil ${isDeactivating ? 'dinonaktifkan' : 'diaktifkan kembali'}!`
    );
    setAccountToToggleStatus(null);
  };

  // Form submission handler
  const handleFormSubmit = (e: React.FormEvent, mode: 'create' | 'edit') => {
    e.preventDefault();

    if (!formData.name || !formData.identifier) {
      alert('Nama Lengkap dan Username / ID Pengguna wajib diisi!');
      return;
    }

    if (mode === 'create') {
      const hasInitialPassword = formData.password.trim().length > 0;

      const newAccount = {
        id: `acc_${Date.now()}`,
        name: formData.name,
        identifier: formData.identifier,
        email: formData.email,
        role: formData.role,
        passwordStatus: hasInitialPassword ? 'Diatur awal' : 'Perlu aktivasi/reset',
        passwordUpdatedAt: hasInitialPassword ? new Date().toISOString() : null,
        status: 'Aktif',
        // Sensible profile fallbacks so details modal still renders beautifully
        phone: '',
        gender: 'Laki-laki',
        tanggalLahir: '2000-01-01',
        alamat: '',
        programStudi: 'S1 Farmasi',
        ...(formData.role === 'Mahasiswa' ? {
          angkatan: '2022',
          kelas: 'FA-22-01',
          skemaTA: 'Skripsi',
          jenisTA: 'Penelitian',
          tahapanAktif: 'Bimbingan',
        } : formData.role === 'Dosen' ? {
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

      setAccounts(prev => [newAccount, ...prev]);
      setIsCreateModalOpen(false);
      triggerToast(
        `Akun ${formData.name} berhasil dibuat. Password tidak disimpan atau ditampilkan ulang.`
      );
    } else {
      const shouldResetPassword = formData.password.trim().length > 0;
      // Edit mode submit
      setAccounts(prev => prev.map(acc => {
        if (acc.id === selectedAccount.id) {
          return {
            ...acc,
            name: formData.name,
            identifier: formData.identifier,
            email: formData.email,
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
      setIsEditModalOpen(false);
      triggerToast(
        shouldResetPassword
          ? `Akun ${formData.name} berhasil diperbarui dan password ditandai untuk reset.`
          : `Akun ${formData.name} berhasil diperbarui!`
      );
    }
  };

  const columns = [
    { 
      key: 'name', 
      label: 'Nama Lengkap',
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-primary shrink-0">
            {row.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-foreground text-xs leading-snug">{row.name}</p>
            <p className="text-[10px] text-muted-foreground">{row.email || 'Email belum diatur'}</p>
          </div>
        </div>
      )
    },
    { 
      key: 'identifier', 
      label: 'NIM / NIP',
      render: (row: any) => (
        <span className="font-mono text-xs font-semibold">{row.identifier}</span>
      )
    },
    { 
      key: 'role', 
      label: 'Role',
      render: (row: any) => {
        let themeClasses = "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-400";
        if (row.role === 'Mahasiswa') {
          themeClasses = "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-900 dark:text-blue-400";
        } else if (row.role === 'Dosen') {
          themeClasses = "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-400";
        } else if (row.role === 'Koordinator') {
          themeClasses = "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900 dark:text-indigo-400";
        }
        return (
          <span className={`px-2 py-0.5 rounded border text-[10px] font-bold tracking-wide uppercase select-none ${themeClasses}`}>
            {row.role}
          </span>
        );
      }
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (row: any) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border select-none ${
          row.status === 'Aktif' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-400' 
            : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-900 dark:text-red-400'
        }`}>
          {row.status}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (row: any) => (
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            title="Lihat Detail"
            onClick={() => handleOpenDetail(row)}
            className="flex items-center gap-1 text-slate-600 border-slate-200 hover:bg-slate-50"
          >
            <Eye size={12} /> Detail
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            title="Edit Akun"
            onClick={() => handleOpenEdit(row)}
            className="flex items-center gap-1 text-primary border-primary/20 hover:bg-primary/5"
          >
            <Pencil size={12} /> Edit
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            title={row.status === 'Aktif' ? 'Kunci Akun' : 'Aktifkan Akun'}
            onClick={() => handleConfirmToggleStatus(row)}
            className={`flex items-center gap-1 border transition-colors ${
              row.status === 'Aktif' 
                ? 'border-red-200 text-red-600 hover:bg-red-50' 
                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 bg-emerald-50/[0.2]'
            }`}
          >
            {row.status === 'Aktif' ? <Lock size={12} /> : <Unlock size={12} />}
            <span>{row.status === 'Aktif' ? 'Kunci' : 'Buka'}</span>
          </Button>
        </div>
      )
    }
  ];

  return (
    <MainLayout>
      {/* Dynamic Success Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-2.5 max-w-sm animate-fade-in border border-slate-800 dark:border-slate-200 animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 stroke-[2.5]" />
          <p className="text-xs font-semibold leading-relaxed">{toastMessage}</p>
        </div>
      )}

      <ContentWrapper
        title="Kelola Akun"
        description="Manajemen akun civitas akademika Mahasiswa, Dosen, dan Koordinator."
        headerRight={
          <Button className="flex items-center gap-2" onClick={handleOpenCreate}>
            <Plus size={16} /> Buat Akun Baru
          </Button>
        }
      >
        {/* Horizontal Sub Navigation Tabs */}
        <div className="flex border-b border-border mb-6 overflow-x-auto whitespace-nowrap scrollbar-none">
          {['Semua Akun', 'Mahasiswa', 'Dosen', 'Koordinator'].map((roleTab) => {
            const isActive = activeTab === roleTab;
            const count = getCountForTab(roleTab);
            return (
              <button
                key={roleTab}
                onClick={() => setActiveTab(roleTab)}
                className={`px-5 py-3 text-xs font-semibold border-b-2 transition-all duration-200 -mb-[1px] flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'border-primary text-primary font-bold bg-primary/[0.02]'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                {roleTab}
                <span className={`text-[9px] px-2 py-0.5 rounded-full ${
                  isActive 
                    ? 'bg-primary text-primary-foreground font-bold' 
                    : 'bg-muted text-muted-foreground font-semibold'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input 
              type="text" 
              placeholder="Cari berdasarkan nama, email, NIM, atau NIP..." 
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-xs text-foreground bg-background transition"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Accounts DataTable */}
        <div className="border border-border/80 rounded-xl overflow-hidden bg-card shadow-xs">
          <DataTable 
            data={filteredAccounts} 
            columns={columns} 
          />
        </div>
      </ContentWrapper>

      {/* ==================================== MODAL: BUAT / EDIT AKUN ==================================== */}
      <BaseModal
        open={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
        }}
        title={isCreateModalOpen ? "Buat Akun Baru" : "Edit Informasi Akun"}
        maxWidth="lg"
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setIsCreateModalOpen(false);
                setIsEditModalOpen(false);
              }}
              className="px-4 py-2 border hover:bg-muted text-foreground font-semibold rounded-xl text-xs transition"
            >
              Batal
            </button>
            <button
              onClick={(e) => handleFormSubmit(e, isCreateModalOpen ? 'create' : 'edit')}
              className="px-5 py-2 bg-primary text-primary-foreground hover:opacity-90 font-bold rounded-xl text-xs transition"
            >
              {isCreateModalOpen ? "Buat Akun" : "Simpan Perubahan"}
            </button>
          </div>
        }
      >
        <form className="space-y-4">
          {/* 1. Seleksi Role */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Role Akun</label>
            <select
              value={formData.role}
              disabled={isEditModalOpen}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
              className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition font-semibold"
            >
              <option value="Mahasiswa">Mahasiswa</option>
              <option value="Dosen">Dosen</option>
              <option value="Koordinator">Koordinator</option>
            </select>
          </div>

          {/* 2. Nama Lengkap */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Nama Lengkap</label>
            <input
              type="text"
              required
              placeholder="Nama lengkap civitas akademika..."
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
            />
          </div>

          {/* 3. Username / ID Pengguna */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">
              {formData.role === 'Mahasiswa' ? 'Username / ID Pengguna (NIM)' : formData.role === 'Dosen' ? 'Username / ID Pengguna (NIDN / NIP)' : 'Username / ID Pengguna (NIP / ID)'}
            </label>
            <input
              type="text"
              required
              placeholder={formData.role === 'Mahasiswa' ? 'Masukkan NIM...' : formData.role === 'Dosen' ? 'Masukkan NIDN/NIP...' : 'Masukkan NIP/ID koordinator...'}
              value={formData.identifier}
              onChange={(e) => setFormData(prev => ({ ...prev, identifier: e.target.value }))}
              className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition font-mono font-semibold"
            />
          </div>

          {/* 4. Email (Opsional) */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Email</label>
              <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Opsional</span>
            </div>
            <input
              type="email"
              placeholder="contoh@pharmsita.ac.id"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
            />
          </div>

          {/* 5. Password awal / reset */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">
              {isCreateModalOpen ? 'Password Awal' : 'Reset Password'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder={isCreateModalOpen ? "Opsional: isi password awal..." : "Opsional: isi password reset..."}
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
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
        </form>
      </BaseModal>


      {/* ==================================== MODAL: LIHAT DETAIL AKUN ==================================== */}
      <BaseModal
        open={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Detail Profil Pengguna"
        maxWidth="lg"
      >
        {selectedAccount && (
          <div className="space-y-6">
            {/* Header Identitas Card */}
            <div className="bg-muted/30 border border-border/80 rounded-2xl p-5 flex flex-col items-center text-center shadow-3xs relative overflow-hidden">
              {/* Role Indicator Banner */}
              <div className={`absolute top-3 right-3 text-[9px] font-extrabold uppercase px-2 py-0.5 border rounded-md tracking-wider ${
                selectedAccount.role === 'Mahasiswa' 
                  ? 'bg-blue-50 border-blue-200 text-blue-700' 
                  : selectedAccount.role === 'Dosen'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-700'
              }`}>
                {selectedAccount.role}
              </div>

              {/* Avatar Container */}
              <div className="relative mb-3.5 mt-2">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center font-extrabold text-2xl text-white shadow-md overflow-hidden bg-gradient-to-br ${
                  selectedAccount.role === 'Mahasiswa'
                    ? 'from-blue-600 to-indigo-600'
                    : selectedAccount.role === 'Dosen'
                      ? 'from-emerald-600 to-teal-600'
                      : 'from-indigo-600 to-purple-600'
                }`}>
                  {selectedAccount.name.substring(0, 2).toUpperCase()}
                </div>
              </div>

              <h3 className="text-base font-bold text-foreground leading-snug">{selectedAccount.name}</h3>
              
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border select-none ${
                  selectedAccount.status === 'Aktif' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  {selectedAccount.status}
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold">
                  Program Studi: {selectedAccount.programStudi || 'S1 Farmasi'}
                </span>
              </div>

              {/* Main Identifier */}
              <div className="w-full mt-4 pt-3.5 border-t border-border/60">
                <div className="bg-card border rounded-xl p-2.5 flex flex-col gap-0.5 text-center text-xs">
                  <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
                    {selectedAccount.role === 'Mahasiswa' ? 'NIM' : selectedAccount.role === 'Dosen' ? 'NIP / NIDN' : 'NIP / ID'}
                  </span>
                  <strong className="text-foreground/90 font-mono text-sm tracking-wide">{selectedAccount.identifier}</strong>
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
                  <div className="flex items-center gap-1.5 font-semibold text-foreground/90">
                    <Mail size={12} className="text-muted-foreground/80 shrink-0" />
                    <span className="truncate">{selectedAccount.email || '-'}</span>
                  </div>
                </div>

                <div className="p-3 bg-muted/20 border rounded-xl space-y-1">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">No. HP / WhatsApp</span>
                  <div className="flex items-center gap-1.5 font-semibold text-foreground/90">
                    <Phone size={12} className="text-muted-foreground/80 shrink-0" />
                    <span>{selectedAccount.phone || '-'}</span>
                  </div>
                </div>

                <div className="p-3 bg-muted/20 border rounded-xl space-y-1">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Jenis Kelamin</span>
                  <strong className="text-foreground/90 font-semibold block">{selectedAccount.gender || 'Laki-laki'}</strong>
                </div>

                <div className="p-3 bg-muted/20 border rounded-xl space-y-1">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Tanggal Lahir</span>
                  <div className="flex items-center gap-1.5 font-semibold text-foreground/90">
                    <Calendar size={12} className="text-muted-foreground/80 shrink-0" />
                    <span className="font-mono">{selectedAccount.tanggalLahir || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Keamanan Password */}
              <div className="p-3 bg-muted/20 border rounded-xl space-y-1 text-xs">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Keamanan Password</span>
                <p className="text-foreground/80 font-medium leading-relaxed">
                  Password tidak dapat dilihat ulang. Gunakan aksi edit akun untuk mengatur password awal atau melakukan reset.
                </p>
              </div>

              <div className="p-3 bg-muted/20 border rounded-xl space-y-1 text-xs">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Alamat Domisili</span>
                <div className="flex items-start gap-1.5 text-foreground/80 font-medium leading-relaxed">
                  <MapPin size={12} className="text-muted-foreground/80 shrink-0 mt-0.5" />
                  <p>{selectedAccount.alamat || 'Alamat belum dilengkapi.'}</p>
                </div>
              </div>
            </div>

            {/* Detail Akademik / Pekerjaan (Role Spesifik) */}
            <div className="space-y-4 pt-1">
              {/* MAHASISWA RENDER */}
              {selectedAccount.role === 'Mahasiswa' && (
                <>
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-widest border-b pb-2 flex items-center gap-1.5">
                    <BookOpen size={14} className="text-primary" /> Rincian Tugas Akhir
                  </h4>

                  <div className="p-3.5 bg-muted/[0.15] border rounded-xl space-y-3.5 text-xs">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-muted-foreground select-none">
                        {selectedAccount.skemaTA || 'Skripsi'} — {selectedAccount.jenisTA || 'Penelitian'}
                      </span>
                      <span className="text-[9px] font-extrabold text-primary bg-primary/[0.05] border border-primary/10 px-2.5 py-0.5 rounded-full select-none uppercase tracking-wide">
                        Tahap: {selectedAccount.tahapanAktif || 'Bimbingan'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground/80 tracking-wider">Judul Usulan Tugas Akhir</span>
                      <p className="font-bold text-foreground leading-relaxed">
                        {selectedAccount.judulTA || 'Belum mengajukan atau merekam judul TA.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1.5">
                      <div className="p-2.5 bg-card border rounded-lg space-y-0.5">
                        <span className="text-[9px] text-muted-foreground block font-bold">Pembimbing Utama (1)</span>
                        <strong className="text-foreground/90">{selectedAccount.pembimbing1 || '-'}</strong>
                      </div>
                      <div className="p-2.5 bg-card border rounded-lg space-y-0.5">
                        <span className="text-[9px] text-muted-foreground block font-bold">Pembimbing Pendamping (2)</span>
                        <strong className="text-foreground/90">{selectedAccount.pembimbing2 || '-'}</strong>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* DOSEN RENDER */}
              {selectedAccount.role === 'Dosen' && (
                <>
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-widest border-b pb-2 flex items-center gap-1.5">
                    <Briefcase size={14} className="text-primary" /> Otoritas & Kapasitas Bimbingan
                  </h4>

                  <div className="space-y-3.5 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 bg-muted/20 border rounded-xl space-y-1">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Jabatan Akademik</span>
                        <strong className="text-foreground/90 font-semibold block">{selectedAccount.jabatanAkademik || 'Lektor'}</strong>
                      </div>

                      <div className="p-3 bg-muted/20 border rounded-xl space-y-1">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Peran dalam Sistem</span>
                        <div className="flex gap-1 flex-wrap mt-1">
                          {selectedAccount.peranSistem && (Array.isArray(selectedAccount.peranSistem) ? selectedAccount.peranSistem : [selectedAccount.peranSistem]).map((peran: string, i: number) => (
                            <span key={i} className="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded">
                              {peran}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-muted/20 border rounded-xl space-y-1 text-xs">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Fokus Keahlian & Riset</span>
                      <div className="flex gap-1.5 flex-wrap mt-1">
                        {(selectedAccount.bidangKeahlian || '').split(',').map((bidang: string, i: number) => {
                          const trimBidang = bidang.trim();
                          if (!trimBidang) return null;
                          return (
                            <span key={i} className="text-[9px] font-bold px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full">
                              {trimBidang}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2 pt-1.5">
                      <span className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Kapasitas Slot Bimbingan Aktif</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div className="bg-muted/10 border rounded-xl p-3 space-y-1.5">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="font-bold text-muted-foreground">SLOT PEMBIMBING UTAMA</span>
                            <span className="font-mono font-extrabold text-primary">{selectedAccount.kuotaTerpakaiPembimbing1 || 0}/{selectedAccount.kuotaPembimbing1 || 8}</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full transition-all" 
                              style={{ width: `${((selectedAccount.kuotaTerpakaiPembimbing1 || 0) / (selectedAccount.kuotaPembimbing1 || 8)) * 100}%` }}
                            />
                          </div>
                        </div>

                        <div className="bg-muted/10 border rounded-xl p-3 space-y-1.5">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="font-bold text-muted-foreground">SLOT PEMBIMBING PENDAMPING</span>
                            <span className="font-mono font-extrabold text-primary">{selectedAccount.kuotaTerpakaiPembimbing2 || 0}/{selectedAccount.kuotaPembimbing2 || 8}</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500 rounded-full transition-all" 
                              style={{ width: `${((selectedAccount.kuotaTerpakaiPembimbing2 || 0) / (selectedAccount.kuotaPembimbing2 || 8)) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* KOORDINATOR RENDER */}
              {selectedAccount.role === 'Koordinator' && (
                <>
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-widest border-b pb-2 flex items-center gap-1.5">
                    <Shield size={14} className="text-primary" /> Otoritas Kebijakan Struktural
                  </h4>

                  <div className="space-y-3.5 text-xs">
                    <div className="p-3 bg-muted/20 border rounded-xl space-y-1">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Jabatan Struktural</span>
                      <strong className="text-foreground/90 font-semibold block">{selectedAccount.jabatan || 'Koordinator Tugas Akhir'}</strong>
                    </div>

                    <div className="space-y-2 pt-1">
                      <span className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Daftar Hak Akses Manajemen</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(selectedAccount.hakAksesUtama || []).map((hak: string, i: number) => (
                          <div key={i} className="flex items-center gap-2 p-2 bg-muted/20 border rounded-lg text-foreground/80 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>{hak}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </BaseModal>


      {/* ==================================== MODAL: KONFIRMASI STATUS (LOCK) ==================================== */}
      {accountToToggleStatus && (
        <ConfirmModal
          open={isConfirmModalOpen}
          onClose={() => {
            setIsConfirmModalOpen(false);
            setAccountToToggleStatus(null);
          }}
          title={accountToToggleStatus.status === 'Aktif' ? "Kunci / Nonaktifkan Akun" : "Aktifkan Kembali Akun"}
          description={
            accountToToggleStatus.status === 'Aktif' 
              ? `Apakah Anda yakin ingin menonaktifkan akun milik ${accountToToggleStatus.name}? Setelah dinonaktifkan, pengguna tidak akan dapat login ke sistem PharmSita.` 
              : `Apakah Anda yakin ingin membuka kunci dan mengaktifkan kembali akun milik ${accountToToggleStatus.name}?`
          }
          cancelText="Batal"
          confirmText={accountToToggleStatus.status === 'Aktif' ? "Kunci Akun" : "Aktifkan"}
          onConfirm={handleToggleStatus}
        />
      )}
    </MainLayout>
  );
};

export default AdminUserManagementPage;
