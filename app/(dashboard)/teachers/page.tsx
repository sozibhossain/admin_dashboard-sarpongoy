"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  createTeacher,
  deleteTeacher,
  fetchCourses,
  fetchDashboard,
  fetchSchools,
  fetchTeachers,
  getApiErrorMessage,
} from "@/lib/api";
import { GRADE_LEVELS } from "@/lib/constants";
import { StatCard } from "@/components/dashboard/stat-card";
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
  const [filterOpen, setFilterOpen] = useState(false);
  const [formState, setFormState] = useState<TeacherFormState>(initialForm);
  const [filters, setFilters] = useState({
    userId: "",
    teacherName: "",
    schoolId: "",
    gradeLevel: "",
    subject: "",
    status: "",
  });

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchInput]);

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

  const createMutation = useMutation({
    mutationFn: createTeacher,
    onSuccess: () => {
      toast.success("Teacher created successfully");
      setCreateOpen(false);
      setFormState(initialForm);
      void queryClient.invalidateQueries({ queryKey: ["teachers"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
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

  const counters = dashboardQuery.data?.counters;
  const schools = schoolsQuery.data?.items || [];
  const courses = coursesQuery.data || [];

  const selectedSchoolName = schools.find(
    (item) => item._id === formState.schoolId,
  )?.name;

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

  const handleDelete = (teacherId: string) => {
    if (!window.confirm("Delete this teacher?")) return;
    deleteMutation.mutate(teacherId);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Teachers"
          value={`${counters?.totalTeachers || 0}`}
          trend="+ 36%"
        />
        <StatCard
          label="Active Teachers"
          value={`${counters?.activeTeachers || 0}`}
          trend="+ 57%"
        />
        <StatCard
          label="Inactive Teachers"
          value={`${counters?.inactiveTeachers || 0}`}
          trend="+ 83%"
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
            className="mb-4"
            addLabel="Add New"
          />

          {teachersQuery.isLoading ? (
            <TableSkeleton />
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
                    <TableRow key={item._id}>
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
                  onChange={setPage}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
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
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      picture: event.target.files?.[0] || null,
                    }))
                  }
                />
                <Upload className="mx-auto h-6 w-6 text-[#0ea43f]" />
                <p className="mt-2 text-[16px] font-semibold text-[#2f2f2f]">
                  upload
                </p>
                <p className="text-[14px] text-[#8b8b8b]">
                  PDF, JPEG, PNG up to 10MB
                </p>
              </label>
              <label className="cursor-pointer rounded-xl border border-dashed border-[#63cb8d] p-4 text-center">
                <input
                  type="file"
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      file: event.target.files?.[0] || null,
                    }))
                  }
                />
                <Upload className="mx-auto h-6 w-6 text-[#0ea43f]" />
                <p className="mt-2 text-[16px] font-semibold text-[#2f2f2f]">
                  upload
                </p>
                <p className="text-[14px] text-[#8b8b8b]">
                  PDF, JPEG, PNG up to 10MB
                </p>
              </label>
            </div>
          </div>

          <DialogFooter className="grid grid-cols-2 gap-3 sm:grid-cols-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
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
