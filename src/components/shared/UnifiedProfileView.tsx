import React, { useState } from "react";
import {
  UserCircle,
  Mail,
  Phone,
  Briefcase,
  Camera,
  Shield,
  Info,
  CheckCircle2,
  BookOpen,
  Key
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Roles } from "../../mock-data/enums";
import type { 
  BaseProfile, 
  StudentProfile, 
  LecturerProfile, 
  CoordinatorProfile, 
  AdminProfile 
} from "../../mock-data/profiles";

interface UnifiedProfileViewProps {
  initialProfile: BaseProfile;
  onSave?: (updatedProfile: any) => void;
  canEdit?: boolean;
}

export const UnifiedProfileView: React.FC<UnifiedProfileViewProps> = ({
  initialProfile,
  onSave,
  canEdit = true
}) => {
  const [profile, setProfile] = useState<any>(initialProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [showNotification, setShowNotification] = useState<string | null>(null);

  // Editable fields state
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone);
  const [alamat, setAlamat] = useState(profile.alamat || "");
  const [gender, setGender] = useState(profile.gender || "Laki-laki");
  const [tanggalLahir, setTanggalLahir] = useState(profile.tanggalLahir || "");

  // Password change state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Cast profiles for role-specific renders
  const student = profile.role === Roles.STUDENT ? (profile as StudentProfile) : null;
  const lecturer = profile.role === Roles.LECTURER ? (profile as LecturerProfile) : null;
  const coordinator = profile.role === Roles.COORDINATOR ? (profile as CoordinatorProfile) : null;
  const admin = profile.role === Roles.ADMIN ? (profile as AdminProfile) : null;

  const triggerToast = (msg: string) => {
    setShowNotification(msg);
    setTimeout(() => {
      setShowNotification(null);
    }, 4000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updated = {
      ...profile,
      email,
      phone,
      alamat,
      gender,
      tanggalLahir
    };

    setProfile(updated);
    setIsEditing(false);
    if (onSave) {
      onSave(updated);
    }
    triggerToast("Profil Anda berhasil diperbarui secara aman!");
  };

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      alert("Kata sandi baru harus memiliki panjang minimal 8 karakter.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Konfirmasi kata sandi baru tidak cocok.");
      return;
    }

    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setIsChangingPassword(false);
    triggerToast("Kata sandi akun Anda berhasil diperbarui secara aman!");
  };

  const handleCancelPasswordChange = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setIsChangingPassword(false);
  };

  const handleCancel = () => {
    setEmail(profile.email);
    setPhone(profile.phone);
    setAlamat(profile.alamat || "");
    setGender(profile.gender || "Laki-laki");
    setTanggalLahir(profile.tanggalLahir || "");
    setIsEditing(false);
  };

  // Get primary identifier (NIM / NIDN / ID)
  const getIdentifierLabel = () => {
    if (student) return { label: "NIM", value: student.nim };
    if (lecturer) return { label: "NIDN", value: lecturer.nidn };
    if (coordinator) return { label: "NIP / ID", value: "19800101 200501 1 001" };
    return { label: "ID Admin", value: "ADM-PRODI-FARMASI" };
  };

  const identifier = getIdentifierLabel();

  // Get role color theme
  const getRoleTheme = () => {
    switch (profile.role) {
      case Roles.STUDENT:
        return {
          bg: "bg-blue-500/[0.04]",
          border: "border-blue-500/20",
          text: "text-blue-600 dark:text-blue-400",
          badge: "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-900 dark:text-blue-400",
          gradient: "from-blue-600 to-indigo-600"
        };
      case Roles.LECTURER:
        return {
          bg: "bg-emerald-500/[0.04]",
          border: "border-emerald-500/20",
          text: "text-emerald-600 dark:text-emerald-400",
          badge: "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-400",
          gradient: "from-emerald-600 to-teal-600"
        };
      case Roles.COORDINATOR:
        return {
          bg: "bg-indigo-500/[0.04]",
          border: "border-indigo-500/20",
          text: "text-indigo-600 dark:text-indigo-400",
          badge: "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900 dark:text-indigo-400",
          gradient: "from-indigo-600 to-purple-600"
        };
      case Roles.ADMIN:
      default:
        return {
          bg: "bg-rose-500/[0.04]",
          border: "border-rose-500/20",
          text: "text-rose-600 dark:text-rose-400",
          badge: "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-400",
          gradient: "from-rose-600 to-orange-600"
        };
    }
  };

  const theme = getRoleTheme();

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {showNotification && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-2.5 max-w-sm animate-fade-in border border-slate-800 dark:border-slate-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 stroke-[2.5]" />
          <p className="text-xs font-semibold leading-relaxed">{showNotification}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ================= LEFT COLUMN: CARD IDENTITAS UTAMA ================= */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-card border border-border/80 rounded-2xl p-6 flex flex-col items-center text-center shadow-xs">
            
            {/* Avatar container */}
            <div className="relative mb-5 group">
              <div className={cn(
                "w-28 h-28 rounded-full bg-linear-to-br flex items-center justify-center border-4 border-background shadow-md overflow-hidden",
                theme.gradient
              )}>
                {profile.photo ? (
                  <img src={profile.photo} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <UserCircle className="w-16 h-16 text-white/90" />
                )}
              </div>
              
              {canEdit && (
                <button
                  onClick={() => triggerToast("Simulasi Unggah Foto: Fitur kamera aktif!")}
                  className="absolute bottom-0 right-0 p-2 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-lg transition"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Basic Info */}
            <h3 className="text-lg font-bold text-foreground leading-snug">{profile.name}</h3>
            
            <div className="flex items-center gap-2 mt-2">
              <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider select-none", theme.badge)}>
                {profile.role}
              </span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-semibold border select-none",
                profile.status === "Aktif" || profile.status === "Lulus"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-400"
                  : "bg-slate-50 border-slate-200 text-slate-500"
              )}>
                {profile.status}
              </span>
            </div>

            {/* Main Identifier */}
            <div className="w-full mt-5 pt-4 border-t border-border/60">
              <div className="bg-muted/40 border rounded-xl p-3 flex flex-col gap-1 text-xs">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{identifier.label}</span>
                <strong className="text-foreground/90 font-mono text-sm">{identifier.value}</strong>
              </div>
            </div>

            {/* Quick Contacts */}
            <div className="w-full mt-4 space-y-2.5 text-xs text-left">
              <div className="flex items-center gap-2.5 text-muted-foreground">
                <Mail className="w-4 h-4 text-muted-foreground/70 shrink-0" />
                <span className="truncate">{profile.email}</span>
              </div>
              <div className="flex items-center gap-2.5 text-muted-foreground">
                <Phone className="w-4 h-4 text-muted-foreground/70 shrink-0" />
                <span>{profile.phone}</span>
              </div>
            </div>

            {/* Action Edit Button */}
            {canEdit && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full mt-6 py-2.5 px-4 bg-primary text-primary-foreground hover:opacity-90 font-bold rounded-xl shadow-xs transition text-xs cursor-pointer"
              >
                Edit Informasi Profil
              </button>
            )}
          </div>
        </div>

        {/* ================= RIGHT COLUMN: DATA DETAIL & ROLE-SPECIFIC INFO ================= */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Main Card: Details or Form */}
          <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs">
            <h4 className="text-sm font-bold text-foreground mb-5 pb-3 border-b border-border/60 flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" /> 
              {isEditing ? "Formulir Edit Informasi Profil" : "Informasi Akun & Kontak Terdaftar"}
            </h4>

            {isEditing ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Read-only Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Nama Lengkap</label>
                    <input
                      type="text"
                      disabled
                      value={profile.name}
                      className="w-full text-xs border rounded-xl px-3 py-2.5 bg-muted text-muted-foreground/80 cursor-not-allowed border-dashed"
                    />
                  </div>

                  {/* Read-only Identifier */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">{identifier.label}</label>
                    <input
                      type="text"
                      disabled
                      value={identifier.value}
                      className="w-full text-xs border rounded-xl px-3 py-2.5 bg-muted text-muted-foreground/80 cursor-not-allowed border-dashed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Email Aktif</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Nomor HP / WhatsApp</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Gender */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Jenis Kelamin</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                    >
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>

                  {/* Birth Date */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Tanggal Lahir</label>
                    <input
                      type="date"
                      value={tanggalLahir}
                      onChange={(e) => setTanggalLahir(e.target.value)}
                      className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Alamat Tinggal</label>
                  <textarea
                    rows={2}
                    value={alamat}
                    onChange={(e) => setAlamat(e.target.value)}
                    placeholder="Ketik alamat lengkap domisili saat ini..."
                    className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                  />
                </div>

                {/* Form Buttons */}
                <div className="pt-4 border-t border-border/60 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 border hover:bg-muted text-foreground font-semibold rounded-xl text-xs transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-primary text-primary-foreground hover:opacity-90 font-bold rounded-xl text-xs transition"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            ) : (
              /* View Mode */
              <div className="space-y-4">
                
                {/* 1. General & Contact Information Group */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/20 border rounded-xl space-y-1">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Program Studi / Divisi</span>
                    <strong className="text-xs text-foreground/90 font-semibold block">
                      {profile.programStudi || profile.divisi || "Fakultas Farmasi"}
                    </strong>
                  </div>

                  <div className="p-3 bg-muted/20 border rounded-xl space-y-1">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Email Terdaftar</span>
                    <strong className="text-xs text-foreground/90 font-semibold block truncate">
                      {profile.email}
                    </strong>
                  </div>

                  <div className="p-3 bg-muted/20 border rounded-xl space-y-1">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">No. HP / WhatsApp</span>
                    <strong className="text-xs text-foreground/90 font-semibold block">
                      {profile.phone}
                    </strong>
                  </div>

                  <div className="p-3 bg-muted/20 border rounded-xl space-y-1">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Jenis Kelamin</span>
                    <strong className="text-xs text-foreground/90 font-semibold block">
                      {profile.gender || "-"}
                    </strong>
                  </div>

                  <div className="p-3 bg-muted/20 border rounded-xl space-y-1">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Tanggal Lahir</span>
                    <strong className="text-xs text-foreground/90 font-semibold block font-mono">
                      {profile.tanggalLahir || "-"}
                    </strong>
                  </div>

                  <div className="p-3 bg-muted/20 border rounded-xl space-y-1">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Status Hubungan Akademik</span>
                    <strong className="text-xs text-foreground/90 font-semibold block">
                      Internal Fakultas Farmasi
                    </strong>
                  </div>
                </div>

                <div className="p-3 bg-muted/20 border rounded-xl space-y-1">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Alamat Domisili</span>
                  <p className="text-xs text-foreground/80 leading-relaxed font-medium">
                    {profile.alamat || "Belum melengkapi alamat domisili."}
                  </p>
                </div>

              </div>
            )}
          </div>

          {/* ================= SECTION 3: ROLE SPECIFIC SPECIAL FIELDS ================= */}
          
          {/* A. STUDENT SPECIFIC VIEW */}
          {student && !isEditing && (
            <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs space-y-4">
              <h4 className="text-sm font-bold text-foreground pb-3 border-b border-border/60 flex items-center gap-2">
                <BookOpen className="w-4.5 h-4.5 text-primary" /> Rincian Tugas Akhir Mahasiswa
              </h4>
              
              <div className="p-4 bg-muted/[0.15] border rounded-xl space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border rounded text-muted-foreground select-none">
                    {student.skemaTA} — {student.jenisTA || "Penelitian"}
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground bg-primary/[0.05] border border-primary/10 px-2.5 py-0.5 rounded-full">
                    Tahapan: {student.tahapanAktif}
                  </span>
                </div>
                
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground/80 tracking-wider">Judul Usulan Tugas Akhir</span>
                  <p className="text-xs font-bold text-foreground leading-relaxed">
                    {student.judulTA || "Belum mengajukan judul Tugas Akhir."}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="p-2.5 bg-card border rounded-lg space-y-0.5">
                    <span className="text-[9px] text-muted-foreground block font-bold">Pembimbing Utama (1)</span>
                    <strong className="text-foreground/90">{student.pembimbing1 || "-"}</strong>
                  </div>
                  <div className="p-2.5 bg-card border rounded-lg space-y-0.5">
                    <span className="text-[9px] text-muted-foreground block font-bold">Pembimbing Pendamping (2)</span>
                    <strong className="text-foreground/90">{student.pembimbing2 || "-"}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* B. LECTURER SPECIFIC VIEW */}
          {lecturer && !isEditing && (
            <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs space-y-4">
              <h4 className="text-sm font-bold text-foreground pb-3 border-b border-border/60 flex items-center gap-2">
                <Briefcase className="w-4.5 h-4.5 text-primary" /> Otoritas Dosen & Kuota Bimbingan
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-muted/20 border rounded-xl space-y-1">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Jabatan Fungsional</span>
                  <strong className="text-xs text-foreground/90 font-semibold block">{lecturer.jabatanAkademik}</strong>
                </div>

                <div className="p-3 bg-muted/20 border rounded-xl space-y-1">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Peran dalam Sistem</span>
                  <div className="flex gap-1.5 flex-wrap mt-1">
                    {lecturer.peranSistem.map((peran, i) => (
                      <span key={i} className="text-[9px] font-bold px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900 rounded-md">
                        {peran}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-muted/20 border rounded-xl space-y-1.5">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Bidang Fokus Riset / Keahlian</span>
                <div className="flex gap-1.5 flex-wrap">
                  {lecturer.bidangKeahlian.map((bidang, i) => (
                    <span key={i} className="text-[9px] font-bold px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900 rounded-full">
                      {bidang}
                    </span>
                  ))}
                </div>
              </div>

              {/* Kuota Bimbingan */}
              <div className="space-y-3.5 pt-2">
                <span className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Rasio Ketersediaan Kuota Bimbingan</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="bg-card border rounded-xl p-3.5 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-muted-foreground block">KUOTA PEMBIMBING UTAMA</span>
                      <span className="text-xs font-mono font-extrabold text-primary">{lecturer.kuotaTerpakaiPembimbing1}/{lecturer.kuotaPembimbing1}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all" 
                        style={{ width: `${(lecturer.kuotaTerpakaiPembimbing1 / lecturer.kuotaPembimbing1) * 100}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-muted-foreground block">
                      Tersedia: <strong>{lecturer.kuotaTersediaPembimbing1} slot mahasiswa</strong>
                    </span>
                  </div>

                  <div className="bg-card border rounded-xl p-3.5 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-muted-foreground block">KUOTA PEMBIMBING PENDAMPING</span>
                      <span className="text-xs font-mono font-extrabold text-primary">{lecturer.kuotaTerpakaiPembimbing2}/{lecturer.kuotaPembimbing2}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 rounded-full transition-all" 
                        style={{ width: `${(lecturer.kuotaTerpakaiPembimbing2 / lecturer.kuotaPembimbing2) * 100}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-muted-foreground block">
                      Tersedia: <strong>{lecturer.kuotaTersediaPembimbing2} slot mahasiswa</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* C. COORDINATOR SPECIFIC VIEW */}
          {coordinator && !isEditing && (
            <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs space-y-4">
              <h4 className="text-sm font-bold text-foreground pb-3 border-b border-border/60 flex items-center gap-2">
                <Shield className="w-4.5 h-4.5 text-primary" /> Otoritas Kebijakan & Hak Akses Koordinator
              </h4>

              <div className="p-3 bg-muted/20 border rounded-xl space-y-1">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Jabatan Struktural</span>
                <strong className="text-xs text-foreground/90 font-semibold block">{coordinator.jabatan}</strong>
              </div>

              <div className="space-y-2 pt-1.5">
                <span className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Daftar Hak Otorisasi Utama</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {coordinator.hakAksesUtama.map((hak, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-card border rounded-lg text-foreground/80 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{hak}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* D. ADMIN SPECIFIC VIEW */}
          {admin && !isEditing && (
            <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs space-y-4">
              <h4 className="text-sm font-bold text-foreground pb-3 border-b border-border/60 flex items-center gap-2">
                <Shield className="w-4.5 h-4.5 text-primary" /> Cakupan Akses & Modul Superadmin
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-muted/20 border rounded-xl space-y-1">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Divisi Kerja</span>
                  <strong className="text-xs text-foreground/90 font-semibold block">{admin.divisi}</strong>
                </div>

                <div className="p-3 bg-muted/20 border rounded-xl space-y-1">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Tingkat Hak Akses</span>
                  <strong className="text-xs text-foreground/90 font-semibold block text-rose-600 dark:text-rose-400">{admin.tingkatAkses}</strong>
                </div>
              </div>

              {admin.cakupanAkses && (
                <div className="space-y-2 pt-1.5">
                  <span className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Cakupan Kelola Modul Master</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {admin.cakupanAkses.map((akses, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-card border rounded-lg text-foreground/80 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>{akses}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* E. UNIFIED PASSWORD CHANGE SECTION */}
          {!isEditing && (
            <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs space-y-4">
              <h4 className="text-sm font-bold text-foreground pb-3 border-b border-border/60 flex items-center gap-2">
                <Key className="w-4.5 h-4.5 text-primary" /> Keamanan Akun & Ganti Password
              </h4>

              {isChangingPassword ? (
                <form onSubmit={handleChangePasswordSubmit} className="space-y-4 animate-slide-down">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Password Lama */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Password Lama</label>
                      <input
                        type="password"
                        required
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                      />
                    </div>

                    {/* Password Baru */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Password Baru</label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimal 8 karakter"
                        className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                      />
                    </div>

                    {/* Konfirmasi Password */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Konfirmasi Password</label>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Ulangi password baru"
                        className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-foreground bg-background transition"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleCancelPasswordChange}
                      className="px-4 py-2 border hover:bg-muted text-foreground font-semibold rounded-xl text-xs transition"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-primary text-primary-foreground hover:opacity-90 font-bold rounded-xl text-xs transition"
                    >
                      Perbarui Password
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/20 p-4 rounded-xl border border-border/40">
                  <div className="space-y-1">
                    <p className="font-bold text-xs text-foreground">Ganti Password Akun</p>
                    <p className="text-[11px] text-muted-foreground">
                      Disarankan untuk memperbarui kata sandi secara berkala guna melindungi data akademik Anda.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsChangingPassword(true)}
                    className="w-full sm:w-auto px-4 py-2 border border-border/80 hover:border-primary/50 hover:bg-primary/[0.02] text-xs font-bold text-foreground hover:text-primary rounded-xl transition shadow-3xs cursor-pointer select-none"
                  >
                    Perbarui Kata Sandi
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
