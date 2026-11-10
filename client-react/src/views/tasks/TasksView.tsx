import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckSquare,
  Plus,
  Search,
  Clock,
  AlertTriangle,
  Trash2,
  Check,
  X,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { useAuthStore } from '../../stores/useAuthStore';
import { apiClient } from '../../services/apiClient';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { useToast } from '../../components/ui/Toast';
import { CardGridSkeleton } from '../../components/ui/Skeleton';

export interface TaskItem {
  id: number;
  title: string;
  description?: string;
  course_code?: string;
  due_date: string;
  priority: 'High' | 'Medium' | 'Low';
  department?: string;
  created_by?: number;
  creator_name?: string;
  creator_student_id?: string;
  is_completed?: number | boolean;
  completed_at?: string;
  status?: string;
  created_at?: string;
}

interface TasksApiResponse {
  success: boolean;
  tasks: TaskItem[];
  pendingTasks?: TaskItem[];
  myPendingTasks?: TaskItem[];
}

export const TasksView: React.FC = () => {
  const { user } = useAuthStore();
  const { success, error, info } = useToast();
  const queryClient = useQueryClient();

  const isCRorAdmin = user?.role === 'cr' || user?.role === 'admin';

  // Filters & State
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'today' | 'overdue' | 'completed' | 'moderation' | 'my_pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [sortBy, setSortBy] = useState('due_asc');
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<TaskItem | null>(null);
  const [taskToReject, setTaskToReject] = useState<TaskItem | null>(null);

  // Create form state
  const [formData, setFormData] = useState({
    title: '',
    course_code: '',
    priority: 'Medium' as 'High' | 'Medium' | 'Low',
    due_date: '',
    description: '',
  });

  // Query Tasks
  const { data, isLoading } = useQuery({
    queryKey: ['tasks-list'],
    queryFn: () => apiClient.get<TasksApiResponse>('/tasks'),
  });

  const tasks = data?.tasks || [];
  const pendingTasks = data?.pendingTasks || [];
  const myPendingTasks = data?.myPendingTasks || [];

  // Mutations
  const toggleCompleteMutation = useMutation({
    mutationFn: async ({ taskId, isDone }: { taskId: number; isDone: boolean }) => {
      if (isDone) {
        return apiClient.delete(`/tasks/${taskId}/complete`);
      } else {
        return apiClient.post(`/tasks/${taskId}/complete`);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
      success(variables.isDone ? 'Marked task as pending' : 'Marked task as completed!');
    },
    onError: (err: Error) => error(err.message || 'Failed to update task completion'),
  });

  const createTaskMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      return apiClient.post<{ success: boolean; message?: string }>('/tasks', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
      setIsCreateModalOpen(false);
      setFormData({
        title: '',
        course_code: '',
        priority: 'Medium',
        due_date: '',
        description: '',
      });
      success(
        isCRorAdmin
          ? 'Task created and published to batch!'
          : 'Submission sent for CR moderation review!'
      );
    },
    onError: (err: Error) => error(err.message || 'Failed to create task'),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      return apiClient.delete(`/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
      setTaskToDelete(null);
      info('Task deleted successfully.');
    },
    onError: (err: Error) => error(err.message || 'Failed to delete task'),
  });

  const approveTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      return apiClient.put(`/tasks/${taskId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
      success('Task approved and published to cohort!');
    },
    onError: (err: Error) => error(err.message || 'Failed to approve task'),
  });

  const rejectTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      return apiClient.delete(`/tasks/${taskId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-list'] });
      setTaskToReject(null);
      info('Task submission rejected and dismissed.');
    },
    onError: (err: Error) => error(err.message || 'Failed to reject task'),
  });

  // Extract unique courses for filter
  const courseOptions = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (t.course_code) set.add(t.course_code.toUpperCase());
    });
    return Array.from(set).sort();
  }, [tasks]);

  // Compute metrics
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const overdueCount = tasks.filter(
    (t) => !t.is_completed && new Date(t.due_date).getTime() < now.getTime()
  ).length;

  const dueTodayCount = tasks.filter(
    (t) => !t.is_completed && t.due_date.slice(0, 10) === todayStr
  ).length;

  const completedCount = tasks.filter((t) => Boolean(t.is_completed)).length;
  const activeCount = tasks.length - completedCount;

  // Filtered & sorted task list
  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        const isDone = Boolean(task.is_completed);
        const taskDue = new Date(task.due_date).getTime();
        const isOverdue = !isDone && taskDue < now.getTime();
        const isToday = !isDone && task.due_date.slice(0, 10) === todayStr;

        // Tab filter
        if (activeTab === 'active' && isDone) return false;
        if (activeTab === 'today' && !isToday) return false;
        if (activeTab === 'overdue' && !isOverdue) return false;
        if (activeTab === 'completed' && !isDone) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = task.title.toLowerCase().includes(q);
          const matchCourse = task.course_code?.toLowerCase().includes(q);
          const matchDesc = task.description?.toLowerCase().includes(q);
          if (!matchTitle && !matchCourse && !matchDesc) return false;
        }

        // Course filter
        if (selectedCourse !== 'all' && task.course_code?.toUpperCase() !== selectedCourse) {
          return false;
        }

        // Priority filter
        if (selectedPriority !== 'all' && task.priority !== selectedPriority) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'due_asc') {
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }
        if (sortBy === 'due_desc') {
          return new Date(b.due_date).getTime() - new Date(a.due_date).getTime();
        }
        if (sortBy === 'priority_desc') {
          const pOrder: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
          return (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0);
        }
        if (sortBy === 'course_asc') {
          return (a.course_code || '').localeCompare(b.course_code || '');
        }
        if (sortBy === 'newest') {
          return new Date(b.created_at || b.due_date).getTime() - new Date(a.created_at || a.due_date).getTime();
        }
        return 0;
      });
  }, [tasks, activeTab, searchQuery, selectedCourse, selectedPriority, sortBy, todayStr, now]);

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      error('Please provide a title for the task');
      return;
    }
    if (!formData.due_date) {
      error('Please specify a due date and time');
      return;
    }
    createTaskMutation.mutate(formData);
  };

  return (
    <AppLayout title="Tasks & Deadlines">
      <div className="space-y-6">
        {/* 1. Header with Title & Create Task */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[12.5px] uppercase font-bold tracking-wider text-accent">
                Academic Deliverables
              </span>
              <span className="text-line">•</span>
              <span className="text-[13px] text-fg-2">Milestones & Coursework</span>
            </div>
            <h1 className="text-[22px] sm:text-[26px] font-bold text-fg tracking-tight mt-0.5">
              Tasks, Assignments & Deadlines
            </h1>
            <p className="text-[13.5px] text-fg-2 mt-0.5">
              Centralized cohort milestone tracking with individualized student progress and CR moderation.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Create Task
          </Button>
        </div>

        {/* 2. Workload Metrics & Progress Strip */}
        <div className="space-y-3">
          {tasks.length > 0 && (
            <div className="bg-surface border border-line rounded-[14px] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-[13px] font-semibold text-fg">Coursework Completion</span>
                <Badge variant="mint" size="xs">
                  {completedCount} of {tasks.length} Done ({tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 100}%)
                </Badge>
              </div>
              <div className="w-full sm:w-64 bg-inset border border-line rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-accent to-info h-full rounded-full transition-all duration-300"
                  style={{ width: `${tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => setActiveTab('overdue')}
              className={`p-4 rounded-[16px] bg-surface border text-left transition-all cursor-pointer ${
                activeTab === 'overdue' ? 'border-danger bg-surface-hover' : 'border-line hover:border-danger/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] uppercase font-bold tracking-wider text-fg-2">
                  Overdue
                </span>
                <span className="w-2 h-2 rounded-full bg-danger" />
              </div>
              <span className="text-[26px] font-bold text-danger mt-1 block">{overdueCount}</span>
              <span className="text-[13px] text-fg-2">Requires attention</span>
            </button>

            <button
              onClick={() => setActiveTab('today')}
              className={`p-4 rounded-[16px] bg-surface border text-left transition-all cursor-pointer ${
                activeTab === 'today' ? 'border-warning bg-surface-hover' : 'border-line hover:border-warning/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] uppercase font-bold tracking-wider text-fg-2">
                  Due Today
                </span>
                <span className="w-2 h-2 rounded-full bg-warning" />
              </div>
              <span className="text-[26px] font-bold text-warning mt-1 block">{dueTodayCount}</span>
              <span className="text-[13px] text-fg-2">Impending cutoff</span>
            </button>

            <button
              onClick={() => setActiveTab('active')}
              className={`p-4 rounded-[16px] bg-surface border text-left transition-all cursor-pointer ${
                activeTab === 'active' ? 'border-info bg-surface-hover' : 'border-line hover:border-info/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] uppercase font-bold tracking-wider text-fg-2">
                  Active Tasks
                </span>
                <span className="w-2 h-2 rounded-full bg-info" />
              </div>
              <span className="text-[26px] font-bold text-fg mt-1 block">{activeCount}</span>
              <span className="text-[13px] text-fg-2">In pipeline</span>
            </button>

            <button
              onClick={() => setActiveTab('completed')}
              className={`p-4 rounded-[16px] bg-surface border text-left transition-all cursor-pointer ${
                activeTab === 'completed' ? 'border-accent bg-surface-hover' : 'border-line hover:border-accent/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] uppercase font-bold tracking-wider text-fg-2">
                  Completed
                </span>
                <span className="w-2 h-2 rounded-full bg-accent" />
              </div>
              <span className="text-[26px] font-bold text-accent mt-1 block">{completedCount}</span>
              <span className="text-[13px] text-fg-2">Submitted & archived</span>
            </button>
          </div>
        </div>

        {/* 3. Navigation Filter Tabs */}
        <div className="flex items-center justify-between border-b border-line pb-3 overflow-x-auto gap-2">
          <div className="flex items-center gap-1.5 shrink-0">
            {[
              { id: 'all', label: 'All Deadlines', count: tasks.length },
              { id: 'active', label: 'Active', count: activeCount },
              { id: 'today', label: 'Due Today', count: dueTodayCount },
              { id: 'overdue', label: 'Overdue', count: overdueCount },
              { id: 'completed', label: 'Completed', count: completedCount },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-3 py-1.5 rounded-[10px] text-[13px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-surface text-accent border border-accent/30 shadow-sm'
                    : 'text-fg-2 hover:text-fg hover:bg-surface/60'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[12px] px-1.5 py-0.2 rounded-full ${
                    activeTab === tab.id
                      ? 'bg-accent/20 text-accent'
                      : 'bg-line text-fg-2'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}

            {isCRorAdmin && (
              <button
                onClick={() => setActiveTab('moderation')}
                className={`px-3 py-1.5 rounded-[10px] text-[13px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'moderation'
                    ? 'bg-surface text-warning border border-warning/30 shadow-sm'
                    : 'text-fg-2 hover:text-fg hover:bg-surface/60'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Moderation Queue</span>
                {pendingTasks.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-warning/20 text-warning text-[12px] font-bold">
                    {pendingTasks.length}
                  </span>
                )}
              </button>
            )}

            {!isCRorAdmin && myPendingTasks.length > 0 && (
              <button
                onClick={() => setActiveTab('my_pending')}
                className={`px-3 py-1.5 rounded-[10px] text-[13px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'my_pending'
                    ? 'bg-surface text-info border border-info/30 shadow-sm'
                    : 'text-fg-2 hover:text-fg hover:bg-surface/60'
                }`}
              >
                <span>My Pending</span>
                <span className="px-1.5 py-0.2 rounded-full bg-info/20 text-info text-[12px] font-bold">
                  {myPendingTasks.length}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* 4. Search and Multi-Field Filters Toolbar (when not in moderation view) */}
        {activeTab !== 'moderation' && activeTab !== 'my_pending' && (
          <div className="bg-surface border border-line rounded-[16px] p-4 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="w-full md:w-80 relative">
              <Search className="w-4 h-4 text-fg-2 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tasks, codes, instructions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-inset border border-line rounded-[10px] pl-9 pr-3 py-2 text-[13px] text-fg placeholder:text-fg-2 focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="bg-inset border border-line text-[13px] text-fg px-3 py-2 rounded-[10px] focus:outline-none focus:border-accent"
              >
                <option value="all">All Courses</option>
                {courseOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="bg-inset border border-line text-[13px] text-fg px-3 py-2 rounded-[10px] focus:outline-none focus:border-accent"
              >
                <option value="all">All Priorities</option>
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-inset border border-line text-[13px] text-fg px-3 py-2 rounded-[10px] focus:outline-none focus:border-accent"
              >
                <option value="due_asc">Nearest Due Date</option>
                <option value="due_desc">Furthest Due Date</option>
                <option value="priority_desc">Priority (High to Low)</option>
                <option value="course_asc">Course Code (A–Z)</option>
                <option value="newest">Recently Added</option>
              </select>
            </div>
          </div>
        )}

        {/* 5. Main Task Content Render */}
        {isLoading ? (
          <CardGridSkeleton count={4} />
        ) : activeTab === 'moderation' ? (
          /* CR/Admin Moderation Queue Panel */
          <div className="bg-surface border border-line rounded-[18px] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.25)] flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-line/60">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-warning" />
                <h3 className="text-[16px] font-bold text-fg">Student Submission Moderation Queue</h3>
              </div>
              <Badge variant="warning">{pendingTasks.length} Pending Review</Badge>
            </div>

            {pendingTasks.length === 0 ? (
              <div className="py-12 text-center text-[13.5px] text-fg-2">
                ✓ All student task submissions have been reviewed and moderated!
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-line/60">
                {pendingTasks.map((task) => (
                  <div key={task.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {task.course_code && (
                          <Badge variant="muted" size="xs">
                            {task.course_code}
                          </Badge>
                        )}
                        <Badge
                          variant={task.priority === 'High' ? 'danger' : task.priority === 'Medium' ? 'warning' : 'muted'}
                          size="xs"
                        >
                          {task.priority}
                        </Badge>
                        <span className="text-[13px] text-fg-2">
                          Due: {new Date(task.due_date).toLocaleString()}
                        </span>
                      </div>
                      <h4 className="text-[15px] font-bold text-fg mt-1">{task.title}</h4>
                      {task.description && (
                        <p className="text-[13px] text-fg-2 line-clamp-2">{task.description}</p>
                      )}
                      <span className="text-[12.5px] text-fg-2 mt-0.5">
                        Submitted by: <strong className="text-fg">{task.creator_name || 'Student'}</strong> (
                        {task.creator_student_id || 'ID N/A'})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<Check className="w-3.5 h-3.5" />}
                        onClick={() => approveTaskMutation.mutate(task.id)}
                        isLoading={approveTaskMutation.isPending}
                      >
                        Approve & Publish
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        leftIcon={<X className="w-3.5 h-3.5" />}
                        onClick={() => setTaskToReject(task)}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'my_pending' ? (
          /* Student's Own Pending Submissions */
          <div className="bg-surface border border-line rounded-[18px] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.25)] flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-line/60">
              <h3 className="text-[16px] font-bold text-fg">Your Submissions Under Review</h3>
              <Badge variant="info">{myPendingTasks.length} Awaiting CR Approval</Badge>
            </div>

            {myPendingTasks.length === 0 ? (
              <div className="py-10 text-center text-[13.5px] text-fg-2">
                You have no pending submissions awaiting review.
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-line/60">
                {myPendingTasks.map((task) => (
                  <div key={task.id} className="py-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {task.course_code && (
                          <Badge variant="muted" size="xs">
                            {task.course_code}
                          </Badge>
                        )}
                        <span className="text-[13px] text-fg-2">
                          Due: {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="text-[14.5px] font-bold text-fg mt-1">{task.title}</h4>
                      {task.description && <p className="text-[13px] text-fg-2">{task.description}</p>}
                    </div>
                    <Badge variant="warning" size="xs">
                      Under Review
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : filteredTasks.length === 0 ? (
          /* Empty State */
          <div className="bg-surface border border-line rounded-[18px] p-12 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-[14px] bg-inset border border-line flex items-center justify-center text-fg-2 mb-3">
              <CheckSquare className="w-6 h-6" />
            </div>
            <h3 className="text-[16px] font-bold text-fg">No Deadlines Found</h3>
            <p className="text-[13px] text-fg-2 max-w-sm mt-1">
              There are no tasks matching your selected filters or search parameters.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => {
                setActiveTab('all');
                setSearchQuery('');
                setSelectedCourse('all');
                setSelectedPriority('all');
              }}
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          /* Active Task Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTasks.map((task) => {
              const isDone = Boolean(task.is_completed);
              const isExpanded = expandedTaskId === task.id;
              const dueTimestamp = new Date(task.due_date).getTime();
              const isOverdue = !isDone && dueTimestamp < now.getTime();

              return (
                <div
                  key={task.id}
                  className={`bg-surface border rounded-[16px] p-5 transition-all shadow-[0_4px_16px_rgba(0,0,0,0.15)] flex flex-col justify-between gap-4 ${
                    isDone
                      ? 'border-line opacity-85'
                      : isOverdue
                      ? 'border-danger/50 bg-raised'
                      : 'border-line hover:border-accent/40'
                  }`}
                >
                  <div className="flex flex-col gap-2.5">
                    {/* Header tags */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
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

                      <div className="flex items-center gap-1.5">
                        {isOverdue && (
                          <span className="text-[12.5px] font-bold text-danger flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> Overdue
                          </span>
                        )}
                        {(isCRorAdmin || task.created_by === user?.id) && (
                          <button
                            onClick={() => setTaskToDelete(task)}
                            className="p-1 rounded-[6px] text-fg-2 hover:text-danger hover:bg-danger/10 transition-colors"
                            title="Delete task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Checkbox & Title */}
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          toggleCompleteMutation.mutate({
                            taskId: task.id,
                            isDone,
                          })
                        }
                        className={`w-5 h-5 rounded-[6px] border flex items-center justify-center transition-all shrink-0 mt-0.5 cursor-pointer ${
                          isDone
                            ? 'bg-accent border-accent text-on-accent'
                            : 'border-line hover:border-accent'
                        }`}
                        title={isDone ? 'Mark as pending' : 'Mark as completed'}
                      >
                        {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>

                      <div className="flex flex-col min-w-0">
                        <h4
                          className={`text-[15px] font-bold transition-all ${
                            isDone ? 'line-through text-fg-2' : 'text-fg'
                          }`}
                        >
                          {task.title}
                        </h4>
                        {task.description && (
                          <p
                            className={`text-[13px] text-fg-2 mt-1 leading-relaxed ${
                              !isExpanded ? 'line-clamp-2' : ''
                            }`}
                          >
                            {task.description}
                          </p>
                        )}
                        {task.description && task.description.length > 100 && (
                          <button
                            type="button"
                            onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                            className="text-[12.5px] text-accent hover:underline font-semibold mt-1 self-start flex items-center gap-0.5"
                          >
                            <span>{isExpanded ? 'Show less' : 'Read more'}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Due Date & Submitter */}
                  <div className="pt-3 border-t border-line/60 flex items-center justify-between text-[13px] text-fg-2">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-info" />
                      <span>
                        Due:{' '}
                        {new Date(task.due_date).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <span className="text-[12.5px] text-muted">
                      By {task.creator_name || 'Cohort Lead'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 6. Modal: Create New Task / Submission */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title={isCRorAdmin ? 'Create Coursework Deadline' : 'Submit Task for Moderation'}
          description={
            isCRorAdmin
              ? 'Publish an assignment or project milestone directly to the entire cohort.'
              : 'Submit an assignment deadline for Class Representative review and approval.'
          }
          maxWidth="md"
        >
          <form onSubmit={handleSubmitCreate} className="space-y-4">
            <Input
              label="Task / Assignment Title *"
              placeholder="e.g., Lab Report 04: Virtual Memory Management"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Course Code"
                placeholder="e.g., CSE-3201"
                value={formData.course_code}
                onChange={(e) => setFormData({ ...formData, course_code: e.target.value })}
              />

              <Select
                label="Priority Level"
                options={[
                  { value: 'High', label: 'High Priority' },
                  { value: 'Medium', label: 'Medium Priority' },
                  { value: 'Low', label: 'Low Priority' },
                ]}
                value={formData.priority}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priority: e.target.value as 'High' | 'Medium' | 'Low',
                  })
                }
              />
            </div>

            <Input
              label="Submission Due Date & Time *"
              type="datetime-local"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              required
            />

            <Textarea
              label="Instructions & Description"
              placeholder="Include submission portal links, formatting guidelines, or rubric details..."
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-line/60">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={createTaskMutation.isPending}
              >
                {isCRorAdmin ? 'Publish Deadline' : 'Submit for Review'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* 7. Confirm Delete Modal */}
        {taskToDelete && (
          <ConfirmModal
            isOpen={Boolean(taskToDelete)}
            onClose={() => setTaskToDelete(null)}
            onConfirm={() => deleteTaskMutation.mutate(taskToDelete.id)}
            title="Delete Academic Task"
            message={`Are you sure you want to permanently delete "${taskToDelete.title}"? This cannot be undone.`}
            confirmText="Yes, Delete"
            isDanger
            isLoading={deleteTaskMutation.isPending}
          />
        )}

        {/* 8. Confirm Reject Modal */}
        {taskToReject && (
          <ConfirmModal
            isOpen={Boolean(taskToReject)}
            onClose={() => setTaskToReject(null)}
            onConfirm={() => rejectTaskMutation.mutate(taskToReject.id)}
            title="Reject Task Submission"
            message={`Decline and discard student submission "${taskToReject.title}"?`}
            confirmText="Yes, Reject"
            isDanger
            isLoading={rejectTaskMutation.isPending}
          />
        )}
      </div>
    </AppLayout>
  );
};
