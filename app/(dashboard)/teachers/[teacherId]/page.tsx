"use client";
"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart2,
  Calculator,
  FlaskConical,
  HandHelping,
  KeyRound,
  Landmark,
  Languages,
  AreaChart as AreaChartIcon,
  Loader2,
  Pencil,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchCourses,
  fetchTeacherById,
  fetchTeacherOverview,
  getApiErrorMessage,
  updateTeacher,
} from "@/lib/api";
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
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const ALL_SUBJECTS = "ALL";
const CURRENT_YEAR = new Date().getFullYear().toString();
const YEAR_OPTIONS = [
  CURRENT_YEAR,
  (Number(CURRENT_YEAR) - 1).toString(),
  (Number(CURRENT_YEAR) - 2).toString(),
];

type SubjectStyle = {
  label: string;
  bg: string;
  border: string;
  text: string;
  icon: LucideIcon;
};

type SubjectTile = SubjectStyle & {
  subject: string;
};

const SUBJECT_STYLES: SubjectStyle[] = [
  {
    label: "English",
    bg: "#e8fbe8",
    border: "#22c55e",
    text: "#1e9f3a",
    icon: Languages,
  },
  {
    label: "Science",
    bg: "#f4ecff",
    border: "#8b5cf6",
    text: "#7c3aed",
    icon: FlaskConical,
  },
  {
    label: "Math",
    bg: "#eaf4ff",
    border: "#3b82f6",
    text: "#2563eb",
    icon: Calculator,
  },
  {
    label: "Social Studies",
    bg: "#fff0de",
    border: "#fb923c",
    text: "#ea580c",
    icon: Landmark,
  },
  {
    label: "Religious & Moral Education",
    bg: "#f8f5e9",
    border: "#d4b61f",
    text: "#a38100",
    icon: HandHelping,
  },
];

const normalizeText = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

const resolveSubjectStyle = (subject: string): SubjectStyle => {
  const normalized = normalizeText(subject);

  if (normalized.includes("english")) return SUBJECT_STYLES[0];
  if (normalized.includes("science")) return SUBJECT_STYLES[1];
  if (normalized.includes("math")) return SUBJECT_STYLES[2];
  if (normalized.includes("social")) return SUBJECT_STYLES[3];
  if (
    normalized.includes("religious") ||
    normalized.includes("moral") ||
    normalized.includes("rme")
  ) {
    return SUBJECT_STYLES[4];
  }

  return SUBJECT_STYLES[0];
};

const getInitials = (value: string) => {
  const names = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (names.length === 0) return "TR";
  if (names.length === 1) return names[0].slice(0, 2).toUpperCase();
  return `${names[0][0]}${names[1][0]}`.toUpperCase();
};

const buildSubjectTiles = (
  courses: Array<{ _id: string; name: string }>,
): SubjectTile[] =>
  courses.map((course) => {
    const style = resolveSubjectStyle(course.name || "");
    return {
      ...style,
      subject: course.name || style.label,
    };
  });

export default function TeacherDetailsPage() {
  const params = useParams<{ teacherId: string }>();
  const teacherId = params.teacherId;
  const queryClient = useQueryClient();
  const [resetOpen, setResetOpen] = useState(false);
  const [passwordState, setPasswordState] = useState({
    password: "",
    confirmPassword: "",
  });

  const [selectedSubject, setSelectedSubject] = useState(ALL_SUBJECTS);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [chartType, setChartType] = useState<"bar" | "area">("bar");
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);

  const teacherQuery = useQuery({
    queryKey: ["teacher", teacherId],
    queryFn: () => fetchTeacherById(teacherId),
    enabled: !!teacherId,
  });

  const coursesQuery = useQuery({
    queryKey: ["courses", "active"],
    queryFn: () => fetchCourses({ status: "active" }),
    enabled: courseDialogOpen,
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (payload: FormData) => updateTeacher(teacherId, payload),
    onSuccess: () => {
      toast.success("Password reset successfully");
      setResetOpen(false);
      setPasswordState({ password: "", confirmPassword: "" });
      void queryClient.invalidateQueries({ queryKey: ["teacher", teacherId] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const assignCoursesMutation = useMutation({
    mutationFn: (payload: FormData) => updateTeacher(teacherId, payload),
    onSuccess: () => {
      toast.success("Assigned courses updated");
      setCourseDialogOpen(false);
      setSelectedSubject(ALL_SUBJECTS);
      void queryClient.invalidateQueries({ queryKey: ["teacher", teacherId] });
      void queryClient.invalidateQueries({
        queryKey: ["teacher-overview", teacherId],
      });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const subjectTiles = useMemo(
    () => buildSubjectTiles(teacherQuery.data?.courses || []),
    [teacherQuery.data?.courses],
  );

  const activeSubject = selectedSubject;

  const overviewQuery = useQuery({
    queryKey: ["teacher-overview", teacherId, activeSubject, selectedYear],
    queryFn: () =>
      fetchTeacherOverview(teacherId, {
        subject: activeSubject,
        year: selectedYear,
        timePeriod: selectedYear,
      }),
    enabled: !!teacherId && teacherQuery.isSuccess,
    placeholderData: (previousData) => previousData,
  });

  const chartData = useMemo(
    () =>
      (overviewQuery.data?.monthlyTrend || []).map((item) => ({
        month: item.month,
        value: item.completed,
        avgQuizScore: item.avgQuizScore || 0,
      })),
    [overviewQuery.data],
  );

  const totalCompletedYear = useMemo(
    () => chartData.reduce((acc, curr) => acc + (curr.value || 0), 0),
    [chartData],
  );

  const peakMonth = useMemo(() => {
    if (!chartData.length) return null;
    let max = chartData[0];
    for (const item of chartData) {
      if ((item.value || 0) > (max.value || 0)) {
        max = item;
      }
    }
    return (max.value || 0) > 0 ? max : null;
  }, [chartData]);

  const activeMonthsCount = useMemo(
    () => chartData.filter((item) => (item.value || 0) > 0).length,
    [chartData],
  );

  if (teacherQuery.isLoading) return <LoadingState />;

  if (teacherQuery.isError || !teacherQuery.data) {
    return (
      <div className="rounded-xl border border-[#ffd6d6] bg-[#fff5f5] p-6 text-[#d53d3d]">
        {getApiErrorMessage(teacherQuery.error, "Unable to load teacher details")}
      </div>
    );
  }

  const teacher = teacherQuery.data;
  const activeSubjectStyle = subjectTiles.find(
    (item) => item.subject === activeSubject,
  );

  const handleResetPassword = () => {
    if (!passwordState.password || !passwordState.confirmPassword) {
      toast.error("Password and confirm password are required");
      return;
    }

    if (passwordState.password !== passwordState.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    const payload = new FormData();
    payload.append("password", passwordState.password);
    resetPasswordMutation.mutate(payload);
  };

  const handleOpenCourseDialog = () => {
    setSelectedCourseIds(teacher.courses.map((course) => course._id));
    setCourseDialogOpen(true);
  };

  const handleToggleCourse = (courseId: string) => {
    setSelectedCourseIds((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId],
    );
  };

  const handleSaveCourses = () => {
    const payload = new FormData();
    payload.append("courseIds", JSON.stringify(selectedCourseIds));
    assignCoursesMutation.mutate(payload);
  };

  return (
    <div className="space-y-4">
      <Card className="content-shell">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-[24px] font-semibold">Teacher Details</h1>
              <p className="mt-1 text-[16px] text-[#838383]">
                <Link href="/teachers" className="hover:underline">
                  Teacher Management
                </Link>{" "}
                &gt; Teacher Details
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setResetOpen(true)}
              className="gap-2"
            >
              <KeyRound className="h-4 w-4" />
              Reset Password
            </Button>
          </div>

          <div className="mt-4 rounded-xl border border-[#e2e7db] p-5">
            <p className="text-[20px] font-semibold text-[#1f1f1f]">
              School name:{" "}
              <span className="text-[#129b33]">{teacher.schoolName}</span>
            </p>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative h-20 w-20 overflow-hidden rounded-full border border-[#deead8] bg-[#d9e8d2]">
                {teacher.picture?.url ? (
                  <Image
                    src={teacher.picture.url}
                    alt={teacher.teacherName}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xl font-semibold text-[#2d5f2f]">
                    {getInitials(teacher.teacherName)}
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-[24px] font-semibold">{teacher.teacherName}</h2>
                <p className="text-[14px] text-[#666]">User ID: {teacher.userId}</p>
                <p className="text-[14px] text-[#666]">Password: ********</p>
                <p className="text-[14px] text-[#666]">
                  Grade Level: {teacher.gradeLevel}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[20px] font-semibold text-[#272727]">
                  Assign course
                </h3>
                <p className="text-[13px] text-[#8f8f8f]">
                  Assigned subjects for the teacher — select a tile to view its progress
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleOpenCourseDialog}
                className="gap-2"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {subjectTiles.map((subject) => {
                const Icon = subject.icon;
                const isSelected = subject.subject === activeSubject;
                return (
                  <button
                    key={subject.subject}
                    type="button"
                    onClick={() => setSelectedSubject(subject.subject)}
                    className="rounded-xl border p-4 text-center transition-shadow"
                    style={{
                      backgroundColor: subject.bg,
                      borderColor: isSelected ? subject.border : "#e2e7db",
                    }}
                  >
                    <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-white/60">
                      <Icon className="h-6 w-6" style={{ color: subject.text }} />
                    </div>
                    <p className="text-[13px] font-semibold" style={{ color: subject.text }}>
                      {subject.subject}
                    </p>
                  </button>
                );
              })}
              {subjectTiles.length === 0 && (
                <p className="text-[13px] text-[#8f8f8f]">
                  No subjects assigned yet. Click Edit to assign courses.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-[24px]">Assign Courses</DialogTitle>
            <DialogDescription>
              Select the subjects {teacher.teacherName} will teach. Multiple
              subjects can be selected.
            </DialogDescription>
          </DialogHeader>

          <div className="thin-scrollbar grid max-h-[260px] gap-2 overflow-y-auto pr-2">
            {coursesQuery.isLoading && (
              <p className="text-sm text-[#8f8f8f]">Loading courses…</p>
            )}
            {coursesQuery.isError && (
              <p className="text-sm text-[#d53d3d]">
                {getApiErrorMessage(coursesQuery.error, "Unable to load courses")}
              </p>
            )}
            {(coursesQuery.data || []).map((course) => (
              <label
                key={course._id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#e2e7db] p-3 text-sm"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={selectedCourseIds.includes(course._id)}
                  onChange={() => handleToggleCourse(course._id)}
                />
                {course.name}
              </label>
            ))}
            {coursesQuery.isSuccess && coursesQuery.data.length === 0 && (
              <p className="text-sm text-[#8f8f8f]">No active courses available.</p>
            )}
          </div>

          <DialogFooter className="grid grid-cols-2 gap-3 sm:grid-cols-2">
            <Button variant="secondary" onClick={() => setCourseDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveCourses}
              disabled={assignCoursesMutation.isPending}
            >
              {assignCoursesMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={resetOpen}
        onOpenChange={(open) => {
          setResetOpen(open);
          if (!open) {
            setPasswordState({ password: "", confirmPassword: "" });
          }
        }}
      >
        <DialogContent className="max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="text-[24px]">Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {teacher.teacherName}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <PasswordInput
                value={passwordState.password}
                onChange={(event) =>
                  setPasswordState((prev) => ({
                    ...prev,
                    password: event.target.value,
                  }))
                }
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <PasswordInput
                value={passwordState.confirmPassword}
                onChange={(event) =>
                  setPasswordState((prev) => ({
                    ...prev,
                    confirmPassword: event.target.value,
                  }))
                }
                placeholder="Confirm new password"
              />
            </div>
          </div>

          <DialogFooter className="grid grid-cols-2 gap-3 sm:grid-cols-2">
            <Button variant="secondary" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="content-shell">
        <CardContent className="p-5">
          {/* Header */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-[22px] font-bold text-[#1a1a1a]">
                Subject completion Overview
              </h2>
              <p className="mt-1 text-sm text-[#7a7a7a]">
                Monthly completion analytics from Jan to Dec ({selectedYear})
              </p>
            </div>

            <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
              {/* Chart Mode Switcher: Bar vs Area */}
              <div className="inline-flex rounded-lg border border-[#d9e3d4] bg-[#f7faf5] p-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => setChartType("bar")}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                    chartType === "bar"
                      ? "bg-white text-[#15803d] shadow-xs ring-1 ring-black/5"
                      : "text-[#6b7280] hover:text-[#1a1a1a]"
                  }`}
                >
                  <BarChart2 className="h-3.5 w-3.5" />
                  Bar Chart
                </button>
                <button
                  type="button"
                  onClick={() => setChartType("area")}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                    chartType === "area"
                      ? "bg-white text-[#15803d] shadow-xs ring-1 ring-black/5"
                      : "text-[#6b7280] hover:text-[#1a1a1a]"
                  }`}
                >
                  <AreaChartIcon className="h-3.5 w-3.5" />
                  Area Chart
                </button>
              </div>

              {/* Year Selector */}
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-10 rounded-lg border-0 bg-[linear-gradient(180deg,#00B023_0%,#078522_100%)] px-3 text-sm font-medium text-white shadow-xs transition-shadow hover:shadow-md focus:ring-2 focus:ring-[#72d486] focus:ring-offset-2 sm:w-[120px] [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  className="border-[#b9d7b5]"
                  viewportClassName="h-auto max-h-72"
                >
                  {YEAR_OPTIONS.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Subject Selector */}
              <Select
                value={activeSubject}
                onValueChange={setSelectedSubject}
              >
                <SelectTrigger className="h-10 rounded-lg border-0 bg-[linear-gradient(180deg,#00B023_0%,#078522_100%)] px-4 text-sm font-medium text-white shadow-xs transition-shadow hover:shadow-md focus:ring-2 focus:ring-[#72d486] focus:ring-offset-2 sm:w-[220px] [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-white">
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent
                  className="border-[#b9d7b5]"
                  viewportClassName="h-auto max-h-72"
                >
                  <SelectItem value={ALL_SUBJECTS}>All Subjects</SelectItem>
                  {subjectTiles.map((subject) => (
                    <SelectItem key={subject.subject} value={subject.subject}>
                      {subject.subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-[#e4ece0] bg-white p-3 shadow-xs">
              <span className="text-xs text-[#71717a]">Total Completed ({selectedYear})</span>
              <p className="text-lg font-bold text-[#1a1a1a]">
                {totalCompletedYear.toLocaleString("en-US")}
              </p>
            </div>
            <div className="rounded-xl border border-[#e4ece0] bg-white p-3 shadow-xs">
              <span className="text-xs text-[#71717a]">Peak Month</span>
              <p className="text-lg font-bold text-[#15803d]">
                {peakMonth ? `${peakMonth.month} (${peakMonth.value.toLocaleString("en-US")})` : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-[#e4ece0] bg-white p-3 shadow-xs">
              <span className="text-xs text-[#71717a]">Active Months</span>
              <p className="text-lg font-bold text-[#1a1a1a]">
                {activeMonthsCount} / 12
              </p>
            </div>
            <div className="rounded-xl border border-[#e4ece0] bg-white p-3 shadow-xs">
              <span className="text-xs text-[#71717a]">Filtered Subject</span>
              <p className="truncate text-lg font-bold" style={{ color: activeSubjectStyle?.text || "#15803d" }}>
                {activeSubject === ALL_SUBJECTS ? "All Subjects" : activeSubject}
              </p>
            </div>
          </div>

          {/* Chart Container */}
          <div className="h-[340px] rounded-xl border border-[#dce8d5] bg-[#f9fdf8] p-3">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              {chartType === "bar" ? (
                <BarChart data={chartData} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="teacherBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16a34a" />
                      <stop offset="100%" stopColor="#22c55e" />
                    </linearGradient>
                    <linearGradient id="teacherBarPeakGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0d9488" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2ece0" />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={{ stroke: "#dce8d5" }}
                    tick={{ fill: "#52525b", fontSize: 12, fontWeight: 500 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#71717a", fontSize: 12 }}
                    allowDecimals={false}
                    tickFormatter={(val) => Number(val).toLocaleString("en-US")}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(34, 197, 94, 0.08)", radius: 6 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-[#bbf7d0] bg-white p-3 shadow-lg">
                            <p className="text-xs font-semibold uppercase tracking-wider text-[#15803d]">
                              {item.month} {selectedYear}
                            </p>
                            <p className="mt-1 text-base font-bold text-[#1a1a1a]">
                              {item.value.toLocaleString("en-US")}{" "}
                              <span className="text-xs font-normal text-muted-foreground">
                                completed
                              </span>
                            </p>
                            {item.avgQuizScore > 0 && (
                              <p className="mt-0.5 text-xs text-[#71717a]">
                                Avg Quiz Score: {item.avgQuizScore}%
                              </p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="value"
                    name="Activities completed"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                  >
                    {chartData.map((entry) => {
                      const isPeak = peakMonth && peakMonth.month === entry.month && entry.value > 0;
                      return (
                        <Cell
                          key={entry.month}
                          fill={isPeak ? "url(#teacherBarPeakGrad)" : "url(#teacherBarGrad)"}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              ) : (
                <AreaChart data={chartData} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="teacherAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2ece0" />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={{ stroke: "#dce8d5" }}
                    tick={{ fill: "#52525b", fontSize: 12, fontWeight: 500 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#71717a", fontSize: 12 }}
                    allowDecimals={false}
                    tickFormatter={(val) => Number(val).toLocaleString("en-US")}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-[#bbf7d0] bg-white p-3 shadow-lg">
                            <p className="text-xs font-semibold uppercase tracking-wider text-[#15803d]">
                              {item.month} {selectedYear}
                            </p>
                            <p className="mt-1 text-base font-bold text-[#1a1a1a]">
                              {item.value.toLocaleString("en-US")}{" "}
                              <span className="text-xs font-normal text-muted-foreground">
                                completed
                              </span>
                            </p>
                            {item.avgQuizScore > 0 && (
                              <p className="mt-0.5 text-xs text-[#71717a]">
                                Avg Quiz Score: {item.avgQuizScore}%
                              </p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="Activities completed"
                    stroke="#16a34a"
                    strokeWidth={3}
                    fill="url(#teacherAreaGrad)"
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Monthly Breakdown Grid (Jan to Dec per month data display) */}
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#52525b]">
                Monthly Breakdown (Jan – Dec {selectedYear})
              </span>
              <span className="text-xs text-[#71717a]">
                {activeMonthsCount > 0
                  ? `${activeMonthsCount} of 12 months with activity`
                  : "No completions recorded in this period"}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
              {chartData.map((item) => {
                const hasData = (item.value || 0) > 0;
                const isPeak = peakMonth && peakMonth.month === item.month && hasData;
                return (
                  <div
                    key={item.month}
                    className={`relative flex flex-col items-center justify-center rounded-xl border p-2 text-center transition-all ${
                      isPeak
                        ? "border-[#16a34a] bg-[#eaf8ea] shadow-xs ring-1 ring-[#16a34a]"
                        : hasData
                        ? "border-[#bbf7d0] bg-[#f0fdf4] hover:border-[#86efac]"
                        : "border-[#e9ece6] bg-[#fafbfa]"
                    }`}
                  >
                    <span
                      className={`text-[12px] font-semibold ${
                        hasData ? "text-[#166534]" : "text-[#71717a]"
                      }`}
                    >
                      {item.month}
                    </span>
                    <span
                      className={`mt-0.5 text-[14px] font-bold ${
                        isPeak
                          ? "text-[#15803d]"
                          : hasData
                          ? "text-[#16a34a]"
                          : "text-[#a1a1aa]"
                      }`}
                    >
                      {item.value.toLocaleString("en-US")}
                    </span>
                    {isPeak && (
                      <span className="mt-0.5 rounded-full bg-[#16a34a] px-1 py-[1px] text-[8px] font-bold uppercase tracking-wider text-white">
                        Peak
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-3 flex items-center justify-between text-sm text-[#6f6f6f]">
            <p>
              Active Subject:{" "}
              <span
                className="font-semibold"
                style={{ color: activeSubjectStyle?.text }}
              >
                {activeSubject === ALL_SUBJECTS ? "All Subjects" : activeSubject}
              </span>
            </p>
            {overviewQuery.isFetching && (
              <span className="inline-flex items-center gap-1.5 text-xs text-[#0b9f2f]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Updating...
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-72 rounded-xl" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}
