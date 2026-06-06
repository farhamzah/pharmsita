import React, { useState } from "react";
import { AuthService } from "../core/services/auth-service";
import { navigateTo } from "../router/Router";
import { Bell, CheckCircle, AlertTriangle, XCircle, Info, Sun, Moon } from "lucide-react";
import { useEffect } from "react";
import type { Role } from "../types/roles";

const getIcon = (type: string) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="text-green-500" size={18} />;
    case 'warning':
      return <AlertTriangle className="text-yellow-500" size={18} />;
    case 'error':
      return <XCircle className="text-red-500" size={18} />;
    default:
      return <Info className="text-blue-500" size={18} />;
  }
};

type HeaderProps = {
  align?: 'default' | 'center';
};

type Notification = {
  id: number;
  title: string;
  description: string;
  type: 'info' | 'success' | 'warning' | 'error';
  time: string;
};

const getProfilePath = (role: Role | null) => {
  switch (role) {
    case 'dosen':
      return 'dosen/profil';
    case 'admin':
      return 'admin/profil';
    case 'kordinator':
      return 'kordinator/profil';
    case 'mahasiswa':
    default:
      return 'mahasiswa/detail-profil';
  }
};

const Header: React.FC<HeaderProps> = ({ align = 'default' }) => {
  const isCenter = align === 'center';
  const [openNotif, setOpenNotif] = useState(false);

  // Theme logic
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark" || document.documentElement.classList.contains("dark") ? "dark" : "light";
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  const notifications: Notification[] = [
    {
      id: 1,
      title: 'Pengajuan Skripsi Disetujui',
      description:
        'Pengajuan skripsi Anda telah disetujui oleh dosen pembimbing.',
      type: 'success',
      time: '2 menit lalu',
    },
    {
      id: 2,
      title: 'Persyaratan Kurang',
      description: 'Silakan lengkapi dokumen persyaratan seminar proposal.',
      type: 'warning',
      time: '1 jam lalu',
    },
    {
      id: 3,
      title: 'Pengajuan Ditolak',
      description: 'Pengajuan judul skripsi Anda ditolak oleh koordinator.',
      type: 'error',
      time: 'Kemarin',
    },
    {
      id: 4,
      title: 'Persyaratan harap segera di selsaikan',
      description: 'Silakan lengkapi dokumen persyaratan saat ini.',
      type: 'info',
      time: '2 hari lalu',
    },
  ];

  return (
    <header className="sticky top-0 z-50 w-full h-16 bg-card text-card-foreground dark:bg-[#1e293b] shadow-sm border-b border-border dark:border-gray-800 transition-colors">
      <div
        className={`flex items-center px-4 sm:px-10 h-full ${isCenter ? 'justify-center' : 'justify-between'
          }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img
            src="/assets/logo/pharmsita-logo.png"
            alt="PharmSITA Logo"
            className="h-8 md:h-10 w-auto object-contain"
          />
        </div>

        {/* Actions (Notif & Theme) */}
        {!isCenter && (
          <div className="relative flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-muted dark:hover:bg-slate-700 transition-colors text-foreground dark:text-muted-foreground"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Moon size={22} /> : <Sun size={22} />}
            </button>

            {/* Notification Toggle */}
            <div className="relative">
              <button
                onClick={() => setOpenNotif(!openNotif)}
                className="relative p-2 rounded-lg hover:bg-muted dark:hover:bg-slate-700 transition text-foreground dark:text-muted-foreground"
              >
                <Bell size={22} className="text-foreground" />

                {/* Badge */}
                <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] flex items-center justify-center bg-red-500 text-white rounded-full">
                  4
                </span>
              </button>

              {/* Dropdown */}
              {openNotif && (
                <div className="absolute right-0 mt-3 w-96 bg-card text-card-foreground dark:bg-slate-800 border border-border dark:border-slate-700 rounded-xl shadow-xl transition-colors z-50">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b dark:border-slate-700">
                    <p className="font-semibold text-sm dark:text-gray-100">Notifications</p>
                    <span className="text-xs text-muted-foreground">4 new</span>
                  </div>

                  {/* List */}
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map((item) => (
                      <div
                        key={item.id}
                        className="flex gap-3 px-4 py-3 hover:bg-muted dark:hover:bg-slate-700/50 transition cursor-pointer"
                      >
                        <div className="mt-1">{getIcon(item.type)}</div>

                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground dark:text-gray-200">
                            {item.title}
                          </p>
                          <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                            {item.description}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {item.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="border-t dark:border-slate-700">
                    <button
                      onClick={() => {
                        setOpenNotif(false);
                        const auth = new AuthService();
                        navigateTo(getProfilePath(auth.getRole()));
                      }}
                      className="w-full py-3 text-sm hover:bg-muted dark:hover:bg-slate-700/50 dark:text-gray-200 transition-colors rounded-b-xl"
                    >
                      View Profile
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
