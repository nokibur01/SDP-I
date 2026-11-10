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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuthStore } from "../../stores/useAuthStore";
import { clsx } from "clsx";

export interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavItem {
  name: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { user, logout } = useAuthStore();
  const isCRorAdmin = user?.role === "cr" || user?.role === "admin";
  const isAdmin = user?.role === "admin";

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
          "fixed lg:sticky top-0 left-0 z-40 h-screen shrink-0 bg-surface border-r border-line flex flex-col justify-between p-3 transition-all duration-200 ease-in-out select-none",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          isCollapsed ? "lg:w-[72px]" : "w-[240px]"
        )}
      >
        <div className="flex flex-col gap-4 overflow-y-auto overflow-x-hidden pr-0.5">
          {/* Brand Logo Header */}
          <div
            className={clsx(
              "flex items-center gap-2.5 px-2 pt-1 pb-1 transition-all",
              isCollapsed ? "justify-center" : "justify-between"
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-surface border border-accent/30 flex items-center justify-center shrink-0 shadow-sm shadow-accent/10">
                <GraduationCap className="w-5 h-5 text-accent" />
              </div>
              {!isCollapsed && (
                <div className="flex flex-col truncate">
                  <span className="text-[16px] font-bold tracking-tight text-fg leading-tight">
                    BatchHub
                  </span>
                  <span className="text-[12.5px] text-accent font-medium tracking-wide truncate">
                    {user?.batch || "2024 / CSE"}
                  </span>
                </div>
              )}
            </div>

            {/* Desktop Collapse Toggle */}
            {onToggleCollapse && !isCollapsed && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden lg:flex p-1.5 rounded-lg text-fg-2 hover:text-fg hover:bg-surface transition-colors cursor-pointer"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* If collapsed, show uncollapse button */}
          {onToggleCollapse && isCollapsed && (
            <div className="hidden lg:flex justify-center py-1">
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1.5 rounded-lg text-fg-2 hover:text-accent hover:bg-surface transition-colors cursor-pointer"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Navigation Links Group */}
          <div className="flex flex-col gap-1">
            {!isCollapsed && (
              <span className="px-2.5 text-[11.5px] font-bold uppercase tracking-wider text-fg-2/80">
                Main Workspace
              </span>
            )}
            <nav className="flex flex-col gap-1">
              {baseNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={isCollapsed ? item.name : undefined}
                    onClick={onClose}
                    className={({ isActive }) =>
                      clsx(
                        "group flex items-center rounded-[11px] text-[13.5px] font-medium transition-all duration-150 relative",
                        isCollapsed
                          ? "justify-center p-2.5"
                          : "justify-between px-3 py-2",
                        isActive
                          ? "bg-raised text-accent font-semibold border border-accent/25 shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
                          : "text-fg-2 hover:text-fg hover:bg-surface"
                      )
                    }
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                      {!isCollapsed && <span className="truncate">{item.name}</span>}
                    </div>
                    {!isCollapsed && item.badge && (
                      <span className="text-[12px] font-semibold px-1.5 py-0.2 rounded-full bg-accent/15 text-accent">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* CR Panel Dedicated Gated Section */}
          <div className="flex flex-col gap-1 pt-2 border-t border-line/60">
            {!isCollapsed && (
              <span className="px-2.5 text-[11.5px] font-bold uppercase tracking-wider text-fg-2/80">
                Cohort Leadership
              </span>
            )}
            <NavLink
              to="/cr-panel"
              title={isCollapsed ? "CR Cohort Panel" : undefined}
              onClick={onClose}
              className={({ isActive }) =>
                clsx(
                  "flex items-center rounded-[11px] text-[13.5px] font-medium transition-all border border-dashed",
                  isCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2",
                  isCRorAdmin
                    ? "border-accent/40 bg-accent/5 text-accent hover:bg-accent/10"
                    : "border-line text-fg-2 hover:text-fg cursor-not-allowed",
                  isActive && "bg-raised font-semibold"
                )
              }
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Shield className="w-4 h-4 shrink-0 text-current" />
                {!isCollapsed && <span className="truncate">CR Panel</span>}
              </div>
              {!isCollapsed && (
                <span className="text-[12px] font-semibold px-1.5 py-0.2 rounded bg-line text-fg">
                  {isCRorAdmin ? "Active" : "Locked"}
                </span>
              )}
            </NavLink>

            {/* Admin Master Control Center Link */}
            {isAdmin && (
              <NavLink
                to="/admin/batches"
                title={isCollapsed ? "Admin Master Panel" : undefined}
                onClick={onClose}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center rounded-[11px] text-[13.5px] font-medium transition-all border mt-0.5",
                    isCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2",
                    "border-blue-500/40 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20",
                    isActive && "bg-blue-600 text-fg font-semibold"
                  )
                }
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-current" />
                  {!isCollapsed && <span className="truncate">Admin Panel</span>}
                </div>
                {!isCollapsed && (
                  <span className="text-[12px] font-semibold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300">
                    Master
                  </span>
                )}
              </NavLink>
            )}
          </div>
        </div>

        {/* User Footer with Role & Logout */}
        <div
          className={clsx(
            "border-t border-line pt-2.5 flex items-center shrink-0",
            isCollapsed ? "justify-center flex-col gap-2" : "justify-between px-1"
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-8 h-8 rounded-full bg-surface-hover border border-line flex items-center justify-center text-[13px] font-bold text-accent shrink-0"
              title={user?.name || "Academic User"}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-semibold text-fg truncate max-w-[110px]">
                  {user?.name || "Academic User"}
                </span>
                <span className="text-[12px] text-fg-2 capitalize truncate">
                  {user?.role || "student"}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={logout}
            className="p-1.5 rounded-[8px] text-danger hover:bg-danger/12 transition-colors cursor-pointer"
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
