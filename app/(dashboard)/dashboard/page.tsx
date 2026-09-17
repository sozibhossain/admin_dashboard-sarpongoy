"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
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
import { fetchDashboard, fetchSchools } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  Building2,
  Check,
  ChevronDown,
  GraduationCap,
  Loader2,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Colors matched exactly from your image
const pieColors = ["#f7941d", "#8f36df", "#2dbd2a", "#0e67ce", "#f0c107"];

function DashboardSkeleton() {
  return (
    <div className="space-y-6 bg-[#f7f9f2] p-6 min-h-screen">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
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

interface SchoolSearchDropdownProps {
  schools: Array<{ _id: string; name: string; schoolCode?: string }>;
  selectedSchoolId: string;
  onSelect: (schoolId: string) => void;
}

function SchoolSearchDropdown({
  schools,
  selectedSchoolId,
  onSelect,
}: SchoolSearchDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedSchool = schools.find((s) => s._id === selectedSchoolId);
  const displayLabel = selectedSchool ? selectedSchool.name : `All Schools (${schools.length})`;

  const filteredSchools = useMemo(() => {
    if (!searchTerm.trim()) return schools;
    const term = searchTerm.toLowerCase();
    return schools.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        (s.schoolCode && s.schoolCode.toLowerCase().includes(term)),
    );
  }, [schools, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-10 min-w-[200px] max-w-[280px] items-center justify-between gap-2 rounded-xl border border-[#dce5d4] bg-[#f8faf6] px-3.5 text-xs font-semibold text-[#272727] shadow-xs transition-all hover:border-[#16a34a] focus:outline-none focus:ring-2 focus:ring-[#79c300]/30"
      >
        <div className="flex items-center gap-2 truncate">
          <Building2 className="h-3.5 w-3.5 shrink-0 text-[#16a34a]" />
          <span className="truncate">{displayLabel}</span>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#7a7a7a] transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-[280px] rounded-2xl border border-[#dce5d4] bg-white p-2.5 shadow-xl ring-1 ring-black/5">
          {/* Search Bar Input */}
          <div className="relative mb-2 flex items-center rounded-xl border border-[#dce5d4] bg-[#f8faf6] px-2.5 py-1.5 focus-within:border-[#16a34a] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#16a34a]">
            <Search className="h-3.5 w-3.5 shrink-0 text-[#16a34a]" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search school name or code..."
              className="ml-2 w-full bg-transparent text-xs text-[#1a1a1a] placeholder:text-[#9ca3af] focus:outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="rounded-full p-0.5 text-[#9ca3af] hover:text-[#1a1a1a]"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Scrollable list with thin-scrollbar */}
          <div className="thin-scrollbar max-h-[220px] space-y-1 overflow-y-auto pr-1">
            <button
              type="button"
              onClick={() => {
                onSelect("");
                setIsOpen(false);
                setSearchTerm("");
              }}
              className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs font-semibold transition-colors ${
                !selectedSchoolId
                  ? "bg-[#eaf8ea] text-[#15803d]"
                  : "text-[#1a1a1a] hover:bg-[#f8faf6]"
              }`}
            >
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-[#16a34a]" />
                <span>All Schools ({schools.length})</span>
              </div>
              {!selectedSchoolId && <Check className="h-3.5 w-3.5 text-[#16a34a]" />}
            </button>

            {filteredSchools.map((school) => {
              const isSelected = school._id === selectedSchoolId;
              return (
                <button
                  key={school._id}
                  type="button"
                  onClick={() => {
                    onSelect(school._id);
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition-colors ${
                    isSelected
                      ? "bg-[#eaf8ea] font-semibold text-[#15803d]"
                      : "text-[#1a1a1a] hover:bg-[#f8faf6]"
                  }`}
                >
                  <div className="flex flex-col truncate pr-2">
                    <span className="truncate">{school.name}</span>
                    {school.schoolCode && (
                      <span className="text-[10px] text-[#8f8f8f]">
                        Code: {school.schoolCode}
                      </span>
                    )}
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-[#16a34a]" />}
                </button>
              );
            })}

            {filteredSchools.length === 0 && (
              <div className="py-4 text-center text-xs text-[#9ca3af]">
                No schools matching &quot;{searchTerm}&quot;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<string>("");

  const schoolsQuery = useQuery({
    queryKey: ["schools", "dashboard-filter"],
    queryFn: () => fetchSchools({ page: 1, limit: 100 }),
  });
  const schools = schoolsQuery.data?.items || [];
  const selectedSchool = schools.find((s) => s._id === selectedSchoolId);
  const hasFilter = Boolean(selectedSchoolId || selectedGradeLevel);

  // Unified dashboard query with overall filtering across all stats & charts
  const {
    data: mainData,
    isLoading: isMainLoading,
    isError: isMainError,
    isFetching,
  } = useQuery({
    queryKey: ["dashboard", selectedSchoolId, selectedGradeLevel],
    queryFn: () =>
      fetchDashboard({
        schoolId: selectedSchoolId || undefined,
        gradeLevel: selectedGradeLevel || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  if (isMainLoading) return <DashboardSkeleton />;
  if (isMainError || !mainData) return <div className="p-6 text-red-500">Error loading data.</div>;

  const totalActivityHours =
    mainData.counters?.totalActivityHours ??
    (mainData.charts?.activityHour || []).reduce(
      (total, item) =>
        total +
        ((item as { totalHours?: number }).totalHours ??
          (item.hours > 20 ? item.hours : item.hours * 100)),
      0,
    );

  const chartActivityData = (mainData.charts?.activityHour || []).map((item) => ({
    ...item,
    hours: item.hours > 20 ? Number((item.hours / 100).toFixed(2)) : item.hours,
  }));

  const subjectDistribution =
    mainData.charts?.subjectDistribution ||
    mainData.charts?.overallSubjectDistribution ||
    [];

  const totalQuizCompleted =
    mainData.counters.totalQuizCompleted ??
    mainData.counts?.totalQuizCompleted ??
    subjectDistribution.reduce(
      (total, item) => total + item.completed,
      0,
    );

  const subjectChartData = subjectDistribution.map((item) => ({
    name: item.subject,
    value: item.completed,
  }));

  const overallQuizChartData = subjectDistribution.map((item) => ({
    name: item.subject,
    value: item.completed,
  }));

  return (
    <div className="space-y-6">
      {/* Top Filter Control Bar Card */}
      <Card className="rounded-2xl border border-[#e2e8db] bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eaf8ea] text-[#16a34a] ring-1 ring-[#bbf7d0]">
                <SlidersHorizontal className="h-4 w-4" />
              </span>
              <div>
                <h1 className="text-[20px] font-bold text-[#1a1a1a]">Dashboard Overview</h1>
                <p className="text-[13px] text-[#7a7a7a]">
                  {hasFilter
                    ? `Scoped view for ${[selectedSchool?.name, selectedGradeLevel].filter(Boolean).join(" • ")}`
                    : "Real-time academic performance & analytics across all schools"}
                </p>
              </div>
            </div>

            {/* Active Filter Badges */}
            {hasFilter && (
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">
                  Active Filters:
                </span>
                {selectedSchool && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-2.5 py-0.5 text-xs font-semibold text-[#15803d]">
                    <Building2 className="h-3 w-3" />
                    {selectedSchool.name}
                    <button
                      type="button"
                      onClick={() => setSelectedSchoolId("")}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-[#dcfce7]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {selectedGradeLevel && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-2.5 py-0.5 text-xs font-semibold text-[#15803d]">
                    <GraduationCap className="h-3 w-3" />
                    Grade: {selectedGradeLevel}
                    <button
                      type="button"
                      onClick={() => setSelectedGradeLevel("")}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-[#dcfce7]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSchoolId("");
                    setSelectedGradeLevel("");
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#dc2626] hover:underline"
                >
                  <RotateCcw className="h-3 w-3" />
                  Clear all
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Searchable School Filter Dropdown with Scrollbar */}
            <SchoolSearchDropdown
              schools={schools}
              selectedSchoolId={selectedSchoolId}
              onSelect={setSelectedSchoolId}
            />

            {/* Grade Level Filter Dropdown */}
            <div className="relative">
              <Select
                value={selectedGradeLevel || "__all__"}
                onValueChange={(val) => setSelectedGradeLevel(val === "__all__" ? "" : val)}
              >
                <SelectTrigger className="h-10 min-w-[140px] rounded-xl border-[#dce5d4] bg-[#f8faf6] px-3.5 text-xs font-semibold text-[#272727] shadow-xs transition-all hover:border-[#16a34a] focus:ring-2 focus:ring-[#79c300]/30 [&_svg]:h-4 [&_svg]:w-4">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-3.5 w-3.5 text-[#16a34a] shrink-0" />
                    <SelectValue placeholder="All Levels" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__" className="font-semibold text-[#16a34a]">
                    All Levels
                  </SelectItem>
                  <SelectItem value="JHS 1">JHS 1</SelectItem>
                  <SelectItem value="JHS 2">JHS 2</SelectItem>
                  <SelectItem value="JHS 3">JHS 3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasFilter && (
              <button
                type="button"
                onClick={() => {
                  setSelectedSchoolId("");
                  setSelectedGradeLevel("");
                }}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#e2e8db] bg-white px-3 text-xs font-semibold text-[#6b7280] shadow-xs transition-colors hover:border-[#dc2626] hover:text-[#dc2626]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            )}

            {isFetching && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#eaf8ea] px-2.5 py-1 text-xs font-medium text-[#16a34a]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Updating...
              </span>
            )}
          </div>
        </div>
      </Card>
      {/* 1. Stat Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Students"
          value={`${(mainData.counters.totalStudents || 0).toLocaleString("en-US")}`}
        />
        <StatCard
          label="Total Teachers"
          value={`${(mainData.counters.totalTeachers || 0).toLocaleString("en-US")}`}
        />
        <StatCard
          label="Total Hours"
          value={`${totalActivityHours.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`}
        />
        <StatCard
          label="Quizzes Completed"
          value={`${totalQuizCompleted.toLocaleString("en-US")}`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* 2. Total Students Bar Chart */}
        <Card className="rounded-2xl border-none shadow-sm min-w-0 xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-[20px] font-bold text-[#1a1a1a]">Students Added Per Month</CardTitle>
          </CardHeader>
          <CardContent className="h-[380px] min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={mainData.charts.monthlyStudentGrowth} margin={{ top: 20 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#96e000" />
                    <stop offset="100%" stopColor="#4c8000" />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e8eddc" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#6b6b6b", fontSize: 12 }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6b6b6b", fontSize: 12 }}
                  tickFormatter={(val) => Number(val).toLocaleString("en-US")}
                />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  formatter={(value: any) => [Number(value).toLocaleString("en-US"), "Students"]}
                />
                <Bar dataKey="total" fill="url(#barGradient)" radius={[2, 2, 0, 0]} barSize={35} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 3. Total Subject Pie Chart */}
        <Card className="rounded-2xl border-none shadow-sm min-w-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-[20px] font-bold text-[#1a1a1a]">Total Subject</CardTitle>
            <p className="text-[14px] text-[#7a7a7a]">See which subject is enjoyable for students</p>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {subjectChartData.length > 0 ? (
              <>
                <div className="h-[280px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <PieChart>
                      <Pie
                        data={subjectChartData}
                        dataKey="value"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={0}
                        labelLine={false}
                        label={({ percent = 0 }) => `${(percent * 100).toFixed(0)}%`}
                      >
                        {subjectChartData.map((_, i) => (
                          <Cell key={i} fill={pieColors[i % pieColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any) => [Number(value).toLocaleString("en-US"), "Completed"]}
                      />
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
              </>
            ) : (
              <div className="flex h-[320px] w-full flex-col items-center justify-center text-center p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f4f7eb] text-[#79c300] mb-3">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                  </svg>
                </div>
                <p className="text-base font-semibold text-[#1a1a1a]">No subject data</p>
                <p className="mt-1 text-sm text-[#7a7a7a]">No quiz records found for this selection.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* 4. Quizzes Completed Donut Chart */}
        <Card className="rounded-2xl border-none shadow-sm min-w-0">
          <CardHeader>
            <CardTitle className="text-[20px] font-bold text-[#1a1a1a]">Quizzes Completed</CardTitle>
            <p className="text-[16px] text-[#7a7a7a]">Completion by subjects</p>
          </CardHeader>
          <CardContent className="h-[350px] flex flex-col items-center min-w-0">
            {overallQuizChartData.length > 0 ? (
              <div className="h-full w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <PieChart>
                    <Pie
                      data={overallQuizChartData}
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={0}
                      dataKey="value"
                      label={({ percent = 0 }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {overallQuizChartData.map((_, i) => (
                        <Cell key={i} fill={pieColors[i % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => [Number(value).toLocaleString("en-US"), "Completed"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center text-center p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f4f7eb] text-[#79c300] mb-3">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-base font-semibold text-[#1a1a1a]">No quizzes completed</p>
                <p className="mt-1 text-sm text-[#7a7a7a]">No completed quizzes recorded for this selection.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 5. Activity Hour Area Chart */}
        <Card className="rounded-2xl border-none shadow-sm min-w-0">
          <CardHeader>
            <CardTitle className="text-[20px] font-bold text-[#1a1a1a]">Past 7 days average student hours</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px] min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={chartActivityData}>
                <defs>
                  <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8ccc2d" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#8ccc2d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="0" vertical={false} stroke="#e8eddc" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 6]}
                  ticks={[0, 2, 4, 6]}
                  tickFormatter={(val) => `${val}`}
                />
                <Tooltip
                  formatter={(value: any) => [
                    `${Number(value).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} hr`,
                    "Activity Hours",
                  ]}
                />
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
