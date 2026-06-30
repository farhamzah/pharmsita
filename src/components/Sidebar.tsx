import React from "react";
import { AuthService } from "../core/services/auth-service";
import { navigateTo } from "../router/Router";
import { sidebarConfig } from "./sidebar-config";
import type { Role } from "../types/roles";
import { ChevronRight, ChevronLeft, LogOut } from "lucide-react";

const Sidebar: React.FC = () => {
  const auth = new AuthService();
  const name = auth.getUsername();
  const role = auth.getRole() as Role;
  const menus = sidebarConfig[role] || [];

  const getProfilePath = (r: Role) => {
    switch(r) {
      case 'dosen': return 'dosen/profil';
      case 'admin': return 'admin/profil';
      case 'kordinator': return 'kordinator/profil';
      default: return 'mahasiswa/detail-profil';
    }
  };

  const [current, setCurrent] = React.useState('');
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);

  React.useEffect(() => {
    const update = () => {
      const route = window.location.hash.replace('#/', '');
      setCurrent(route);
    };

    update();
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);

  function logout() {
    auth.clear();
    navigateTo('login');
  }

  return (
    <>
      {/* ================= MOBILE TOGGLE ================= */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-20 left-0 z-50 primary-gradient-tb text-white p-2 rounded-r-full shadow-lg"
      >
        {mobileOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </button>

      {/* ================= MOBILE OVERLAY ================= */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ================= SIDEBAR ================= */}
      <aside
        className={`
          primary-gradient-tb text-white flex flex-col
          transition-all duration-300

          /* MOBILE */
          fixed top-0 left-0 h-screen w-60 z-50
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}

          /* DESKTOP */
          md:sticky md:top-0 md:translate-x-0
          md:h-screen
          ${collapsed ? 'md:w-20' : 'md:w-60'}
        `}
      >
        {/* ================= HEADER ================= */}
        <div
          className={`
            flex items-center px-4 h-16 border-b border-white/20
            ${collapsed ? 'md:justify-center' : 'justify-end'}
          `}
        >
          {/* Desktop Collapse Button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:block"
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* ================= PROFILE ================= */}
        <div className="flex flex-col items-center p-4 border-b border-white/20">
          <div className="w-12 h-12 rounded-full bg-card text-card-foreground/30 mb-3"></div>

          <div
            className={`
              text-center space-y-1
              ${collapsed ? 'md:hidden' : 'md:block'}
            `}
          >
            <h2 className="font-semibold capitalize">{name}</h2>
            <p className="text-sm opacity-70 capitalize">{role || "user"}</p>
            <p
              onClick={() => navigateTo(getProfilePath(role))}
              className="text-xs opacity-90 cursor-pointer hover:underline"
            >
              View Profile
            </p>
          </div>
        </div>

        {/* ================= MENU ================= */}
        <nav
          className={`
            ${mobileOpen ? 'px-3' : 'pl-3 items-end'}
            flex-1
            min-h-0
            py-4
            flex flex-col gap-2 md:gap-3
            overflow-y-auto
            hide-scrollbar
          `}
        >
          {menus.map((menu) => {
            const active = current === menu.path;
            const Icon = menu.icon;

            return (
              <button
                key={menu.path}
                onClick={() => {
                  navigateTo(menu.path);
                  setMobileOpen(false);
                }}
                className={`
                  w-full
                  flex items-center gap-3
                  px-3 py-3 
                  transition-all
                  ${active ? 'bg-muted font-semibold relative' : 'hover:bg-white/20'}
                  ${mobileOpen ? 'rounded-xl' : 'rounded-l-full'}
                `}
              >
                <span
                  className={` ${active ? 'inner-rounded-tr block border-8 border-muted' : 'hidden'} ${mobileOpen ? 'hidden' : ''}`}
                ></span>
                <span
                  className={` ${active ? 'inner-rounded-br block border-8 border-muted' : 'hidden'} ${mobileOpen ? 'hidden' : ''}`}
                ></span>
                <Icon
                  size={22}
                  className={active ? 'text-[#117DC5]' : 'text-white'}
                />

                <span
                  className={`
                whitespace-nowrap
                ${collapsed ? 'md:hidden' : 'md:inline'}

                ${active
                      ? 'bg-linear-to-r from-[#117DC5] to-[#00ADB5] bg-clip-text text-transparent'
                      : 'text-white'
                    }
              `}
                >
                  {menu.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* ================= LOGOUT ================= */}
        <div className="p-3 border-t border-white/20">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-red-500/40 transition"
          >
            <LogOut size={20} />

            <span
              className={`
                ${collapsed ? 'md:hidden' : 'md:inline'} 
              `}
            >
              Keluar
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
