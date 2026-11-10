import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar as CalendarIcon,
  Plus,
  Search,
  Clock,
  MapPin,
  Check,
  X,
  ShieldCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { useAuthStore } from '../../stores/useAuthStore';
import { apiClient } from '../../services/apiClient';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { useToast } from '../../components/ui/Toast';
import { ListSkeleton } from '../../components/ui/Skeleton';

export interface EventItem {
  id: number;
  title: string;
  description?: string;
  event_date: string;
  time?: string;
  location?: string;
  department?: string;
  created_by?: number;
  organizer_name?: string;
  status?: string;
  created_at?: string;
}

interface EventsApiResponse {
  success: boolean;
  events: EventItem[];
  pastEvents?: EventItem[];
  pendingEvents?: EventItem[];
}

// Dynamic countdown helper
const getEventCountdown = (dateStr: string) => {
  const target = new Date(dateStr);
  const now = new Date();
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const targetDate = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const diffDays = Math.round((targetDate - todayDate) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: 'Past', variant: 'muted' as const };
  if (diffDays === 0) return { label: 'Today', variant: 'danger' as const };
  if (diffDays === 1) return { label: 'Tomorrow', variant: 'warning' as const };
  if (diffDays <= 7) return { label: `In ${diffDays}d`, variant: 'mint' as const };
  return { label: `In ${diffDays}d`, variant: 'info' as const };
};

export const EventsView: React.FC = () => {
  const { user } = useAuthStore();
  const { success, error, info } = useToast();
  const queryClient = useQueryClient();

  const isCRorAdmin = user?.role === 'cr' || user?.role === 'admin';

  // State & Filter
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'pending'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [eventToReject, setEventToReject] = useState<EventItem | null>(null);

  // Form
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    department: user?.department || 'CSE',
    event_date: '',
    description: '',
  });

  // Query events
  const { data, isLoading } = useQuery({
    queryKey: ['events-list'],
    queryFn: () => apiClient.get<EventsApiResponse>('/events'),
  });

  const upcomingEvents = data?.events || [];
  const pastEvents = data?.pastEvents || [];
  const pendingEvents = data?.pendingEvents || [];

  // Mutations
  const createEventMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      return apiClient.post<{ success: boolean; message?: string }>('/events', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-events'] });
      setIsCreateModalOpen(false);
      setFormData({
        title: '',
        location: '',
        department: user?.department || 'CSE',
        event_date: '',
        description: '',
      });
      success(
        isCRorAdmin
          ? 'Event published and scheduled on cohort calendar!'
          : 'Event suggested! Awaiting Class Representative moderation.'
      );
    },
    onError: (err: Error) => error(err.message || 'Failed to create event'),
  });

  const approveEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      return apiClient.put(`/events/${eventId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-events'] });
      success('Event approved and posted to the cohort timeline!');
    },
    onError: (err: Error) => error(err.message || 'Failed to approve event'),
  });

  const rejectEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      return apiClient.delete(`/events/${eventId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events-list'] });
      setEventToReject(null);
      info('Event suggestion rejected.');
    },
    onError: (err: Error) => error(err.message || 'Failed to reject event'),
  });

  // Filtered events
  const currentList = useMemo(() => {
    let list =
      activeTab === 'upcoming'
        ? upcomingEvents
        : activeTab === 'past'
        ? pastEvents
        : pendingEvents;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (ev) =>
          ev.title.toLowerCase().includes(q) ||
          ev.location?.toLowerCase().includes(q) ||
          ev.organizer_name?.toLowerCase().includes(q) ||
          ev.description?.toLowerCase().includes(q)
      );
    }

    if (selectedDay !== null && activeTab === 'upcoming') {
      const year = calendarDate.getFullYear();
      const month = calendarDate.getMonth();
      list = list.filter((ev) => {
        const d = new Date(ev.event_date);
        return d.getFullYear() === year && d.getMonth() === month && d.getDate() === selectedDay;
      });
    }

    return list;
  }, [activeTab, upcomingEvents, pastEvents, pendingEvents, searchQuery, selectedDay, calendarDate]);

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      error('Event title is required');
      return;
    }
    if (!formData.event_date) {
      error('Event date and time is required');
      return;
    }
    createEventMutation.mutate(formData);
  };

  return (
    <AppLayout title="Campus Events">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[12.5px] uppercase font-bold tracking-wider text-accent">
                Department Schedule
              </span>
              <span className="text-line">•</span>
              <span className="text-[13px] text-fg-2">Hackathons, Seminars & Workshops</span>
            </div>
            <h1 className="text-[22px] sm:text-[26px] font-bold text-fg tracking-tight mt-0.5">
              Campus Events & Calendar
            </h1>
            <p className="text-[13.5px] text-fg-2 mt-0.5">
              Explore university hackathons, project defense dates, seminars, and batch gatherings.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            {isCRorAdmin ? 'Publish Event' : 'Suggest Event'}
          </Button>
        </div>

        {/* Layout Grid: Left Mini Calendar / Filter, Right Event Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (4 cols): Mini Calendar & Date Filter */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            <div className="bg-surface border border-line rounded-[18px] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-line/60">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-accent" />
                  <h3 className="text-[15px] font-bold text-fg">
                    {calendarDate.toLocaleString('default', { month: 'long' })} {calendarDate.getFullYear()}
                  </h3>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
                      setSelectedDay(null);
                    }}
                    title="Previous Month"
                    className="p-1 rounded-[6px] hover:bg-surface-hover text-fg-2 hover:text-fg transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setCalendarDate(new Date());
                      setSelectedDay(null);
                    }}
                    title="Current Month"
                    className="px-2 py-0.5 text-[12px] font-semibold text-accent hover:bg-surface-hover rounded-[6px] transition-colors cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => {
                      setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
                      setSelectedDay(null);
                    }}
                    title="Next Month"
                    className="p-1 rounded-[6px] hover:bg-surface-hover text-fg-2 hover:text-fg transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {selectedDay && (
                <div className="mb-2 flex items-center justify-between text-[12.5px] px-1">
                  <span className="text-fg-2">
                    Filtered to Day {selectedDay}
                  </span>
                  <button
                    onClick={() => setSelectedDay(null)}
                    className="text-accent hover:underline font-semibold cursor-pointer"
                  >
                    Clear Filter
                  </button>
                </div>
              )}

              <div className="grid grid-cols-7 gap-1 text-center select-none text-[13px]">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                  <div key={d} className="text-fg-2 font-semibold py-1">
                    {d}
                  </div>
                ))}

                {/* Leading blanks */}
                {Array.from({ length: new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).getDay() }).map((_, i) => (
                  <div key={`blank-${i}`} className="py-1.5" />
                ))}

                {/* Days in Month */}
                {Array.from({ length: new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate() }, (_, i) => i + 1).map((day) => {
                  const isSelected = selectedDay === day;
                  const calYear = calendarDate.getFullYear();
                  const calMonth = calendarDate.getMonth();
                  const hasEventsOnDay = upcomingEvents.some((ev) => {
                    const d = new Date(ev.event_date);
                    return d.getFullYear() === calYear && d.getMonth() === calMonth && d.getDate() === day;
                  });
                  const today = new Date();
                  const isTodayDate = today.getFullYear() === calYear && today.getMonth() === calMonth && today.getDate() === day;

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(isSelected ? null : day)}
                      className={`relative py-1.5 rounded-[9px] font-medium transition-all cursor-pointer flex flex-col items-center justify-center ${
                        isSelected
                          ? 'bg-accent text-on-accent font-bold shadow-[0_2px_8px_rgba(0,0,0,0.25)]'
                          : isTodayDate
                          ? 'border border-accent/60 text-fg hover:bg-surface-hover'
                          : 'text-fg hover:bg-surface-hover'
                      }`}
                    >
                      <span>{day}</span>
                      {hasEventsOnDay && !isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-accent mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 pt-3 border-t border-line/60 text-[13px] text-fg-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-accent" /> Has Event
                </span>
                <span>{upcomingEvents.length} scheduled</span>
              </div>
            </div>

            {/* Quick Summary Card */}
            <div className="bg-surface border border-line rounded-[18px] p-5 text-[13px] text-fg-2 leading-relaxed flex flex-col gap-2">
              <span className="text-fg font-semibold flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-info" /> Cohort Calendar Guidelines
              </span>
              <p>
                All student suggestions undergo moderation by the Class Representatives. Approved events
                appear across the dashboard flight deck.
              </p>
            </div>
          </div>

          {/* Right Column (8 cols): Event Tabs & Grid */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {/* Toolbar */}
            <div className="bg-surface border border-line rounded-[16px] p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <button
                  onClick={() => {
                    setActiveTab('upcoming');
                    setSelectedDay(null);
                  }}
                  className={`px-3 py-1.5 rounded-[10px] text-[13px] font-semibold transition-all cursor-pointer ${
                    activeTab === 'upcoming'
                      ? 'bg-inset text-accent border border-accent/30'
                      : 'text-fg-2 hover:text-fg'
                  }`}
                >
                  Upcoming ({upcomingEvents.length})
                </button>

                <button
                  onClick={() => {
                    setActiveTab('past');
                    setSelectedDay(null);
                  }}
                  className={`px-3 py-1.5 rounded-[10px] text-[13px] font-semibold transition-all cursor-pointer ${
                    activeTab === 'past'
                      ? 'bg-inset text-accent border border-accent/30'
                      : 'text-fg-2 hover:text-fg'
                  }`}
                >
                  Past Events ({pastEvents.length})
                </button>

                {isCRorAdmin && (
                  <button
                    onClick={() => {
                      setActiveTab('pending');
                      setSelectedDay(null);
                    }}
                    className={`px-3 py-1.5 rounded-[10px] text-[13px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeTab === 'pending'
                        ? 'bg-inset text-warning border border-warning/30'
                        : 'text-fg-2 hover:text-fg'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Pending ({pendingEvents.length})</span>
                  </button>
                )}
              </div>

              <div className="w-full sm:w-64 relative">
                <Search className="w-4 h-4 text-fg-2 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-inset border border-line rounded-[10px] pl-9 pr-3 py-1.5 text-[13px] text-fg placeholder:text-fg-2 focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            {/* Event List */}
            {isLoading ? (
              <ListSkeleton items={4} />
            ) : currentList.length === 0 ? (
              <div className="bg-surface border border-line rounded-[18px] p-12 text-center flex flex-col items-center justify-center">
                <CalendarIcon className="w-10 h-10 text-fg-2 mb-2" />
                <h3 className="text-[16px] font-bold text-fg">No Events Found</h3>
                <p className="text-[13px] text-fg-2 mt-1">
                  {selectedDay
                    ? `No events scheduled on ${calendarDate.toLocaleString('default', { month: 'long' })} ${selectedDay}.`
                    : 'There are no events matching your criteria in this view.'}
                </p>
                {selectedDay && (
                  <Button variant="secondary" size="sm" className="mt-3" onClick={() => setSelectedDay(null)}>
                    Clear Date Filter
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {currentList.map((ev) => {
                  const evDate = new Date(ev.event_date);
                  const isPending = activeTab === 'pending';
                  const countdown = getEventCountdown(ev.event_date);

                  return (
                    <div
                      key={ev.id}
                      onClick={() => setSelectedEvent(ev)}
                      className="bg-surface border border-line hover:border-accent/40 rounded-[16px] p-4 sm:p-5 transition-all shadow-[0_4px_16px_rgba(0,0,0,0.15)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
                    >
                      <div className="flex items-start gap-4 min-w-0">
                        {/* Date badge */}
                        <div className="w-13 h-13 rounded-[12px] bg-inset border border-line group-hover:border-accent/50 flex flex-col items-center justify-center text-center shrink-0 transition-colors">
                          <span className="text-[12px] uppercase font-bold text-fg-2">
                            {evDate.toLocaleString('default', { month: 'short' })}
                          </span>
                          <span className="text-[17px] font-bold text-accent">{evDate.getDate()}</span>
                        </div>

                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-[15.5px] font-bold text-fg group-hover:text-accent transition-colors truncate">
                              {ev.title}
                            </h3>
                            {ev.department && (
                              <Badge variant="muted" size="xs">
                                {ev.department}
                              </Badge>
                            )}
                            <Badge variant={countdown.variant} size="xs">
                              {countdown.label}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-3.5 text-[13px] text-fg-2 mt-1.5 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-info" />{' '}
                              {ev.time || evDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-info" /> {ev.location || 'Campus'}
                            </span>
                            <span className="text-[12.5px] text-muted">
                              Organized by: {ev.organizer_name || 'Academic Lead'}
                            </span>
                          </div>

                          {ev.description && (
                            <p className="text-[13px] text-fg-2 mt-2 line-clamp-1 leading-relaxed">
                              {ev.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Pending Review Actions for CR/Admin */}
                      {isPending && isCRorAdmin && (
                        <div
                          className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-line/60"
                          onClick={(e) => e.stopPropagation()}
                        >
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
                            onClick={() => setEventToReject(ev)}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal: Create Event */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title={isCRorAdmin ? 'Publish Campus Event' : 'Suggest Event for Moderation'}
          description={
            isCRorAdmin
              ? 'Schedule and publish an event directly to the cohort calendar.'
              : 'Submit an event suggestion. Class Representatives will review and publish it.'
          }
          maxWidth="md"
        >
          <form onSubmit={handleSubmitCreate} className="space-y-4">
            <Input
              label="Event Title *"
              placeholder="e.g., Algorithmic Coding Contest 2026"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Location / Venue *"
                placeholder="e.g., Lab-3, Dept of CSE"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
              />

              <Input
                label="Department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>

            <Input
              label="Event Date & Time *"
              type="datetime-local"
              value={formData.event_date}
              onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
              required
            />

            <Textarea
              label="Description & Registration Guidelines"
              placeholder="Include eligibility, problem set info, registration links, prizes..."
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
                isLoading={createEventMutation.isPending}
              >
                {isCRorAdmin ? 'Publish Event' : 'Suggest Event'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: Event Details Drawer */}
        {selectedEvent && (
          <Modal
            isOpen={Boolean(selectedEvent)}
            onClose={() => setSelectedEvent(null)}
            title={selectedEvent.title}
            maxWidth="md"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-[13px] text-fg-2 bg-inset border border-line p-3 rounded-[12px] flex-wrap">
                <span className="flex items-center gap-1.5">
                  <CalendarIcon className="w-4 h-4 text-accent" />
                  {new Date(selectedEvent.event_date).toLocaleDateString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-info" />
                  {selectedEvent.time || new Date(selectedEvent.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-info" /> {selectedEvent.location || 'Campus'}
                </span>
              </div>

              <div>
                <h4 className="text-[13px] font-bold text-fg-2 uppercase tracking-wider mb-1">
                  Event Description
                </h4>
                <p className="text-[14px] text-fg leading-relaxed whitespace-pre-line">
                  {selectedEvent.description || 'No additional description provided.'}
                </p>
              </div>

              <div className="pt-3 border-t border-line/60 flex items-center justify-between text-[13px] text-fg-2">
                <span>Organized by: {selectedEvent.organizer_name || 'Cohort Lead'}</span>
                {selectedEvent.department && <Badge variant="muted">{selectedEvent.department}</Badge>}
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="secondary" size="sm" onClick={() => setSelectedEvent(null)}>
                  Close
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Confirm Reject Modal */}
        {eventToReject && (
          <ConfirmModal
            isOpen={Boolean(eventToReject)}
            onClose={() => setEventToReject(null)}
            onConfirm={() => rejectEventMutation.mutate(eventToReject.id)}
            title="Reject Event Suggestion"
            message={`Are you sure you want to decline "${eventToReject.title}"?`}
            confirmText="Yes, Reject"
            isDanger
            isLoading={rejectEventMutation.isPending}
          />
        )}
      </div>
    </AppLayout>
  );
};

