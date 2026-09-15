"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchStudentById, getApiErrorMessage, updateStudent } from "@/lib/api";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const DEFAULT_SUBJECT = "ALL";
const DEFAULT_TIME_PERIOD = "Past Year";

const normalizeText = (value: string) =>
  value.trim().toLowerCase().replace(/&/g, "and").replace(/\s+/g, " ");

const getInitials = (value: string) => {
  const names = value.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (names.length === 0) return "ST";
  if (names.length === 1) return names[0].slice(0, 2).toUpperCase();
  return `${names[0][0]}${names[1][0]}`.toUpperCase();
};

const formatScore = (value: number | null) =>
  value === null || value === undefined ? "-----" : `${Number(value.toFixed(1))}%`;

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

const getSubjectColor = (subject: string) => {
  const normalized = normalizeText(subject);
  if (normalized.includes("english")) return "#b729c8";
  if (normalized.includes("science")) return "#7c3aed";
  if (normalized.includes("math")) return "#2563eb";
  if (normalized.includes("social")) return "#ea580c";
  if (normalized.includes("religious") || normalized.includes("moral")) {
    return "#49b955";
  }
  return "#129b33";
};

const getLessonLabel = (lesson: {
  strand?: string;
  subStrand?: string;
  lessonNumber?: string;
  title?: string;
}) =>
  [lesson.strand, lesson.subStrand, lesson.title].filter(Boolean).join(" / ") ||
  lesson.lessonNumber ||
  "-";

export default function StudentDetailsPage() {
  const params = useParams<{ studentId: string }>();
  const studentId = params.studentId;
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [timePeriod, setTimePeriod] = useState(DEFAULT_TIME_PERIOD);
  const [resetOpen, setResetOpen] = useState(false);
  const [passwordState, setPasswordState] = useState({
    password: "",
    confirmPassword: "",
  });

  const studentQuery = useQuery({
    queryKey: ["student", studentId, subject, timePeriod],
    queryFn: () =>
      fetchStudentById(studentId, {
        gradeLevel: "ALL",
        subject,
        timePeriod,
      }),
    enabled: !!studentId,
    placeholderData: (previousData) => previousData,
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (payload: FormData) => updateStudent(studentId, payload),
    onSuccess: () => {
      toast.success("Password reset successfully");
      setResetOpen(false);
      setPasswordState({ password: "", confirmPassword: "" });
      void queryClient.invalidateQueries({ queryKey: ["student", studentId] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  if (studentQuery.isLoading) return <LoadingState />;

  if (studentQuery.isError || !studentQuery.data) {
    return (
      <div className="rounded-xl border border-[#ffd6d6] bg-[#fff5f5] p-6 text-[#d53d3d]">
        {getApiErrorMessage(studentQuery.error, "Unable to load student details")}
      </div>
    );
  }

  const { student, filters, overview } = studentQuery.data;
  const studentNamePrefix = (student.studentName || "Student").split(" ")[0];
  const sectionTitle =
    subject === DEFAULT_SUBJECT
      ? "All Subjects"
      : overview.courseWiseOverview[0]?.subject || subject;

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

  return (
    <div className="space-y-4">
      <Card className="content-shell">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-[24px] font-semibold">Student Overview</h1>
              <p className="mt-1 text-[16px] text-[#838383]">
                <Link href="/students" className="hover:underline">
                  Student Management
                </Link>{" "}
                &gt; Student Overview
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
              School name: <span className="text-[#129b33]">{student.schoolName}</span>
            </p>
            <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full bg-[#dcebe0]">
                {student.picture?.url ? (
                  <Image
                    src={student.picture.url}
                    alt={student.studentName}
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-2xl font-semibold text-[#119d36]">
                    {getInitials(student.studentName)}
                  </span>
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[26px] font-semibold">{student.studentName}</h2>
                  <span className="rounded-full border border-[#a8e4b8] px-3 py-0.5 text-xs font-medium capitalize text-[#14983a]">
                    {student.status} student
                  </span>
                </div>
                <p className="mt-2 text-[16px] text-[#555]">User ID: {student.userId}</p>
                <p className="mt-1 text-[16px] text-[#555]">
                  Grade Level: {student.gradeLevel}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-[24px] font-medium text-[#263650]">
                  {studentNamePrefix}&apos;s Progress Sheet
                </h3>
                <p className="mt-1 text-[14px] text-[#8f8f8f]">
                  Select subject and see the progress
                </p>
              </div>
              <Select value={timePeriod} onValueChange={setTimePeriod}>
                <SelectTrigger className="h-10 w-full border-0 bg-[#079d2d] text-sm text-white sm:w-[160px] [&_svg]:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filters.timePeriods.map((period) => (
                    <SelectItem key={period} value={period}>
                      {period}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="h-12 w-full border-0 bg-[#079d2d] text-white sm:w-[260px] [&_svg]:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filters.subjects.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {studentQuery.isFetching && <Loader2 className="h-5 w-5 animate-spin text-[#079d2d]" />}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="content-shell">
        <CardContent className="p-5 sm:p-7">
          <h3 className="text-center text-[26px] font-semibold text-[#49b955]">
            {sectionTitle}
          </h3>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Activity Count"
              value={String(overview.summary.activityCount)}
              background="#d6f4ff"
              color="#017aa8"
            />
            <MetricCard
              label="Avg. Daily Hours"
              value={overview.summary.avgDailyHours.toFixed(2)}
              background="#ffeef0"
              color="#532d34"
            />
            <MetricCard
              label="Total Hours"
              value={overview.summary.totalHours.toFixed(1)}
              background="#dffbc9"
              color="#173a21"
            />
            <MetricCard
              label="Avg. Quiz Score"
              value={`${Number(overview.summary.avgQuizScore.toFixed(1))}/100`}
              background="#ffdda0"
              color="#3f311f"
            />
          </div>

          <TrendChart
            title="Average Daily Time Spent"
            data={overview.monthlyActivity.months}
            dataKey="avgDailyHours"
            legend="Avg. Daily Hours"
            color="#ffa1aa"
            domain={[0, 12]}
            ticks={[0, 4, 8, 12]}
          />

          <TrendChart
            title="Average Monthly Scores"
            data={overview.monthlyActivity.months}
            dataKey="avgQuizScore"
            legend="Avg. Quiz Score"
            color="#ffc969"
            domain={[0, 100]}
            ticks={[0, 20, 40, 60, 80, 100]}
          />
        </CardContent>
      </Card>

      <Card className="content-shell">
        <CardContent className="p-5 sm:p-7">
          <h3 className="text-[26px] font-semibold">Most Recent Activity</h3>
          <p className="mt-2 text-[14px] text-[#555]">
            Recent lesson activity completed across subjects.
          </p>
          <div className="mt-5 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Practice Score</TableHead>
                  <TableHead>Quiz Score</TableHead>
                  <TableHead className="min-w-[280px]">Lesson</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.recentWork.length === 0 ? (
                  <EmptyRow colSpan={5} message="No recent activity found" />
                ) : (
                  overview.recentWork.map((item, index) => (
                    <TableRow key={`${item.subject}-${item.date}-${index}`}>
                      <TableCell
                        className="font-medium"
                        style={{ color: getSubjectColor(item.subject) }}
                      >
                        {item.subject}
                      </TableCell>
                      <TableCell>{formatScore(item.practiceScore)}</TableCell>
                      <TableCell>{formatScore(item.quizScore)}</TableCell>
                      <TableCell className="max-w-[360px] whitespace-normal leading-5">
                        {getLessonLabel(item.lesson)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(item.date)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="content-shell">
        <CardContent className="p-5 sm:p-7">
          <h3 className="text-[26px] font-semibold">Quiz Scores Table</h3>
          <div className="mt-5 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subjects</TableHead>
                  <TableHead>Average Latest Attempt Quiz Scores</TableHead>
                  <TableHead>Average First Attempt Quiz Scores</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.quizScoreTable.length === 0 ? (
                  <EmptyRow colSpan={3} message="No quiz scores found" />
                ) : (
                  overview.quizScoreTable.map((item) => (
                    <TableRow key={item.subject}>
                      <TableCell
                        className="font-medium"
                        style={{ color: getSubjectColor(item.subject) }}
                      >
                        {item.subject}
                      </TableCell>
                      <TableCell>{formatScore(item.avgLatestAttempt)}</TableCell>
                      <TableCell>{formatScore(item.avgFirstAttempt)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={resetOpen}
        onOpenChange={(open) => {
          setResetOpen(open);
          if (!open) setPasswordState({ password: "", confirmPassword: "" });
        }}
      >
        <DialogContent className="max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="text-[24px]">Reset Password</DialogTitle>
            <DialogDescription>Set a new password for {student.studentName}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <PasswordInput
                value={passwordState.password}
                onChange={(event) =>
                  setPasswordState((previous) => ({
                    ...previous,
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
                  setPasswordState((previous) => ({
                    ...previous,
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
    </div>
  );
}

function MetricCard({
  label,
  value,
  background,
  color,
}: {
  label: string;
  value: string;
  background: string;
  color: string;
}) {
  return (
    <div className="rounded-lg px-3 py-5 text-center" style={{ backgroundColor: background }}>
      <p className="text-[15px] text-[#2f2f2f]">{label}</p>
      <p className="mt-1 text-[27px] font-medium" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function TrendChart({
  title,
  data,
  dataKey,
  legend,
  color,
  domain,
  ticks,
}: {
  title: string;
  data: Array<{ label: string; avgDailyHours: number; avgQuizScore: number }>;
  dataKey: "avgDailyHours" | "avgQuizScore";
  legend: string;
  color: string;
  domain: [number, number];
  ticks: number[];
}) {
  return (
    <section className="mt-8">
      <h4 className="text-center text-[22px] font-semibold">{title}</h4>
      <div className="mt-4 h-[330px] rounded-xl border border-[#e2e7db] p-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="#dfe5dc" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis domain={domain} ticks={ticks} tickLine={false} axisLine={false} />
            <Tooltip />
            <Legend verticalAlign="bottom" />
            <Line
              type="monotone"
              dataKey={dataKey}
              name={legend}
              stroke={color}
              strokeWidth={3}
              dot={{ r: 6, fill: color, stroke: "#fff", strokeWidth: 2 }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-10 text-center text-[#858585]">
        {message}
      </TableCell>
    </TableRow>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-72 rounded-xl" />
      <Skeleton className="h-[760px] rounded-xl" />
      <Skeleton className="h-80 rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}
