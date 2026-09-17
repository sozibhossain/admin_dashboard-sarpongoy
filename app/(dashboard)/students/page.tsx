"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Loader2, Pencil, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  createStudentsBulk,
  createStudent,
  deleteStudent,
  fetchDashboard,
  fetchSchools,
  fetchStudents,
  fetchStudentsExport,
  getApiErrorMessage,
  updateStudent,
  updateStudentsGradeLevel,
} from "@/lib/api";
import type {
  BulkStudentPayload,
  StudentExportRow,
  StudentListItem,
} from "@/lib/api";
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
const STUDENT_EXPORT_COLUMNS = [
  { key: "serialNumber", label: "Serial Number" },
  { key: "schoolName", label: "School Name" },
  { key: "studentName", label: "Student Name" },
  { key: "userId", label: "User ID" },
  { key: "gradeLevel", label: "Grade Level" },
] satisfies readonly ExportColumn<StudentExportRow>[];

const formatUploadSize = (bytes: number) => {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

interface StudentFormState {
  schoolId: string;
  studentName: string;
  userId: string;
  password: string;
  confirmPassword: string;
  gradeLevel: string;
  status: "active" | "inactive";
  picture: File | null;
  file: File | null;
}

interface StudentEditFormState {
  schoolId: string;
  studentName: string;
  userId: string;
  password: string;
  confirmPassword: string;
  gradeLevel: string;
  status: "active" | "inactive";
}

interface StudentFilters {
  userId: string;
  studentName: string;
  schoolId: string;
  gradeLevel: string;
  status: string;
}

const emptyStudentFilters: StudentFilters = {
  userId: "",
  studentName: "",
  schoolId: "",
  gradeLevel: "",
  status: "",
};

const initialForm: StudentFormState = {
  schoolId: "",
  studentName: "",
  userId: "",
  password: "",
  confirmPassword: "",
  gradeLevel: "JHS 1",
  status: "active",
  picture: null,
  file: null,
};

const initialEditForm: StudentEditFormState = {
  schoolId: "",
  studentName: "",
  userId: "",
  password: "",
  confirmPassword: "",
  gradeLevel: "JHS 1",
  status: "active",
};

export default function StudentsPage() {
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
  const [formState, setFormState] = useState<StudentFormState>(initialForm);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editFormState, setEditFormState] =
    useState<StudentEditFormState>(initialEditForm);
  const [picturePreviewUrl, setPicturePreviewUrl] = useState("");
  const [filePreviewUrl, setFilePreviewUrl] = useState("");
  const picturePreviewObjectUrlRef = useRef<string | null>(null);
  const filePreviewObjectUrlRef = useRef<string | null>(null);
  const [filters, setFilters] = useState<StudentFilters>(emptyStudentFilters);
  const [filterDraft, setFilterDraft] =
    useState<StudentFilters>(emptyStudentFilters);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    new Set(),
  );
  const [bulkGradeLevel, setBulkGradeLevel] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
      setSelectedStudentIds(new Set());
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
    queryKey: ["schools", "student-form"],
    queryFn: () => fetchSchools({ page: 1, limit: 100 }),
  });

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", "students-counters"],
    queryFn: fetchDashboard,
  });

  const studentsQuery = useQuery({
    queryKey: [
      "students",
      page,
      search,
      filters.userId,
      filters.studentName,
      filters.schoolId,
      filters.gradeLevel,
      filters.status,
    ],
    queryFn: () =>
      fetchStudents({
        page,
        limit: PAGE_SIZE,
        search: search || filters.userId || filters.studentName,
        schoolId: filters.schoolId || undefined,
        gradeLevel: filters.gradeLevel || undefined,
        status: filters.status || undefined,
      }),
  });

  const studentsExportQuery = useQuery({
    queryKey: [
      "students-export",
      search,
      filters.userId,
      filters.studentName,
      filters.schoolId,
      filters.gradeLevel,
      filters.status,
    ],
    queryFn: () =>
      fetchStudentsExport({
        search: search || filters.userId || filters.studentName || undefined,
        schoolId: filters.schoolId || undefined,
        gradeLevel: filters.gradeLevel || undefined,
        status: filters.status || undefined,
      }),
    enabled: exportOpen,
  });

  const createMutation = useMutation({
    mutationFn: createStudent,
    onSuccess: () => {
      toast.success("Student created successfully");
      setCreateOpen(false);
      resetCreateForm();
      void queryClient.invalidateQueries({ queryKey: ["students"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["schools"] });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ studentId, payload }: { studentId: string; payload: FormData }) =>
      updateStudent(studentId, payload),
    onSuccess: () => {
      toast.success("Student updated successfully");
      setEditingStudentId(null);
      setEditFormState(initialEditForm);
      void queryClient.invalidateQueries({ queryKey: ["students"] });
      void queryClient.invalidateQueries({ queryKey: ["student"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["schools"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const bulkCreateMutation = useMutation({
    mutationFn: createStudentsBulk,
    onSuccess: (result) => {
      const failedCount = result.failed.length;
      if (failedCount > 0) {
        toast.error(`${result.created.length} students created, ${failedCount} failed`);
      } else {
        toast.success(`${result.created.length} students created successfully`);
      }
      setBulkCreateOpen(false);
      setBulkText("");
      setBulkFileName("");
      void queryClient.invalidateQueries({ queryKey: ["students"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["schools"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStudent,
    onSuccess: () => {
      toast.success("Student deleted successfully");
      void queryClient.invalidateQueries({ queryKey: ["students"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const bulkGradeMutation = useMutation({
    mutationFn: ({ studentIds, gradeLevel }: { studentIds: string[]; gradeLevel: string }) =>
      updateStudentsGradeLevel(studentIds, gradeLevel),
    onSuccess: (result) => {
      toast.success(
        `${result.updatedCount} student${result.updatedCount === 1 ? "" : "s"} updated to ${result.gradeLevel}`,
      );
      setSelectedStudentIds(new Set());
      setBulkGradeLevel("");
      void queryClient.invalidateQueries({ queryKey: ["students"] });
      void queryClient.invalidateQueries({ queryKey: ["student"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const counters = dashboardQuery.data?.counters;

  const schools = schoolsQuery.data?.items || [];
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const visibleStudentIds = studentsQuery.data?.items.map((item) => item._id) || [];
  const allVisibleStudentsSelected =
    visibleStudentIds.length > 0 &&
    visibleStudentIds.every((studentId) => selectedStudentIds.has(studentId));
  const someVisibleStudentsSelected = visibleStudentIds.some((studentId) =>
    selectedStudentIds.has(studentId),
  );

  const handleToggleFilters = () => {
    setFilterOpen((isOpen) => {
      if (!isOpen) {
        setFilterDraft(filters);
      }
      return !isOpen;
    });
  };

  const handleApplyFilters = () => {
    setFilters(filterDraft);
    setPage(1);
    setSelectedStudentIds(new Set());
    setFilterOpen(false);
  };

  const handleClearFilters = () => {
    setFilterDraft(emptyStudentFilters);
    setFilters(emptyStudentFilters);
    setPage(1);
    setSelectedStudentIds(new Set());
  };

  const handleToggleStudent = (studentId: string, checked: boolean) => {
    setSelectedStudentIds((current) => {
      const next = new Set(current);
      if (checked) next.add(studentId);
      else next.delete(studentId);
      return next;
    });
  };

  const handleToggleAllStudents = (checked: boolean) => {
    setSelectedStudentIds(checked ? new Set(visibleStudentIds) : new Set());
  };

  const handleBulkGradeUpdate = () => {
    if (!bulkGradeLevel || selectedStudentIds.size === 0) return;
    bulkGradeMutation.mutate({
      studentIds: [...selectedStudentIds],
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

  const handleCreateStudent = () => {
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
    payload.append("studentName", formState.studentName);
    payload.append("userId", formState.userId);
    payload.append("password", formState.password);
    payload.append("confirmPassword", formState.confirmPassword);
    payload.append("gradeLevel", formState.gradeLevel);
    payload.append("status", formState.status);

    if (formState.picture) payload.append("picture", formState.picture);
    if (formState.file) payload.append("file", formState.file);

    createMutation.mutate(payload);
  };

  const handleOpenEdit = (student: StudentListItem) => {
    setEditFormState({
      schoolId: student.schoolId,
      studentName: student.studentName,
      userId: student.userId,
      password: "",
      confirmPassword: "",
      gradeLevel: student.gradeLevel,
      status: student.status,
    });
    setEditingStudentId(student._id);
  };

  const handleEditDialogChange = (open: boolean) => {
    if (open) return;
    setEditingStudentId(null);
    setEditFormState(initialEditForm);
  };

  const handleUpdateStudent = () => {
    if (!editingStudentId) return;
    if (
      !editFormState.schoolId ||
      !editFormState.studentName.trim() ||
      !editFormState.userId.trim() ||
      !editFormState.gradeLevel
    ) {
      toast.error("School, student name, user ID, and grade level are required");
      return;
    }
    if (editFormState.password !== editFormState.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    const payload = new FormData();
    payload.append("schoolId", editFormState.schoolId);
    payload.append("studentName", editFormState.studentName.trim());
    payload.append("userId", editFormState.userId.trim());
    payload.append("gradeLevel", editFormState.gradeLevel);
    payload.append("status", editFormState.status);
    if (editFormState.password) {
      payload.append("password", editFormState.password);
    }

    updateMutation.mutate({ studentId: editingStudentId, payload });
  };

  const parseBulkStudents = (): BulkStudentPayload[] | null => {
    const parsedRows = parseCsvRows(bulkText);
    const rows =
      parsedRows.length > 0 &&
      hasCsvHeader(parsedRows[0], ["school", "student", "user"])
        ? parsedRows.slice(1)
        : parsedRows;

    if (rows.length === 0) {
      toast.error("Add at least one student row");
      return null;
    }

    const students: BulkStudentPayload[] = [];
    for (const [index, row] of rows.entries()) {
      const [schoolName, studentName, userId, password, gradeLevel, status] = row;

      if (!schoolName || !studentName || !userId || !password || !gradeLevel) {
        toast.error(`Row ${index + 1} is missing required values`);
        return null;
      }

      students.push({
        schoolName,
        studentName,
        userId,
        password,
        confirmPassword: password,
        gradeLevel,
        status: status === "inactive" ? "inactive" : "active",
      });
    }

    return students;
  };

  const handleBulkCreateStudents = () => {
    const students = parseBulkStudents();
    if (!students) return;
    bulkCreateMutation.mutate(students);
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

  const handleDelete = (studentId: string) => {
    const proceed = window.confirm("Delete this student?");
    if (!proceed) return;
    deleteMutation.mutate(studentId);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Students"
          value={`${(counters?.totalStudents || 0).toLocaleString("en-US")}`}
        />
        <StatCard
          label="Active Students"
          value={`${(counters?.activeStudents || 0).toLocaleString("en-US")}`}
        />
        <StatCard
          label="Inactive Students"
          value={`${(counters?.inactiveStudents || 0).toLocaleString("en-US")}`}
        />
      </div>

      <Card className="content-shell">
        <CardContent className="p-5">
          <SectionHeader
            title="Student Management"
            subtitle="Dashboard  >  Student Management"
          />
          <ManagementToolbar
            search={searchInput}
            onSearchChange={setSearchInput}
            onOpenFilter={handleToggleFilters}
            filterOpen={filterOpen}
            filterCount={activeFilterCount}
            onOpenCreate={() => setCreateOpen(true)}
            onOpenBulkCreate={() => setBulkCreateOpen(true)}
            onOpenExport={() => setExportOpen(true)}
            addLabel="Add New"
            className="mb-4"
          />

          {filterOpen ? (
            <section
              aria-label="Student filters"
              className="mb-4 rounded-xl border border-[#dbe8d4] bg-[#f8fcf6] p-4 shadow-[0_8px_24px_rgba(21,77,35,0.06)]"
            >
              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#1f2d22]">
                    Filter students
                  </h3>
                  <p className="text-sm text-[#748077]">
                    Choose one or more options, then apply the filters.
                  </p>
                </div>
                {activeFilterCount > 0 ? (
                  <span className="w-fit rounded-full bg-[#e2f6e7] px-3 py-1 text-xs font-semibold text-[#087c2d]">
                    {activeFilterCount} active
                  </span>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <div className="space-y-1.5">
                  <Label htmlFor="filter-student-user-id" className="text-sm">
                    User ID
                  </Label>
                  <Input
                    id="filter-student-user-id"
                    value={filterDraft.userId}
                    onChange={(event) =>
                      setFilterDraft((prev) => ({
                        ...prev,
                        userId: event.target.value,
                      }))
                    }
                    placeholder="Enter user ID"
                    className="bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="filter-student-name" className="text-sm">
                    Student&apos;s Name
                  </Label>
                  <Input
                    id="filter-student-name"
                    value={filterDraft.studentName}
                    onChange={(event) =>
                      setFilterDraft((prev) => ({
                        ...prev,
                        studentName: event.target.value,
                      }))
                    }
                    placeholder="Enter student name"
                    className="bg-white"
                  />
                </div>

                <div className="min-w-0 space-y-1.5">
                  <Label className="text-sm">School Name</Label>
                  <Select
                    value={filterDraft.schoolId || "__all__"}
                    onValueChange={(value) =>
                      setFilterDraft((prev) => ({
                        ...prev,
                        schoolId: value === "__all__" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger className="min-w-0 bg-white">
                      <SelectValue placeholder="All schools" />
                    </SelectTrigger>
                    <SelectContent viewportClassName="h-auto max-h-60 overflow-y-auto">
                      <SelectItem value="__all__">All Schools</SelectItem>
                      {schools.map((school) => (
                        <SelectItem key={school._id} value={school._id}>
                          {school.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">Grade Level</Label>
                  <Select
                    value={filterDraft.gradeLevel || "__all__"}
                    onValueChange={(value) =>
                      setFilterDraft((prev) => ({
                        ...prev,
                        gradeLevel: value === "__all__" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="All grade levels" />
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

                <div className="space-y-1.5">
                  <Label className="text-sm">Status</Label>
                  <Select
                    value={filterDraft.status || "__all__"}
                    onValueChange={(value) =>
                      setFilterDraft((prev) => ({
                        ...prev,
                        status: value === "__all__" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClearFilters}
                  className="h-10"
                >
                  Clear all
                </Button>
                <Button
                  type="button"
                  onClick={handleApplyFilters}
                  className="h-10 min-w-36"
                >
                  Apply filters
                </Button>
              </div>
            </section>
          ) : null}

          <BulkGradeAction
            selectedCount={selectedStudentIds.size}
            itemLabel="student"
            gradeLevel={bulkGradeLevel}
            onGradeLevelChange={setBulkGradeLevel}
            onApply={handleBulkGradeUpdate}
            onClear={() => {
              setSelectedStudentIds(new Set());
              setBulkGradeLevel("");
            }}
            isPending={bulkGradeMutation.isPending}
          />

          {studentsQuery.isLoading ? (
            <TableSkeleton columns={8} />
          ) : studentsQuery.isError ? (
            <div className="rounded-lg border border-[#ffd3d3] bg-[#fff6f6] p-4 text-[#d73636]">
              {getApiErrorMessage(
                studentsQuery.error,
                "Failed to load students",
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-[#dee5d2]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 px-4">
                      <SelectionCheckbox
                        checked={allVisibleStudentsSelected}
                        indeterminate={
                          someVisibleStudentsSelected && !allVisibleStudentsSelected
                        }
                        onChange={(event) =>
                          handleToggleAllStudents(event.target.checked)
                        }
                        disabled={
                          visibleStudentIds.length === 0 || bulkGradeMutation.isPending
                        }
                        aria-label="Select all students on this page"
                      />
                    </TableHead>
                    <TableHead>School Name</TableHead>
                    <TableHead>Student&apos;s Name</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Grade Level</TableHead>
                    <TableHead>Password</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentsQuery.data?.items.map((item) => (
                    <TableRow
                      key={item._id}
                      className={
                        selectedStudentIds.has(item._id) ? "bg-[#f2fbf3]" : undefined
                      }
                    >
                      <TableCell className="w-12 px-4">
                        <SelectionCheckbox
                          checked={selectedStudentIds.has(item._id)}
                          onChange={(event) =>
                            handleToggleStudent(item._id, event.target.checked)
                          }
                          disabled={bulkGradeMutation.isPending}
                          aria-label={`Select ${item.studentName}`}
                        />
                      </TableCell>
                      <TableCell>{item.schoolName}</TableCell>
                      <TableCell>{item.studentName}</TableCell>
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
                            className="text-[#159447] transition-colors hover:text-[#0f6d35]"
                            onClick={() => handleOpenEdit(item)}
                            aria-label={`Edit ${item.studentName}`}
                            title="Edit student"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="text-[#ff3030]"
                            onClick={() => handleDelete(item._id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <Link
                            href={`/students/${item._id}`}
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
                  Showing {studentsQuery.data?.items.length || 0} of{" "}
                  {studentsQuery.data?.meta.total || 0} results
                </p>
                <Pagination
                  page={studentsQuery.data?.meta.page || 1}
                  totalPages={studentsQuery.data?.meta.totalPages || 1}
                  onChange={(nextPage) => {
                    setSelectedStudentIds(new Set());
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
                <Label className="text-[18px] ">School Name</Label>
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
                  <SelectContent viewportClassName="h-auto max-h-60 overflow-y-auto">
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
                <Label className="text-[18px]">
                  Student&apos;s Name
                </Label>
              </div>
              <div>
                <Input
                  value={formState.studentName}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      studentName: event.target.value,
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
            <Button
              onClick={handleCreateStudent}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingStudentId !== null}
        onOpenChange={handleEditDialogChange}
      >
        <DialogContent className="max-w-[640px]">
          <DialogHeader>
            <DialogTitle className="text-[24px]">Edit Student</DialogTitle>
            <DialogDescription>
              Update the student&apos;s account and school information.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-[18px]">School Name</Label>
              <Select
                value={editFormState.schoolId}
                onValueChange={(value) =>
                  setEditFormState((prev) => ({ ...prev, schoolId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select School" />
                </SelectTrigger>
                <SelectContent viewportClassName="h-auto max-h-60 overflow-y-auto">
                  {schools.map((school) => (
                    <SelectItem key={school._id} value={school._id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-student-name" className="text-[18px]">
                Student&apos;s Name
              </Label>
              <Input
                id="edit-student-name"
                value={editFormState.studentName}
                onChange={(event) =>
                  setEditFormState((prev) => ({
                    ...prev,
                    studentName: event.target.value,
                  }))
                }
                placeholder="Student name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-student-user-id" className="text-[18px]">
                User ID
              </Label>
              <Input
                id="edit-student-user-id"
                value={editFormState.userId}
                onChange={(event) =>
                  setEditFormState((prev) => ({
                    ...prev,
                    userId: event.target.value,
                  }))
                }
                placeholder="User ID"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[18px]">Grade Level</Label>
              <Select
                value={editFormState.gradeLevel}
                onValueChange={(value) =>
                  setEditFormState((prev) => ({ ...prev, gradeLevel: value }))
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

            <div className="space-y-2">
              <Label className="text-[18px]">Status</Label>
              <Select
                value={editFormState.status}
                onValueChange={(value) =>
                  setEditFormState((prev) => ({
                    ...prev,
                    status: value as StudentEditFormState["status"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-student-password" className="text-[18px]">
                New Password
              </Label>
              <PasswordInput
                id="edit-student-password"
                value={editFormState.password}
                onChange={(event) =>
                  setEditFormState((prev) => ({
                    ...prev,
                    password: event.target.value,
                  }))
                }
                placeholder="Leave blank to keep current"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="edit-student-confirm-password"
                className="text-[18px]"
              >
                Confirm Password
              </Label>
              <PasswordInput
                id="edit-student-confirm-password"
                value={editFormState.confirmPassword}
                onChange={(event) =>
                  setEditFormState((prev) => ({
                    ...prev,
                    confirmPassword: event.target.value,
                  }))
                }
                placeholder="Confirm new password"
              />
            </div>
          </div>

          <DialogFooter className="grid grid-cols-2 gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleEditDialogChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUpdateStudent}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkCreateOpen} onOpenChange={setBulkCreateOpen}>
        <DialogContent className="max-w-[760px]">
          <DialogHeader>
            <DialogTitle className="text-[24px]">Bulk Add Students</DialogTitle>
            <DialogDescription>
              Upload a CSV file with School Name, Student Name, User ID, Password, Grade Level, Status
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
              onClick={handleBulkCreateStudents}
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
        title="Export Students"
        description="Preview all students matching the current search and filters."
        fileName="students-export.csv"
        columns={STUDENT_EXPORT_COLUMNS}
        rows={studentsExportQuery.data || []}
        isLoading={studentsExportQuery.isLoading || studentsExportQuery.isFetching}
        errorMessage={
          studentsExportQuery.isError
            ? getApiErrorMessage(
                studentsExportQuery.error,
                "Failed to load student export data",
              )
            : undefined
        }
      />

    </div>
  );
}
