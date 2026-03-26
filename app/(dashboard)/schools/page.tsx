"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createSchool,
  deleteSchool,
  fetchSchools,
  getApiErrorMessage,
  updateSchool,
} from "@/lib/api";
import { GRADE_LEVELS } from "@/lib/constants";
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

export default function SchoolManagementPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [formState, setFormState] = useState({
    name: "",
    schoolCode: "",
    totalStudent: "",
    totalTeacher: "",
    gradeLevel: "JHS 1",
  });

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const schoolsQuery = useQuery({
    queryKey: ["schools", page, search],
    queryFn: () =>
      fetchSchools({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: createSchool,
    onSuccess: () => {
      toast.success("School created successfully");
      setCreateOpen(false);
      setFormState({
        name: "",
        schoolCode: "",
        totalStudent: "",
        totalTeacher: "",
        gradeLevel: "JHS 1",
      });
      void queryClient.invalidateQueries({ queryKey: ["schools"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSchool,
    onSuccess: () => {
      toast.success("School deleted successfully");
      void queryClient.invalidateQueries({ queryKey: ["schools"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      schoolId,
      gradeLevel,
      status,
    }: {
      schoolId: string;
      gradeLevel?: string;
      status?: "active" | "inactive";
    }) =>
      updateSchool(schoolId, {
        gradeLevels: gradeLevel ? [gradeLevel] : undefined,
        status,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["schools"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const handleCreate = () => {
    if (!formState.name || !formState.schoolCode) {
      toast.error("School name and school code are required");
      return;
    }

    createMutation.mutate({
      name: formState.name,
      schoolCode: formState.schoolCode,
      gradeLevels: [formState.gradeLevel],
      status: "active",
    });
  };

  const handleDelete = (schoolId: string) => {
    if (!window.confirm("Delete this school?")) return;
    deleteMutation.mutate(schoolId);
  };

  return (
    <div className="space-y-4">
      <Card className="content-shell">
        <CardContent className="p-5">
          <SectionHeader
            title="School Management"
            subtitle="Dashboard  >  School Management"
          />

          <div className="mb-4 flex flex-col gap-3 md:flex-row">
            <div className="flex flex-1">
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search"
                className="h-12 rounded-r-none border-r-0 border-[#b7b7b7] text-base"
              />
              <Button
                size="icon"
                className="h-12 w-12 rounded-l-none rounded-r-lg"
                type="button"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <Button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="h-12 gap-2 text-[20px]"
            >
              <Plus className="h-4 w-4" />
              Add New
            </Button>
          </div>

          {schoolsQuery.isLoading ? (
            <TableSkeleton columns={7} />
          ) : schoolsQuery.isError ? (
            <div className="rounded-lg border border-[#ffd3d3] bg-[#fff6f6] p-4 text-[#d73636]">
              {getApiErrorMessage(schoolsQuery.error, "Failed to load schools")}
            </div>
          ) : (
            <div className="rounded-xl border border-[#dee5d2]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>School Name</TableHead>
                    <TableHead>School Code</TableHead>
                    <TableHead>Total Student</TableHead>
                    <TableHead>Total Teacher</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schoolsQuery.data?.items.map((item) => (
                    <TableRow key={item._id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.schoolCode}</TableCell>
                      <TableCell>{item.totalStudent}</TableCell>
                      <TableCell>{item.totalTeacher}</TableCell>
                      <TableCell className="w-[130px]">
                        <Select
                          value={item.gradeLevels?.[0] || "__none__"}
                          onValueChange={(value) => {
                            if (value === "__none__") return;
                            updateMutation.mutate({
                              schoolId: item._id,
                              gradeLevel: value,
                            });
                          }}
                        >
                          <SelectTrigger className="h-8 border-[#6ac585] text-sm">
                            <SelectValue placeholder="Grade" />
                          </SelectTrigger>
                          <SelectContent>
                            {GRADE_LEVELS.map((grade) => (
                              <SelectItem key={grade} value={grade}>
                                {grade}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() =>
                            updateMutation.mutate({
                              schoolId: item._id,
                              status:
                                item.status === "active"
                                  ? "inactive"
                                  : "active",
                            })
                          }
                        >
                          <Badge
                            variant={
                              item.status === "active" ? "active" : "locked"
                            }
                          >
                            {item.status === "active" ? "Active" : "Locked"}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          className="text-[#ff3030]"
                          onClick={() => handleDelete(item._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex flex-col items-center justify-between gap-3 border-t border-[#ececec] px-4 py-3 text-sm text-[#6f6f6f] sm:flex-row">
                <p>
                  Showing {schoolsQuery.data?.items.length || 0} of{" "}
                  {schoolsQuery.data?.meta.total || 0} results
                </p>
                <Pagination
                  page={schoolsQuery.data?.meta.page || 1}
                  totalPages={schoolsQuery.data?.meta.totalPages || 1}
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
            <DialogTitle className="text-[24px]">Add New School</DialogTitle>
            <DialogDescription className="sr-only">
              Create school
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-2 pb-2">
              <div>
                <Label className="text-[18px]">School Name</Label>
              </div>
              <div>
                <Input
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Achimota Junior High School"
                />
              </div>
            </div>
            <div className="space-y-2 pb-2">
              <div>
                <Label className="text-[18px]">School Code</Label>
              </div>
              <div>
                <Input
                  value={formState.schoolCode}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      schoolCode: event.target.value,
                    }))
                  }
                  placeholder="GH-AR-JHS-0123"
                />
              </div>
            </div>
            <div className="space-y-2 pb-2">
              <div>
                <Label className="text-[18px]">Total Student</Label>
              </div>
              <div>
                <Input
                  value={formState.totalStudent}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      totalStudent: event.target.value,
                    }))
                  }
                  placeholder="50"
                />
              </div>
            </div>
            <div className="space-y-2 pb-2">
              <div>
                <Label className="text-[18px]">Total Teacher</Label>
              </div>
              <div>
                <Input
                  value={formState.totalTeacher}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      totalTeacher: event.target.value,
                    }))
                  }
                  placeholder="10"
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
    </div>
  );
}
