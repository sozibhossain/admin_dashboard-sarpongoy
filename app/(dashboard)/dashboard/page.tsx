"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchDashboard } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/dashboard/stat-card";

// Colors matched exactly from your image
const pieColors = ["#f7941d", "#8f36df", "#2dbd2a", "#0e67ce", "#f0c107"];

function DashboardSkeleton() {
  return (
    <div className="space-y-6 bg-[#f7f9f2] p-6 min-h-screen">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[130px] rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Skeleton className="h-[470px] rounded-2xl xl:col-span-2" />
        <Skeleton className="h-[470px] rounded-2xl" />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Skeleton className="h-[430px] rounded-2xl" />
        <Skeleton className="h-[430px] rounded-2xl" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
  });

  if (isLoading) return <DashboardSkeleton />;
  if (isError || !data) return <div className="p-6 text-red-500">Error loading data.</div>;

  const subjectChartData = data.charts.subjectDistribution.map((item) => ({
    name: item.subject,
    value: item.completed,
  }));

  return (
    <div className="space-y-6 ">
      {/* 1. Stat Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Students" value="12.5k" trend="+ 36%" />
        <StatCard label="Total Teachers" value="12.5k" trend="+ 36%" />
        <StatCard label="Total Subjects" value="5" trend="+ 57%" />
        <StatCard label="Activity Hour" value="20 hr" trend="+ 83%" />
        <StatCard label="Quiz Completed" value="125" trend="+ 69%" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* 2. Total Students Bar Chart */}
        <Card className="rounded-2xl border-none shadow-sm xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-[20px] font-bold text-[#1a1a1a]">Total Students</CardTitle>
              <p className="text-[16px] text-[#7a7a7a]">See your students per year.</p>
            </div>
            <select className="rounded-md border border-[#79c300] px-3 py-1 text-sm font-medium">
              <option>Students</option>
            </select>
          </CardHeader>
          <CardContent className="h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.charts.monthlyStudentGrowth} margin={{ top: 20 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#96e000" />
                    <stop offset="100%" stopColor="#4c8000" />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e8eddc" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#6b6b6b", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b6b6b", fontSize: 12 }} />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="total" fill="url(#barGradient)" radius={[2, 2, 0, 0]} barSize={35} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 3. Total Subject Pie Chart */}
        <Card className="rounded-2xl border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-[20px] font-bold text-[#1a1a1a]">Total Subject</CardTitle>
            <p className="text-[16px] text-[#7a7a7a]">See which subject is enjoyable for students</p>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={subjectChartData}
                    dataKey="value"
                    innerRadius={0}
                    outerRadius={100}
                    labelLine={false}
                    label={({ percent = 0 }) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {subjectChartData.map((_, i) => (
                      <Cell key={i} fill={pieColors[i % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 w-full px-4">
              {subjectChartData.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm font-medium">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: pieColors[i % pieColors.length] }} />
                  {item.name}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* 4. Quiz Completed Donut Chart */}
        <Card className="rounded-2xl border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-[20px] font-bold text-[#1a1a1a]">Quiz Completed</CardTitle>
            <p className="text-[16px] text-[#7a7a7a]">See which subject&apos;s quiz is completed.</p>
          </CardHeader>
          <CardContent className="h-[350px] flex flex-col items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={subjectChartData}
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={0}
                  dataKey="value"
                  label={({ percent = 0 }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {subjectChartData.map((_, i) => (
                    <Cell key={i} fill={pieColors[i % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 5. Activity Hour Area Chart */}
        <Card className="rounded-2xl border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-[20px] font-bold text-[#1a1a1a]">Activity Hour</CardTitle>
            <p className="text-[16px] text-[#7a7a7a]">See students spending average hour per week.</p>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.charts.activityHour}>
                <defs>
                  <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8ccc2d" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#8ccc2d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="0" vertical={false} stroke="#e8eddc" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} unit="hr" />
                <Tooltip />
                <Area 
                    type="monotone" 
                    dataKey="hours" 
                    stroke="#8cc53f" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#areaFill)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
