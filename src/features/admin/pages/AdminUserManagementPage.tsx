import React, { useState, useEffect } from 'react';
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
import { ApiError } from '../../../core/api/api-types';
import {
  loadAdminAccounts,
  type AdminAccount,
} from '../../../core/services/admin-data-service';

type AdminRoleKey = 'mahasiswa' | 'dosen' | 'koordinator' | 'kaprodi' | 'dekan' | 'admin';
type AdminRoleLabel = 'Mahasiswa' | 'Dosen' | 'Koordinator' | 'Kaprodi' | 'Dekan' | 'Admin';
type FormErrors = Record<string, string>;

const roleTabs: Array<'Semua Akun' | AdminRoleLabel> = ['Semua Akun', 'Mahasiswa', 'Dosen', 'Koordinator', 'Kaprodi', 'Dekan', 'Admin'];
const roleOptions: AdminRoleLabel[] = ['Mahasiswa', 'Dosen', 'Koordinator', 'Kaprodi', 'Dekan', 'Admin'];

const normalizeAdminRole = (role: unknown): AdminRoleKey => {
  const normalized = String(role || '').trim().toLowerCase();

  if (normalized === 'dosen') return 'dosen';
  if (normalized === 'koordinator' || normalized === 'kordinator') return 'koordinator';
  if (normalized === 'kaprodi' || normalized === 'kepala program studi' || normalized === 'kepala-program-studi') return 'kaprodi';
  if (normalized === 'dekan') return 'dekan';
  if (normalized === 'admin') return 'admin';
  return 'mahasiswa';
};

const getRoleLabel = (role: unknown): AdminRoleLabel => {
  const roleKey = normalizeAdminRole(role);

  if (roleKey === 'dosen') return 'Dosen';
  if (roleKey === 'koordinator') return 'Koordinator';
  if (roleKey === 'kaprodi') return 'Kaprodi';
  if (roleKey === 'dekan') return 'Dekan';
  if (roleKey === 'admin') return 'Admin';
  return 'Mahasiswa';
};

const getRoleThemeClasses = (role: unknown) => {
  const roleKey = normalizeAdminRole(role);

  if (roleKey === 'mahasiswa') {
    return "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-900 dark:text-blue-400";
  }
  if (roleKey === 'dosen') {
    return "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-400";
  }
  if (roleKey === 'koordinator') {
    return "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900 dark:text-indigo-400";
  }
  if (roleKey === 'kaprodi') {
    return "bg-cyan-50 border-cyan-200 text-cyan-700 dark:bg-cyan-950/20 dark:border-cyan-900 dark:text-cyan-400";
  }
  if (roleKey === 'dekan') {
    return "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-400";
  }
  return "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-400";
};

const getRoleAvatarGradient = (role: unknown) => {
  const roleKey = normalizeAdminRole(role);

  if (roleKey === 'mahasiswa') return 'from-blue-600 to-indigo-600';
  if (roleKey === 'dosen') return 'from-emerald-600 to-teal-600';
  if (roleKey === 'koordinator') return 'from-indigo-600 to-violet-600';
  if (roleKey === 'kaprodi') return 'from-cyan-600 to-blue-600';
  if (roleKey === 'dekan') return 'from-amber-600 to-orange-600';
  return 'from-rose-600 to-slate-700';
};

const isRole = (account: AdminAccount, role: AdminRoleKey) => normalizeAdminRole(account.role) === role;

const getIdentifierLabel = (role: unknown) => {
  const roleKey = normalizeAdminRole(role);

  if (roleKey === 'mahasiswa') return 'NIM';
  if (roleKey === 'dosen') return 'NIP / NIDN';
  if (roleKey === 'koordinator') return 'NIP / ID';
  if (roleKey === 'kaprodi') return 'NIP / ID Kaprodi';
  if (roleKey === 'dekan') return 'NIP / ID Dekan';
  return 'Username / ID Admin';
};

const getProgramOrDivision = (account: AdminAccount) => {
  const roleKey = normalizeAdminRole(account.role);

  if (roleKey === 'admin') return account.divisi || 'Administrasi PharmSITA';
  return account.programStudi || 'S1 Farmasi';
};

const toTextList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const toTextValue = (value: unknown) => toTextList(value).join(', ');

const apiFieldMap: Record<string, string> = {
  'body.name': 'name',
  'body.identifier': 'identifier',
  'body.email': 'email',
  'body.password': 'password',
  'body.role': 'role',
  'body.status': 'status',
  'body.gender': 'gender',
  'body.birthDate': 'birthDate',
  'body.skemaTA': 'skemaTA',
  'body.tingkatAkses': 'tingkatAkses',
};

const firstErrorMessage = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean)[0];
  }

  return typeof value === 'string' ? value : undefined;
};

const parseAdminUserApiError = (error: unknown): FormErrors => {
  if (!(error instanceof ApiError)) {
    return { general: 'Akun gagal disimpan. Periksa data atau coba lagi.' };
  }

  const errors: FormErrors = {};
  const details = error.payload.details;

  if (details && typeof details === 'object' && !Array.isArray(details)) {
    Object.entries(details as Record<string, unknown>).forEach(([key, value]) => {
      const mappedKey = apiFieldMap[key] || key.replace(/^body\./, '');
      const message = firstErrorMessage(value);
      if (message) {
        errors[mappedKey] = message;
      }
    });
  }

  if (error.payload.code === 'CONFLICT' && !errors.identifier) {
    errors.identifier = error.payload.message;
  }

  return Object.keys(errors).length > 0
    ? errors
    : { general: error.payload.message || 'Akun gagal disimpan.' };
};

// Default form data template (simplified)
const defaultFormData = {
  id: '',
  role: 'Mahasiswa',
  name: '',
  identifier: '',
  email: '',
  password: '',
  status: 'Aktif',
  phone: '',
  address: '',
  gender: 'Laki-laki',
  birthDate: '',
  programStudi: 'S1 Farmasi',
  angkatan: '',
  kelas: '',
  skemaTA: 'Skripsi',
  jenisTA: 'Penelitian',
  nidn: '',
  bidangKeahlianText: '',
  jabatanAkademik: '',
  peranSistemText: '',
  jabatan: '',
  hakAksesUtamaText: '',
  divisi: '',
  tingkatAkses: 'Admin Prodi',
  cakupanAksesText: '',
};

const AdminUserManagementPage: React.FC = () => {
  // Mapped accounts state
  const [accounts, setAccounts] = useState<AdminAccount[]>(() => loadAdminAccounts());

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

    return () => {
      mounted = false;
    };
  }, []);

  const [activeTab, setActiveTab] = useState<string>('Semua Akun');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  
  // Selection states
  const [selectedAccount, setSelectedAccount] = useState<AdminAccount | null>(null);
  const [accountToToggleStatus, setAccountToToggleStatus] = useState<AdminAccount | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  
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

  const clearFormError = (field: string) => {
    setFormErrors((prev) => {
      if (!prev[field] && !prev.general) return prev;
      const { [field]: _fieldError, general: _generalError, ...rest } = prev;
      return rest;
    });
  };

  const updateFormField = (field: keyof typeof defaultFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    clearFormError(field);
  };

  const validateFormBeforeSubmit = () => {
    const errors: FormErrors = {};

    if (!formData.name.trim()) {
      errors.name = 'Nama lengkap wajib diisi.';
    }

    if (!formData.identifier.trim()) {
      errors.identifier = 'Username / ID pengguna wajib diisi.';
    }

    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Format email tidak valid.';
    }

    if (formData.password.trim() && formData.password.trim().length < 8) {
      errors.password = isCreateModalOpen
        ? 'Password awal minimal 8 karakter.'
        : 'Password reset minimal 8 karakter.';
    }

    if (formData.birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(formData.birthDate)) {
      errors.birthDate = 'Tanggal lahir harus format YYYY-MM-DD.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Filter accounts by active tab and search query
  const filteredAccounts = accounts.filter(acc => {
    const matchesTab = activeTab === 'Semua Akun' || getRoleLabel(acc.role) === activeTab;
    const matchesSearch =
      String(acc.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(acc.identifier || '').includes(searchTerm) ||
      (acc.email && String(acc.email).toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  // Calculate tab sizes dynamically
  const getCountForTab = (tab: string) => {
    if (tab === 'Semua Akun') return accounts.length;
    return accounts.filter(acc => getRoleLabel(acc.role) === tab).length;
  };

  // Open creation modal
  const handleOpenCreate = () => {
    setFormErrors({});
    setFormData({
      ...defaultFormData,
      role: 'Mahasiswa',
      programStudi: 'S1 Farmasi',
      angkatan: '2022',
      kelas: 'FA-22-01',
    });
    setShowPassword(false);
    setIsCreateModalOpen(true);
  };

  // Open edit modal
  const handleOpenEdit = (account: AdminAccount) => {
    setFormErrors({});
    setSelectedAccount(account);
    setFormData({
      id: account.id,
      role: getRoleLabel(account.role),
      name: account.name,
      identifier: account.identifier,
      email: account.email || '',
      password: '',
      status: account.status,
      phone: account.phone || '',
      address: account.address || account.alamat || '',
      gender: account.gender || 'Laki-laki',
      birthDate: account.birthDate || account.tanggalLahir || '',
      programStudi: account.programStudi || 'S1 Farmasi',
      angkatan: account.angkatan || '',
      kelas: account.kelas || '',
      skemaTA: account.skemaTA || 'Skripsi',
      jenisTA: account.jenisTA || 'Penelitian',
      nidn: account.nidn || account.identifier || '',
      bidangKeahlianText: toTextValue(account.bidangKeahlian),
      jabatanAkademik: account.jabatanAkademik || '',
      peranSistemText: toTextValue(account.peranSistem),
      jabatan: account.jabatan || '',
      hakAksesUtamaText: toTextValue(account.hakAksesUtama),
      divisi: account.divisi || '',
      tingkatAkses: account.tingkatAkses || 'Admin Prodi',
      cakupanAksesText: toTextValue(account.cakupanAkses),
    });
    setShowPassword(false);
    setIsEditModalOpen(true);
  };

  // Open detail modal
  const handleOpenDetail = (account: AdminAccount) => {
    setSelectedAccount(account);
    setIsDetailModalOpen(true);
  };

  // Confirm lock/unlock account status
  const handleConfirmToggleStatus = (account: AdminAccount) => {
    setAccountToToggleStatus(account);
    setIsConfirmModalOpen(true);
  };

  // Perform active/inactive status toggle
  const handleToggleStatus = async () => {
    if (!accountToToggleStatus) return;
    
    const isDeactivating = accountToToggleStatus.status === 'Aktif';
    const updatedStatus = isDeactivating ? 'Nonaktif' : 'Aktif';

    try {
      const response = await adminApi.updateUserStatus(accountToToggleStatus.id, updatedStatus);

      setAccounts(prev => prev.map(acc => {
        if (acc.id === accountToToggleStatus.id) {
          return response.data;
        }
        return acc;
      }));

      setIsConfirmModalOpen(false);
      triggerToast(
        `Akun ${accountToToggleStatus.name} berhasil ${isDeactivating ? 'dinonaktifkan' : 'diaktifkan kembali'}!`
      );
      setAccountToToggleStatus(null);
    } catch {
      triggerToast('Status akun gagal diperbarui. Silakan coba lagi.');
    }
  };

  const buildRoleProfilePayload = (): Partial<AdminAccount> => {
    const role = getRoleLabel(formData.role);
    const commonProfile: Partial<AdminAccount> = {
      phone: formData.phone,
      address: formData.address,
      alamat: formData.address,
      gender: formData.gender,
      birthDate: formData.birthDate,
      tanggalLahir: formData.birthDate,
    };

    if (role === 'Mahasiswa') {
      return {
        ...commonProfile,
        nim: formData.identifier,
        programStudi: formData.programStudi,
        angkatan: formData.angkatan,
        kelas: formData.kelas,
        skemaTA: formData.skemaTA,
        jenisTA: formData.jenisTA,
      };
    }

    if (role === 'Dosen') {
      return {
        ...commonProfile,
        nidn: formData.nidn || formData.identifier,
        programStudi: formData.programStudi,
        bidangKeahlian: toTextList(formData.bidangKeahlianText),
        jabatanAkademik: formData.jabatanAkademik,
        peranSistem: toTextList(formData.peranSistemText),
      };
    }

    if (role === 'Koordinator' || role === 'Kaprodi' || role === 'Dekan') {
      return {
        ...commonProfile,
        programStudi: formData.programStudi,
        jabatan: formData.jabatan,
        hakAksesUtama: toTextList(formData.hakAksesUtamaText),
      };
    }

    return {
      ...commonProfile,
      divisi: formData.divisi,
      tingkatAkses: formData.tingkatAkses,
      cakupanAkses: toTextList(formData.cakupanAksesText),
    };
  };

  // Form submission handler
  const handleFormSubmit = async (e: React.FormEvent, mode: 'create' | 'edit') => {
    e.preventDefault();

    if (!validateFormBeforeSubmit()) {
      return;
    }

    setFormErrors({});

    try {
      if (mode === 'create') {
        const hasInitialPassword = formData.password.trim().length > 0;

        const newAccount: AdminAccount = {
          name: formData.name,
          identifier: formData.identifier,
          email: formData.email,
          role: formData.role,
          ...(hasInitialPassword ? { password: formData.password.trim() } : {}),
          status: 'Aktif',
          ...buildRoleProfilePayload(),
        };

        const response = await adminApi.createUser(newAccount);
        setAccounts(prev => [response.data, ...prev.filter((account) => account.id !== response.data.id)]);
        setIsCreateModalOpen(false);
        triggerToast(
          `Akun ${formData.name} berhasil dibuat. Password tidak disimpan atau ditampilkan ulang.`
        );
      } else {
        if (!selectedAccount) return;

        const shouldResetPassword = formData.password.trim().length > 0;
        const updateResponse = await adminApi.updateUser(selectedAccount.id, {
          name: formData.name,
          identifier: formData.identifier,
          email: formData.email,
          ...buildRoleProfilePayload(),
        });
        const finalAccount = shouldResetPassword
          ? (await adminApi.resetUserPassword(selectedAccount.id, formData.password.trim())).data
          : updateResponse.data;

        setAccounts(prev => prev.map(acc => (
          acc.id === selectedAccount.id ? finalAccount : acc
        )));
        setIsEditModalOpen(false);
        triggerToast(
          shouldResetPassword
            ? `Akun ${formData.name} berhasil diperbarui dan password ditandai untuk reset.`
            : `Akun ${formData.name} berhasil diperbarui!`
        );
      }
    } catch (error) {
      setFormErrors(parseAdminUserApiError(error));
      triggerToast('Akun gagal disimpan. Periksa pesan pada form.');
    }
  };

  const columns = [
    { 
      key: 'name', 
      label: 'Nama Lengkap',
      render: (row: AdminAccount) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-primary shrink-0">
            {String(row.name || '?').substring(0, 2).toUpperCase()}
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
      render: (row: AdminAccount) => (
        <span className="font-mono text-xs font-semibold">{row.identifier}</span>
      )
    },
    { 
      key: 'role', 
      label: 'Role',
      render: (row: AdminAccount) => {
        const themeClasses = getRoleThemeClasses(row.role);
        return (
          <span className={`px-2 py-0.5 rounded border text-[10px] font-bold tracking-wide uppercase select-none ${themeClasses}`}>
            {getRoleLabel(row.role)}
          </span>
        );
      }
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (row: AdminAccount) => (
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
      render: (row: AdminAccount) => (
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
        description="Manajemen akun Mahasiswa, Dosen, Koordinator, Kaprodi, Dekan, dan Admin PharmSITA."
        headerRight={
          <Button className="flex items-center gap-2" onClick={handleOpenCreate}>
            <Plus size={16} /> Buat Akun Baru
          </Button>
        }
      >
        {/* Horizontal Sub Navigation Tabs */}
        <div className="flex border-b border-border mb-6 overflow-x-auto whitespace-nowrap scrollbar-none">
          {roleTabs.map((roleTab) => {
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
          setFormErrors({});
        }}
        title={isCreateModalOpen ? "Buat Akun Baru" : "Edit Informasi Akun"}
        maxWidth="2xl"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={() => {
                setIsCreateModalOpen(false);
                setIsEditModalOpen(false);
                setFormErrors({});
              }}
              className="w-full rounded-xl border px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-muted sm:w-auto"
            >
              Batal
            </button>
            <button
              onClick={(e) => handleFormSubmit(e, isCreateModalOpen ? 'create' : 'edit')}
              className="w-full rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground transition hover:opacity-90 sm:w-auto"
            >
              {isCreateModalOpen ? "Buat Akun" : "Simpan Perubahan"}
            </button>
          </div>
        }
      >
        <form className="space-y-4">
          {formErrors.general && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {formErrors.general}
            </div>
          )}

          {/* 1. Seleksi Role */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Role Akun</label>
            <select
              value={formData.role}
              disabled={isEditModalOpen}
              onChange={(e) => updateFormField('role', e.target.value)}
              className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition font-semibold"
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            {formErrors.role && <p className="text-[10px] font-semibold text-red-600">{formErrors.role}</p>}
          </div>

          {/* 2. Nama Lengkap */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Nama Lengkap</label>
            <input
              type="text"
              required
              placeholder="Nama lengkap civitas akademika..."
              value={formData.name}
              onChange={(e) => updateFormField('name', e.target.value)}
              className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
            />
            {formErrors.name && <p className="text-[10px] font-semibold text-red-600">{formErrors.name}</p>}
          </div>

          {/* 3. Username / ID Pengguna */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">
              {formData.role === 'Mahasiswa' ? 'Username / ID Pengguna (NIM)' : formData.role === 'Dosen' ? 'Username / ID Pengguna (NIDN / NIP)' : ['Koordinator', 'Kaprodi', 'Dekan'].includes(formData.role) ? `Username / ID Pengguna (${getIdentifierLabel(formData.role)})` : 'Username / ID Admin'}
            </label>
            <input
              type="text"
              required
              placeholder={formData.role === 'Mahasiswa' ? 'Masukkan NIM...' : formData.role === 'Dosen' ? 'Masukkan NIDN/NIP...' : ['Koordinator', 'Kaprodi', 'Dekan'].includes(formData.role) ? `Masukkan ${getIdentifierLabel(formData.role).toLowerCase()}...` : 'Masukkan username admin...'}
              value={formData.identifier}
              onChange={(e) => updateFormField('identifier', e.target.value)}
              className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition font-mono font-semibold"
            />
            {formErrors.identifier && <p className="text-[10px] font-semibold text-red-600">{formErrors.identifier}</p>}
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
              onChange={(e) => updateFormField('email', e.target.value)}
              className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
            />
            {formErrors.email && <p className="text-[10px] font-semibold text-red-600">{formErrors.email}</p>}
          </div>

          {/* 5. Profil umum */}
          <div className="space-y-3 border border-border/70 rounded-xl p-3 bg-muted/[0.08]">
            <h4 className="text-[10px] font-bold text-foreground uppercase tracking-wider">Profil Umum</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">No. HP / WhatsApp</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => updateFormField('phone', e.target.value)}
                  className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Tanggal Lahir</label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => updateFormField('birthDate', e.target.value)}
                  className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                />
                {formErrors.birthDate && <p className="text-[10px] font-semibold text-red-600">{formErrors.birthDate}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Jenis Kelamin</label>
                <select
                  value={formData.gender}
                  onChange={(e) => updateFormField('gender', e.target.value)}
                  className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                >
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
                {formErrors.gender && <p className="text-[10px] font-semibold text-red-600">{formErrors.gender}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Alamat</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => updateFormField('address', e.target.value)}
                  className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                />
              </div>
            </div>
          </div>

          {/* 6. Profil role */}
          <div className="space-y-3 border border-border/70 rounded-xl p-3 bg-muted/[0.08]">
            <h4 className="text-[10px] font-bold text-foreground uppercase tracking-wider">
              Profil {formData.role}
            </h4>

            {formData.role === 'Mahasiswa' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Program Studi</label>
                  <input
                    type="text"
                    value={formData.programStudi}
                    onChange={(e) => updateFormField('programStudi', e.target.value)}
                    className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Angkatan</label>
                  <input
                    type="text"
                    value={formData.angkatan}
                    onChange={(e) => updateFormField('angkatan', e.target.value)}
                    className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Kelas</label>
                  <input
                    type="text"
                    value={formData.kelas}
                    onChange={(e) => updateFormField('kelas', e.target.value)}
                    className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Skema TA</label>
                  <select
                    value={formData.skemaTA}
                    onChange={(e) => updateFormField('skemaTA', e.target.value)}
                    className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                  >
                    <option value="Skripsi">Skripsi</option>
                    <option value="Non Skripsi">Non Skripsi</option>
                  </select>
                  {formErrors.skemaTA && <p className="text-[10px] font-semibold text-red-600">{formErrors.skemaTA}</p>}
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Jenis TA</label>
                  <input
                    type="text"
                    value={formData.jenisTA}
                    onChange={(e) => updateFormField('jenisTA', e.target.value)}
                    className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                  />
                </div>
              </div>
            )}

            {formData.role === 'Dosen' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">NIDN / NIP</label>
                  <input
                    type="text"
                    value={formData.nidn}
                    onChange={(e) => updateFormField('nidn', e.target.value)}
                    className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Program Studi</label>
                  <input
                    type="text"
                    value={formData.programStudi}
                    onChange={(e) => updateFormField('programStudi', e.target.value)}
                    className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Jabatan Akademik</label>
                  <input
                    type="text"
                    value={formData.jabatanAkademik}
                    onChange={(e) => updateFormField('jabatanAkademik', e.target.value)}
                    className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Peran Sistem</label>
                  <input
                    type="text"
                    value={formData.peranSistemText}
                    onChange={(e) => updateFormField('peranSistemText', e.target.value)}
                    className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Bidang Keahlian</label>
                  <input
                    type="text"
                    value={formData.bidangKeahlianText}
                    onChange={(e) => updateFormField('bidangKeahlianText', e.target.value)}
                    className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                  />
                </div>
              </div>
            )}

            {['Koordinator', 'Kaprodi', 'Dekan'].includes(formData.role) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Program Studi</label>
                  <input
                    type="text"
                    value={formData.programStudi}
                    onChange={(e) => updateFormField('programStudi', e.target.value)}
                    className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Jabatan</label>
                  <input
                    type="text"
                    value={formData.jabatan}
                    onChange={(e) => updateFormField('jabatan', e.target.value)}
                    className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Hak Akses Utama</label>
                  <input
                    type="text"
                    value={formData.hakAksesUtamaText}
                    onChange={(e) => updateFormField('hakAksesUtamaText', e.target.value)}
                    className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                  />
                </div>
              </div>
            )}

            {formData.role === 'Admin' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Divisi</label>
                  <input
                    type="text"
                    value={formData.divisi}
                    onChange={(e) => updateFormField('divisi', e.target.value)}
                    className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Tingkat Akses</label>
                  <select
                    value={formData.tingkatAkses}
                    onChange={(e) => updateFormField('tingkatAkses', e.target.value)}
                    className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                  >
                    <option value="Admin Prodi">Admin Prodi</option>
                    <option value="Superadmin">Superadmin</option>
                  </select>
                  {formErrors.tingkatAkses && <p className="text-[10px] font-semibold text-red-600">{formErrors.tingkatAkses}</p>}
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Cakupan Akses</label>
                  <input
                    type="text"
                    value={formData.cakupanAksesText}
                    onChange={(e) => updateFormField('cakupanAksesText', e.target.value)}
                    className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 7. Password awal / reset */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">
              {isCreateModalOpen ? 'Password Awal' : 'Reset Password'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder={isCreateModalOpen ? "Opsional: isi password awal..." : "Opsional: isi password reset..."}
                value={formData.password}
                onChange={(e) => updateFormField('password', e.target.value)}
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
            {formErrors.password && <p className="text-[10px] font-semibold text-red-600">{formErrors.password}</p>}
          </div>
        </form>
      </BaseModal>


      {/* ==================================== MODAL: LIHAT DETAIL AKUN ==================================== */}
      <BaseModal
        open={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Detail Profil Pengguna"
        maxWidth="2xl"
      >
        {selectedAccount && (
          <div className="space-y-6">
            {/* Header Identitas Card */}
            <div className="bg-muted/30 border border-border/80 rounded-2xl p-5 flex flex-col items-center text-center shadow-3xs relative overflow-hidden">
              {/* Role Indicator Banner */}
              <div className={`absolute top-3 right-3 text-[9px] font-extrabold uppercase px-2 py-0.5 border rounded-md tracking-wider ${getRoleThemeClasses(selectedAccount.role)}`}>
                {getRoleLabel(selectedAccount.role)}
              </div>

              {/* Avatar Container */}
              <div className="relative mb-3.5 mt-2">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center font-extrabold text-2xl text-white shadow-md overflow-hidden bg-gradient-to-br ${getRoleAvatarGradient(selectedAccount.role)}`}>
                  {String(selectedAccount.name || '?').substring(0, 2).toUpperCase()}
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
                  {isRole(selectedAccount, 'admin') ? 'Divisi' : 'Program Studi'}: {getProgramOrDivision(selectedAccount)}
                </span>
              </div>

              {/* Main Identifier */}
              <div className="w-full mt-4 pt-3.5 border-t border-border/60">
                <div className="bg-card border rounded-xl p-2.5 flex flex-col gap-0.5 text-center text-xs">
                  <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
                    {getIdentifierLabel(selectedAccount.role)}
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
                    <span className="font-mono">{selectedAccount.birthDate || selectedAccount.tanggalLahir || '-'}</span>
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
                  <p>{selectedAccount.address || selectedAccount.alamat || 'Alamat belum dilengkapi.'}</p>
                </div>
              </div>
            </div>

            {/* Detail Akademik / Pekerjaan (Role Spesifik) */}
            <div className="space-y-4 pt-1">
              {/* MAHASISWA RENDER */}
              {isRole(selectedAccount, 'mahasiswa') && (
                <>
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-widest border-b pb-2 flex items-center gap-1.5">
                    <BookOpen size={14} className="text-primary" /> Rincian Tugas Akhir
                  </h4>

                  <div className="p-3.5 bg-muted/[0.15] border rounded-xl space-y-3.5 text-xs">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-muted-foreground select-none">
                        {selectedAccount.skemaTA || 'Skripsi'} - {selectedAccount.jenisTA || 'Penelitian'}
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
              {isRole(selectedAccount, 'dosen') && (
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
                          {toTextList(selectedAccount.peranSistem).map((peran: string, i: number) => (
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
                        {toTextList(selectedAccount.bidangKeahlian).map((trimBidang: string, i: number) => {
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
              {(isRole(selectedAccount, 'koordinator') || isRole(selectedAccount, 'kaprodi') || isRole(selectedAccount, 'dekan')) && (
                <>
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-widest border-b pb-2 flex items-center gap-1.5">
                    <Shield size={14} className="text-primary" /> Otoritas Kebijakan Struktural
                  </h4>

                  <div className="space-y-3.5 text-xs">
                    <div className="p-3 bg-muted/20 border rounded-xl space-y-1">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Jabatan Struktural</span>
                      <strong className="text-foreground/90 font-semibold block">{selectedAccount.jabatan || getRoleLabel(selectedAccount.role)}</strong>
                    </div>

                    <div className="space-y-2 pt-1">
                      <span className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Daftar Hak Akses Manajemen</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {toTextList(selectedAccount.hakAksesUtama).map((hak: string, i: number) => (
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

              {/* ADMIN RENDER */}
              {isRole(selectedAccount, 'admin') && (
                <>
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-widest border-b pb-2 flex items-center gap-1.5">
                    <Shield size={14} className="text-primary" /> Otoritas Administrasi
                  </h4>

                  <div className="space-y-3.5 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 bg-muted/20 border rounded-xl space-y-1">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Divisi</span>
                        <strong className="text-foreground/90 font-semibold block">{selectedAccount.divisi || 'Administrasi Akademik'}</strong>
                      </div>

                      <div className="p-3 bg-muted/20 border rounded-xl space-y-1">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Tingkat Akses</span>
                        <strong className="text-foreground/90 font-semibold block">{selectedAccount.tingkatAkses || 'Admin Prodi'}</strong>
                      </div>
                    </div>

                    <div className="space-y-2 pt-1">
                      <span className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Cakupan Akses Review</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {toTextList(selectedAccount.cakupanAkses).map((cakupan: string, i: number) => (
                          <div key={i} className="flex items-center gap-2 p-2 bg-muted/20 border rounded-lg text-foreground/80 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>{cakupan}</span>
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
