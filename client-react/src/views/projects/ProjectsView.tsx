import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FolderGit2,
  Plus,
  Search,
  ExternalLink,
  Users,
  Check,
  X,
  Trash2,
  CheckCircle2,
  Clock,
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
import { CardGridSkeleton } from '../../components/ui/Skeleton';

export interface ProjectItem {
  id: number;
  title: string;
  description?: string;
  tech_stack: string;
  repo_url: string;
  team_members: string;
  department?: string;
  created_by?: number;
  publisher_name?: string;
  member_count?: number;
  created_at: string;
}

export interface IncomingRequest {
  request_id: number;
  project_id: number;
  status: string;
  project_title: string;
  requester_name: string;
  requester_id: number;
  requester_email: string;
  created_at: string;
}

export interface IncomingInvitation {
  request_id: number;
  project_id: number;
  status: string;
  project_title: string;
  tech_stack?: string;
  inviter_name: string;
  inviter_id?: number;
  inviter_email?: string;
  created_at: string;
}

export interface MyRequest {
  project_id: number;
  status: string;
  request_type: string;
}

interface ProjectsApiResponse {
  success: boolean;
  projects: ProjectItem[];
  incomingRequests?: IncomingRequest[];
  incomingInvitations?: IncomingInvitation[];
  myRequests?: MyRequest[];
}

export const ProjectsView: React.FC = () => {
  const { user } = useAuthStore();
  const { success, error, info } = useToast();
  const queryClient = useQueryClient();

  const isCRorAdmin = user?.role === 'cr' || user?.role === 'admin';

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<ProjectItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    tech_stack: '',
    department: user?.department || 'CSE',
    team_members: user?.name || '',
    repo_url: '',
    description: '',
  });

  // Query projects
  const { data, isLoading } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => apiClient.get<ProjectsApiResponse>('/projects'),
  });

  const projects = data?.projects || [];
  const incomingRequests = data?.incomingRequests || [];
  const incomingInvitations = data?.incomingInvitations || [];
  const myRequests = data?.myRequests || [];

  // Mutations
  const acceptInvitationMutation = useMutation({
    mutationFn: async (requestId: number) => {
      return apiClient.put(`/projects/invitations/${requestId}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
      success('Invitation accepted! You joined the project team.');
    },
    onError: (err: Error) => error(err.message || 'Failed to accept invitation'),
  });

  const rejectInvitationMutation = useMutation({
    mutationFn: async (requestId: number) => {
      return apiClient.delete(`/projects/invitations/${requestId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
      info('Project invitation declined.');
    },
    onError: (err: Error) => error(err.message || 'Failed to decline invitation'),
  });
  const createProjectMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      return apiClient.post<{ success: boolean; message?: string }>('/projects', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
      setIsAddModalOpen(false);
      setFormData({
        title: '',
        tech_stack: '',
        department: user?.department || 'CSE',
        team_members: user?.name || '',
        repo_url: '',
        description: '',
      });
      success('Project published to the batch directory!');
    },
    onError: (err: Error) => error(err.message || 'Failed to publish project'),
  });

  const joinProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      return apiClient.post(`/projects/${projectId}/join`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
      success('Join request sent to project owner!');
    },
    onError: (err: Error) => error(err.message || 'Failed to submit join request'),
  });

  const approveRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      return apiClient.put(`/projects/requests/${requestId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
      success('Applicant approved and added to project team!');
    },
    onError: (err: Error) => error(err.message || 'Failed to approve request'),
  });

  const rejectRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      return apiClient.delete(`/projects/requests/${requestId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
      info('Join request declined.');
    },
    onError: (err: Error) => error(err.message || 'Failed to decline request'),
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      return apiClient.delete(`/projects/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
      setProjectToDelete(null);
      info('Project deleted successfully.');
    },
    onError: (err: Error) => error(err.message || 'Failed to delete project'),
  });

  // Filtered projects
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.tech_stack.toLowerCase().includes(q) ||
        p.publisher_name?.toLowerCase().includes(q) ||
        p.team_members?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
    );
  }, [projects, searchQuery]);

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      error('Project title is required');
      return;
    }
    if (!formData.tech_stack.trim()) {
      error('Please specify technologies used (e.g. React, Node.js)');
      return;
    }
    if (!formData.repo_url.trim()) {
      error('Repository or live demo link is required');
      return;
    }
    createProjectMutation.mutate(formData);
  };

  return (
    <AppLayout title="Project Hub">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11.5px] uppercase font-bold tracking-wider text-[#95b399]">
                Collaborative Innovation
              </span>
              <span className="text-[#1b261f]">•</span>
              <span className="text-[12px] text-[#a7b3aa]">Team Directory & Open Roles</span>
            </div>
            <h1 className="text-[22px] sm:text-[26px] font-bold text-[#d6ded8] tracking-tight mt-0.5">
              Batch Projects & Collaboration
            </h1>
            <p className="text-[13.5px] text-[#a7b3aa] mt-0.5">
              Showcase semester software systems, connect with co-builders, and manage applicant requests.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddModalOpen(true)}
          >
            Publish Project
          </Button>
        </div>

        {/* Incoming Join Requests for Project Owners */}
        {incomingRequests.length > 0 && (
          <div className="bg-[#101713] border border-[#95b399]/40 rounded-[18px] p-5 sm:p-6 shadow-[0_12px_32px_rgba(0,0,0,0.3)]">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1b261f]/60">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#95b399] animate-pulse" />
                <h3 className="text-[16px] font-bold text-[#d6ded8]">Pending Team Join Requests</h3>
              </div>
              <Badge variant="mint" size="xs">
                {incomingRequests.length} Action Required
              </Badge>
            </div>

            <div className="flex flex-col divide-y divide-[#1b261f]/60">
              {incomingRequests.map((req) => (
                <div key={req.request_id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[14px] font-semibold text-[#d6ded8]">
                      {req.requester_name}{' '}
                      <span className="text-[12px] text-[#a7b3aa]">({req.requester_email})</span>
                    </span>
                    <p className="text-[12.5px] text-[#a7b3aa] mt-0.5">
                      Requested to join: <strong className="text-[#95b399]">{req.project_title}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Check className="w-3.5 h-3.5" />}
                      onClick={() => approveRequestMutation.mutate(req.request_id)}
                      isLoading={approveRequestMutation.isPending}
                    >
                      Approve Member
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      leftIcon={<X className="w-3.5 h-3.5" />}
                      onClick={() => rejectRequestMutation.mutate(req.request_id)}
                      isLoading={rejectRequestMutation.isPending}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Incoming Team Invitations for Logged-in Student */}
        {incomingInvitations.length > 0 && (
          <div className="bg-[#101713] border border-[#7f9fb3]/40 rounded-[18px] p-5 sm:p-6 shadow-[0_12px_32px_rgba(0,0,0,0.3)]">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1b261f]/60">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#7f9fb3] animate-pulse" />
                <h3 className="text-[16px] font-bold text-[#d6ded8]">Project Team Invitations</h3>
              </div>
              <Badge variant="info" size="xs">
                {incomingInvitations.length} Pending
              </Badge>
            </div>

            <div className="flex flex-col divide-y divide-[#1b261f]/60">
              {incomingInvitations.map((inv) => (
                <div key={inv.request_id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[14px] font-semibold text-[#d6ded8]">
                      {inv.inviter_name}{' '}
                      <span className="text-[12px] text-[#a7b3aa]">({inv.inviter_email || 'Project Lead'})</span>
                    </span>
                    <p className="text-[12.5px] text-[#a7b3aa] mt-0.5">
                      Invited you to collaborate on: <strong className="text-[#7f9fb3]">{inv.project_title}</strong>
                      {inv.tech_stack && <span className="text-[12px] text-[#a7b3aa]"> ({inv.tech_stack})</span>}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Check className="w-3.5 h-3.5" />}
                      onClick={() => acceptInvitationMutation.mutate(inv.request_id)}
                      isLoading={acceptInvitationMutation.isPending}
                    >
                      Accept Invite
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      leftIcon={<X className="w-3.5 h-3.5" />}
                      onClick={() => rejectInvitationMutation.mutate(inv.request_id)}
                      isLoading={rejectInvitationMutation.isPending}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search Toolbar */}
        <div className="bg-[#101713] border border-[#1b261f] rounded-[16px] p-4 flex items-center justify-between">
          <div className="w-full md:w-96 relative">
            <Search className="w-4 h-4 text-[#a7b3aa] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title, stack (e.g. React, Python), or creator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0c120e] border border-[#1b261f] rounded-[10px] pl-9 pr-3 py-2 text-[13px] text-[#d6ded8] placeholder:text-[#a7b3aa] focus:outline-none focus:border-[#95b399]"
            />
          </div>

          <span className="hidden sm:inline-block text-[12px] text-[#a7b3aa]">
            {filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'} indexed
          </span>
        </div>

        {/* Project Grid */}
        {isLoading ? (
          <CardGridSkeleton count={6} />
        ) : filteredProjects.length === 0 ? (
          <div className="bg-[#101713] border border-[#1b261f] rounded-[18px] p-12 text-center flex flex-col items-center justify-center">
            <FolderGit2 className="w-10 h-10 text-[#a7b3aa] mb-2" />
            <h3 className="text-[16px] font-bold text-[#d6ded8]">No Projects Found</h3>
            <p className="text-[13px] text-[#a7b3aa] mt-1">
              No published projects match your search keywords. Be the first to publish one!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.map((project) => {
              const isOwner = project.created_by === user?.id;
              const hasSentRequest = myRequests.some(
                (r) => r.project_id === project.id && r.status === 'pending'
              );
              const isAcceptedMember = myRequests.some(
                (r) => r.project_id === project.id && r.status === 'accepted'
              );

              // Extract tech tags
              const techs = project.tech_stack
                ? project.tech_stack.split(',').map((t) => t.trim()).filter(Boolean)
                : [];

              return (
                <div
                  key={project.id}
                  className="bg-[#101713] border border-[#1b261f] hover:border-[#95b399]/40 rounded-[18px] p-5 sm:p-6 transition-all shadow-[0_6px_20px_rgba(0,0,0,0.2)] flex flex-col justify-between gap-4 group"
                >
                  <div className="flex flex-col gap-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-10 h-10 rounded-[11px] bg-[#0c120e] border border-[#1b261f] group-hover:border-[#95b399]/50 flex items-center justify-center text-[#95b399] shrink-0 transition-colors">
                        <FolderGit2 className="w-5 h-5" />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <a
                          href={project.repo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-[8px] bg-[#0c120e] border border-[#1b261f] text-[#a7b3aa] hover:text-[#95b399] hover:border-[#95b399]/40 transition-colors"
                          title="Open Repository"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        {(isOwner || isCRorAdmin) && (
                          <button
                            onClick={() => setProjectToDelete(project)}
                            className="p-1.5 rounded-[8px] bg-[#0c120e] border border-[#1b261f] text-[#a7b3aa] hover:text-[#d66767] hover:border-[#d66767]/40 transition-colors"
                            title="Delete Project"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Title & Desc */}
                    <div>
                      <h3 className="text-[17px] font-bold text-[#d6ded8] group-hover:text-[#95b399] transition-colors tracking-tight line-clamp-1">
                        {project.title}
                      </h3>
                      <p className="text-[13px] text-[#a7b3aa] mt-1.5 line-clamp-2 leading-relaxed">
                        {project.description || 'No detailed scope provided.'}
                      </p>
                    </div>

                    {/* Tech Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {techs.slice(0, 4).map((tech) => (
                        <span
                          key={tech}
                          className="text-[11.5px] font-medium bg-[#0c120e] border border-[#1b261f] text-[#d6ded8] px-2 py-0.5 rounded-[6px]"
                        >
                          {tech}
                        </span>
                      ))}
                      {techs.length > 4 && (
                        <span className="text-[11px] text-[#a7b3aa]">+{techs.length - 4} more</span>
                      )}
                    </div>
                  </div>

                  {/* Team Members & Action Button */}
                  <div className="pt-3.5 border-t border-[#1b261f]/60 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between text-[12px] text-[#a7b3aa]">
                      <span className="flex items-center gap-1.5 truncate max-w-[180px]">
                        <Users className="w-3.5 h-3.5 text-[#7f9fb3]" />
                        <span className="truncate">{project.team_members || 'Solo builder'}</span>
                      </span>

                      <span className="text-[11px] text-[#78877d]">
                        By {project.publisher_name || 'Student'}
                      </span>
                    </div>

                    {/* Request To Join or Status */}
                    {!isOwner && (
                      <div className="pt-1">
                        {isAcceptedMember ? (
                          <div className="w-full text-center py-1.5 rounded-[10px] bg-[#95b399]/10 border border-[#95b399]/25 text-[#95b399] text-[12px] font-semibold flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Team Member
                          </div>
                        ) : hasSentRequest ? (
                          <div className="w-full text-center py-1.5 rounded-[10px] bg-[#d6b867]/10 border border-[#d6b867]/25 text-[#d6b867] text-[12px] font-semibold flex items-center justify-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" /> Request Pending
                          </div>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-full"
                            leftIcon={<Users className="w-3.5 h-3.5" />}
                            onClick={() => joinProjectMutation.mutate(project.id)}
                            isLoading={joinProjectMutation.isPending}
                          >
                            Request to Join Team
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Publish Project */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Publish Batch Project"
          description="Register your semester software project, display tech stack, and invite cohort collaborators."
          maxWidth="md"
        >
          <form onSubmit={handleSubmitCreate} className="space-y-4">
            <Input
              label="Project Title *"
              placeholder="e.g., PeerShare - Academic Notes Exchange"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Tech Stack (comma separated) *"
                placeholder="e.g., React, Node.js, MySQL, Tailwind"
                value={formData.tech_stack}
                onChange={(e) => setFormData({ ...formData, tech_stack: e.target.value })}
                required
              />

              <Input
                label="Department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>

            <Input
              label="Current Team Members *"
              placeholder="e.g., Nokib, Mahathir, Sarah"
              value={formData.team_members}
              onChange={(e) => setFormData({ ...formData, team_members: e.target.value })}
              required
            />

            <Input
              label="Repository or Live Demo URL *"
              placeholder="https://github.com/username/project"
              value={formData.repo_url}
              onChange={(e) => setFormData({ ...formData, repo_url: e.target.value })}
              required
            />

            <Textarea
              label="Project Description & Open Roles"
              placeholder="Describe what the system does and what talent or roles you are looking to recruit..."
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#1b261f]/60">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setIsAddModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={createProjectMutation.isPending}
              >
                Publish Project
              </Button>
            </div>
          </form>
        </Modal>

        {/* Confirm Delete Modal */}
        {projectToDelete && (
          <ConfirmModal
            isOpen={Boolean(projectToDelete)}
            onClose={() => setProjectToDelete(null)}
            onConfirm={() => deleteProjectMutation.mutate(projectToDelete.id)}
            title="Delete Project"
            message={`Are you sure you want to permanently delete "${projectToDelete.title}"?`}
            confirmText="Yes, Delete"
            isDanger
            isLoading={deleteProjectMutation.isPending}
          />
        )}
      </div>
    </AppLayout>
  );
};
