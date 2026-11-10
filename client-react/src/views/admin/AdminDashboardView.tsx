import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Megaphone,
  BookOpen,
  CheckSquare,
  Calendar,
  FolderGit2,
  Search,
  Trash2,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  Clock,
} from "lucide-react";
import { clsx } from "clsx";
import { apiClient } from "../../services/apiClient";
import { useAuthStore } from "../../stores/useAuthStore";
import { useToast } from "../../components/ui/Toast";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { EmptyState } from "../../components/ui/EmptyState";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { AppLayout } from "../../components/layout/AppLayout";

type CategoryKey = "students" | "notices" | "resources" | "tasks" | "events" | "projects";
type Role = "student" | "cr" | "admin";
type AdminRecord = Record<string, any> & { id: number };

interface AdminStatsResponse {
  success: boolean;
  stats: Record<CategoryKey, number>;
  roleCounts: Record<Role, number>;
}

const CATEGORIES: {
  key: CategoryKey;
  label: string;
  singular: string;
  endpoint: string;
  icon: React.ElementType;
}[] = [
  { key: "students", label: "Users", singular: "user", endpoint: "/users", icon: Users },
  { key: "notices", label: "Notices", singular: "notice", endpoint: "/users/notices", icon: Megaphone },
  { key: "resources", label: "Resources", singular: "resource", endpoint: "/users/materials", icon: BookOpen },
  { key: "tasks", label: "Tasks", singular: "task", endpoint: "/users/tasks", icon: CheckSquare },
  { key: "events", label: "Events", singular: "event", endpoint: "/users/events", icon: Calendar },
  { key: "projects", label: "Projects", singular: "project", endpoint: "/users/projects", icon: FolderGit2 },
];

const ROLE_OPTIONS: { value: Role | "all"; label: string }[] = [
  { value: "all", label: "All roles" },
  { value: "student", label: "Students" },
  { value: "cr", label: "CRs" },
  { value: "admin", label: "Admins" },
];

const formatDate = (value?: string) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const statusVariant = (status?: string) =>
  status === "approved" ? "mint" : status === "pending" ? "warning" : status === "rejected" ? "danger" : "muted";

const authorOf = (item: AdminRecord) =>
  item.author_name || item.uploader_name || item.creator_name || item.organizer_name || item.publisher_name;

export const AdminDashboardView: React.FC = () => {
  const { user } = useAuthStore();
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const [activeCategory, setActiveCategory] = useState<CategoryKey>("students");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [pendingDelete, setPendingDelete] = useState<AdminRecord | null>(null);

  const activeConfig = CATEGORIES.find((c) => c.key === activeCategory)!;

  const statsQuery = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => apiClient.get<AdminStatsResponse>("/users/admin/stats"),
  });

  const listQuery = useQuery({
    queryKey: ["admin-list", activeCategory],
    queryFn: () => apiClient.get<AdminRecord[]>(activeConfig.endpoint),
  });

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    queryClient.invalidateQueries({ queryKey: ["admin-list"] });
  };

  const deleteMutation = useMutation({
    mutationFn: (item: AdminRecord) =>
      apiClient.delete<{ message: string }>(`/users/admin/${activeCategory}/${item.id}`),
    onSuccess: () => {
      success(`Deleted ${activeConfig.singular} successfully`);
      setPendingDelete(null);
      refreshAll();
    },
    onError: (err: Error) => {
      error(err.message || "Failed to delete record");
      setPendingDelete(null);
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: Role }) =>
      apiClient.put<{ message: string }>(`/users/admin/users/${id}/role`, { role }),
    onSuccess: (_data, vars) => {
      success(`Role updated to ${vars.role.toUpperCase()}`);
      refreshAll();
    },
    onError: (err: Error) => error(err.message || "Failed to update role"),
  });

  const items = Array.isArray(listQuery.data) ? listQuery.data : [];

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (activeCategory === "students" && roleFilter !== "all" && item.role !== roleFilter) return false;
      if (!q) return true;
      const haystack = [
        item.name,
        item.title,
        item.email,
        item.student_id,
        item.batch,
        item.department,
        item.course_code,
        item.category,
        item.description,
        authorOf(item),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, searchQuery, roleFilter, activeCategory]);

  const stats = statsQuery.data?.stats;
  const roleCounts = statsQuery.data?.roleCounts;
  const isSelf = (item: AdminRecord) => activeCategory === "students" && Number(item.id) === Number(user?.id);

  const switchCategory = (key: CategoryKey) => {
    setActiveCategory(key);
    setSearchQuery("");
    setRoleFilter("all");
  };

  return (
    <AppLayout title="Admin Control Center">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-[12px] bg-inset border border-line flex items-center justify-center text-accent shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-[22px] sm:text-[24px] font-bold text-fg tracking-tight">Admin Control Center</h1>
              <p className="text-[13.5px] text-muted mt-0.5">
                Manage every user and record across all batches.
                {roleCounts && (
                  <span className="text-fg-2">
                    {" "}
                    {roleCounts.student} students · {roleCounts.cr} CRs · {roleCounts.admin} admins
                  </span>
                )}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={refreshAll}
            isLoading={listQuery.isFetching || statsQuery.isFetching}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
        </section>

        {/* Category tiles */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const selected = cat.key === activeCategory;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => switchCategory(cat.key)}
                aria-pressed={selected}
                className={clsx(
                  "group text-left rounded-[16px] border p-4 transition-all duration-150 cursor-pointer",
                  selected
                    ? "bg-accent-soft border-accent/50"
                    : "bg-surface border-line hover:border-accent/30 hover:bg-surface-hover",
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={clsx(
                      "text-[12.5px] font-semibold uppercase tracking-wider",
                      selected ? "text-accent" : "text-fg-2",
                    )}
                  >
                    {cat.label}
                  </span>
                  <Icon
                    className={clsx(
                      "w-4 h-4 transition-colors",
                      selected ? "text-accent" : "text-icon group-hover:text-accent",
                    )}
                  />
                </div>
                <div className="mt-2.5 text-[24px] font-extrabold text-fg leading-none">
                  {stats ? (
                    stats[cat.key]
                  ) : statsQuery.isError ? (
                    <span className="text-muted" title="Couldn't load counts">—</span>
                  ) : (
                    <span className="inline-block w-8 h-6 rounded bg-raised animate-pulse" />
                  )}
                </div>
              </button>
            );
          })}
        </section>

        {/* Toolbar */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h2 className="text-[16px] font-semibold text-fg">
            All {activeConfig.label.toLowerCase()}
            <span className="text-muted font-medium"> ({filteredItems.length})</span>
          </h2>
          <div className="flex flex-col sm:flex-row gap-2.5 md:w-auto w-full">
            {activeCategory === "students" && (
              <div className="flex gap-1 p-1 bg-inset border border-line rounded-[12px] overflow-x-auto">
                {ROLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRoleFilter(opt.value)}
                    className={clsx(
                      "px-3 py-1.5 rounded-[9px] text-[13px] font-medium whitespace-nowrap transition-colors cursor-pointer",
                      roleFilter === opt.value
                        ? "bg-accent text-on-accent"
                        : "text-fg-2 hover:text-fg",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
            <div className="sm:w-[280px]">
              <Input
                placeholder={`Search ${activeConfig.label.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftElement={<Search className="w-4 h-4" />}
              />
            </div>
          </div>
        </section>

        {/* Records */}
        <section>
          {listQuery.isLoading ? (
            <ListSkeleton items={5} />
          ) : listQuery.isError ? (
            <EmptyState
              icon={<AlertCircle className="w-6 h-6" />}
              title="Couldn't load records"
              description={(listQuery.error as Error)?.message || "The server did not respond."}
              actionLabel="Try again"
              onAction={() => listQuery.refetch()}
            />
          ) : filteredItems.length === 0 ? (
            <EmptyState
              icon={<Search className="w-6 h-6" />}
              title={`No ${activeConfig.label.toLowerCase()} found`}
              description={searchQuery || roleFilter !== "all" ? "Try a different search or filter." : "Nothing has been created yet."}
            />
          ) : (
            <ul className="bg-surface border border-line rounded-[16px] divide-y divide-line overflow-hidden">
              {filteredItems.map((item) =>
                activeCategory === "students" ? (
                  <UserRow
                    key={item.id}
                    item={item}
                    self={isSelf(item)}
                    roleUpdating={roleMutation.isPending && roleMutation.variables?.id === item.id}
                    onRoleChange={(role) => roleMutation.mutate({ id: item.id, role })}
                    onDelete={() => setPendingDelete(item)}
                  />
                ) : (
                  <RecordRow key={item.id} item={item} onDelete={() => setPendingDelete(item)} />
                ),
              )}
            </ul>
          )}
        </section>

        <ConfirmModal
          isOpen={!!pendingDelete}
          onClose={() => !deleteMutation.isPending && setPendingDelete(null)}
          onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete)}
          isDanger
          isLoading={deleteMutation.isPending}
          title={`Delete ${activeConfig.singular}?`}
          confirmText="Delete permanently"
          message={
            activeCategory === "students"
              ? `"${pendingDelete?.name ?? ""}" will be removed along with their notices, projects, task completions and notifications. This cannot be undone.`
              : `"${pendingDelete?.title ?? pendingDelete?.name ?? `#${pendingDelete?.id}`}" will be permanently deleted. This cannot be undone.`
          }
        />
      </div>
    </AppLayout>
  );
};

const UserRow: React.FC<{
  item: AdminRecord;
  self: boolean;
  roleUpdating: boolean;
  onRoleChange: (role: Role) => void;
  onDelete: () => void;
}> = ({ item, self, roleUpdating, onRoleChange, onDelete }) => (
  <li className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 hover:bg-surface-hover transition-colors">
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <div className="w-9 h-9 rounded-full bg-raised border border-line flex items-center justify-center text-[13px] font-semibold text-accent shrink-0">
        {(item.name || "?").charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-[14px] text-fg truncate">{item.name}</span>
          {self && <Badge variant="mint" size="xs">You</Badge>}
        </div>
        <div className="text-[13px] text-muted truncate">
          {item.email}
          {item.student_id && <> · ID {item.student_id}</>}
          {(item.department || item.batch) && (
            <> · {[item.department, item.batch].filter(Boolean).join(" / ")}</>
          )}
        </div>
      </div>
    </div>
    <div className="flex items-center gap-2 sm:shrink-0 pl-12 sm:pl-0">
      <select
        aria-label={`Role for ${item.name}`}
        value={item.role}
        disabled={self || roleUpdating}
        onChange={(e) => onRoleChange(e.target.value as Role)}
        title={self ? "You can't change your own role" : undefined}
        className="bg-inset text-fg text-[13px] rounded-[10px] border border-line py-1.5 pl-2.5 pr-7 focus:outline-none focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        <option value="student">Student</option>
        <option value="cr">CR</option>
        <option value="admin">Admin</option>
      </select>
      <Button
        variant="danger"
        size="xs"
        onClick={onDelete}
        disabled={self}
        title={self ? "You can't delete your own account" : undefined}
        leftIcon={<Trash2 className="w-3.5 h-3.5" />}
      >
        Delete
      </Button>
    </div>
  </li>
);

const RecordRow: React.FC<{ item: AdminRecord; onDelete: () => void }> = ({ item, onDelete }) => {
  const author = authorOf(item);
  const created = formatDate(item.created_at);
  const due = formatDate(item.due_date || item.event_date);
  const body = item.description || item.content || item.file_path;

  return (
    <li className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 hover:bg-surface-hover transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          {item.course_code && <Badge variant="muted" size="xs">{item.course_code}</Badge>}
          <span className="font-semibold text-[14px] text-fg">{item.title || item.name || `Record #${item.id}`}</span>
          {item.status && (
            <Badge variant={statusVariant(item.status)} size="xs" className="capitalize">
              {item.status}
            </Badge>
          )}
          {item.priority && (
            <Badge
              variant={item.priority === "High" ? "danger" : item.priority === "Medium" ? "warning" : "muted"}
              size="xs"
            >
              {item.priority}
            </Badge>
          )}
          {item.category && <Badge variant="neutral" size="xs" className="capitalize">{item.category}</Badge>}
        </div>
        {body && <p className="text-[13px] text-fg-2 mt-1 line-clamp-1">{body}</p>}
        <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-[13px] text-muted mt-1">
          {author && <span>by {author}</span>}
          {created && <span>Created {created}</span>}
          {due && (
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {item.due_date ? "Due" : "On"} {due}
            </span>
          )}
          {item.location && <span>{item.location}</span>}
        </div>
      </div>
      <Button
        variant="danger"
        size="xs"
        onClick={onDelete}
        leftIcon={<Trash2 className="w-3.5 h-3.5" />}
        className="self-start sm:self-center"
      >
        Delete
      </Button>
    </li>
  );
};

export default AdminDashboardView;
