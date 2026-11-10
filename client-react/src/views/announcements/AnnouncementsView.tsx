import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Megaphone,
  Plus,
  Search,
  Pin,
  PinOff,
  Trash2,
  Calendar,
  User,
  Eye,
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
import { ListSkeleton } from '../../components/ui/Skeleton';

export interface NoticeItem {
  id: number;
  title: string;
  description: string;
  category: 'academic' | 'examination' | 'event' | 'general' | string;
  target_audience?: string;
  priority: 'Urgent' | 'Important' | 'Normal';
  is_pinned?: number | boolean;
  created_by?: number;
  author_name?: string;
  created_at: string;
}

interface NoticesApiResponse {
  success: boolean;
  notices: NoticeItem[];
}

export const AnnouncementsView: React.FC = () => {
  const { user } = useAuthStore();
  const { success, error, info } = useToast();
  const queryClient = useQueryClient();

  const isCRorAdmin = user?.role === 'cr' || user?.role === 'admin';

  // Filters & State
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<NoticeItem | null>(null);
  const [noticeToDelete, setNoticeToDelete] = useState<NoticeItem | null>(null);

  // Form
  const [formData, setFormData] = useState({
    title: '',
    category: 'general',
    priority: 'Normal' as 'Urgent' | 'Important' | 'Normal',
    target_audience: 'all',
    description: '',
    is_pinned: false,
  });

  // Query Notices
  const { data, isLoading } = useQuery({
    queryKey: ['notices-list'],
    queryFn: () => apiClient.get<NoticesApiResponse>('/notices'),
  });

  const notices = data?.notices || [];

  // Mutations
  const createNoticeMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      return apiClient.post<{ success: boolean; message?: string }>('/notices', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-notices'] });
      setIsCreateModalOpen(false);
      setFormData({
        title: '',
        category: 'general',
        priority: 'Normal',
        target_audience: 'all',
        description: '',
        is_pinned: false,
      });
      success('Announcement published to cohort bulletin!');
    },
    onError: (err: Error) => error(err.message || 'Failed to publish announcement'),
  });

  const deleteNoticeMutation = useMutation({
    mutationFn: async (noticeId: number) => {
      return apiClient.delete(`/notices/${noticeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-notices'] });
      setNoticeToDelete(null);
      info('Announcement deleted.');
    },
    onError: (err: Error) => error(err.message || 'Failed to delete announcement'),
  });

  const togglePinMutation = useMutation({
    mutationFn: async (noticeId: number) => {
      return apiClient.put(`/notices/${noticeId}/pin`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-notices'] });
      success('Notice pin status updated.');
    },
    onError: (err: Error) => error(err.message || 'Failed to update pin status'),
  });

  // Filtered notices
  const filteredNotices = useMemo(() => {
    return notices.filter((n) => {
      if (selectedCategory !== 'all' && n.category.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          n.title.toLowerCase().includes(q) ||
          n.description.toLowerCase().includes(q) ||
          n.author_name?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [notices, selectedCategory, searchQuery]);

  const categoryCounts = useMemo(() => {
    return {
      all: notices.length,
      academic: notices.filter((n) => n.category?.toLowerCase() === 'academic').length,
      examination: notices.filter((n) => n.category?.toLowerCase() === 'examination').length,
      event: notices.filter((n) => n.category?.toLowerCase() === 'event').length,
      general: notices.filter((n) => n.category?.toLowerCase() === 'general').length,
    };
  }, [notices]);

  const formatRelativeTime = (dateStr?: string): string => {
    if (!dateStr) return 'Recently';
    const time = new Date(dateStr).getTime();
    if (isNaN(time)) return 'Recently';
    const diffSec = Math.floor((Date.now() - time) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 172800) return 'Yesterday';
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      error('Announcement title is required');
      return;
    }
    if (!formData.description.trim()) {
      error('Announcement body is required');
      return;
    }
    createNoticeMutation.mutate(formData);
  };

  return (
    <AppLayout title="Batch Announcements">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11.5px] uppercase font-bold tracking-wider text-[#95b399]">
                Cohort Bulletin
              </span>
              <span className="text-[#1b261f]">•</span>
              <span className="text-[12px] text-[#a7b3aa]">Official Academic Broadcasts</span>
            </div>
            <h1 className="text-[22px] sm:text-[26px] font-bold text-[#d6ded8] tracking-tight mt-0.5">
              Batch Announcements & Notices
            </h1>
            <p className="text-[13.5px] text-[#a7b3aa] mt-0.5">
              Important cohort updates, examination room schedules, deadlines, and official university memos.
            </p>
          </div>

          {isCRorAdmin && (
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Post Announcement
            </Button>
          )}
        </div>

        {/* Toolbar */}
        <div className="bg-[#101713] border border-[#1b261f] rounded-[16px] p-4 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'all', label: 'All Notices', count: categoryCounts.all },
              { id: 'academic', label: 'Academic', count: categoryCounts.academic },
              { id: 'examination', label: 'Examinations', count: categoryCounts.examination },
              { id: 'event', label: 'Events', count: categoryCounts.event },
              { id: 'general', label: 'General', count: categoryCounts.general },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-[10px] text-[13px] font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? 'bg-[#0c120e] text-[#95b399] border border-[#95b399]/30 shadow-sm'
                    : 'text-[#a7b3aa] hover:text-[#d6ded8] hover:bg-[#0c120e]/50'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                    selectedCategory === cat.id
                      ? 'bg-[#95b399]/20 text-[#95b399]'
                      : 'bg-[#1b261f] text-[#a7b3aa]'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="w-full md:w-72 relative">
            <Search className="w-4 h-4 text-[#a7b3aa] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search announcements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0c120e] border border-[#1b261f] rounded-[10px] pl-9 pr-3 py-1.5 text-[12.5px] text-[#d6ded8] placeholder:text-[#a7b3aa] focus:outline-none focus:border-[#95b399]"
            />
          </div>
        </div>

        {/* Notices Feed */}
        {isLoading ? (
          <ListSkeleton items={4} />
        ) : filteredNotices.length === 0 ? (
          <div className="bg-[#101713] border border-[#1b261f] rounded-[18px] p-12 text-center flex flex-col items-center justify-center">
            <Megaphone className="w-10 h-10 text-[#a7b3aa] mb-2" />
            <h3 className="text-[16px] font-bold text-[#d6ded8]">No Announcements Found</h3>
            <p className="text-[13px] text-[#a7b3aa] mt-1">
              There are no announcements matching your category or search filter.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredNotices.map((notice) => {
              const isPinned = Boolean(notice.is_pinned);

              return (
                <div
                  key={notice.id}
                  onClick={() => setSelectedNotice(notice)}
                  className={`bg-[#101713] border rounded-[16px] p-5 transition-all shadow-[0_4px_16px_rgba(0,0,0,0.15)] flex flex-col gap-3 cursor-pointer group ${
                    isPinned
                      ? 'border-[#95b399]/40 bg-[#101713] relative overflow-hidden'
                      : 'border-[#1b261f] hover:border-[#95b399]/30'
                  }`}
                >
                  {/* Top Tag Row */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      {isPinned && (
                        <span className="flex items-center gap-1 text-[11.5px] font-bold text-[#95b399] bg-[#95b399]/10 border border-[#95b399]/20 px-2 py-0.5 rounded-[6px]">
                          <Pin className="w-3 h-3 fill-[#95b399]" /> PINNED
                        </span>
                      )}
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
                      <span className="text-[11.5px] uppercase font-bold tracking-wider text-[#a7b3aa]">
                        {notice.category}
                      </span>
                      {notice.target_audience && notice.target_audience !== 'all' && (
                        <span className="text-[11px] text-[#78877d] bg-[#0c120e] px-2 py-0.5 rounded border border-[#1b261f]">
                          Audience: {notice.target_audience}
                        </span>
                      )}
                    </div>

                    {/* Author & Date + Management Controls */}
                    <div className="flex items-center gap-3">
                      <span className="text-[12px] text-[#a7b3aa] flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#7f9fb3]" />
                        {formatRelativeTime(notice.created_at)}
                      </span>

                      {isCRorAdmin && (
                        <div
                          className="flex items-center gap-1 border-l border-[#1b261f] pl-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => togglePinMutation.mutate(notice.id)}
                            className="p-1 rounded-[6px] text-[#a7b3aa] hover:text-[#95b399] hover:bg-[#95b399]/10 transition-colors"
                            title={isPinned ? 'Unpin' : 'Pin to top'}
                          >
                            {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setNoticeToDelete(notice)}
                            className="p-1 rounded-[6px] text-[#a7b3aa] hover:text-[#d66767] hover:bg-[#d66767]/10 transition-colors"
                            title="Delete announcement"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Title & Preview */}
                  <div>
                    <h3 className="text-[16px] font-bold text-[#d6ded8] group-hover:text-[#95b399] transition-colors tracking-tight">
                      {notice.title}
                    </h3>
                    <p className="text-[13.5px] text-[#a7b3aa] mt-1.5 leading-relaxed line-clamp-3">
                      {notice.description}
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="pt-2 border-t border-[#1b261f]/60 flex items-center justify-between text-[12px] text-[#a7b3aa]">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#95b399]" />
                      Posted by: <strong className="text-[#d6ded8]">{notice.author_name || 'Class Representative'}</strong>
                    </span>

                    <span className="text-[#95b399] font-semibold flex items-center gap-1 group-hover:underline">
                      <Eye className="w-3.5 h-3.5" /> Read Full Bulletin
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Create Announcement */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Post Cohort Announcement"
          description="Publish official updates, exam circulars, and notices to students."
          maxWidth="md"
        >
          <form onSubmit={handleSubmitCreate} className="space-y-4">
            <Input
              label="Announcement Title *"
              placeholder="e.g., Final-Year Project Proposal Defense Schedule"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Category"
                options={[
                  { value: 'academic', label: 'Academic' },
                  { value: 'examination', label: 'Examination' },
                  { value: 'event', label: 'Event' },
                  { value: 'general', label: 'General Announcement' },
                ]}
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />

              <Select
                label="Priority"
                options={[
                  { value: 'Normal', label: 'Normal' },
                  { value: 'Important', label: 'Important 🟡' },
                  { value: 'Urgent', label: 'Urgent 🔴' },
                ]}
                value={formData.priority}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priority: e.target.value as 'Urgent' | 'Important' | 'Normal',
                  })
                }
              />
            </div>

            <Input
              label="Target Audience"
              placeholder="e.g., all, CSE 2024, Section B"
              value={formData.target_audience}
              onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
            />

            <Textarea
              label="Announcement Description & Body *"
              placeholder="Provide clear details, venue, time, external document links..."
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="pinCheckbox"
                checked={formData.is_pinned}
                onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                className="w-4 h-4 accent-[#95b399] rounded cursor-pointer"
              />
              <label htmlFor="pinCheckbox" className="text-[13px] text-[#d6ded8] cursor-pointer select-none">
                Pin this notice to the top of the cohort feed
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#1b261f]/60">
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
                isLoading={createNoticeMutation.isPending}
              >
                Publish Notice
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: Full Notice View */}
        {selectedNotice && (
          <Modal
            isOpen={Boolean(selectedNotice)}
            onClose={() => setSelectedNotice(null)}
            maxWidth="lg"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-[#1b261f]/60 pb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="mint">{selectedNotice.category.toUpperCase()}</Badge>
                  <Badge
                    variant={
                      selectedNotice.priority === 'Urgent'
                        ? 'danger'
                        : selectedNotice.priority === 'Important'
                        ? 'warning'
                        : 'info'
                    }
                  >
                    {selectedNotice.priority}
                  </Badge>
                  {selectedNotice.is_pinned ? (
                    <span className="text-[12px] text-[#95b399] font-bold flex items-center gap-1">
                      <Pin className="w-3.5 h-3.5 fill-[#95b399]" /> Pinned
                    </span>
                  ) : null}
                </div>
                <span className="text-[12px] text-[#a7b3aa]">
                  {new Date(selectedNotice.created_at).toLocaleDateString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>

              <h2 className="text-[20px] font-bold text-[#d6ded8] tracking-tight">{selectedNotice.title}</h2>

              <div className="bg-[#0c120e] border border-[#1b261f] rounded-[12px] p-3 text-[12.5px] text-[#a7b3aa] flex items-center justify-between flex-wrap gap-2">
                <span>
                  Author: <strong className="text-[#d6ded8]">{selectedNotice.author_name || 'Class Representative'}</strong>
                </span>
                <span>
                  Audience: <strong className="text-[#d6ded8]">{selectedNotice.target_audience || 'All Cohort'}</strong>
                </span>
              </div>

              <div className="text-[14px] text-[#d6ded8] leading-relaxed whitespace-pre-line py-2">
                {selectedNotice.description}
              </div>

              <div className="flex justify-end pt-3 border-t border-[#1b261f]/60">
                <Button variant="secondary" size="sm" onClick={() => setSelectedNotice(null)}>
                  Close
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Modal: Confirm Delete */}
        {noticeToDelete && (
          <ConfirmModal
            isOpen={Boolean(noticeToDelete)}
            onClose={() => setNoticeToDelete(null)}
            onConfirm={() => deleteNoticeMutation.mutate(noticeToDelete.id)}
            title="Delete Announcement"
            message={`Are you sure you want to delete "${noticeToDelete.title}"?`}
            confirmText="Yes, Delete"
            isDanger
            isLoading={deleteNoticeMutation.isPending}
          />
        )}
      </div>
    </AppLayout>
  );
};
