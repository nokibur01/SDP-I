import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Pin,
  Check,
  Megaphone,
  CheckSquare,
  FolderGit2,
  Activity,
  Plus,
  Compass,
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { useAuthStore } from '../../stores/useAuthStore';
import { apiClient } from '../../services/apiClient';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { DashboardSkeleton } from '../../components/ui/Skeleton';

interface Task {
  id: number;
  title: string;
  course_code?: string;
  due_date: string;
  priority: 'High' | 'Medium' | 'Low';
  is_completed?: number | boolean;
  description?: string;
  created_at?: string;
}

interface EventItem {
  id: number;
  title: string;
  event_date: string;
  time?: string;
  location?: string;
  description?: string;
  created_at?: string;
}

interface NoticeItem {
  id: number;
  title: string;
  description: string;
  priority: 'Urgent' | 'Important' | 'Normal';
  is_pinned?: number | boolean;
  category: string;
  created_at: string;
}

interface RoutineSlot {
  id?: number;
  course_name?: string;
  time_slot?: string;
  room_no?: string;
  room_number?: string;
  day_of_week?: string;
}

interface AcademicResponse {
  courses?: Array<{ id: number; course_code: string; course_title: string; department?: string; batch?: string }>;
  routine?: RoutineSlot[];
}

interface ProjectItem {
  id: number;
  title: string;
  description?: string;
  tech_stack?: string;
  created_at?: string;
}

interface ProjectsResponse {
  projects?: ProjectItem[];
}

interface ActivityItem {
  id: string;
  type: 'task' | 'event' | 'notice' | 'project';
  title: string;
  subtitle: string;
  timestamp: string;
  link: string;
}

// Relative time helper
const formatRelativeTime = (dateStr?: string): string => {
  if (!dateStr) return 'Recently';
  const time = new Date(dateStr).getTime();
  if (isNaN(time)) return 'Recently';
  const diffSec = Math.floor((Date.now() - time) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return 'Yesterday';
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// Dynamic event countdown helper
const getEventCountdown = (dateStr: string) => {
  const target = new Date(dateStr);
  const now = new Date();
  // Clear times to compare dates accurately
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const targetDate = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const diffDays = Math.round((targetDate - todayDate) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: 'Completed', variant: 'muted' as const };
  if (diffDays === 0) return { label: 'Today', variant: 'danger' as const };
  if (diffDays === 1) return { label: 'Tomorrow', variant: 'warning' as const };
  if (diffDays <= 7) return { label: `In ${diffDays}d`, variant: 'mint' as const };
  return { label: `In ${diffDays}d`, variant: 'info' as const };
};

export const DashboardView: React.FC = () => {
  const { user } = useAuthStore();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Dynamic calendar state
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // 1. Fetch Tasks
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['dashboard-tasks'],
    queryFn: () => apiClient.get<{ tasks: Task[] }>('/tasks'),
  });

  // 2. Fetch Events
  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['dashboard-events'],
    queryFn: () => apiClient.get<{ events: EventItem[] }>('/events'),
  });

  // 3. Fetch Notices
  const { data: noticesData, isLoading: noticesLoading } = useQuery({
    queryKey: ['dashboard-notices'],
    queryFn: () => apiClient.get<{ notices: NoticeItem[] }>('/notices'),
  });

  // 4. Fetch Projects
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['dashboard-projects'],
    queryFn: () => apiClient.get<ProjectsResponse>('/projects'),
  });

  // 5. Fetch Academic Routine
  const { data: academicData } = useQuery({
    queryKey: ['dashboard-academic'],
    queryFn: () => apiClient.get<AcademicResponse>('/academic'),
  });

  // Task Completion Mutation with Optimistic Feedback
  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, isCurrentlyCompleted }: { taskId: number; isCurrentlyCompleted: boolean }) => {
      if (isCurrentlyCompleted) {
        return apiClient.delete(`/tasks/${taskId}/complete`);
      } else {
        return apiClient.post(`/tasks/${taskId}/complete`);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-list'] });
      success(variables.isCurrentlyCompleted ? 'Task marked as pending' : 'Task marked as completed!');
    },
    onError: (err: Error) => {
      error(err.message || 'Failed to update task status');
    },
  });

  const tasks = tasksData?.tasks || [];
  const events = eventsData?.events || [];
  const notices = noticesData?.notices || [];
  const projects = projectsData?.projects || [];
  const routinesList = academicData?.routine || [];

  // Metrics computation from real database records
  const now = new Date();
  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter((t) => Boolean(t.is_completed)).length;
  const pendingTasksCount = Math.max(0, totalTasksCount - completedTasksCount);
  const overdueTasksCount = tasks.filter(
    (t) => !t.is_completed && new Date(t.due_date).getTime() < now.getTime()
  ).length;

  const weekAhead = now.getTime() + 7 * 24 * 60 * 60 * 1000;
  const dueThisWeekCount = tasks.filter((t) => {
    const due = new Date(t.due_date).getTime();
    return !t.is_completed && due >= now.getTime() && due <= weekAhead;
  }).length;
  const nextEvent = [...events]
    .filter((e) => new Date(e.event_date).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())[0];

  const completionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 100;

  const activeTasks = tasks.slice(0, 5);
  const activeEvents = events.slice(0, 4);
  const pinnedNotices = notices.filter((n) => Boolean(n.is_pinned)).slice(0, 2);

  // Dynamic Time-of-Day Greeting
  const currentHour = now.getHours();
  const greeting =
    currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';

  // Dynamic next upcoming class computed from actual time and weekly routine records
  const nextClass = useMemo(() => {
    if (!routinesList || routinesList.length === 0) return null;

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayIndex = now.getDay();
    const currentDayName = daysOfWeek[currentDayIndex];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const parseEndTimeMinutes = (timeSlot?: string): number => {
      if (!timeSlot) return 24 * 60;
      const parts = timeSlot.split('-');
      if (parts.length < 2) return 24 * 60;
      const endStr = parts[1].trim();
      const match = endStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (!match) return 24 * 60;
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const meridiem = (match[3] || '').toUpperCase();
      if (meridiem === 'PM' && h < 12) h += 12;
      if (meridiem === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    };

    // 1. Today's remaining classes
    const todayClasses = routinesList.filter(
      (r) => r.day_of_week?.toLowerCase() === currentDayName.toLowerCase()
    );
    for (const c of todayClasses) {
      if (parseEndTimeMinutes(c.time_slot) > currentMinutes) {
        return { ...c, dayLabel: 'Today' };
      }
    }

    // 2. Upcoming days in routine
    for (let offset = 1; offset <= 7; offset++) {
      const nextDayIndex = (currentDayIndex + offset) % 7;
      const nextDayName = daysOfWeek[nextDayIndex];
      const dayClasses = routinesList.filter(
        (r) => r.day_of_week?.toLowerCase() === nextDayName.toLowerCase()
      );
      if (dayClasses.length > 0) {
        return {
          ...dayClasses[0],
          dayLabel: offset === 1 ? 'Tomorrow' : nextDayName,
        };
      }
    }

    return { ...routinesList[0], dayLabel: routinesList[0].day_of_week || 'Routine' };
  }, [routinesList, now]);

  // Aggregate Real Live Activity Feed (100% genuine backend data)
  const recentActivities = useMemo<ActivityItem[]>(() => {
    const list: ActivityItem[] = [];

    // Announcements
    notices.forEach((n) => {
      list.push({
        id: `notice-${n.id}`,
        type: 'notice',
        title: n.title,
        subtitle: `Announcement (${n.category})`,
        timestamp: n.created_at,
        link: '/announcements',
      });
    });

    // Events
    events.forEach((e) => {
      list.push({
        id: `event-${e.id}`,
        type: 'event',
        title: e.title,
        subtitle: `Event on ${new Date(e.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
        timestamp: e.created_at || e.event_date,
        link: '/events',
      });
    });

    // Tasks
    tasks.forEach((t) => {
      list.push({
        id: `task-${t.id}`,
        type: 'task',
        title: t.title,
        subtitle: `Coursework deadline ${t.course_code ? `[${t.course_code}]` : ''}`,
        timestamp: t.created_at || t.due_date,
        link: '/tasks',
      });
    });

    // Projects
    projects.forEach((p) => {
      list.push({
        id: `project-${p.id}`,
        type: 'project',
        title: p.title,
        subtitle: `Project collaboration ${p.tech_stack ? `(${p.tech_stack})` : ''}`,
        timestamp: p.created_at || new Date().toISOString(),
        link: '/projects',
      });
    });

    // Sort descending by timestamp
    return list
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [notices, events, tasks, projects]);

  // Dynamic Calendar Calculation
  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();
  const calMonthName = calendarDate.toLocaleString('default', { month: 'long' });
  const daysInCalMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();

  const handlePrevMonth = () => {
    setCalendarDate(new Date(calYear, calMonth - 1, 1));
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    setCalendarDate(new Date(calYear, calMonth + 1, 1));
    setSelectedDay(null);
  };

  // Calendar Day Indicators
  const dayHasIndicator = (day: number) => {
    const hasEv = events.some((e) => {
      const d = new Date(e.event_date);
      return d.getFullYear() === calYear && d.getMonth() === calMonth && d.getDate() === day;
    });
    const hasTask = tasks.some((t) => {
      const d = new Date(t.due_date);
      return d.getFullYear() === calYear && d.getMonth() === calMonth && d.getDate() === day;
    });
    return hasEv || hasTask;
  };

  const isCurrentToday = (day: number) => {
    const today = new Date();
    return today.getFullYear() === calYear && today.getMonth() === calMonth && today.getDate() === day;
  };

  const isInitialLoading = tasksLoading && eventsLoading && noticesLoading && projectsLoading;

  return (
    <AppLayout title="Dashboard">
      {isInitialLoading ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-5">
          {/* 1. Welcome Banner */}
          <section className="relative overflow-hidden bg-[#101713] border border-[#1b261f] rounded-[18px] p-5 sm:p-6">
            <div className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-[#95b399]/[0.06] blur-3xl" />

            <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap text-[12px] font-medium">
                  <span className="text-[#78877d]">
                    {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                  </span>
                  {user?.batch && (
                    <span className="px-2 py-0.5 rounded-full bg-[#1f2c23] text-[#95b399] border border-[#95b399]/20">
                      {/year|batch/i.test(user.batch) ? user.batch : `Batch ${user.batch}`}
                    </span>
                  )}
                  {user?.department && (
                    <span className="px-2 py-0.5 rounded-full bg-[#141d18] text-[#a7b3aa] border border-[#1b261f]">
                      {user.department}
                    </span>
                  )}
                </div>

                <h2 className="text-[22px] sm:text-[26px] font-bold text-[#d6ded8] tracking-tight mt-2">
                  {greeting}, {user?.name ? user.name.split(' ')[0] : 'there'}
                </h2>

                <p className="text-[13.5px] text-[#a7b3aa] mt-1 max-w-xl leading-relaxed">
                  {pendingTasksCount === 0 ? (
                    <>You&apos;re all caught up — no pending tasks.</>
                  ) : (
                    <>
                      You have{' '}
                      <strong className="text-[#d6ded8] font-semibold">
                        {pendingTasksCount} pending {pendingTasksCount === 1 ? 'task' : 'tasks'}
                      </strong>
                      {overdueTasksCount > 0 && (
                        <>
                          , <span className="text-[#d66767] font-medium">{overdueTasksCount} overdue</span>
                        </>
                      )}
                      .
                    </>
                  )}
                  {nextEvent && (
                    <>
                      {' '}Next up: <span className="text-[#d6ded8] font-medium">{nextEvent.title}</span> on{' '}
                      {new Date(nextEvent.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}.
                    </>
                  )}
                </p>

                <div className="flex items-center gap-2.5 mt-4 flex-wrap">
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => navigate('/tasks')}
                  >
                    New Task
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Compass className="w-3.5 h-3.5" />}
                    onClick={() => navigate('/resources')}
                  >
                    Resources
                  </Button>
                </div>
              </div>

              {/* At-a-glance summary */}
              <div className="grid grid-cols-3 gap-2.5 lg:w-[360px] shrink-0">
                <div className="rounded-[14px] bg-[#0c120e] border border-[#1b261f] p-3">
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-[#78877d]">Progress</div>
                  <div className="text-[20px] font-bold text-[#d6ded8] mt-1 leading-none">{completionRate}%</div>
                  <div className="h-1.5 rounded-full bg-[#1b261f] mt-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#95b399] transition-all duration-500"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                </div>
                <div className="rounded-[14px] bg-[#0c120e] border border-[#1b261f] p-3">
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-[#78877d]">This week</div>
                  <div className="text-[20px] font-bold text-[#d6ded8] mt-1 leading-none">{dueThisWeekCount}</div>
                  <div className="text-[11.5px] text-[#78877d] mt-2">due soon</div>
                </div>
                <div className="rounded-[14px] bg-[#0c120e] border border-[#1b261f] p-3">
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-[#78877d]">Overdue</div>
                  <div
                    className={`text-[20px] font-bold mt-1 leading-none ${
                      overdueTasksCount > 0 ? 'text-[#d66767]' : 'text-[#d6ded8]'
                    }`}
                  >
                    {overdueTasksCount}
                  </div>
                  <div className="text-[11.5px] text-[#78877d] mt-2">{overdueTasksCount > 0 ? 'need attention' : 'all clear'}</div>
                </div>
              </div>
            </div>
          </section>

          {/* 2. Real Data-Driven 4 KPI Metric Cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {/* Card 1: Upcoming Events */}
            <div
              onClick={() => navigate('/events')}
              className="group bg-[#101713] hover:bg-[#16201a] border border-[#1b261f] hover:border-[#95b399]/40 rounded-[16px] p-4 sm:p-5 transition-all duration-150 cursor-pointer shadow-sm hover:shadow-[0_8px_20px_rgba(0,0,0,0.3)] flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#a7b3aa] uppercase tracking-wider">
                  Events
                </span>
                <div className="w-8 h-8 rounded-lg bg-[#0c120e] border border-[#1b261f] group-hover:border-[#95b399]/40 flex items-center justify-center text-[#4a6352] group-hover:text-[#95b399] transition-colors">
                  <CalendarIcon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-[26px] font-extrabold text-[#d6ded8] tracking-tight leading-none">
                  {events.length}
                </div>
                <div className="flex items-center justify-between text-[11.5px] text-[#a7b3aa] mt-1.5">
                  <span>Scheduled campus activities</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#95b399] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>

            {/* Card 2: Active Deadlines */}
            <div
              onClick={() => navigate('/tasks')}
              className="group bg-[#101713] hover:bg-[#16201a] border border-[#1b261f] hover:border-[#95b399]/40 rounded-[16px] p-4 sm:p-5 transition-all duration-150 cursor-pointer shadow-sm hover:shadow-[0_8px_20px_rgba(0,0,0,0.3)] flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#a7b3aa] uppercase tracking-wider">
                  Course Tasks
                </span>
                <div className="w-8 h-8 rounded-lg bg-[#0c120e] border border-[#1b261f] group-hover:border-[#95b399]/40 flex items-center justify-center text-[#4a6352] group-hover:text-[#95b399] transition-colors">
                  <CheckSquare className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-[26px] font-extrabold text-[#d6ded8] tracking-tight leading-none">
                    {pendingTasksCount}
                  </span>
                  <span className="text-[12px] text-[#a7b3aa]">/ {totalTasksCount} total</span>
                </div>
                <div className="flex items-center justify-between text-[11.5px] text-[#a7b3aa] mt-1.5">
                  <span className={overdueTasksCount > 0 ? 'text-[#d66767] font-medium' : 'text-[#95b399]'}>
                    {overdueTasksCount > 0 ? `${overdueTasksCount} overdue` : `${completionRate}% done`}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#95b399] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>

            {/* Card 3: Batch Bulletins */}
            <div
              onClick={() => navigate('/announcements')}
              className="group bg-[#101713] hover:bg-[#16201a] border border-[#1b261f] hover:border-[#7f9fb3]/40 rounded-[16px] p-4 sm:p-5 transition-all duration-150 cursor-pointer shadow-sm hover:shadow-[0_8px_20px_rgba(0,0,0,0.3)] flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#a7b3aa] uppercase tracking-wider">
                  Bulletins
                </span>
                <div className="w-8 h-8 rounded-lg bg-[#0c120e] border border-[#1b261f] group-hover:border-[#95b399]/40 flex items-center justify-center text-[#4a6352] group-hover:text-[#95b399] transition-colors">
                  <Megaphone className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-[26px] font-extrabold text-[#d6ded8] tracking-tight leading-none">
                  {notices.length}
                </div>
                <div className="flex items-center justify-between text-[11.5px] text-[#a7b3aa] mt-1.5">
                  <span>{pinnedNotices.length} pinned notices</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#7f9fb3] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>

            {/* Card 4: Project Workspaces */}
            <div
              onClick={() => navigate('/projects')}
              className="group bg-[#101713] hover:bg-[#16201a] border border-[#1b261f] hover:border-[#a394c0]/40 rounded-[16px] p-4 sm:p-5 transition-all duration-150 cursor-pointer shadow-sm hover:shadow-[0_8px_20px_rgba(0,0,0,0.3)] flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#a7b3aa] uppercase tracking-wider">
                  Projects
                </span>
                <div className="w-8 h-8 rounded-lg bg-[#0c120e] border border-[#1b261f] group-hover:border-[#95b399]/40 flex items-center justify-center text-[#4a6352] group-hover:text-[#95b399] transition-colors">
                  <FolderGit2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-[26px] font-extrabold text-[#d6ded8] tracking-tight leading-none">
                  {projects.length}
                </div>
                <div className="flex items-center justify-between text-[11.5px] text-[#a7b3aa] mt-1.5">
                  <span>Active team repositories</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#a394c0] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>
          </section>

          {/* 3. Primary Workspace Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
            {/* Left Column (5 cols): Routine Session, Calendar & Events */}
            <div className="lg:col-span-5 flex flex-col gap-4 sm:gap-5">
              {/* Routine Session Flight Deck */}
              <div className="bg-[#101713] border border-[#1b261f] rounded-[16px] p-4 sm:p-5 shadow-[0_4px_16px_rgba(0,0,0,0.18)]">
                <div className="flex items-center justify-between pb-2.5 border-b border-[#1b261f]/60">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#95b399] animate-pulse" />
                    <span className="text-[11px] uppercase font-bold tracking-wider text-[#95b399]">
                      Next Routine Class
                    </span>
                  </div>
                  {nextClass ? (
                    <Badge variant="mint" size="xs">
                      {nextClass.dayLabel}
                    </Badge>
                  ) : (
                    <Badge variant="muted" size="xs">
                      No Class
                    </Badge>
                  )}
                </div>

                {nextClass ? (
                  <div className="mt-3">
                    <h3 className="text-[15px] font-bold text-[#d6ded8] tracking-tight">
                      {nextClass.course_name}
                    </h3>
                    <div className="flex items-center gap-2 text-[12px] text-[#a7b3aa] mt-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#7f9fb3]" />
                      <span>{nextClass.time_slot || 'Time not specified'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[12px] text-[#a7b3aa] mt-1">
                      <MapPin className="w-3.5 h-3.5 text-[#7f9fb3]" />
                      <span>Room: {nextClass.room_no || nextClass.room_number || 'TBA'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-5 text-center flex flex-col items-center justify-center gap-1">
                    <p className="text-[13px] text-[#a7b3aa]">No routine slots scheduled for your cohort.</p>
                    <p className="text-[11.5px] text-[#a7b3aa]/70">Class Representatives can register periods in the CR Panel.</p>
                  </div>
                )}

                <div className="pt-3 mt-3 border-t border-[#1b261f]/60 flex items-center justify-between text-[11.5px]">
                  <span className="text-[#a7b3aa]">
                    {user?.department ? `${user.department} Schedule` : 'Academic Schedule'}
                  </span>
                  <Link
                    to="/cr-panel"
                    className="text-[#95b399] hover:underline font-medium inline-flex items-center gap-1"
                  >
                    View routine <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* Dynamic Interactive Mini Calendar */}
              <div className="bg-[#101713] border border-[#1b261f] rounded-[16px] p-4 sm:p-5 shadow-[0_4px_16px_rgba(0,0,0,0.18)]">
                <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#1b261f]/60">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-[#95b399]" />
                    <h3 className="text-[14.5px] font-bold text-[#d6ded8]">
                      {calMonthName} {calYear}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handlePrevMonth}
                      title="Previous Month"
                      className="p-1 rounded-[6px] hover:bg-[#141d18] text-[#a7b3aa] hover:text-[#d6ded8] transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setCalendarDate(new Date());
                        setSelectedDay(null);
                      }}
                      title="Today"
                      className="px-2 py-0.5 text-[11px] font-semibold text-[#95b399] hover:bg-[#141d18] rounded-[6px] transition-colors cursor-pointer"
                    >
                      Today
                    </button>
                    <button
                      onClick={handleNextMonth}
                      title="Next Month"
                      className="p-1 rounded-[6px] hover:bg-[#141d18] text-[#a7b3aa] hover:text-[#d6ded8] transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center select-none text-[11.5px]">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                    <div key={d} className="text-[#a7b3aa] font-semibold py-1">
                      {d}
                    </div>
                  ))}

                  {/* Leading Blank Cells */}
                  {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                    <div key={`blank-${i}`} className="py-1.5" />
                  ))}

                  {/* Actual Days of the Month */}
                  {Array.from({ length: daysInCalMonth }, (_, i) => i + 1).map((day) => {
                    const isSelected = selectedDay === day;
                    const hasIndicator = dayHasIndicator(day);
                    const isTodayDate = isCurrentToday(day);

                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(isSelected ? null : day)}
                        className={`relative py-1.5 rounded-[8px] font-medium transition-all cursor-pointer flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-[#95b399] text-[#090e0b] font-bold shadow-[0_0_12px_rgba(149,179,153,0.4)] ring-2 ring-[#95b399]/40'
                            : isTodayDate
                            ? 'border border-[#95b399]/60 text-[#d6ded8] hover:bg-[#141d18]'
                            : 'text-[#d6ded8] hover:bg-[#141d18]'
                        }`}
                      >
                        <span>{day}</span>
                        {hasIndicator && !isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#95b399] mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Upcoming Events with Dynamic Countdown Badges */}
              <div className="bg-[#101713] border border-[#1b261f] rounded-[16px] p-4 sm:p-5 shadow-[0_4px_16px_rgba(0,0,0,0.18)] flex flex-col gap-2.5">
                <div className="flex items-center justify-between pb-2.5 border-b border-[#1b261f]/60">
                  <h3 className="text-[14.5px] font-bold text-[#d6ded8]">Upcoming Events</h3>
                  <Link
                    to="/events"
                    className="text-[11.5px] text-[#95b399] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>View All</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {eventsLoading ? (
                  <div className="py-6 text-center text-[12.5px] text-[#a7b3aa]">Loading events...</div>
                ) : activeEvents.length === 0 ? (
                  <div className="py-6 text-center text-[12.5px] text-[#a7b3aa]">No upcoming events scheduled.</div>
                ) : (
                  <div className="flex flex-col divide-y divide-[#1b261f]/60">
                    {activeEvents.map((ev) => {
                      const countdown = getEventCountdown(ev.event_date);
                      return (
                        <Link
                          key={ev.id}
                          to="/events"
                          className="py-2.5 flex items-center justify-between group cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-[10px] bg-[#0c120e] border border-[#1b261f] flex flex-col items-center justify-center text-center shrink-0">
                              <span className="text-[10px] uppercase font-bold text-[#a7b3aa]">
                                {new Date(ev.event_date).toLocaleString('default', { month: 'short' })}
                              </span>
                              <span className="text-[14px] font-bold text-[#95b399]">
                                {new Date(ev.event_date).getDate()}
                              </span>
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[13px] font-semibold text-[#d6ded8] group-hover:text-[#95b399] transition-colors truncate">
                                {ev.title}
                              </span>
                              <div className="flex items-center gap-3 text-[11.5px] text-[#a7b3aa] mt-0.5 truncate">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-[#7f9fb3]" /> {ev.time || 'TBA'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-[#7f9fb3]" /> {ev.location || 'Campus'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant={countdown.variant} size="xs">
                              {countdown.label}
                            </Badge>
                            <ChevronRight className="w-4 h-4 text-[#a7b3aa] group-hover:text-[#d6ded8] transition-colors" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column (7 cols): Workload, Tasks, Bulletins & Real Live Activity Feed */}
            <div className="lg:col-span-7 flex flex-col gap-4 sm:gap-5">
              {/* Active Deadlines with Interactive Workload Progress */}
              <div className="bg-[#101713] border border-[#1b261f] rounded-[16px] p-4 sm:p-5 shadow-[0_4px_16px_rgba(0,0,0,0.18)] flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2.5 border-b border-[#1b261f]/60">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#95b399]" />
                    <h3 className="text-[14.5px] font-bold text-[#d6ded8]">Coursework & Deadlines</h3>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Badge variant="mint" size="xs">
                      {completedTasksCount} of {totalTasksCount} Done ({completionRate}%)
                    </Badge>
                    <Link
                      to="/tasks"
                      className="text-[11.5px] text-[#95b399] hover:underline flex items-center gap-1 font-semibold"
                    >
                      Manage <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* SaaS Progress Meter */}
                {totalTasksCount > 0 && (
                  <div className="w-full bg-[#0c120e] border border-[#1b261f] rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#95b399] to-[#7f9fb3] h-full rounded-full transition-all duration-300"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                )}

                {tasksLoading ? (
                  <div className="py-6 text-center text-[12.5px] text-[#a7b3aa]">Loading course deadlines...</div>
                ) : activeTasks.length === 0 ? (
                  <div className="py-6 text-center text-[12.5px] text-[#a7b3aa]">
                    No active deadlines! You're completely up to date.
                  </div>
                ) : (
                  <div className="flex flex-col divide-y divide-[#1b261f]/50">
                    {activeTasks.map((task) => {
                      const isDone = Boolean(task.is_completed);
                      return (
                        <div
                          key={task.id}
                          onClick={() =>
                            toggleTaskMutation.mutate({
                              taskId: task.id,
                              isCurrentlyCompleted: isDone,
                            })
                          }
                          className="py-2.5 px-2 rounded-[8px] hover:bg-[#141d18]/40 transition-all cursor-pointer flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <button
                              type="button"
                              aria-label={`Toggle task ${task.title}`}
                              className={`w-4.5 h-4.5 rounded-[5px] border flex items-center justify-center transition-all shrink-0 ${
                                isDone
                                  ? 'bg-[#95b399] border-[#95b399] text-[#090e0b]'
                                  : 'border-[#1b261f] group-hover:border-[#95b399]'
                              }`}
                            >
                              {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                            </button>
                            <div className="flex flex-col min-w-0">
                              <span
                                className={`text-[13px] font-medium transition-all truncate ${
                                  isDone ? 'line-through text-[#a7b3aa]' : 'text-[#d6ded8] group-hover:text-[#95b399]'
                                }`}
                              >
                                {task.title}
                              </span>
                              <span className="text-[11.5px] text-[#a7b3aa] flex items-center gap-1.5 mt-0.5">
                                <Clock className="w-3 h-3 text-[#7f9fb3]" /> Due:{' '}
                                {new Date(task.due_date).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {task.course_code && (
                              <Badge variant="muted" size="xs">
                                {task.course_code}
                              </Badge>
                            )}
                            <Badge
                              variant={
                                task.priority === 'High'
                                  ? 'danger'
                                  : task.priority === 'Medium'
                                  ? 'warning'
                                  : 'muted'
                              }
                              size="xs"
                            >
                              {task.priority}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Dynamic Live Activity Feed (Aggregated real database items) */}
              <div className="bg-[#101713] border border-[#1b261f] rounded-[16px] p-4 sm:p-5 shadow-[0_4px_16px_rgba(0,0,0,0.18)] flex flex-col gap-2.5">
                <div className="flex items-center justify-between pb-2.5 border-b border-[#1b261f]/60">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#95b399]" />
                    <h3 className="text-[14.5px] font-bold text-[#d6ded8]">Live Activity Feed</h3>
                  </div>
                  <span className="text-[11px] text-[#a7b3aa]">Real-time cohort updates</span>
                </div>

                {recentActivities.length === 0 ? (
                  <div className="py-6 text-center text-[12.5px] text-[#a7b3aa]">
                    No recent cohort activity recorded.
                  </div>
                ) : (
                  <div className="flex flex-col divide-y divide-[#1b261f]/50">
                    {recentActivities.map((act) => (
                      <Link
                        key={act.id}
                        to={act.link}
                        className="py-2.5 px-2 rounded-[8px] hover:bg-[#141d18]/40 transition-all flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                              act.type === 'notice'
                                ? 'bg-[#7f9fb3]/10 text-[#7f9fb3] border-[#7f9fb3]/20'
                                : act.type === 'event'
                                ? 'bg-[#95b399]/10 text-[#95b399] border-[#95b399]/20'
                                : act.type === 'project'
                                ? 'bg-[#a394c0]/10 text-[#a394c0] border-[#a394c0]/20'
                                : 'bg-[#d6b867]/10 text-[#d6b867] border-[#d6b867]/20'
                            }`}
                          >
                            {act.type === 'notice' && <Megaphone className="w-3.5 h-3.5" />}
                            {act.type === 'event' && <CalendarIcon className="w-3.5 h-3.5" />}
                            {act.type === 'project' && <FolderGit2 className="w-3.5 h-3.5" />}
                            {act.type === 'task' && <CheckSquare className="w-3.5 h-3.5" />}
                          </div>

                          <div className="flex flex-col min-w-0">
                            <span className="text-[13px] font-medium text-[#d6ded8] group-hover:text-[#95b399] transition-colors truncate">
                              {act.title}
                            </span>
                            <span className="text-[11.5px] text-[#a7b3aa] truncate">{act.subtitle}</span>
                          </div>
                        </div>

                        <span className="text-[11px] text-[#a7b3aa] shrink-0">
                          {formatRelativeTime(act.timestamp)}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Pinned Announcements */}
              <div className="bg-[#101713] border border-[#1b261f] rounded-[16px] p-4 sm:p-5 shadow-[0_4px_16px_rgba(0,0,0,0.18)] flex flex-col gap-2.5">
                <div className="flex items-center justify-between pb-2.5 border-b border-[#1b261f]/60">
                  <div className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-[#7f9fb3]" />
                    <h3 className="text-[14.5px] font-bold text-[#d6ded8]">Cohort Bulletins</h3>
                  </div>
                  <Link
                    to="/announcements"
                    className="text-[11.5px] text-[#95b399] hover:underline flex items-center gap-1 font-semibold"
                  >
                    View All <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {noticesLoading ? (
                  <div className="py-6 text-center text-[12.5px] text-[#a7b3aa]">Loading notices...</div>
                ) : pinnedNotices.length === 0 ? (
                  <div className="py-6 text-center text-[12.5px] text-[#a7b3aa]">No pinned announcements currently.</div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {pinnedNotices.map((notice) => (
                      <div
                        key={notice.id}
                        className="p-3.5 rounded-[12px] bg-[#0c120e] border border-[#1b261f] flex flex-col gap-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Pin className="w-3.5 h-3.5 text-[#95b399]" />
                            <Badge
                              variant={
                                notice.priority === 'Urgent'
                                  ? 'danger'
                                  : notice.priority === 'Important'
                                  ? 'warning'
                                  : 'info'
                              }
                              size="xs"
                            >
                              {notice.priority}
                            </Badge>
                            <span className="text-[11px] uppercase font-bold tracking-wider text-[#a7b3aa]">
                              {notice.category}
                            </span>
                          </div>
                          <span className="text-[11px] text-[#a7b3aa]">
                            {formatRelativeTime(notice.created_at)}
                          </span>
                        </div>
                        <h4 className="text-[14px] font-bold text-[#d6ded8] tracking-tight">{notice.title}</h4>
                        <p className="text-[12.5px] text-[#a7b3aa] line-clamp-2 leading-relaxed">
                          {notice.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};
