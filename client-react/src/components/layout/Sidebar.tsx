import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutGrid,
  Users,
  Calendar,
  Megaphone,
  CheckSquare,
  FolderGit2,
  BookOpen,
  Settings,
  Shield,
  LogOut,
  GraduationCap,
  ShieldAlert,
} from "lucide-react";
import { useAuthStore } from "../../stores/useAuthStore";
import { clsx } from "clsx";

export interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  name: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuthStore();
  const isCRorAdmin = user?.role === "cr" || user?.role === "admin";
  const isAdmin = user?.role === "admin"; // Admin check

  const baseNavItems: NavItem[] = [
    { name: "Dashboard", to: "/dashboard", icon: LayoutGrid },
    { name: "Members", to: "/members", icon: Users },
    { name: "Events", to: "/events", icon: Calendar },
    { name: "Announcements", to: "/announcements", icon: Megaphone },
    { name: "Tasks & Deadlines", to: "/tasks", icon: CheckSquare },
    { name: "Projects", to: "/projects", icon: FolderGit2 },
    { name: "Resources", to: "/resources", icon: BookOpen },
    { name: "Profile", to: "/profile", icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Rail */}
      <aside
        className={clsx(
          "fixed lg:sticky top-0 left-0 z-40 h-screen w-[240px] shrink-0 bg-[#0E181D] border-r border-[#1F353C] flex flex-col justify-between p-4 transition-transform duration-200 ease-in-out select-none",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex flex-col gap-5 overflow-y-auto pr-1">
          {/* Brand Logo Header */}
          <div className="flex items-center gap-2.5 px-2 pt-1 pb-1">
            <GraduationCap className="w-6 h-6 text-[#00D084] shrink-0" />
            <div className="flex flex-col">
              <span className="text-[17px] font-bold tracking-tight text-white leading-tight">
                BatchHub
              </span>
              <span className="text-[12px] text-[#00D084] font-medium tracking-wide">
                {user?.batch || "2024 / CSE"}
              </span>
            </div>
          </div>

          {/* Navigation Links Group */}
          <div className="flex flex-col gap-1.5">
            <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-[#9BB2BC]">
              Main Workspace
            </span>
            <nav className="flex flex-col gap-1">
              {baseNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      clsx(
                        "group flex items-center justify-between px-3 py-2 rounded-[11px] text-[13.5px] font-medium transition-all duration-150",
                        isActive
                          ? "bg-[#1A323A] text-[#00D084] font-semibold border border-[#00D084]/20 shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                          : "text-[#9BB2BC] hover:text-[#D2DFE5] hover:bg-[#15242A]",
                      )
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[11.5px] font-semibold px-2 py-0.2 rounded-full bg-[#00D084]/15 text-[#00D084]">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* CR Panel Dedicated Gated Section */}
          <div className="flex flex-col gap-1.5 pt-3 border-t border-[#1F353C]/60">
            <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-[#9BB2BC]">
              Cohort Leadership
            </span>
            <NavLink
              to="/cr-panel"
              onClick={onClose}
              className={({ isActive }) =>
                clsx(
                  "flex items-center justify-between px-3 py-2.5 rounded-[12px] text-[13.5px] font-medium transition-all border border-dashed",
                  isCRorAdmin
                    ? "border-[#00D084]/40 bg-[#00D084]/5 text-[#00D084] hover:bg-[#00D084]/10"
                    : "border-[#1F353C] text-[#9BB2BC] hover:text-white cursor-not-allowed",
                  isActive && "bg-[#1A323A] font-semibold",
                )
              }
            >
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 shrink-0 text-current" />
                <span>CR Panel</span>
              </div>
              <span className="text-[11.5px] font-semibold px-2 py-0.5 rounded bg-[#1F353C] text-white">
                {isCRorAdmin ? "Active" : "Locked"}
              </span>
            </NavLink>

            {/* Admin Master Control Center Link (Shudhu matro Admin holei dekhabe) */}
            {isAdmin && (
              <NavLink
                to="/admin/batches"
                onClick={onClose}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center justify-between px-3 py-2.5 rounded-[12px] text-[13.5px] font-medium transition-all border mt-1",
                    "border-blue-500/40 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20",
                    isActive && "bg-blue-600 text-white font-semibold",
                  )
                }
              >
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-current" />
                  <span>Admin Panel</span>
                </div>
                <span className="text-[11.5px] font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                  Master
                </span>
              </NavLink>
            )}
          </div>
        </div>

        {/* User Footer with Role & Logout */}
        <div className="border-t border-[#1F353C] pt-3 flex items-center justify-between px-1 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#192C34] border border-[#1F353C] flex items-center justify-center text-[12px] font-bold text-[#00D084] shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-semibold text-white truncate max-w-[120px]">
                {user?.name || "Academic User"}
              </span>
              <span className="text-[11.5px] text-[#9BB2BC] capitalize">
                {user?.role || "student"}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-1.5 rounded-[8px] text-[#F87171] hover:bg-[rgba(248,113,113,0.12)] transition-colors cursor-pointer"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
