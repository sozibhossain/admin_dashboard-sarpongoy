"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
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
import { fetchTeacherById, getApiErrorMessage } from "@/lib/api";
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

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
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

  if (names.length === 0) return "TR";
  if (names.length === 1) return names[0].slice(0, 2).toUpperCase();
  return `${names[0][0]}${names[1][0]}`.toUpperCase();
};

const buildSubjectTiles = (courses: Array<{ _id: string; name: string }>) => {
  const fallbackRates = [95, 86, 70, 60, 52];
  const tiles: SubjectTile[] = courses.map((course, index) => {
    const style = resolveSubjectStyle(course.name || "");
    return {
      ...style,
      subject: course.name || style.label,
      completionRate: clamp(92 - index * 9, 40, 98),
    };
  });

  const seen = new Set(tiles.map((item) => normalizeText(item.subject)));
  for (let index = 0; index < SUBJECT_STYLES.length; index += 1) {
    const style = SUBJECT_STYLES[index];
    const key = normalizeText(style.label);
    if (seen.has(key)) continue;
    tiles.push({
      ...style,
      subject: style.label,
      completionRate: fallbackRates[index],
    });
    seen.add(key);
  }

  return tiles.slice(0, 5);
};

export default function TeacherDetailsPage() {
  const params = useParams<{ teacherId: string }>();
  const teacherId = params.teacherId;

  const teacherQuery = useQuery({
    queryKey: ["teacher", teacherId],
    queryFn: () => fetchTeacherById(teacherId),
    enabled: !!teacherId,
  });

  const subjectTiles = useMemo(
    () => buildSubjectTiles(teacherQuery.data?.courses || []),
    [teacherQuery.data?.courses],
  );

  const chartData = useMemo(() => {
    const primaryRate = subjectTiles[0]?.completionRate || 75;
    return MONTHS.map((month, index) => ({
      month,
      value: Math.round(
        780 + primaryRate * 8 + index * 95 + Math.sin(index / 1.8) * 170,
      ),
    }));
  }, [subjectTiles]);

  if (teacherQuery.isLoading) return <LoadingState />;

  if (teacherQuery.isError || !teacherQuery.data) {
    return (
      <div className="rounded-xl border border-[#ffd6d6] bg-[#fff5f5] p-6 text-[#d53d3d]">
        {getApiErrorMessage(teacherQuery.error, "Unable to load teacher details")}
      </div>
    );
  }

  const teacher = teacherQuery.data;
  const selectedSubject = subjectTiles[0];

  return (
    <div className="space-y-4">
      <Card className="content-shell">
        <CardContent className="p-5">
          <h1 className="text-[24px] font-semibold">Teacher Details</h1>
          <p className="mt-1 text-[16px] text-[#838383]">
            <Link href="/teachers" className="hover:underline">
              Teacher Management
            </Link>{" "}
            &gt; Teacher Details
          </p>

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
            <h3 className="text-[20px] font-semibold text-[#272727]">Assign course</h3>
            <p className="text-[13px] text-[#8f8f8f]">
              Assigned subjects for the teacher
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {subjectTiles.map((subject) => {
                const Icon = subject.icon;
                return (
                  <div
                    key={`${subject.subject}-top`}
                    className="rounded-xl border p-4 text-center"
                    style={{
                      backgroundColor: subject.bg,
                      borderColor: "#e2e7db",
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

          <div className="mt-5">
            <h3 className="text-[20px] font-semibold text-[#272727]">Assign course</h3>
            <p className="text-[13px] text-[#8f8f8f]">
              Select subject and see the progress
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {subjectTiles.map((subject, index) => {
                const Icon = subject.icon;
                const isSelected = index === 0;
                return (
                  <div
                    key={`${subject.subject}-bottom`}
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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[24px] font-semibold leading-none">
              Subject completion Overview
            </h2>
            <select className="rounded-md bg-[linear-gradient(180deg,#00B023_0%,#077A1E_91.46%)] px-3 py-1 text-sm text-white outline-none">
              {subjectTiles.map((subject) => (
                <option key={subject.subject} value={subject.subject}>
                  {subject.subject}
                </option>
              ))}
            </select>
          </div>

          <div className="h-[380px] rounded-xl border border-[#dce8d5] bg-[#f4fdf2] p-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="teacherOverview" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#39b54a" stopOpacity={0.75} />
                    <stop offset="100%" stopColor="#39b54a" stopOpacity={0.15} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#cfe1c8" />
                <XAxis dataKey="month" tickLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#0b9f2f"
                  strokeWidth={3}
                  fill="url(#teacherOverview)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <p className="mt-3 text-sm text-[#6f6f6f]">
            Active Subject:{" "}
            <span className="font-semibold" style={{ color: selectedSubject?.text }}>
              {selectedSubject?.subject || "English"}
            </span>
          </p>
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
              Recent lesson activity and completion summary
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
                  {subjectTiles.map((subject) => {
                    const practice = `${clamp(
                      Math.round(16 + subject.completionRate * 0.14),
                      8,
                      30,
                    )}/30`;
                    const quiz = `${clamp(
                      Math.round(20 + subject.completionRate * 0.2),
                      8,
                      40,
                    )}/40`;
                    const lowest = `${clamp(
                      Math.round(8 + subject.completionRate * 0.12),
                      4,
                      20,
                    )}/20`;

                    return (
                      <TableRow key={subject.subject}>
                        <TableCell style={{ color: subject.text }}>
                          {subject.subject}
                        </TableCell>
                        <TableCell>{practice}</TableCell>
                        <TableCell>{quiz}</TableCell>
                        <TableCell>{lowest}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-72 rounded-xl" />
      <Skeleton className="h-96 rounded-xl" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}
