"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  createTeachersBulk,
  createTeacher,
  deleteTeacher,
  fetchCourses,
  fetchDashboard,
  fetchSchools,
  fetchTeachers,
  fetchTeachersExport,
  getApiErrorMessage,
  updateTeachersGradeLevel,
} from "@/lib/api";
import type { BulkTeacherPayload, TeacherExportRow } from "@/lib/api";
import { GRADE_LEVELS } from "@/lib/constants";
import { hasCsvHeader, parseCsvRows } from "@/lib/csv";
import { StatCard } from "@/components/dashboard/stat-card";
import { BulkGradeAction } from "@/components/management/bulk-grade-action";
import {
  ExportRecordsDialog,
  type ExportColumn,
} from "@/components/management/export-records-dialog";
import { ManagementToolbar } from "@/components/management/management-toolbar";
import { SectionHeader } from "@/components/management/section-header";
import { TableSkeleton } from "@/components/management/table-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import { PasswordInput } from "@/components/ui/password-input";
import { SelectionCheckbox } from "@/components/ui/selection-checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 10;
const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
const FILE_MIME_TYPES = new Set([...IMAGE_MIME_TYPES, "application/pdf"]);
const TEACHER_EXPORT_COLUMNS = [
  { key: "serialNumber", label: "Serial Number" },
  { key: "schoolName", label: "School Name" },
  { key: "teacherName", label: "Teacher Name" },
  { key: "userId", label: "User ID" },
  { key: "gradeLevel", label: "Grade Level" },
] satisfies readonly ExportColumn<TeacherExportRow>[];

const formatUploadSize = (bytes: number) => {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

interface TeacherFormState {
  schoolId: string;
  teacherName: string;
  userId: string;
  password: string;
  confirmPassword: string;
  gradeLevel: string;
  courseId: string;
  status: "active" | "inactive";
  picture: File | null;
  file: File | null;
}

const initialForm: TeacherFormState = {
  schoolId: "",
  teacherName: "",
  userId: "",
  password: "",
  confirmPassword: "",
  gradeLevel: "JHS 1",
  courseId: "",
  status: "active",
  picture: null,
  file: null,
};

export default function TeachersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkCreateOpen, setBulkCreateOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkFileName, setBulkFileName] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [formState, setFormState] = useState<TeacherFormState>(initialForm);
  const [picturePreviewUrl, setPicturePreviewUrl] = useState("");
  const [filePreviewUrl, setFilePreviewUrl] = useState("");
  const picturePreviewObjectUrlRef = useRef<string | null>(null);
  const filePreviewObjectUrlRef = useRef<string | null>(null);
  const [filters, setFilters] = useState({
    userId: "",
    teacherName: "",
    schoolId: "",
    gradeLevel: "",
    subject: "",
    status: "",
  });
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<Set<string>>(
    new Set(),
  );
  const [bulkGradeLevel, setBulkGradeLevel] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
      setSelectedTeacherIds(new Set());
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(
    () => () => {
      if (picturePreviewObjectUrlRef.current) {
        URL.revokeObjectURL(picturePreviewObjectUrlRef.current);
      }
      if (filePreviewObjectUrlRef.current) {
        URL.revokeObjectURL(filePreviewObjectUrlRef.current);
      }
    },
    [],
  );

  const schoolsQuery = useQuery({
    queryKey: ["schools", "teacher-form"],
    queryFn: () => fetchSchools({ page: 1, limit: 100 }),
  });

  const coursesQuery = useQuery({
    queryKey: ["courses", "teacher-form"],
    queryFn: () => fetchCourses({ status: "active" }),
  });

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", "teachers-counters"],
    queryFn: fetchDashboard,
  });

  const teachersQuery = useQuery({
    queryKey: [
      "teachers",
      page,
      search,
      filters.userId,
      filters.teacherName,
      filters.schoolId,
      filters.gradeLevel,
      filters.status,
    ],
    queryFn: () =>
      fetchTeachers({
        page,
        limit: PAGE_SIZE,
        search: search || filters.userId || filters.teacherName,
        schoolId: filters.schoolId || undefined,
        gradeLevel: filters.gradeLevel || undefined,
        status: filters.status || undefined,
      }),
  });

  const teachersExportQuery = useQuery({
    queryKey: [
      "teachers-export",
      search,
      filters.userId,
      filters.teacherName,
      filters.schoolId,
      filters.gradeLevel,
      filters.status,
    ],
    queryFn: () =>
      fetchTeachersExport({
        search: search || filters.userId || filters.teacherName || undefined,
        schoolId: filters.schoolId || undefined,
        gradeLevel: filters.gradeLevel || undefined,
        status: filters.status || undefined,
      }),
    enabled: exportOpen,
  });

  const createMutation = useMutation({
    mutationFn: createTeacher,
    onSuccess: () => {
      toast.success("Teacher created successfully");
      setCreateOpen(false);
      resetCreateForm();
      void queryClient.invalidateQueries({ queryKey: ["teachers"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const bulkCreateMutation = useMutation({
    mutationFn: createTeachersBulk,
    onSuccess: (result) => {
      const failedCount = result.failed.length;
      if (failedCount > 0) {
        toast.error(`${result.created.length} teachers created, ${failedCount} failed`);
      } else {
        toast.success(`${result.created.length} teachers created successfully`);
      }
      setBulkCreateOpen(false);
      setBulkText("");
      setBulkFileName("");
      void queryClient.invalidateQueries({ queryKey: ["teachers"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["schools"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTeacher,
    onSuccess: () => {
      toast.success("Teacher deleted successfully");
      void queryClient.invalidateQueries({ queryKey: ["teachers"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const bulkGradeMutation = useMutation({
    mutationFn: ({ teacherIds, gradeLevel }: { teacherIds: string[]; gradeLevel: string }) =>
      updateTeachersGradeLevel(teacherIds, gradeLevel),
    onSuccess: (result) => {
      toast.success(
        `${result.updatedCount} teacher${result.updatedCount === 1 ? "" : "s"} updated to ${result.gradeLevel}`,
      );
      setSelectedTeacherIds(new Set());
      setBulkGradeLevel("");
      void queryClient.invalidateQueries({ queryKey: ["teachers"] });
      void queryClient.invalidateQueries({ queryKey: ["teacher"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const counters = dashboardQuery.data?.counters;
  const schools = schoolsQuery.data?.items || [];
  const courses = coursesQuery.data || [];
  const visibleTeacherIds = teachersQuery.data?.items.map((item) => item._id) || [];
  const allVisibleTeachersSelected =
    visibleTeacherIds.length > 0 &&
    visibleTeacherIds.every((teacherId) => selectedTeacherIds.has(teacherId));
  const someVisibleTeachersSelected = visibleTeacherIds.some((teacherId) =>
    selectedTeacherIds.has(teacherId),
  );

  const handleToggleTeacher = (teacherId: string, checked: boolean) => {
    setSelectedTeacherIds((current) => {
      const next = new Set(current);
      if (checked) next.add(teacherId);
      else next.delete(teacherId);
      return next;
    });
  };

  const handleToggleAllTeachers = (checked: boolean) => {
    setSelectedTeacherIds(checked ? new Set(visibleTeacherIds) : new Set());
  };

  const handleBulkGradeUpdate = () => {
    if (!bulkGradeLevel || selectedTeacherIds.size === 0) return;
    bulkGradeMutation.mutate({
      teacherIds: [...selectedTeacherIds],
      gradeLevel: bulkGradeLevel,
    });
  };

  const selectedSchoolName = schools.find(
    (item) => item._id === formState.schoolId,
  )?.name;

  const clearPicturePreview = () => {
    if (picturePreviewObjectUrlRef.current) {
      URL.revokeObjectURL(picturePreviewObjectUrlRef.current);
      picturePreviewObjectUrlRef.current = null;
    }
    setPicturePreviewUrl("");
  };

  const clearFilePreview = () => {
    if (filePreviewObjectUrlRef.current) {
      URL.revokeObjectURL(filePreviewObjectUrlRef.current);
      filePreviewObjectUrlRef.current = null;
    }
    setFilePreviewUrl("");
  };

  const resetCreateForm = () => {
    setFormState(initialForm);
    clearPicturePreview();
    clearFilePreview();
  };

  const handleCreateDialogChange = (open: boolean) => {
    setCreateOpen(open);
    if (!open) {
      resetCreateForm();
    }
  };

  const handlePictureUpload = (file: File | null) => {
    clearPicturePreview();
    if (!file) {
      setFormState((prev) => ({ ...prev, picture: null }));
      return;
    }

    if (!IMAGE_MIME_TYPES.has(file.type)) {
      toast.error("Picture must be JPG, PNG, or WEBP");
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      toast.error("Picture must be 10MB or smaller");
      return;
    }

    setFormState((prev) => ({ ...prev, picture: file }));
    const previewUrl = URL.createObjectURL(file);
    picturePreviewObjectUrlRef.current = previewUrl;
    setPicturePreviewUrl(previewUrl);
  };

  const handleFileUpload = (file: File | null) => {
    clearFilePreview();
    if (!file) {
      setFormState((prev) => ({ ...prev, file: null }));
      return;
    }

    if (!FILE_MIME_TYPES.has(file.type)) {
      toast.error("File must be PDF, JPG, PNG, or WEBP");
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      toast.error("File must be 10MB or smaller");
      return;
    }

    setFormState((prev) => ({ ...prev, file: file }));
    if (file.type.startsWith("image/")) {
      const previewUrl = URL.createObjectURL(file);
      filePreviewObjectUrlRef.current = previewUrl;
      setFilePreviewUrl(previewUrl);
    }
  };

  const handleCreate = () => {
    if (!formState.schoolId) {
      toast.error("School is required");
      return;
    }

    if (formState.password !== formState.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    const payload = new FormData();
    payload.append("schoolId", formState.schoolId);
    payload.append("schoolName", selectedSchoolName || "");
    payload.append("teacherName", formState.teacherName);
    payload.append("userId", formState.userId);
    payload.append("password", formState.password);
    payload.append("confirmPassword", formState.confirmPassword);
    payload.append("gradeLevel", formState.gradeLevel);
    payload.append("status", formState.status);
    if (formState.courseId) payload.append("courseIds[]", formState.courseId);
    if (formState.picture) payload.append("picture", formState.picture);
    if (formState.file) payload.append("file", formState.file);

    createMutation.mutate(payload);
  };

  const findCourseId = (value: string) => {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return "";

    return (
      courses.find(
        (course) =>
          course._id === value || course.name.trim().toLowerCase() === normalized,
      )?._id || ""
    );
  };

  const parseBulkTeachers = (): BulkTeacherPayload[] | null => {
    const parsedRows = parseCsvRows(bulkText);
    const rows =
      parsedRows.length > 0 &&
      hasCsvHeader(parsedRows[0], ["school", "teacher", "user"])
        ? parsedRows.slice(1)
        : parsedRows;

    if (rows.length === 0) {
      toast.error("Add at least one teacher row");
      return null;
    }

    const teachers: BulkTeacherPayload[] = [];
    for (const [index, row] of rows.entries()) {
      const [schoolName, teacherName, userId, password, gradeLevel] = row;

      if (!schoolName || !teacherName || !userId || !password || !gradeLevel) {
        toast.error(`Row ${index + 1} is missing required values`);
        return null;
      }

      const optionalValues = row.slice(5).filter(Boolean);
      const statusValue = optionalValues.find((value) =>
        ["active", "inactive"].includes(value.toLowerCase()),
      );
      const courseIds = optionalValues
        .filter((value) => !["active", "inactive"].includes(value.toLowerCase()))
        .map(findCourseId)
        .filter(Boolean);

      teachers.push({
        schoolName,
        teacherName,
        userId,
        password,
        confirmPassword: password,
        gradeLevel,
        courseIds,
        status: statusValue?.toLowerCase() === "inactive" ? "inactive" : "active",
      });
    }

    return teachers;
  };

  const handleBulkCreateTeachers = () => {
    const teachers = parseBulkTeachers();
    if (!teachers) return;
    bulkCreateMutation.mutate(teachers);
  };

  const handleBulkCsvUpload = async (file: File | null) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Upload a CSV file");
      return;
    }
    setBulkText(await file.text());
    setBulkFileName(file.name);
  };

  const handleDelete = (teacherId: string) => {
    if (!window.confirm("Delete this teacher?")) return;
    deleteMutation.mutate(teacherId);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Teachers"
          value={`${(counters?.totalTeachers || 0).toLocaleString("en-US")}`}
        />
        <StatCard
          label="Active Teachers"
          value={`${(counters?.activeTeachers || 0).toLocaleString("en-US")}`}
        />
        <StatCard
          label="Inactive Teachers"
          value={`${(counters?.inactiveTeachers || 0).toLocaleString("en-US")}`}
        />
      </div>

      <Card className="content-shell">
        <CardContent className="p-5">
          <SectionHeader
            title="Teacher Management"
            subtitle="Dashboard  >  Teacher Management"
          />
          <ManagementToolbar
            search={searchInput}
            onSearchChange={setSearchInput}
            onOpenFilter={() => setFilterOpen(true)}
            onOpenCreate={() => setCreateOpen(true)}
            onOpenBulkCreate={() => setBulkCreateOpen(true)}
            onOpenExport={() => setExportOpen(true)}
            className="mb-4"
            addLabel="Add New"
          />

          <BulkGradeAction
            selectedCount={selectedTeacherIds.size}
            itemLabel="teacher"
            gradeLevel={bulkGradeLevel}
            onGradeLevelChange={setBulkGradeLevel}
            onApply={handleBulkGradeUpdate}
            onClear={() => {
              setSelectedTeacherIds(new Set());
              setBulkGradeLevel("");
            }}
            isPending={bulkGradeMutation.isPending}
          />

          {teachersQuery.isLoading ? (
            <TableSkeleton columns={8} />
          ) : teachersQuery.isError ? (
            <div className="rounded-lg border border-[#ffd3d3] bg-[#fff6f6] p-4 text-[#d73636]">
              {getApiErrorMessage(
                teachersQuery.error,
                "Failed to load teachers",
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-[#dee5d2]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 px-4">
                      <SelectionCheckbox
                        checked={allVisibleTeachersSelected}
                        indeterminate={
                          someVisibleTeachersSelected && !allVisibleTeachersSelected
                        }
                        onChange={(event) =>
                          handleToggleAllTeachers(event.target.checked)
                        }
                        disabled={
                          visibleTeacherIds.length === 0 || bulkGradeMutation.isPending
                        }
                        aria-label="Select all teachers on this page"
                      />
                    </TableHead>
                    <TableHead>School Name</TableHead>
                    <TableHead>Teacher Name</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Grade Level</TableHead>
                    <TableHead>Password</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachersQuery.data?.items.map((item) => (
                    <TableRow
                      key={item._id}
                      className={
                        selectedTeacherIds.has(item._id) ? "bg-[#f2fbf3]" : undefined
                      }
                    >
                      <TableCell className="w-12 px-4">
                        <SelectionCheckbox
                          checked={selectedTeacherIds.has(item._id)}
                          onChange={(event) =>
                            handleToggleTeacher(item._id, event.target.checked)
                          }
                          disabled={bulkGradeMutation.isPending}
                          aria-label={`Select ${item.teacherName}`}
                        />
                      </TableCell>
                      <TableCell>{item.schoolName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="h-8 w-8 rounded-full bg-[#e2e8d6]" />
                          <span>{item.teacherName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{item.userId}</TableCell>
                      <TableCell>{item.gradeLevel}</TableCell>
                      <TableCell>********</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.status === "active" ? "active" : "inactive"
                          }
                        >
                          {item.status === "active" ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="text-[#ff3030]"
                            onClick={() => handleDelete(item._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <Link
                            href={`/teachers/${item._id}`}
                            className="text-[#2f4a81]"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex flex-col items-center justify-between gap-3 border-t border-[#ececec] px-4 py-3 text-sm text-[#6f6f6f] sm:flex-row">
                <p>
                  Showing {teachersQuery.data?.items.length || 0} of{" "}
                  {teachersQuery.data?.meta.total || 0} results
                </p>
                <Pagination
                  page={teachersQuery.data?.meta.page || 1}
                  totalPages={teachersQuery.data?.meta.totalPages || 1}
                  onChange={(nextPage) => {
                    setSelectedTeacherIds(new Set());
                    setPage(nextPage);
                  }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={handleCreateDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[24px]">Add New User</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2 pb-2">
              <div>
                <Label className="text-[18px]">School Name</Label>
              </div>
              <div>
                <Select
                  value={formState.schoolId}
                  onValueChange={(value) =>
                    setFormState((prev) => ({ ...prev, schoolId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select School" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map((school) => (
                      <SelectItem key={school._id} value={school._id}>
                        {school.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 pb-2">
              <div>
                <Label className="text-[18px]">Teacher Name</Label>
              </div>
              <div>
                <Input
                  value={formState.teacherName}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      teacherName: event.target.value,
                    }))
                  }
                  placeholder="Butlar Mane"
                />
              </div>
            </div>

            <div className="space-y-2 pb-2">
              <div>
                <Label className="text-[18px]">User ID</Label>
              </div>
              <div>
                <Input
                  value={formState.userId}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      userId: event.target.value,
                    }))
                  }
                  placeholder="223344"
                />
              </div>
            </div>

            <div className="space-y-2 pb-2">
              <div>
                <Label className="text-[18px]">Password</Label>
              </div>
              <div>
                <PasswordInput
                  value={formState.password}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      password: event.target.value,
                    }))
                  }
                  placeholder="********"
                />
              </div>
            </div>

            <div className="space-y-2 pb-2">
              <div>
                <Label className="text-[18px]">Confirm Password</Label>
              </div>
              <div>
                <PasswordInput
                  value={formState.confirmPassword}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      confirmPassword: event.target.value,
                    }))
                  }
                  placeholder="********"
                />
              </div>
            </div>

            <div className="space-y-2 pb-2">
              <div>
                <Label className="text-[18px]">Grade Level</Label>
              </div>
              <div>
                <Select
                  value={formState.gradeLevel}
                  onValueChange={(value) =>
                    setFormState((prev) => ({ ...prev, gradeLevel: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_LEVELS.map((grade) => (
                      <SelectItem key={grade} value={grade}>
                        {grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 pb-2">
              <div>
                <Label className="text-[18px]">Subject</Label>
              </div>
              <div>
                <Select
                  value={formState.courseId || "__none__"}
                  onValueChange={(value) =>
                    setFormState((prev) => ({
                      ...prev,
                      courseId: value === "__none__" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No Subject</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course._id} value={course._id}>
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="cursor-pointer rounded-xl border border-dashed border-[#63cb8d] p-4 text-center">
                <input
                  type="file"
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={(event) => {
                    const selectedFile = event.target.files?.[0] || null;
                    handlePictureUpload(selectedFile);
                    if (!selectedFile) return;
                    if (
                      !IMAGE_MIME_TYPES.has(selectedFile.type) ||
                      selectedFile.size > MAX_UPLOAD_SIZE_BYTES
                    ) {
                      event.target.value = "";
                    }
                  }}
                />
                {picturePreviewUrl ? (
                  <div className="mx-auto h-14 w-14 overflow-hidden rounded-md border border-[#deead8]">
                    <Image
                      src={picturePreviewUrl}
                      alt={formState.picture?.name || "Profile image preview"}
                      width={56}
                      height={56}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <Upload className="mx-auto h-6 w-6 text-[#0ea43f]" />
                )}
                <p className="mt-2 text-[16px] font-semibold text-[#2f2f2f]">
                  {formState.picture?.name || "Upload picture"}
                </p>
                <p className="text-[14px] text-[#8b8b8b]">
                  {formState.picture
                    ? formatUploadSize(formState.picture.size)
                    : "JPEG, PNG, WEBP up to 10MB"}
                </p>
              </label>
              <label className="cursor-pointer rounded-xl border border-dashed border-[#63cb8d] p-4 text-center">
                <input
                  type="file"
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  onChange={(event) => {
                    const selectedFile = event.target.files?.[0] || null;
                    handleFileUpload(selectedFile);
                    if (!selectedFile) return;
                    if (
                      !FILE_MIME_TYPES.has(selectedFile.type) ||
                      selectedFile.size > MAX_UPLOAD_SIZE_BYTES
                    ) {
                      event.target.value = "";
                    }
                  }}
                />
                {filePreviewUrl ? (
                  <div className="mx-auto h-14 w-14 overflow-hidden rounded-md border border-[#deead8]">
                    <Image
                      src={filePreviewUrl}
                      alt={formState.file?.name || "File image preview"}
                      width={56}
                      height={56}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <Upload className="mx-auto h-6 w-6 text-[#0ea43f]" />
                )}
                <p className="mt-2 text-[16px] font-semibold text-[#2f2f2f]">
                  {formState.file?.name || "Upload file"}
                </p>
                <p className="text-[14px] text-[#8b8b8b]">
                  {formState.file
                    ? `${formatUploadSize(formState.file.size)}${
                        formState.file.type.startsWith("image/")
                          ? " • Image"
                          : " • PDF"
                      }`
                    : "PDF, JPEG, PNG up to 10MB"}
                </p>
              </label>
            </div>
          </div>

          <DialogFooter className="grid grid-cols-2 gap-3 sm:grid-cols-2">
            <Button
              variant="secondary"
              onClick={() => handleCreateDialogChange(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkCreateOpen} onOpenChange={setBulkCreateOpen}>
        <DialogContent className="max-w-[760px]">
          <DialogHeader>
            <DialogTitle className="text-[24px]">Bulk Add Teachers</DialogTitle>
            <DialogDescription>
              Upload a CSV file with School Name, Teacher Name, User ID, Password, Grade Level, Course, Status
            </DialogDescription>
          </DialogHeader>

          <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[#34b56a] bg-[#f8fff9] text-[16px] font-semibold text-[#079938]">
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => {
                void handleBulkCsvUpload(event.target.files?.[0] || null);
                event.target.value = "";
              }}
            />
            <Upload className="h-4 w-4" />
            Upload CSV
          </label>
          {bulkFileName ? (
            <div className="rounded-lg border border-[#d9ead3] bg-[#f8fff9] px-4 py-3 text-sm font-medium text-[#079938]">
              {bulkFileName}
            </div>
          ) : null}

          <DialogFooter className="grid grid-cols-2 gap-3 sm:grid-cols-2">
            <Button
              variant="secondary"
              onClick={() => {
                setBulkCreateOpen(false);
                setBulkText("");
                setBulkFileName("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkCreateTeachers}
              disabled={bulkCreateMutation.isPending}
            >
              {bulkCreateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExportRecordsDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        title="Export Teachers"
        description="Preview all teachers matching the current search and filters."
        fileName="teachers-export.csv"
        columns={TEACHER_EXPORT_COLUMNS}
        rows={teachersExportQuery.data || []}
        isLoading={teachersExportQuery.isLoading || teachersExportQuery.isFetching}
        errorMessage={
          teachersExportQuery.isError
            ? getApiErrorMessage(
                teachersExportQuery.error,
                "Failed to load teacher export data",
              )
            : undefined
        }
      />

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-w-[740px]">
          <DialogHeader>
            <DialogTitle className="text-[24px]">Filters</DialogTitle>
            <DialogDescription className="sr-only">
              Filter teacher list
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-2 pb-2">
              <div>
                <Label className="text-[18px]">Teacher&apos;s Name</Label>
              </div>
              <div>
                <Input
                  value={filters.teacherName}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      teacherName: event.target.value,
                    }))
                  }
                  placeholder="Butlar Mane"
                />
              </div>
            </div>
            <div className="space-y-2 pb-2">
              <div>
                <Label className="text-[18px]">School Name</Label>
              </div>
              <div>
                <Select
                  value={filters.schoolId || "__all__"}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      schoolId: value === "__all__" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select school" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Schools</SelectItem>
                    {schools.map((school) => (
                      <SelectItem key={school._id} value={school._id}>
                        {school.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2 pb-2">
              <div>
                <Label className="text-[18px]">Grade Level</Label>
              </div>
              <div>
                <Select
                  value={filters.gradeLevel || "__all__"}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      gradeLevel: value === "__all__" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Grade Levels</SelectItem>
                    {GRADE_LEVELS.map((grade) => (
                      <SelectItem key={grade} value={grade}>
                        {grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2 pb-2">
              <div>
                <Label className="text-[18px]">Subject</Label>
              </div>
              <div>
                <Select
                  value={filters.subject || "__all__"}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      subject: value === "__all__" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Subjects</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course._id} value={course._id}>
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="sm:justify-center">
            <Button
              onClick={() => {
                setPage(1);
                setFilterOpen(false);
              }}
              className="w-full max-w-[260px]"
            >
              Search
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
