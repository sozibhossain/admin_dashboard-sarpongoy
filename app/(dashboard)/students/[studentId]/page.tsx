"use client";

import { useMemo } from "react";
import Link from "next/link";
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
import { fetchStudentById, getApiErrorMessage } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const subjectColors = ["#4a96ff", "#20a768", "#8d57f6", "#fd8f2f", "#f0bf2a"];

export default function StudentDetailsPage() {
  const params = useParams<{ studentId: string }>();
  const studentId = params.studentId;

  const studentQuery = useQuery({
    queryKey: ["student", studentId],
    queryFn: () => fetchStudentById(studentId),
    enabled: !!studentId,
  });

  const chartData = useMemo(() => {
    const recent = studentQuery.data?.progressSheet.recentWork || [];
    if (recent.length === 0) {
      return [
        { day: "Sat", activity: 20, score: 30 },
        { day: "Sun", activity: 25, score: 35 },
        { day: "Mon", activity: 40, score: 45 },
        { day: "Tue", activity: 50, score: 55 },
        { day: "Wed", activity: 45, score: 50 },
        { day: "Thu", activity: 48, score: 58 },
        { day: "Fri", activity: 56, score: 62 },
      ];
    }

    const weekdays = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
    return weekdays.map((day, index) => {
      const item = recent[index] || recent[recent.length - 1];
      return {
        day,
        activity: Math.max(
          0,
          Math.round(
            (item?.status === "completed" ? 1 : 0.5) *
              (item?.score ||
                studentQuery.data?.progressSheet.summary.completionRate ||
                30),
          ),
        ),
        score: Math.max(0, item?.score || 0),
      };
    });
  }, [studentQuery.data?.progressSheet]);

  if (studentQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (studentQuery.isError || !studentQuery.data) {
    return (
      <div className="rounded-xl border border-[#ffd6d6] bg-[#fff5f5] p-6 text-[#d53d3d]">
        {getApiErrorMessage(
          studentQuery.error,
          "Unable to load student details",
        )}
      </div>
    );
  }

  const { student, progressSheet } = studentQuery.data;

  return (
    <div className="space-y-4">
      <Card className="content-shell">
        <CardContent className="p-5">
          <h1 className="text-[34px] font-semibold">Student Details</h1>
          <p className="mt-1 text-[18px] text-[#838383]">
            <Link href="/students" className="hover:underline">
              Student Management
            </Link>{" "}
            &gt; Student Details
          </p>

          <div className="mt-4 rounded-xl border border-[#e2e2e2] p-5">
            <p className="text-[16px] font-semibold text-[#1d1d1d]">
              School name:{" "}
              <span className="text-[#18a739]">{student.schoolName}</span>
            </p>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="h-20 w-20 rounded-full bg-[#d9e8d2]" />
              <div>
                <h2 className="text-[36px] font-semibold">
                  {student.studentName}
                </h2>
                <p className="text-[18px] text-[#686868]">
                  User ID: {student.userId}
                </p>
                <p className="text-[18px] text-[#686868]">
                  Grade Level: {student.gradeLevel}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="content-shell">
        <CardContent className="p-5">
          <h2 className="text-[16px] font-semibold">
            Rock&apos;s Progress Sheet
          </h2>
          <p className="text-[16px] text-[#8d8d8d]">
            Select subject and see the progress
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {progressSheet.subjectProgress.map((item, index) => (
              <div
                key={item.subject}
                className="rounded-xl border border-[#e2e7db] p-4 text-center"
                style={{
                  background:
                    index === 0
                      ? "#e8fbe8"
                      : index === 1
                        ? "#f4ecff"
                        : index === 2
                          ? "#eaf4ff"
                          : index === 3
                            ? "#fff0de"
                            : "#f8f5e9",
                }}
              >
                <p className="text-[18px] font-semibold">{item.subject}</p>
                <p className="mt-2 text-[16px] text-[#6c6c6c]">
                  {item.completionRate}%
                </p>
              </div>
            ))}
          </div>

          <h3 className="mt-8 text-center text-[32px] font-semibold text-[#2ca735]">
            {progressSheet.subjectProgress[0]?.subject || "Subject Overview"}
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-lg bg-[#e9f8ff] p-4 text-center">
              <p className="text-[16px] text-[#4d4d4d]">Activity Count</p>
              <p className="mt-2 text-[24px] font-semibold">
                {progressSheet.summary.totalActivities}
              </p>
            </div>
            <div className="rounded-lg bg-[#fff0f0] p-4 text-center">
              <p className="text-[16px] text-[#4d4d4d]">Avg. Daily Hours</p>
              <p className="mt-2 text-[24px] font-semibold">
                {Math.round(progressSheet.summary.totalHours / 7)}
              </p>
            </div>
            <div className="rounded-lg bg-[#eefce6] p-4 text-center">
              <p className="text-[16px] text-[#4d4d4d]">Total Hours</p>
              <p className="mt-2 text-[24px] font-semibold">
                {progressSheet.summary.totalHours}
              </p>
            </div>
            <div className="rounded-lg bg-[#fff6df] p-4 text-center">
              <p className="text-[16px] text-[#4d4d4d]">Avg. Quiz Score</p>
              <p className="mt-2 text-[24px] font-semibold">
                {progressSheet.summary.avgQuizScore}%
              </p>
            </div>
          </div>

          <div className="mt-4 h-[360px] rounded-xl border border-[#e2e7db] p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="4 4" stroke="#e3ead8" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="activity"
                  name="Activity Count"
                  stroke="#40bff4"
                  strokeWidth={3}
                  dot={{ fill: "#40bff4", r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  name="Avg. Quiz Score"
                  stroke="#f4be48"
                  strokeWidth={3}
                  dot={{ fill: "#f4be48", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="content-shell">
          <CardHeader>
            <CardTitle className="text-[34px] font-semibold">
              Subject Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {progressSheet.subjectProgress.map((item, index) => (
                <div key={item.subject}>
                  <div className="mb-1 flex items-center justify-between text-[16px]">
                    <span>{item.subject}</span>
                    <span>{item.completionRate}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-[#eef1e7]">
                    <div
                      className="h-3 rounded-full"
                      style={{
                        width: `${Math.min(item.completionRate, 100)}%`,
                        backgroundColor:
                          subjectColors[index % subjectColors.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="content-shell">
          <CardHeader>
            <CardTitle className="text-[34px] font-semibold">
              Recent Work
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                {progressSheet.recentWork.slice(0, 5).map((item) => (
                  <TableRow key={item._id}>
                    <TableCell>{item.subject || "-"}</TableCell>
                    <TableCell>{item.activityType}</TableCell>
                    <TableCell>{item.score ?? "--"}</TableCell>
                    <TableCell>{item.score ?? "--"}</TableCell>
                  </TableRow>
                ))}
                {progressSheet.recentWork.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-[#848484]"
                    >
                      No progress data yet
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
