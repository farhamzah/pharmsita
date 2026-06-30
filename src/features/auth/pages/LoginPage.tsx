import React from "react";
import {
  ArrowLeft,
  Briefcase,
  Check,
  Eye,
  EyeOff,
  GraduationCap,
  ShieldCheck,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import {
  authApi,
  isAuthSessionResponse,
  normalizeApiRole,
  type AuthChallengeResponse,
  type AuthSessionResponse,
  type AuthUser,
} from "../../../core/api/domain";
import { AuthService } from "../../../core/services/auth-service";
import { navigateTo } from "../../../router/Router";

type LoginStep = "credentials" | "role-selection" | "first-login";
type ApiRole = AuthUser["role"];

const inputClass =
  "w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white/95";

const roleMeta = (role: ApiRole): { label: string; Icon: LucideIcon } => {
  switch (normalizeApiRole(role)) {
    case "mahasiswa":
      return { label: "Mahasiswa", Icon: GraduationCap };
    case "dosen":
      return { label: "Dosen", Icon: Briefcase };
    case "admin":
      return { label: "Admin", Icon: ShieldCheck };
    case "kordinator":
      return { label: "Koordinator", Icon: UserCheck };
    default:
      return { label: role, Icon: UserCheck };
  }
};

const profileRouteForRole = (role: ApiRole) => {
  switch (normalizeApiRole(role)) {
    case "mahasiswa":
      return "mahasiswa/detail-profil";
    case "dosen":
      return "dosen/profil";
    case "kordinator":
      return "kordinator/profil";
    case "admin":
      return "admin/profil";
    default:
      return normalizeApiRole(role);
  }
};

const LoginComponent: React.FC = () => {
  const auth = React.useMemo(() => new AuthService(), []);
  const [step, setStep] = React.useState<LoginStep>("credentials");
  const [challenge, setChallenge] = React.useState<AuthChallengeResponse | null>(null);
  const [selectedRole, setSelectedRole] = React.useState<ApiRole | "">("");
  const [msg, setMsg] = React.useState("");
  const [msgColor, setMsgColor] = React.useState("text-green-600");
  const [usernameState, setUsernameState] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const showMessage = (message: string, color = "text-slate-500") => {
    setMsg(message);
    setMsgColor(color);
  };

  const resetChallenge = () => {
    setStep("credentials");
    setChallenge(null);
    setSelectedRole("");
    setNewPassword("");
    setConfirmPassword("");
    showMessage("");
  };

  const completeSession = (session: AuthSessionResponse, redirectToProfile = false) => {
    const role = normalizeApiRole(session.user.role);
    auth.setToken(session.accessToken, session.user.name, role);
    showMessage("Login berhasil, mengalihkan...", "text-green-600");
    setTimeout(
      () => navigateTo(redirectToProfile ? profileRouteForRole(session.user.role) : role),
      300
    );
  };

  const activateChallenge = (response: AuthChallengeResponse) => {
    const initialRole = (response.availableRoles[0] || response.user.role) as ApiRole;
    setChallenge(response);
    setSelectedRole(initialRole);
    setNewPassword("");
    setConfirmPassword("");
    setStep(response.requiresFirstLogin ? "first-login" : "role-selection");
    showMessage(
      response.requiresFirstLogin
        ? "Akun perlu aktivasi awal."
        : "Pilih role untuk melanjutkan.",
      response.requiresFirstLogin ? "text-amber-600" : "text-slate-500"
    );
  };

  const onSubmitCredentials = async (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();

    const fd = new FormData(ev.currentTarget);
    const username = (fd.get("username") as string) || "";
    const password = (fd.get("password") as string) || "";

    setIsSubmitting(true);
    showMessage("Memproses login...");

    try {
      const response = await authApi.login({ identifier: username, password });
      if (isAuthSessionResponse(response)) {
        completeSession(response);
        return;
      }

      activateChallenge(response);
    } catch {
      showMessage("Login gagal. Periksa username/password atau koneksi backend.", "text-red-500");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitRole = async (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();

    if (!challenge || !selectedRole) {
      showMessage("Pilih role terlebih dahulu.", "text-red-500");
      return;
    }

    setIsSubmitting(true);
    showMessage("Menyiapkan sesi...");

    try {
      const session = await authApi.selectRole({
        loginChallengeId: challenge.loginChallengeId,
        role: selectedRole,
      });
      completeSession(session);
    } catch {
      showMessage("Role tidak bisa dipakai. Silakan login ulang.", "text-red-500");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitFirstLogin = async (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();

    if (!challenge || !selectedRole) {
      showMessage("Pilih role terlebih dahulu.", "text-red-500");
      return;
    }

    if (newPassword.length < 8) {
      showMessage("Password baru minimal 8 karakter.", "text-red-500");
      return;
    }

    if (newPassword !== confirmPassword) {
      showMessage("Konfirmasi password belum sama.", "text-red-500");
      return;
    }

    setIsSubmitting(true);
    showMessage("Menyelesaikan aktivasi...");

    try {
      const session = await authApi.firstLogin({
        loginChallengeId: challenge.loginChallengeId,
        role: selectedRole,
        newPassword,
      });
      completeSession(session, true);
    } catch {
      showMessage("Aktivasi gagal. Silakan cek password atau login ulang.", "text-red-500");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderRoleButtons = () => {
    const roles = challenge?.availableRoles || [];

    return (
      <div className="grid grid-cols-1 gap-3">
        {roles.map((role) => {
          const meta = roleMeta(role as ApiRole);
          const Icon = meta.Icon;
          const isSelected = selectedRole === role;

          return (
            <button
              key={role}
              type="button"
              onClick={() => setSelectedRole(role as ApiRole)}
              className={[
                "flex items-center justify-between rounded-lg border px-4 py-3 text-left transition",
                isSelected
                  ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                  : "border-slate-200 bg-white/90 text-slate-700 hover:border-blue-300",
              ].join(" ")}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-5 w-5" />
                <span className="font-semibold">{meta.label}</span>
              </span>
              {isSelected && <Check className="h-5 w-5" />}
            </button>
          );
        })}
      </div>
    );
  };

  const renderCredentials = () => (
    <>
      <h2 className="text-3xl md:text-4xl font-bold text-gradient pb-8">Sign in</h2>
      <form onSubmit={onSubmitCredentials} className="space-y-5">
        <div>
          <label className="block text-sm mb-2 text-muted-foreground">Username</label>
          <input
            name="username"
            required
            value={usernameState}
            onChange={(e) => setUsernameState(e.target.value)}
            placeholder="Enter username"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm mb-2 text-muted-foreground">Password</label>
          <div className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              required
              placeholder="Enter password"
              className={`${inputClass} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full primary-gradient-lr text-white py-3 rounded-lg font-semibold shadow-lg hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "MEMPROSES..." : "LOGIN"}
        </button>
      </form>
    </>
  );

  const renderRoleSelection = () => (
    <>
      <button
        type="button"
        onClick={resetChallenge}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali
      </button>
      <h2 className="text-2xl md:text-3xl font-bold text-gradient pb-3">Pilih Role</h2>
      <p className="mb-5 text-sm text-slate-500">{challenge?.user.name}</p>
      <form onSubmit={onSubmitRole} className="space-y-5">
        {renderRoleButtons()}
        <button
          type="submit"
          disabled={isSubmitting || !selectedRole}
          className="w-full primary-gradient-lr text-white py-3 rounded-lg font-semibold shadow-lg hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "MEMPROSES..." : "LANJUT"}
        </button>
      </form>
    </>
  );

  const renderFirstLogin = () => {
    const selectedMeta = selectedRole ? roleMeta(selectedRole) : null;
    const SelectedIcon = selectedMeta?.Icon || UserCheck;

    return (
      <>
        <button
          type="button"
          onClick={resetChallenge}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </button>
        <h2 className="text-2xl md:text-3xl font-bold text-gradient pb-3">Aktivasi Awal</h2>
        <p className="mb-5 text-sm text-slate-500">{challenge?.user.name}</p>
        <form onSubmit={onSubmitFirstLogin} className="space-y-5">
          {(challenge?.availableRoles.length || 0) > 1 ? (
            renderRoleButtons()
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-blue-700">
              <SelectedIcon className="h-5 w-5" />
              <span className="font-semibold">{selectedMeta?.label || "Mahasiswa"}</span>
            </div>
          )}

          <div>
            <label className="block text-sm mb-2 text-muted-foreground">Password Baru</label>
            <div className="relative">
              <input
                name="newPassword"
                type={showNewPassword ? "text" : "password"}
                minLength={8}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                className={`${inputClass} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label={showNewPassword ? "Sembunyikan password baru" : "Tampilkan password baru"}
                title={showNewPassword ? "Sembunyikan password baru" : "Tampilkan password baru"}
              >
                {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2 text-muted-foreground">Konfirmasi Password</label>
            <div className="relative">
              <input
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                minLength={8}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
                className={`${inputClass} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label={showConfirmPassword ? "Sembunyikan konfirmasi password" : "Tampilkan konfirmasi password"}
                title={showConfirmPassword ? "Sembunyikan konfirmasi password" : "Tampilkan konfirmasi password"}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !selectedRole}
            className="w-full primary-gradient-lr text-white py-3 rounded-lg font-semibold shadow-lg hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "MEMPROSES..." : "AKTIVASI"}
          </button>
        </form>
      </>
    );
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 gradient-elegant" />
      <div className="relative z-10 min-h-screen flex">
        <div className="hidden md:flex flex-col w-1/2 items-center justify-center text-white p-16">
          <h1 className="text-4xl font-bold mb-6">Selamat Datang !</h1>
          <p className="mb-4 text-lg">
            Lengkapi profil dan unggah dokumen persyaratan Tugas Akhir Anda.
          </p>
          <p className="mb-8 text-sm opacity-90">
            Pastikan semua data sudah benar sebelum mengajukan verifikasi.
          </p>

          <button className="bg-card text-card-foreground text-blue-700 px-6 py-2 rounded-full font-medium shadow hover:scale-105 transition">
            Syarat & Ketentuan
          </button>
        </div>
        <div className="w-full md:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md bg-card/70 backdrop-blur rounded-lg shadow-xl p-8">
            {step === "credentials" && renderCredentials()}
            {step === "role-selection" && renderRoleSelection()}
            {step === "first-login" && renderFirstLogin()}
            {msg && <p className={`mt-5 text-sm ${msgColor}`}>{msg}</p>}

            <div className="mt-10 md:hidden text-center">
              <div className="animated-gradient rounded-lg p-6 text-black">
                <h3 className="font-bold text-lg mb-2">Selamat Datang !</h3>

                <p className="text-sm mb-4">
                  Lengkapi profil dan unggah dokumen persyaratan Tugas Akhir
                  Anda.
                </p>

                <button className="bg-card text-card-foreground text-blue-500 px-6 py-1 rounded-full font-medium text-sm shadow">
                  Syarat & Ketentuan
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const LoginPage: React.FC = LoginComponent;
