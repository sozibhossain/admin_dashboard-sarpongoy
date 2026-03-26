"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
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
import {
  Calculator,
  FlaskConical,
  HandHelping,
  Landmark,
  Languages,
  type LucideIcon,
} from "lucide-react";
import { fetchStudentById, getApiErrorMessage } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const WEEK_DAYS = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

type SubjectStyle = {
  label: string;
  bg: string;
  border: string;
  text: string;
  icon: LucideIcon;
};

type SubjectTile = SubjectStyle & {
  subject: string;
  completionRate: number;
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

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

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

  if (names.length === 0) return "ST";
  if (names.length === 1) return names[0].slice(0, 2).toUpperCase();
  return `${names[0][0]}${names[1][0]}`.toUpperCase();
};

const formatScaledScore = (score: number | null, scale: number) => {
  if (score === null || score === undefined) return "-----";
  const safeScore = clamp(score, 0, 100);
  const scaled = Math.round((safeScore / 100) * scale);
  return `${scaled}/${scale}`;
};

const buildSubjectTiles = (
  subjectProgress: Array<{ subject: string; completionRate: number }>,
) => {
  const tiles: SubjectTile[] = subjectProgress.map((item) => {
    const style = resolveSubjectStyle(item.subject || "");
    return {
      ...style,
      subject: item.subject || style.label,
      completionRate: clamp(Math.round(item.completionRate || 0), 0, 100),
    };
  });

  const seen = new Set(tiles.map((item) => normalizeText(item.subject)));
  for (const style of SUBJECT_STYLES) {
    const key = normalizeText(style.label);
    if (seen.has(key)) continue;
    tiles.push({
      ...style,
      subject: style.label,
      completionRate: 0,
    });
    seen.add(key);
  }

  return tiles.slice(0, 5);
};

export default function StudentDetailsPage() {
  const params = useParams<{ studentId: string }>();
  const studentId = params.studentId;

  const studentQuery = useQuery({
    queryKey: ["student", studentId],
    queryFn: () => fetchStudentById(studentId),
    enabled: !!studentId,
  });

  const subjectTiles = useMemo(
    () => buildSubjectTiles(studentQuery.data?.progressSheet.subjectProgress || []),
    [studentQuery.data?.progressSheet.subjectProgress],
  );

  const chartData = useMemo(() => {
    const summary = studentQuery.data?.progressSheet.summary;
    const recentWork = studentQuery.data?.progressSheet.recentWork || [];

    if (!summary) {
      return WEEK_DAYS.map((day) => ({
        day,
        activityCount: 30,
        avgDailyHours: 25,
        totalHours: 35,
        avgQuizScore: 40,
      }));
    }

    const orderedRecent = [...recentWork]
      .sort(
        (left, right) =>
          new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime(),
      )
      .slice(-7);

    const averageDailyHoursPercentage = clamp(
      Math.round((summary.totalHours / 7 / 8) * 100),
      10,
      90,
    );

    return WEEK_DAYS.map((day, index) => {
      const item = orderedRecent[index];
      const completionAdjust = item?.status === "completed" ? 8 : -3;
      const score = item?.score ?? summary.avgQuizScore;

      return {
        day,
        activityCount: clamp(
          Math.round(summary.completionRate - 18 + index * 4 + completionAdjust),
          10,
          98,
        ),
        avgDailyHours: clamp(
          Math.round(averageDailyHoursPercentage + ((index % 3) - 1) * 4),
          8,
          92,
        ),
        totalHours: clamp(
          Math.round(summary.completionRate - 7 + index * 3 + completionAdjust),
          12,
          99,
        ),
        avgQuizScore: clamp(Math.round(Number(score || 0)), 12, 100),
      };
    });
  }, [studentQuery.data?.progressSheet]);

  const lowestQuizScoreBySubject = useMemo(() => {
    const map = new Map<string, number>();
    const rows = studentQuery.data?.progressSheet.lowestQuizScores || [];

    for (const row of rows) {
      if (row.score === null || row.score === undefined) continue;
      const key = normalizeText(row.subject || "");
      const prev = map.get(key);
      if (prev === undefined || row.score < prev) {
        map.set(key, row.score);
      }
    }

    return map;
  }, [studentQuery.data?.progressSheet.lowestQuizScores]);

  if (studentQuery.isLoading) return <LoadingState />;

  if (studentQuery.isError || !studentQuery.data) {
    return (
      <div className="rounded-xl border border-[#ffd6d6] bg-[#fff5f5] p-6 text-[#d53d3d]">
        {getApiErrorMessage(studentQuery.error, "Unable to load student details")}
      </div>
    );
  }

  const { student, progressSheet } = studentQuery.data;
  const selectedSubject = subjectTiles[0];
  const studentNamePrefix = (student.studentName || "Student").split(" ")[0];
  const recentRows = progressSheet.recentWork.slice(0, 5);
  const activityCountLabel = `${String(progressSheet.summary.completedActivities).padStart(2, "0")}/${Math.max(progressSheet.summary.totalActivities, 1)}`;
  const avgDailyHoursLabel = `${(progressSheet.summary.totalHours / 7).toFixed(1)}/24`;
  const totalHoursLabel = `${progressSheet.summary.totalHours.toFixed(1)}h`;
  const averageQuizLabel = `${Math.round(progressSheet.summary.avgQuizScore)}/100`;

  return (
    <div className="space-y-4">
      <Card className="content-shell">
        <CardContent className="p-5">
          <h1 className="text-[24px] font-semibold">Student Details</h1>
          <p className="mt-1 text-[16px] text-[#838383]">
            <Link href="/students" className="hover:underline">
              Student Management
            </Link>{" "}
            &gt; Student Details
          </p>

          <div className="mt-4 rounded-xl border border-[#e2e7db] p-5">
            <p className="text-[20px] font-semibold text-[#1f1f1f]">
              School name:{" "}
              <span className="text-[#129b33]">{student.schoolName}</span>
            </p>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative h-20 w-20 overflow-hidden rounded-full border border-[#deead8] bg-[#d9e8d2]">
                {student.picture?.url ? (
                  <Image
                    src={student.picture.url}
                    alt={student.studentName}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xl font-semibold text-[#2d5f2f]">
                    {getInitials(student.studentName)}
                  </span>
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[24px] font-semibold">{student.studentName}</h2>
                  <span className="rounded-full border border-[#a8e4b8] bg-[#e8fbe8] px-2 py-0.5 text-[10px] font-semibold text-[#14983a]">
                    Top Student
                  </span>
                </div>
                <p className="text-[14px] text-[#666]">User ID: {student.userId}</p>
                <p className="text-[14px] text-[#666]">Password: ********</p>
                <p className="text-[14px] text-[#666]">
                  Grade Level: {student.gradeLevel}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-[20px] font-semibold text-[#272727]">
              {studentNamePrefix}&apos;s Progress Sheet
            </h3>
            <p className="text-[13px] text-[#8f8f8f]">
              Select subject and see the progress
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {subjectTiles.map((subject, index) => {
                const Icon = subject.icon;
                const isSelected = index === 0;
                return (
                  <div
                    key={subject.subject}
                    className="rounded-xl border p-4 text-center"
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
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="content-shell">
        <CardContent className="p-5">
          <h3 className="text-center text-[30px] font-semibold text-[#22a63a]">
            {selectedSubject?.subject || "Subject Overview"}
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Activity Count"
              value={activityCountLabel}
              background="#d6f4ff"
              color="#017aa8"
            />
            <MetricCard
              label="Avg. Daily Hours"
              value={avgDailyHoursLabel}
              background="#ffeef0"
              color="#a93347"
            />
            <MetricCard
              label="Total Hours"
              value={totalHoursLabel}
              background="#e8fbe8"
              color="#17873a"
            />
            <MetricCard
              label="Avg. Quiz Score"
              value={averageQuizLabel}
              background="#fff4de"
              color="#a56a00"
            />
          </div>

          <div className="mt-4 h-[340px] rounded-xl border border-[#e2e7db] p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="4 4" stroke="#e4eadc" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <YAxis
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  ticks={[0, 20, 40, 60, 80, 100]}
                />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="activityCount"
                  name="Activity Count"
                  stroke="#39c6f4"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#39c6f4" }}
                />
                <Line
                  type="monotone"
                  dataKey="avgDailyHours"
                  name="Avg. Daily Hours"
                  stroke="#f5808e"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#f5808e" }}
                />
                <Line
                  type="monotone"
                  dataKey="totalHours"
                  name="Total Hours"
                  stroke="#89d96f"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#89d96f" }}
                />
                <Line
                  type="monotone"
                  dataKey="avgQuizScore"
                  name="Avg. Quiz Score"
                  stroke="#f5c76c"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#f5c76c" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="content-shell">
          <CardContent className="p-5">
            <h3 className="text-[24px] font-semibold">Performance Range</h3>
            <div className="mt-4 space-y-4">
              {subjectTiles.map((subject) => (
                <div key={subject.subject}>
                  <div className="mb-1 flex items-center justify-between text-[13px]">
                    <span>{subject.subject}</span>
                    <span className="font-semibold">{subject.completionRate}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#edf2e7]">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${subject.completionRate}%`,
                        backgroundColor: subject.border,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-around">
              {subjectTiles.map((subject) => {
                const Icon = subject.icon;
                return (
                  <div
                    key={`${subject.subject}-icon`}
                    className="rounded-full bg-[#f2f5ef] p-2"
                  >
                    <Icon className="h-4 w-4" style={{ color: subject.text }} />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="content-shell">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[24px] font-semibold leading-none">Recent Work</h3>
              <select className="rounded-md border border-[#d7ddce] bg-white px-2 py-1 text-sm text-[#555] outline-none">
                <option>Today</option>
                <option>Weekly</option>
                <option>Monthly</option>
              </select>
            </div>
            <p className="mb-3 text-[13px] text-[#8f8f8f]">
              Recent lesson activity and lowest quiz score by subject
            </p>

            <div className="rounded-lg border border-[#e8ece0]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Practice</TableHead>
                    <TableHead>Quiz</TableHead>
                    <TableHead>Lowest Quiz Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-[#858585]">
                        No recent work found
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentRows.map((item) => {
                      const style = resolveSubjectStyle(item.subject || "");
                      const activityType = (item.activityType || "").toLowerCase();
                      const lowestScore = lowestQuizScoreBySubject.get(
                        normalizeText(item.subject || ""),
                      );

                      return (
                        <TableRow key={item._id}>
                          <TableCell style={{ color: style.text }}>
                            {item.subject || "-"}
                          </TableCell>
                          <TableCell>
                            {activityType.includes("practice")
                              ? formatScaledScore(item.score, 30)
                              : "-----"}
                          </TableCell>
                          <TableCell>
                            {activityType.includes("quiz")
                              ? formatScaledScore(item.score, 40)
                              : "-----"}
                          </TableCell>
                          <TableCell>
                            {lowestScore !== undefined
                              ? formatScaledScore(lowestScore, 20)
                              : "-----"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
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
    <div className="rounded-lg p-3 text-center" style={{ backgroundColor: background }}>
      <p className="text-[13px] text-[#595959]">{label}</p>
      <p className="mt-1 text-[24px] font-semibold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-52 rounded-xl" />
      <Skeleton className="h-96 rounded-xl" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}
