import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Calendar,
  Bell,
  Menu,
  CheckCheck,
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { apiClient } from '../../services/apiClient';
import { Dropdown } from '../ui/Dropdown';
import { Badge } from '../ui/Badge';

export interface TopbarProps {
  title?: string;
  onOpenSidebar: () => void;
  onOpenCommand: () => void;
}

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  related_entity_type?: string;
  related_entity_id?: number;
  is_read: number | boolean;
  created_at: string;
}

export const Topbar: React.FC<TopbarProps> = ({
  title = 'Dashboard',
  onOpenSidebar,
  onOpenCommand,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Live Notifications from backend
  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiClient.get<{ notifications: NotificationItem[]; unreadCount: number }>('/notifications'),
    refetchInterval: 30000,
  });

  const notifications = notifData?.notifications || [];
  const unreadCount = notifData?.unreadCount || 0;

  const markAllReadMutation = useMutation({
    mutationFn: () => apiClient.put('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markOneReadMutation = useMutation({
    mutationFn: (id: number) => apiClient.put(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Close notifications on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    if (isNotifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNotifOpen]);

  const userMenuItems = [
    {
      id: 'profile',
      label: 'Your Profile',
      onClick: () => {
        navigate('/profile');
      },
    },
    {
      id: 'logout',
      label: 'Sign Out',
      danger: true,
      onClick: logout,
    },
  ];

  return (
    <header className="sticky top-0 z-30 h-16 w-full bg-[#101713]/90 backdrop-blur-md border-b border-[#1b261f] px-4 sm:px-6 lg:px-8 flex items-center justify-between select-none">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 rounded-[10px] text-[#a7b3aa] hover:text-[#d6ded8] hover:bg-[#101713] transition-colors cursor-pointer shrink-0"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 truncate">
          <h1 className="text-[17px] font-bold text-[#d6ded8] tracking-tight truncate">{title}</h1>
          <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-[#95b399] shrink-0" />
          <span className="hidden sm:inline-block text-[12px] text-[#a7b3aa] font-medium truncate">
            {[user?.department, user?.batch].filter(Boolean).join(' · ') || 'BatchHub'}
          </span>
        </div>
      </div>

      {/* Center: Global Command Search Trigger */}
      <div className="hidden md:flex items-center max-w-md w-full mx-6">
        <button
          type="button"
          onClick={onOpenCommand}
          className="w-full flex items-center justify-between bg-[#0c120e] border border-[#1b261f] hover:border-[#95b399]/40 rounded-[12px] py-1.5 px-3.5 text-[13px] text-[#a7b3aa] transition-all cursor-pointer group shadow-sm"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-[#a7b3aa] group-hover:text-[#95b399] transition-colors" />
            <span className="group-hover:text-[#d6ded8] transition-colors">
              Search students, events, or announcements...
            </span>
          </div>
          <kbd className="text-[11.5px] font-mono bg-[#101713] border border-[#1b261f] px-1.5 py-0.5 rounded text-[#a7b3aa]">
            Ctrl + K
          </kbd>
        </button>
      </div>

      {/* Right: Actions and User Profile */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Mobile Search Button */}
        <button
          onClick={onOpenCommand}
          className="md:hidden p-2 rounded-[10px] text-[#a7b3aa] hover:text-[#d6ded8] hover:bg-[#101713] transition-colors cursor-pointer"
          aria-label="Search"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Calendar Quick Action */}
        <button
          onClick={() => navigate('/events')}
          className="p-2 rounded-[10px] text-[#a7b3aa] hover:text-[#d6ded8] hover:bg-[#101713] transition-colors cursor-pointer"
          title="Campus Calendar"
        >
          <Calendar className="w-4 h-4" />
        </button>

        {/* Notifications Dropdown Container */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="p-2 rounded-[10px] text-[#a7b3aa] hover:text-[#d6ded8] hover:bg-[#101713] transition-colors cursor-pointer relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#95b399] animate-pulse" />
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#16201a] border border-[#1b261f] rounded-[16px] shadow-[0_16px_40px_rgba(0,0,0,0.6)] p-3.5 z-50 animate-in fade-in zoom-in-95 duration-100 max-h-[460px] flex flex-col">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1b261f]">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-[#d6ded8]">Cohort Notifications</span>
                  {unreadCount > 0 ? (
                    <Badge variant="mint" size="xs">
                      {unreadCount} New
                    </Badge>
                  ) : (
                    <Badge variant="muted" size="xs">
                      0 New
                    </Badge>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllReadMutation.mutate()}
                    className="text-[11.5px] text-[#95b399] hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto flex flex-col gap-2 max-h-72 pr-0.5">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-[12.5px] text-[#a7b3aa]">
                    All caught up! No recent notifications.
                  </div>
                ) : (
                  notifications.map((n) => {
                    const isUnread = !Boolean(n.is_read);
                    return (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (isUnread) markOneReadMutation.mutate(n.id);
                          setIsNotifOpen(false);
                          if (n.type === 'task' || n.related_entity_type === 'task') navigate('/tasks');
                          else if (n.type === 'event' || n.related_entity_type === 'event') navigate('/events');
                          else if (n.type === 'announcement' || n.related_entity_type === 'notice') navigate('/announcements');
                          else if (n.type === 'project' || n.related_entity_type === 'project') navigate('/projects');
                        }}
                        className={`p-2.5 rounded-[10px] border flex flex-col gap-1 text-left transition-colors cursor-pointer ${
                          isUnread
                            ? 'bg-[#101713] border-[#95b399]/30 hover:border-[#95b399]/60'
                            : 'bg-[#16201a] border-[#1b261f]/40 hover:bg-[#101713]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`text-[11px] font-bold uppercase tracking-wider ${
                              n.type === 'announcement'
                                ? 'text-[#7f9fb3]'
                                : n.type === 'task'
                                ? 'text-[#95b399]'
                                : 'text-[#d6b867]'
                            }`}
                          >
                            {n.type}
                          </span>
                          <span className="text-[10.5px] text-[#a7b3aa]">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <span className="text-[12.5px] font-semibold text-[#d6ded8] leading-snug">
                          {n.title}
                        </span>
                        <p className="text-[11.5px] text-[#a7b3aa] line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              <Link
                to="/announcements"
                onClick={() => setIsNotifOpen(false)}
                className="block text-center text-[12px] text-[#95b399] hover:underline font-medium pt-2.5 mt-2 border-t border-[#1b261f]"
              >
                View all cohort announcements →
              </Link>
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-[#1b261f] mx-1" />

        {/* Profile Avatar Dropdown */}
        <Dropdown
          trigger={
            <div className="flex items-center gap-2.5 p-1 rounded-[12px] hover:bg-[#101713] transition-colors cursor-pointer select-none">
              <div className="w-8 h-8 rounded-full bg-[#141d18] border border-[#95b399]/30 flex items-center justify-center text-[13px] font-bold text-[#95b399]">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-[13px] font-semibold text-[#d6ded8] leading-tight">
                  {user?.name || 'Academic User'}
                </span>
                <span className="text-[11.5px] text-[#a7b3aa] capitalize">
                  {user?.role || 'student'}
                </span>
              </div>
            </div>
          }
          items={userMenuItems}
        />
      </div>
    </header>
  );
};
