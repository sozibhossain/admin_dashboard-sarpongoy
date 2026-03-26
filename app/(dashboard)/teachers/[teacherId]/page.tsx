"use client";

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

const weeklyData = [
  { day: "Jan", value: 1000 },
  { day: "Feb", value: 1300 },
  { day: "Mar", value: 1500 },
  { day: "Apr", value: 1600 },
  { day: "May", value: 1650 },
  { day: "Jun", value: 1500 },
  { day: "Jul", value: 1450 },
  { day: "Aug", value: 1600 },
  { day: "Sep", value: 1900 },
  { day: "Oct", value: 2100 },
  { day: "Nov", value: 2200 },
  { day: "Dec", value: 2300 },
];

export default function TeacherDetailsPage() {
  const params = useParams<{ teacherId: string }>();
  const teacherId = params.teacherId;

  const teacherQuery = useQuery({
    queryKey: ["teacher", teacherId],
    queryFn: () => fetchTeacherById(teacherId),
    enabled: !!teacherId,
  });

  const assignedSubjects = useMemo(() => {
    const courses = teacherQuery.data?.courses || [];
    if (courses.length > 0) return courses;
    return [
      { _id: "subject-1", name: "English" },
      { _id: "subject-2", name: "Science" },
      { _id: "subject-3", name: "Math" },
      { _id: "subject-4", name: "Social Studies" },
      { _id: "subject-5", name: "Religious & Moral Education" },
    ];
  }, [teacherQuery.data?.courses]);

  if (teacherQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (teacherQuery.isError || !teacherQuery.data) {
    return (
      <div className="rounded-xl border border-[#ffd6d6] bg-[#fff5f5] p-6 text-[#d53d3d]">
        {getApiErrorMessage(
          teacherQuery.error,
          "Unable to load teacher details",
        )}
      </div>
    );
  }

  const teacher = teacherQuery.data;

  return (
    <div className="space-y-4">
      <Card className="content-shell">
        <CardContent className="p-5">
          <h1 className="text-[34px] font-semibold">Teacher Details</h1>
          <p className="mt-1 text-[18px] text-[#838383]">
            <Link href="/teachers" className="hover:underline">
              Teacher Management
            </Link>{" "}
            &gt; Teacher Details
          </p>

          <div className="mt-4 rounded-xl border border-[#e2e2e2] p-5">
            <p className="text-[16px] font-semibold text-[#1d1d1d]">
              School name:{" "}
              <span className="text-[#18a739]">{teacher.schoolName}</span>
            </p>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="h-20 w-20 rounded-full bg-[#d9e8d2]" />
              <div>
                <h2 className="text-[36px] font-semibold">
                  {teacher.teacherName}
                </h2>
                <p className="text-[18px] text-[#686868]">
                  User ID: {teacher.userId}
                </p>
                <p className="text-[18px] text-[#686868]">
                  Grade Level: {teacher.gradeLevel}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-[26px] font-semibold">Assign course</h3>
            <p className="text-[16px] text-[#8d8d8d]">
              Assigned subjects for the teacher
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
              {assignedSubjects.map((subject, index) => (
                <div
                  key={subject._id}
                  className="rounded-xl border border-[#e2e7db] p-4 text-center"
                  style={{
                    background:
                      index % 5 === 0
                        ? "#e8fbe8"
                        : index % 5 === 1
                          ? "#f4ecff"
                          : index % 5 === 2
                            ? "#eaf4ff"
                            : index % 5 === 3
                              ? "#fff0de"
                              : "#f8f5e9",
                  }}
                >
                  <p className="text-[17px] font-semibold">{subject.name}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="content-shell">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[34px] font-semibold">
              Subject completion Overview
            </h2>
            <div className="rounded-md bg-[linear-gradient(180deg,#00B023_0%,#077A1E_91.46%)] px-3 py-1 text-sm text-white">
              {assignedSubjects[0]?.name || "Subject"}
            </div>
          </div>
          <div className="h-[380px] rounded-xl border border-[#e3e8d9] p-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient
                    id="teacherOverview"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#52bf56" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#52bf56" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#deead6" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3dab3f"
                  strokeWidth={3}
                  fill="url(#teacherOverview)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="content-shell">
          <CardContent className="p-5">
            <h3 className="text-[32px] font-semibold">Performance Range</h3>
            <div className="mt-4 space-y-3">
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span>95%</span>
                  <span>Math</span>
                </div>
                <div className="h-2 rounded-full bg-[#eff3ea]">
                  <div className="h-2 w-[95%] rounded-full bg-[#4a96ff]" />
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span>86%</span>
                  <span>Science</span>
                </div>
                <div className="h-2 rounded-full bg-[#eff3ea]">
                  <div className="h-2 w-[86%] rounded-full bg-[#21af78]" />
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span>70%</span>
                  <span>English</span>
                </div>
                <div className="h-2 rounded-full bg-[#eff3ea]">
                  <div className="h-2 w-[70%] rounded-full bg-[#8b5cf6]" />
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span>60%</span>
                  <span>Social</span>
                </div>
                <div className="h-2 rounded-full bg-[#eff3ea]">
                  <div className="h-2 w-[60%] rounded-full bg-[#f59e0b]" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="content-shell">
          <CardContent className="p-5">
            <h3 className="text-[32px] font-semibold">Recent Work</h3>
            <p className="text-sm text-[#8c8c8c]">
              Recent lesson activity and completion summary
            </p>
            <div className="mt-3 rounded-lg border border-[#e8ece0]">
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
                  {assignedSubjects.slice(0, 5).map((course, index) => (
                    <TableRow key={course._id}>
                      <TableCell>{course.name}</TableCell>
                      <TableCell>{20 + index * 4}/30</TableCell>
                      <TableCell>{40 + index * 5}/40</TableCell>
                      <TableCell>{14 + index}/20</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
