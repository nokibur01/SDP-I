import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Search,
  ExternalLink,
  FileText,
  FileCode,
  HelpCircle,
  BookMarked,
  AlertCircle,
  Upload,
  Trash2,
} from "lucide-react";
import { AppLayout } from "../../components/layout/AppLayout";
import { useAuthStore } from "../../stores/useAuthStore";
import { apiClient } from "../../services/apiClient";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { useToast } from "../../components/ui/Toast";
import { CardGridSkeleton } from "../../components/ui/Skeleton";

export interface MaterialItem {
  id: number;
  course_code: string;
  course_title?: string;
  title: string;
  file_url: string;
  category:
    | "Lecture Notes"
    | "Assignment"
    | "Book"
    | "Question Bank"
    | "Other"
    | string;
  uploaded_by?: number;
  uploader_name?: string;
  status?: string;
  created_at: string;
}

interface ResourcesApiResponse {
  success: boolean;
  materials: MaterialItem[];
  pendingMaterials?: MaterialItem[];
}

export const ResourcesView: React.FC = () => {
  const { user } = useAuthStore();
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const isCRorAdmin = user?.role === "cr" || user?.role === "admin";

  // Filters & State
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    title: "",
    course_code: "",
    category: "Lecture Notes",
    file_url: "",
  });

  // Query resources
  const { data, isLoading } = useQuery({
    queryKey: ["resources-list"],
    queryFn: () => apiClient.get<ResourcesApiResponse>("/resources"),
  });

  const materials = data?.materials || [];

  // Mutations
  const uploadResourceMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      return apiClient.post<{ success: boolean; message?: string }>(
        "/resources",
        payload,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources-list"] });
      setIsUploadModalOpen(false);
      setFormData({
        title: "",
        course_code: "",
        category: "Lecture Notes",
        file_url: "",
      });
      success(
        isCRorAdmin
          ? "Study material published to cohort library!"
          : "Material uploaded! Awaiting Class Representative moderation.",
      );
    },
    onError: (err: Error) => error(err.message || "Failed to upload material"),
  });

  const deleteResourceMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/resources/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources-list"] });
      queryClient.invalidateQueries({ queryKey: ["cr-resources"] });
      success("Resource deleted from library!");
    },
    onError: (err: Error) => error(err.message || "Failed to delete resource"),
  });

  // Filtered materials
  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      if (
        selectedCategory !== "all" &&
        m.category.toLowerCase() !== selectedCategory.toLowerCase()
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          m.title.toLowerCase().includes(q) ||
          m.course_code.toLowerCase().includes(q) ||
          m.uploader_name?.toLowerCase().includes(q) ||
          m.course_title?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [materials, selectedCategory, searchQuery]);

  const categoryCounts = useMemo(() => {
    return {
      all: materials.length,
      lectureNotes: materials.filter((m) => m.category === 'Lecture Notes').length,
      assignment: materials.filter((m) => m.category === 'Assignment').length,
      book: materials.filter((m) => m.category === 'Book').length,
      questionBank: materials.filter((m) => m.category === 'Question Bank').length,
    };
  }, [materials]);

  const handleSubmitUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      error("Material title is required");
      return;
    }
    if (!formData.course_code.trim()) {
      error("Course code is required");
      return;
    }
    if (!formData.file_url.trim()) {
      error("Resource file or cloud storage link is required");
      return;
    }
    uploadResourceMutation.mutate(formData);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Lecture Notes":
        return <FileText className="w-5 h-5 text-accent" />;
      case "Assignment":
        return <FileCode className="w-5 h-5 text-info" />;
      case "Book":
        return <BookMarked className="w-5 h-5 text-lilac" />;
      case "Question Bank":
        return <HelpCircle className="w-5 h-5 text-warning" />;
      default:
        return <BookOpen className="w-5 h-5 text-fg-2" />;
    }
  };

  return (
    <AppLayout title="Resource Library">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[12.5px] uppercase font-bold tracking-wider text-accent">
                Study Library
              </span>
              <span className="text-line">•</span>
              <span className="text-[13px] text-fg-2">
                Notes, Slides & Previous Exams
              </span>
            </div>
            <h1 className="text-[22px] sm:text-[26px] font-bold text-fg tracking-tight mt-0.5">
              Course Study Materials
            </h1>
            <p className="text-[13.5px] text-fg-2 mt-0.5">
              Peer-contributed lecture slides, assignment solutions, syllabus
              notes, and exam question archives.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            leftIcon={<Upload className="w-4 h-4" />}
            onClick={() => setIsUploadModalOpen(true)}
          >
            Upload Material
          </Button>
        </div>

        {/* Toolbar */}
        <div className="bg-surface border border-line rounded-[16px] p-4 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {[
              { id: "all", label: "All Resources", count: categoryCounts.all },
              { id: "Lecture Notes", label: "Lecture Notes", count: categoryCounts.lectureNotes },
              { id: "Assignment", label: "Assignments", count: categoryCounts.assignment },
              { id: "Book", label: "Books & Text", count: categoryCounts.book },
              { id: "Question Bank", label: "Question Bank", count: categoryCounts.questionBank },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-[10px] text-[13px] font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? "bg-inset text-accent border border-accent/30 shadow-sm"
                    : "text-fg-2 hover:text-fg hover:bg-inset/50"
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[12px] px-1.5 py-0.2 rounded-full ${
                    selectedCategory === cat.id
                      ? "bg-accent/20 text-accent"
                      : "bg-line text-fg-2"
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="w-full md:w-72 relative">
            <Search className="w-4 h-4 text-fg-2 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search notes, course codes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-inset border border-line rounded-[10px] pl-9 pr-3 py-1.5 text-[13px] text-fg placeholder:text-fg-2 focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        {/* Materials Grid */}
        {isLoading ? (
          <CardGridSkeleton count={6} />
        ) : filteredMaterials.length === 0 ? (
          <div className="bg-surface border border-line rounded-[18px] p-12 text-center flex flex-col items-center justify-center">
            <BookOpen className="w-10 h-10 text-fg-2 mb-2" />
            <h3 className="text-[16px] font-bold text-fg">
              No Materials Found
            </h3>
            <p className="text-[13px] text-fg-2 mt-1">
              There are no study materials matching this category or keyword.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMaterials.map((mat) => (
              <div
                key={mat.id}
                className="bg-surface border border-line hover:border-accent/40 rounded-[16px] p-5 transition-all shadow-[0_4px_16px_rgba(0,0,0,0.15)] flex flex-col justify-between gap-4 group"
              >
                <div className="flex flex-col gap-3">
                  {/* Top tags */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="w-10 h-10 rounded-[10px] bg-inset border border-line group-hover:border-accent/50 flex items-center justify-center shrink-0 transition-colors">
                      {getCategoryIcon(mat.category)}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Badge variant="muted" size="xs">
                        {mat.course_code}
                      </Badge>
                      <span className="text-[12.5px] font-medium text-fg-2 bg-inset px-2 py-0.5 rounded border border-line">
                        {mat.category}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <h3 className="text-[15.5px] font-bold text-fg group-hover:text-accent transition-colors tracking-tight line-clamp-2">
                      {mat.title}
                    </h3>
                    {mat.course_title && (
                      <p className="text-[13px] text-muted mt-1 line-clamp-1">
                        {mat.course_title}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer and Download link */}
                <div className="pt-3 border-t border-line/60 flex items-center justify-between text-[13px] text-fg-2">
                  <span className="truncate max-w-[130px]">
                    By {mat.uploader_name || "Student"}
                  </span>

                  <div className="flex items-center gap-2.5">
                    <a
                      href={mat.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-accent hover:underline font-semibold"
                    >
                      <span>Access Material</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    {(mat.uploaded_by === user?.id || isCRorAdmin) && (
                      <button
                        onClick={() => deleteResourceMutation.mutate(mat.id)}
                        className="p-1 rounded text-fg-2 hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                        title="Delete Material"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Upload Resource */}
        <Modal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          title="Upload Academic Resource"
          description={
            isCRorAdmin
              ? "Add lecture notes, slides, or reference material directly to the cohort library."
              : "Submit study material for Class Representative moderation before publishing."
          }
          maxWidth="md"
        >
          <form onSubmit={handleSubmitUpload} className="space-y-4">
            <Input
              label="Material Title *"
              placeholder="e.g., Operating Systems Chapter 3 - CPU Scheduling Notes"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Course Code *"
                placeholder="e.g., CSE-3201"
                value={formData.course_code}
                onChange={(e) =>
                  setFormData({ ...formData, course_code: e.target.value })
                }
                required
              />

              <Select
                label="Material Category"
                options={[
                  { value: "Lecture Notes", label: "Lecture Notes" },
                  { value: "Assignment", label: "Assignment Solution" },
                  { value: "Book", label: "Reference Book" },
                  { value: "Question Bank", label: "Question Bank" },
                  { value: "Other", label: "Other Document" },
                ]}
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
              />
            </div>

            <Input
              label="Cloud Storage / Document Link *"
              placeholder="https://drive.google.com/file/d/... or GitHub link"
              value={formData.file_url}
              onChange={(e) =>
                setFormData({ ...formData, file_url: e.target.value })
              }
              required
            />

            {!isCRorAdmin && (
              <div className="text-[13px] text-warning bg-warning/10 border border-warning/20 p-3 rounded-[10px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  Student uploads require Class Representative verification
                  before public display.
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-line/60">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={uploadResourceMutation.isPending}
              >
                {isCRorAdmin ? "Publish Resource" : "Submit for Review"}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppLayout>
  );
};
