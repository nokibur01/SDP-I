import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  ShieldCheck,
  Check,
  X,
  Plus,
  BookOpen,
  Calendar,
  CheckSquare,
  Clock,
  Layers,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { useAuthStore } from '../../stores/useAuthStore';
import { apiClient } from '../../services/apiClient';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { useToast } from '../../components/ui/Toast';

interface PendingResource {
  id: number;
  title: string;
  course_code: string;
  category: string;
  uploader_name?: string;
  file_url: string;
}

interface PendingEvent {
  id: number;
  title: string;
  location?: string;
  event_date: string;
  organizer_name?: string;
  description?: string;
}

interface PendingTask {
  id: number;
  title: string;
  course_code?: string;
  due_date: string;
  uploader_name?: string;
  creator_name?: string;
  description?: string;
}

interface AcademicData {
  courses?: Array<{ id: number; course_code: string; course_title: string; department?: string; batch?: string }>;
  routine?: Array<{ id: number; course_name?: string; time_slot?: string; room_no?: string; room_number?: string; day_of_week?: string; batch?: string }>;
}

export const CRPanelView: React.FC = () => {
  const { user } = useAuthStore();
  const { success, error, info } = useToast();
  const queryClient = useQueryClient();

  const isCRorAdmin = user?.role === 'cr' || user?.role === 'admin';

  // Tabs
  const [activeTab, setActiveTab] = useState<'approvals' | 'routines' | 'courses'>('approvals');

  // Confirmation Modals State
  const [rejectItem, setRejectItem] = useState<{ type: 'resource' | 'event' | 'task'; id: number; title: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  // Forms State
  const [routineForm, setRoutineForm] = useState({
    batch: user?.batch || '',
    day_of_week: 'Sunday',
    time_slot: '',
    room_number: '',
    course_name: '',
  });

  const [courseForm, setCourseForm] = useState({
    course_code: '',
    course_title: '',
    department: user?.department || '',
    batch: user?.batch || '',
  });

  // Queries
  const { data: resourcesData } = useQuery({
    queryKey: ['cr-resources'],
    queryFn: () => apiClient.get<{ pendingMaterials?: PendingResource[] }>('/resources'),
    enabled: isCRorAdmin,
  });

  const { data: eventsData } = useQuery({
    queryKey: ['cr-events'],
    queryFn: () => apiClient.get<{ pendingEvents?: PendingEvent[] }>('/events'),
    enabled: isCRorAdmin,
  });

  const { data: tasksData } = useQuery({
    queryKey: ['cr-tasks'],
    queryFn: () => apiClient.get<{ pendingTasks?: PendingTask[] }>('/tasks'),
    enabled: isCRorAdmin,
  });

  const { data: academicData } = useQuery({
    queryKey: ['cr-academic'],
    queryFn: () => apiClient.get<AcademicData>('/academic'),
    enabled: isCRorAdmin,
  });

  const pendingResources = resourcesData?.pendingMaterials || [];
  const pendingEvents = eventsData?.pendingEvents || [];
  const pendingTasks = tasksData?.pendingTasks || [];
  const totalPending = pendingResources.length + pendingEvents.length + pendingTasks.length;

  const currentCourses = academicData?.courses || [];
  const currentRoutines = academicData?.routine || [];

  // Approval / Rejection Mutations
  const approveResourceMutation = useMutation({
    mutationFn: (id: number) => apiClient.put(`/resources/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cr-resources'] });
      queryClient.invalidateQueries({ queryKey: ['resources-list'] });
      success('Resource approved and published!');
    },
    onError: (err: Error) => error(err.message),
  });

  const approveEventMutation = useMutation({
    mutationFn: (id: number) => apiClient.put(`/events/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cr-events'] });
      queryClient.invalidateQueries({ queryKey: ['events-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-events'] });
      success('Event approved and posted to calendar!');
    },
    onError: (err: Error) => error(err.message),
  });

  const approveTaskMutation = useMutation({
    mutationFn: (id: number) => apiClient.put(`/tasks/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cr-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
      success('Task approved and published to batch!');
    },
    onError: (err: Error) => error(err.message),
  });

  const handleExecuteReject = async () => {
    if (!rejectItem) return;
    try {
      if (rejectItem.type === 'resource') {
        await apiClient.put(`/resources/${rejectItem.id}/reject`, { reason: rejectionReason });
        queryClient.invalidateQueries({ queryKey: ['cr-resources'] });
        queryClient.invalidateQueries({ queryKey: ['resources-list'] });
      } else if (rejectItem.type === 'event') {
        await apiClient.delete(`/events/${rejectItem.id}/reject`);
        queryClient.invalidateQueries({ queryKey: ['cr-events'] });
      } else if (rejectItem.type === 'task') {
        await apiClient.delete(`/tasks/${rejectItem.id}/reject`);
        queryClient.invalidateQueries({ queryKey: ['cr-tasks'] });
      }
      info(`${rejectItem.type.toUpperCase()} rejected.`);
      setRejectItem(null);
      setRejectionReason('');
    } catch (err: unknown) {
      const e = err as Error;
      error(e.message || 'Failed to reject item');
    }
  };

  // Add Routine Slot Mutation
  const addRoutineMutation = useMutation({
    mutationFn: (payload: typeof routineForm) => apiClient.post('/academic/routine', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cr-academic'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-academic'] });
      setRoutineForm({
        batch: user?.batch || '',
        day_of_week: 'Sunday',
        time_slot: '',
        room_number: '',
        course_name: '',
      });
      success('Routine period slot registered!');
    },
    onError: (err: Error) => error(err.message || 'Failed to add routine slot'),
  });

  // Add Course Mutation
  const addCourseMutation = useMutation({
    mutationFn: (payload: typeof courseForm) => apiClient.post('/academic/courses', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cr-academic'] });
      setCourseForm({
        course_code: '',
        course_title: '',
        department: user?.department || '',
        batch: user?.batch || '',
      });
      success('Semester course enrolled in catalog!');
    },
    onError: (err: Error) => error(err.message || 'Failed to register course'),
  });

  // Delete Routine Mutation
  const deleteRoutineMutation = useMutation({
    mutationFn: (routineId: number) => apiClient.delete(`/academic/routine/${routineId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cr-academic'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-academic'] });
      success('Routine period slot removed!');
    },
    onError: (err: Error) => error(err.message || 'Failed to remove routine slot'),
  });

  // Delete Course Mutation
  const deleteCourseMutation = useMutation({
    mutationFn: (courseId: number) => apiClient.delete(`/academic/courses/${courseId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cr-academic'] });
      success('Course removed from catalog!');
    },
    onError: (err: Error) => error(err.message || 'Failed to remove course'),
  });

  if (!isCRorAdmin) {
    return (
      <AppLayout title="Access Restricted">
        <div className="bg-surface border border-danger/40 rounded-[20px] p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto mt-12">
          <div className="w-14 h-14 rounded-full bg-danger/10 text-danger border border-danger/20 flex items-center justify-center mb-4">
            <Shield className="w-7 h-7" />
          </div>
          <h2 className="text-[20px] font-bold text-fg">Cohort Leadership Restricted Area</h2>
          <p className="text-[13.5px] text-fg-2 mt-2 leading-relaxed">
            The CR & Academic Administration Panel is exclusively accessible to authorized Class
            Representatives and Platform Administrators.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Cohort Administration">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[12.5px] uppercase font-bold tracking-wider text-accent">
                Leadership Flight Deck
              </span>
              <span className="text-line">•</span>
              <span className="text-[13px] text-fg-2">Moderation, Routines & Curriculum</span>
            </div>
            <h1 className="text-[22px] sm:text-[26px] font-bold text-fg tracking-tight mt-0.5">
              CR & Academic Administration
            </h1>
            <p className="text-[13.5px] text-fg-2 mt-0.5">
              Review student peer uploads, publish weekly class routines, and manage enrolled semester courses.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="warning">ROLE: {user?.role.toUpperCase()}</Badge>
            <Badge variant="mint">BATCH {user?.batch || '2024'}</Badge>
          </div>
        </div>

        {/* Tab Filter Strip */}
        <div className="flex items-center gap-2 border-b border-line pb-3">
          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-4 py-2 rounded-[12px] text-[13.5px] font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'approvals'
                ? 'bg-surface text-accent border border-accent/30 shadow-sm'
                : 'text-fg-2 hover:text-fg'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Pending Approvals</span>
            {totalPending > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-warning/20 text-warning text-[12px] font-bold">
                {totalPending}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('routines')}
            className={`px-4 py-2 rounded-[12px] text-[13.5px] font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'routines'
                ? 'bg-surface text-accent border border-accent/30 shadow-sm'
                : 'text-fg-2 hover:text-fg'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Class Routines</span>
          </button>

          <button
            onClick={() => setActiveTab('courses')}
            className={`px-4 py-2 rounded-[12px] text-[13.5px] font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'courses'
                ? 'bg-surface text-accent border border-accent/30 shadow-sm'
                : 'text-fg-2 hover:text-fg'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Semester Courses</span>
          </button>
        </div>

        {/* TAB 1: PENDING APPROVALS */}
        {activeTab === 'approvals' && (
          <div className="space-y-6">
            {/* 1. Pending Resources */}
            <div className="bg-surface border border-line rounded-[18px] p-5 sm:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-line/60">
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-info" />
                  <h3 className="text-[16px] font-bold text-fg">Pending Study Material Submissions</h3>
                </div>
                <Badge variant={pendingResources.length > 0 ? 'warning' : 'muted'} size="xs">
                  {pendingResources.length} Pending
                </Badge>
              </div>

              {pendingResources.length === 0 ? (
                <div className="py-6 text-center text-[13px] text-fg-2">
                  ✓ All submitted study materials have been reviewed!
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-line/60">
                  {pendingResources.map((res) => (
                    <div key={res.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-semibold text-fg">{res.title}</span>
                          <Badge variant="muted" size="xs">
                            {res.course_code}
                          </Badge>
                          <span className="text-[12.5px] text-fg-2">({res.category})</span>
                        </div>
                        <div className="text-[13px] text-fg-2 mt-1 flex items-center gap-3">
                          <span>By: {res.uploader_name || 'Student'}</span>
                          <a
                            href={res.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:underline inline-flex items-center gap-1 font-semibold"
                          >
                            <span>Inspect File</span> <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<Check className="w-3.5 h-3.5" />}
                          onClick={() => approveResourceMutation.mutate(res.id)}
                          isLoading={approveResourceMutation.isPending}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          leftIcon={<X className="w-3.5 h-3.5" />}
                          onClick={() =>
                            setRejectItem({ type: 'resource', id: res.id, title: res.title })
                          }
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Pending Events */}
            <div className="bg-surface border border-line rounded-[18px] p-5 sm:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-line/60">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-accent" />
                  <h3 className="text-[16px] font-bold text-fg">Pending Event Suggestions</h3>
                </div>
                <Badge variant={pendingEvents.length > 0 ? 'warning' : 'muted'} size="xs">
                  {pendingEvents.length} Pending
                </Badge>
              </div>

              {pendingEvents.length === 0 ? (
                <div className="py-6 text-center text-[13px] text-fg-2">
                  ✓ No pending event suggestions awaiting moderation.
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-line/60">
                  {pendingEvents.map((ev) => (
                    <div key={ev.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-semibold text-fg">{ev.title}</span>
                          <span className="text-[13px] text-fg-2">({ev.location || 'Campus'})</span>
                        </div>
                        <div className="text-[13px] text-fg-2 mt-1 flex items-center gap-3">
                          <span>Scheduled: {new Date(ev.event_date).toLocaleString()}</span>
                          <span>Suggested by: {ev.organizer_name || 'Student'}</span>
                        </div>
                        {ev.description && (
                          <p className="text-[13px] text-muted mt-1 line-clamp-1">{ev.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<Check className="w-3.5 h-3.5" />}
                          onClick={() => approveEventMutation.mutate(ev.id)}
                          isLoading={approveEventMutation.isPending}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          leftIcon={<X className="w-3.5 h-3.5" />}
                          onClick={() => setRejectItem({ type: 'event', id: ev.id, title: ev.title })}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Pending Tasks */}
            <div className="bg-surface border border-line rounded-[18px] p-5 sm:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-line/60">
                <div className="flex items-center gap-2.5">
                  <CheckSquare className="w-4 h-4 text-warning" />
                  <h3 className="text-[16px] font-bold text-fg">Pending Task Deadlines</h3>
                </div>
                <Badge variant={pendingTasks.length > 0 ? 'warning' : 'muted'} size="xs">
                  {pendingTasks.length} Pending
                </Badge>
              </div>

              {pendingTasks.length === 0 ? (
                <div className="py-6 text-center text-[13px] text-fg-2">
                  ✓ All student task submissions have been reviewed!
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-line/60">
                  {pendingTasks.map((task) => (
                    <div key={task.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-semibold text-fg">{task.title}</span>
                          {task.course_code && (
                            <Badge variant="muted" size="xs">
                              {task.course_code}
                            </Badge>
                          )}
                        </div>
                        <div className="text-[13px] text-fg-2 mt-1 flex items-center gap-3">
                          <span>Due: {new Date(task.due_date).toLocaleString()}</span>
                          <span>Submitter: {task.creator_name || task.uploader_name || 'Student'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<Check className="w-3.5 h-3.5" />}
                          onClick={() => approveTaskMutation.mutate(task.id)}
                          isLoading={approveTaskMutation.isPending}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          leftIcon={<X className="w-3.5 h-3.5" />}
                          onClick={() => setRejectItem({ type: 'task', id: task.id, title: task.title })}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CLASS ROUTINES */}
        {activeTab === 'routines' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Form (5 cols) */}
            <div className="lg:col-span-5 bg-surface border border-line rounded-[20px] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.25)]">
              <h3 className="text-[17px] font-bold text-fg tracking-tight">Add Routine Schedule Slot</h3>
              <p className="text-[13px] text-fg-2 mt-0.5 mb-5">
                Register recurring class periods and labs for your batch flight deck.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!routineForm.course_name.trim()) return error('Course name is required');
                  if (!routineForm.time_slot.trim()) return error('Time slot is required');
                  if (!routineForm.room_number.trim()) return error('Room number is required');
                  addRoutineMutation.mutate(routineForm);
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Batch *"
                    value={routineForm.batch}
                    onChange={(e) => setRoutineForm({ ...routineForm, batch: e.target.value })}
                    required
                  />

                  <Select
                    label="Day of Week *"
                    options={[
                      { value: 'Sunday', label: 'Sunday' },
                      { value: 'Monday', label: 'Monday' },
                      { value: 'Tuesday', label: 'Tuesday' },
                      { value: 'Wednesday', label: 'Wednesday' },
                      { value: 'Thursday', label: 'Thursday' },
                      { value: 'Friday', label: 'Friday' },
                      { value: 'Saturday', label: 'Saturday' },
                    ]}
                    value={routineForm.day_of_week}
                    onChange={(e) => setRoutineForm({ ...routineForm, day_of_week: e.target.value })}
                  />
                </div>

                <Input
                  label="Course Name / Code *"
                  placeholder="e.g., CSE-3201 Operating Systems"
                  value={routineForm.course_name}
                  onChange={(e) => setRoutineForm({ ...routineForm, course_name: e.target.value })}
                  required
                />

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Time Slot *"
                    placeholder="e.g., 09:00 AM - 10:30 AM"
                    value={routineForm.time_slot}
                    onChange={(e) => setRoutineForm({ ...routineForm, time_slot: e.target.value })}
                    required
                  />

                  <Input
                    label="Room / Lab No *"
                    placeholder="e.g., Room 402 / Lab 3"
                    value={routineForm.room_number}
                    onChange={(e) => setRoutineForm({ ...routineForm, room_number: e.target.value })}
                    required
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    leftIcon={<Plus className="w-4 h-4" />}
                    isLoading={addRoutineMutation.isPending}
                  >
                    Add Routine Slot
                  </Button>
                </div>
              </form>
            </div>

            {/* Existing Routine List (7 cols) */}
            <div className="lg:col-span-7 bg-surface border border-line rounded-[20px] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.25)] flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-line/60">
                <h3 className="text-[17px] font-bold text-fg tracking-tight">Active Batch Schedule</h3>
                <span className="text-[13px] text-fg-2">{currentRoutines.length} periods registered</span>
              </div>

              {currentRoutines.length === 0 ? (
                <div className="py-12 text-center text-[13px] text-fg-2">
                  No routine slots registered yet for this semester.
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-line/60">
                  {currentRoutines.map((r, idx) => (
                    <div key={r.id || idx} className="py-3 flex items-center justify-between group">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-bold text-fg">{r.course_name}</span>
                          <Badge variant="mint" size="xs">
                            {r.day_of_week}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[13px] text-fg-2 mt-1">
                          <span>{r.time_slot}</span>
                          <span>{r.room_number || r.room_no}</span>
                        </div>
                      </div>

                      {r.id && (
                        <button
                          onClick={() => deleteRoutineMutation.mutate(r.id)}
                          className="p-1.5 rounded-[8px] text-fg-2 hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                          title="Remove Slot"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SEMESTER COURSES */}
        {activeTab === 'courses' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Form (5 cols) */}
            <div className="lg:col-span-5 bg-surface border border-line rounded-[20px] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.25)]">
              <h3 className="text-[17px] font-bold text-fg tracking-tight">Register Semester Course</h3>
              <p className="text-[13px] text-fg-2 mt-0.5 mb-5">
                Enroll a course into curriculum catalog for notes indexing.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!courseForm.course_code.trim()) return error('Course code is required');
                  if (!courseForm.course_title.trim()) return error('Course title is required');
                  addCourseMutation.mutate(courseForm);
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Course Code *"
                    placeholder="e.g., CSE-3201"
                    value={courseForm.course_code}
                    onChange={(e) => setCourseForm({ ...courseForm, course_code: e.target.value })}
                    required
                  />

                  <Input
                    label="Department *"
                    value={courseForm.department}
                    onChange={(e) => setCourseForm({ ...courseForm, department: e.target.value })}
                    required
                  />
                </div>

                <Input
                  label="Course Title *"
                  placeholder="e.g., Operating Systems & System Programming"
                  value={courseForm.course_title}
                  onChange={(e) => setCourseForm({ ...courseForm, course_title: e.target.value })}
                  required
                />

                <Input
                  label="Batch *"
                  value={courseForm.batch}
                  onChange={(e) => setCourseForm({ ...courseForm, batch: e.target.value })}
                  required
                />

                <div className="pt-2 flex justify-end">
                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    leftIcon={<Plus className="w-4 h-4" />}
                    isLoading={addCourseMutation.isPending}
                  >
                    Register Course
                  </Button>
                </div>
              </form>
            </div>

            {/* Existing Course Catalog (7 cols) */}
            <div className="lg:col-span-7 bg-surface border border-line rounded-[20px] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.25)] flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-line/60">
                <h3 className="text-[17px] font-bold text-fg tracking-tight">Curriculum Course Catalog</h3>
                <span className="text-[13px] text-fg-2">{currentCourses.length} courses enrolled</span>
              </div>

              {currentCourses.length === 0 ? (
                <div className="py-12 text-center text-[13px] text-fg-2">
                  No courses registered in catalog yet.
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-line/60">
                  {currentCourses.map((c, idx) => (
                    <div key={c.id || idx} className="py-3 flex items-center justify-between group">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="muted" size="xs">
                            {c.course_code}
                          </Badge>
                          <span className="text-[14px] font-bold text-fg">{c.course_title}</span>
                        </div>
                        <div className="text-[13px] text-fg-2 mt-0.5">
                          {c.department || 'CSE'} • Batch {c.batch || '2024'}
                        </div>
                      </div>

                      {c.id && (
                        <button
                          onClick={() => deleteCourseMutation.mutate(c.id)}
                          className="p-1.5 rounded-[8px] text-fg-2 hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                          title="Remove Course"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rejection Confirm Modal */}
        {rejectItem && (
          <ConfirmModal
            isOpen={Boolean(rejectItem)}
            onClose={() => setRejectItem(null)}
            onConfirm={handleExecuteReject}
            title={`Reject ${rejectItem.type.toUpperCase()}`}
            message={`Are you sure you want to decline and reject "${rejectItem.title}"?`}
            confirmText="Yes, Reject"
            isDanger
          />
        )}
      </div>
    </AppLayout>
  );
};
