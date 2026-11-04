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
        return <FileText className="w-5 h-5 text-[#00D084]" />;
      case "Assignment":
        return <FileCode className="w-5 h-5 text-[#38BDF8]" />;
      case "Book":
        return <BookMarked className="w-5 h-5 text-[#A78BFA]" />;
      case "Question Bank":
        return <HelpCircle className="w-5 h-5 text-[#FBBF24]" />;
      default:
        return <BookOpen className="w-5 h-5 text-[#9BB2BC]" />;
    }
  };

  return (
    <AppLayout title="Resource Library">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11.5px] uppercase font-bold tracking-wider text-[#00D084]">
                Study Library
              </span>
              <span className="text-[#1F353C]">•</span>
              <span className="text-[12px] text-[#9BB2BC]">
                Notes, Slides & Previous Exams
              </span>
            </div>
            <h1 className="text-[22px] sm:text-[26px] font-bold text-white tracking-tight mt-0.5">
              Course Study Materials
            </h1>
            <p className="text-[13.5px] text-[#9BB2BC] mt-0.5">
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
        <div className="bg-[#15242A] border border-[#1F353C] rounded-[16px] p-4 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {[
              { id: "all", label: "All Resources" },
              { id: "Lecture Notes", label: "Lecture Notes" },
              { id: "Assignment", label: "Assignments" },
              { id: "Book", label: "Books & Text" },
              { id: "Question Bank", label: "Question Bank" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-[10px] text-[13px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? "bg-[#0E171B] text-[#00D084] border border-[#00D084]/30"
                    : "text-[#9BB2BC] hover:text-white"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="w-full md:w-72 relative">
            <Search className="w-4 h-4 text-[#9BB2BC] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search notes, course codes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0E171B] border border-[#1F353C] rounded-[10px] pl-9 pr-3 py-1.5 text-[12.5px] text-white placeholder:text-[#9BB2BC] focus:outline-none focus:border-[#00D084]"
            />
          </div>
        </div>

        {/* Materials Grid */}
        {isLoading ? (
          <div className="py-16 text-center text-[13px] text-[#9BB2BC]">
            Loading study materials...
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="bg-[#15242A] border border-[#1F353C] rounded-[18px] p-12 text-center flex flex-col items-center justify-center">
            <BookOpen className="w-10 h-10 text-[#9BB2BC] mb-2" />
            <h3 className="text-[16px] font-bold text-white">
              No Materials Found
            </h3>
            <p className="text-[13px] text-[#9BB2BC] mt-1">
              There are no study materials matching this category or keyword.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMaterials.map((mat) => (
              <div
                key={mat.id}
                className="bg-[#15242A] border border-[#1F353C] hover:border-[#00D084]/40 rounded-[16px] p-5 transition-all shadow-[0_4px_16px_rgba(0,0,0,0.15)] flex flex-col justify-between gap-4 group"
              >
                <div className="flex flex-col gap-3">
                  {/* Top tags */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="w-10 h-10 rounded-[10px] bg-[#0E171B] border border-[#1F353C] group-hover:border-[#00D084]/50 flex items-center justify-center shrink-0 transition-colors">
                      {getCategoryIcon(mat.category)}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Badge variant="muted" size="xs">
                        {mat.course_code}
                      </Badge>
                      <span className="text-[11.5px] font-medium text-[#9BB2BC] bg-[#0E171B] px-2 py-0.5 rounded border border-[#1F353C]">
                        {mat.category}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <h3 className="text-[15.5px] font-bold text-white group-hover:text-[#00D084] transition-colors tracking-tight line-clamp-2">
                      {mat.title}
                    </h3>
                    {mat.course_title && (
                      <p className="text-[12px] text-[#7E96A0] mt-1 line-clamp-1">
                        {mat.course_title}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer and Download link */}
                <div className="pt-3 border-t border-[#1F353C]/60 flex items-center justify-between text-[12px] text-[#9BB2BC]">
                  <span className="truncate max-w-[130px]">
                    By {mat.uploader_name || "Student"}
                  </span>

                  <div className="flex items-center gap-2.5">
                    <a
                      href={mat.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#00D084] hover:underline font-semibold"
                    >
                      <span>Access Material</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    {(mat.uploaded_by === user?.id || isCRorAdmin) && (
                      <button
                        onClick={() => deleteResourceMutation.mutate(mat.id)}
                        className="p-1 rounded text-[#9BB2BC] hover:text-[#F87171] hover:bg-[#F87171]/10 transition-colors cursor-pointer"
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
              <div className="text-[12.5px] text-[#FBBF24] bg-[#FBBF24]/10 border border-[#FBBF24]/20 p-3 rounded-[10px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  Student uploads require Class Representative verification
                  before public display.
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#1F353C]/60">
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
