"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, Plus, Search, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useErrorFeedback, type ErrorDetail } from "@/components/management/error-feedback";
import { DeleteConfirmationDialog } from "@/components/management/delete-confirmation-dialog";
import {
  createSchoolsBulk,
  createSchool,
  deleteSchool,
  fetchSchools,
  fetchSchoolsExport,
  getApiErrorMessage,
  updateSchool,
  updateSchoolsGradeLevel,
} from "@/lib/api";
import type { BulkSchoolPayload, SchoolExportRow } from "@/lib/api";
import { GRADE_LEVELS } from "@/lib/constants";
import { hasCsvHeader, parseCsvRows } from "@/lib/csv";
import { BulkGradeAction } from "@/components/management/bulk-grade-action";
import {
  ExportRecordsDialog,
  type ExportColumn,
} from "@/components/management/export-records-dialog";
import { SectionHeader } from "@/components/management/section-header";
import { CreatedDate } from "@/components/management/created-date";
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
import { SelectionCheckbox } from "@/components/ui/selection-checkbox";
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
const SCHOOL_EXPORT_COLUMNS = [
  { key: "serialNumber", label: "Serial Number" },
  { key: "schoolName", label: "School Name" },
  { key: "schoolCode", label: "School Code" },
  { key: "gradeLevel", label: "Grade Level" },
] satisfies readonly ExportColumn<SchoolExportRow>[];

export default function SchoolManagementPage() {
  const queryClient = useQueryClient();
  const { showError, showBulkErrors } = useErrorFeedback();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkCreateOpen, setBulkCreateOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkFileName, setBulkFileName] = useState("");
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<Set<string>>(
    new Set(),
  );
  const [bulkGradeLevel, setBulkGradeLevel] = useState("");
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
      setSelectedSchoolIds(new Set());
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

  const schoolsExportQuery = useQuery({
    queryKey: ["schools-export", search],
    queryFn: () => fetchSchoolsExport({ search: search || undefined }),
    enabled: exportOpen,
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
    onError: (error) => showError(error),
  });

  const bulkCreateMutation = useMutation({
    mutationFn: createSchoolsBulk,
    onSuccess: (result) => {
      const failedCount = result.failed.length;
      if (failedCount > 0) {
        showBulkErrors(result, "schools");
      } else {
        toast.success(`${result.created.length} schools created successfully`);
      }
      setBulkCreateOpen(false);
      setBulkText("");
      setBulkFileName("");
      void queryClient.invalidateQueries({ queryKey: ["schools"] });
    },
    onError: (error) => showError(error),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSchool,
    onSuccess: () => {
      setDeleteTargetId(null);
      toast.success("School deleted successfully");
      void queryClient.invalidateQueries({ queryKey: ["schools"] });
    },
    onError: (error) => {
      setDeleteTargetId(null);
      showError(error);
    },
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
    onError: (error) => showError(error),
  });

  const bulkGradeMutation = useMutation({
    mutationFn: ({ schoolIds, gradeLevel }: { schoolIds: string[]; gradeLevel: string }) =>
      updateSchoolsGradeLevel(schoolIds, gradeLevel),
    onSuccess: (result) => {
      toast.success(
        `${result.updatedCount} school${result.updatedCount === 1 ? "" : "s"} updated to ${result.gradeLevel}`,
      );
      setSelectedSchoolIds(new Set());
      setBulkGradeLevel("");
      void queryClient.invalidateQueries({ queryKey: ["schools"] });
    },
    onError: (error) => showError(error),
  });

  const visibleSchoolIds = schoolsQuery.data?.items.map((item) => item._id) || [];
  const allVisibleSchoolsSelected =
    visibleSchoolIds.length > 0 &&
    visibleSchoolIds.every((schoolId) => selectedSchoolIds.has(schoolId));
  const someVisibleSchoolsSelected = visibleSchoolIds.some((schoolId) =>
    selectedSchoolIds.has(schoolId),
  );

  const handleToggleSchool = (schoolId: string, checked: boolean) => {
    setSelectedSchoolIds((current) => {
      const next = new Set(current);
      if (checked) next.add(schoolId);
      else next.delete(schoolId);
      return next;
    });
  };

  const handleToggleAllSchools = (checked: boolean) => {
    setSelectedSchoolIds(checked ? new Set(visibleSchoolIds) : new Set());
  };

  const handleBulkGradeUpdate = () => {
    if (!bulkGradeLevel || selectedSchoolIds.size === 0) return;
    bulkGradeMutation.mutate({
      schoolIds: [...selectedSchoolIds],
      gradeLevel: bulkGradeLevel,
    });
  };

  const handleCreate = () => {
    if (!formState.name || !formState.schoolCode) {
      showError("School name and school code are required");
      return;
    }

    createMutation.mutate({
      name: formState.name,
      schoolCode: formState.schoolCode,
      gradeLevels: [formState.gradeLevel],
      status: "active",
    });
  };

  const parseBulkSchools = (): BulkSchoolPayload[] | null => {
    const parsedRows = parseCsvRows(bulkText);
    const rows =
      parsedRows.length > 0 && hasCsvHeader(parsedRows[0], ["school", "code"])
        ? parsedRows.slice(1)
        : parsedRows;

    if (rows.length === 0) {
      showError("Add at least one school row");
      return null;
    }

    const schools: BulkSchoolPayload[] = [];
    const validationErrors: ErrorDetail[] = [];
    for (const [index, row] of rows.entries()) {
      const [name, schoolCode, gradeLevel, status] = row;

      if (!name || !schoolCode) {
        const missing = Object.entries({"School Name": name, "School Code": schoolCode})
          .filter(([, value]) => !value).map(([label]) => label);
        validationErrors.push({
          label: `Data row ${index + 1}`,
          message: `Missing required values: ${missing.join(", ")}`,
        });
        continue;
      }

      schools.push({
        name,
        schoolCode,
        gradeLevels: gradeLevel ? [gradeLevel] : [],
        status: status === "inactive" ? "inactive" : "active",
      });
    }

    if (validationErrors.length) {
      showError(`${validationErrors.length} CSV rows have missing required values`, validationErrors);
      return null;
    }
    return schools;
  };

  const handleBulkCreateSchools = () => {
    const schools = parseBulkSchools();
    if (!schools) return;
    bulkCreateMutation.mutate(schools);
  };

  const handleBulkCsvUpload = async (file: File | null) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      showError("Upload a CSV file");
      return;
    }
    setBulkText(await file.text());
    setBulkFileName(file.name);
  };

  const handleDelete = (schoolId: string) => {
    setDeleteTargetId(schoolId);
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
            <Button
              type="button"
              variant="secondary"
              onClick={() => setBulkCreateOpen(true)}
              className="h-12 gap-2 text-[20px]"
            >
              <Plus className="h-4 w-4" />
              Bulk Add
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setExportOpen(true)}
              aria-label="Export schools"
              title="Export schools"
              className="h-12 w-full px-0 md:w-12"
            >
              <Download className="h-5 w-5" />
            </Button>
          </div>

          <BulkGradeAction
            selectedCount={selectedSchoolIds.size}
            itemLabel="school"
            gradeLevel={bulkGradeLevel}
            onGradeLevelChange={setBulkGradeLevel}
            onApply={handleBulkGradeUpdate}
            onClear={() => {
              setSelectedSchoolIds(new Set());
              setBulkGradeLevel("");
            }}
            isPending={bulkGradeMutation.isPending}
          />

          {schoolsQuery.isLoading ? (
            <TableSkeleton columns={9} />
          ) : schoolsQuery.isError ? (
            <div className="rounded-lg border border-[#ffd3d3] bg-[#fff6f6] p-4 text-[#d73636]">
              {getApiErrorMessage(schoolsQuery.error, "Failed to load schools")}
            </div>
          ) : (
            <div className="rounded-xl border border-[#dee5d2]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 px-4">
                      <SelectionCheckbox
                        checked={allVisibleSchoolsSelected}
                        indeterminate={
                          someVisibleSchoolsSelected && !allVisibleSchoolsSelected
                        }
                        onChange={(event) =>
                          handleToggleAllSchools(event.target.checked)
                        }
                        disabled={
                          visibleSchoolIds.length === 0 || bulkGradeMutation.isPending
                        }
                        aria-label="Select all schools on this page"
                      />
                    </TableHead>
                    <TableHead>School Name</TableHead>
                    <TableHead>School Code</TableHead>
                    <TableHead>Total Student</TableHead>
                    <TableHead>Total Teacher</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="whitespace-nowrap">Created Date</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schoolsQuery.data?.items.map((item) => (
                    <TableRow
                      key={item._id}
                      className={
                        selectedSchoolIds.has(item._id) ? "bg-[#f2fbf3]" : undefined
                      }
                    >
                      <TableCell className="w-12 px-4">
                        <SelectionCheckbox
                          checked={selectedSchoolIds.has(item._id)}
                          onChange={(event) =>
                            handleToggleSchool(item._id, event.target.checked)
                          }
                          disabled={bulkGradeMutation.isPending}
                          aria-label={`Select ${item.name}`}
                        />
                      </TableCell>
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
                      <TableCell className="whitespace-nowrap">
                        <CreatedDate value={item.createdAt} />
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
                  onChange={(nextPage) => {
                    setSelectedSchoolIds(new Set());
                    setPage(nextPage);
                  }}
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

      <ExportRecordsDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        title="Export Schools"
        description="Preview all schools matching the current search."
        fileName="schools-export.csv"
        columns={SCHOOL_EXPORT_COLUMNS}
        rows={schoolsExportQuery.data || []}
        isLoading={schoolsExportQuery.isLoading || schoolsExportQuery.isFetching}
        errorMessage={
          schoolsExportQuery.isError
            ? getApiErrorMessage(
                schoolsExportQuery.error,
                "Failed to load school export data",
              )
            : undefined
        }
      />

      <Dialog open={bulkCreateOpen} onOpenChange={setBulkCreateOpen}>
        <DialogContent className="max-w-[760px]">
          <DialogHeader>
            <DialogTitle className="text-[24px]">Bulk Add Schools</DialogTitle>
            <DialogDescription>
              Upload a CSV file with School Name, School Code, Grade Level, Status
            </DialogDescription>
          </DialogHeader>

          <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[#34b56a] bg-[#f8fff9] text-[16px] font-semibold text-[#079938]">
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => {
                void handleBulkCsvUpload(event.target.files?.[0] || null);
                event.target.value = "";
              }}
            />
            <Upload className="h-4 w-4" />
            Upload CSV
          </label>
          {bulkFileName ? (
            <div className="rounded-lg border border-[#d9ead3] bg-[#f8fff9] px-4 py-3 text-sm font-medium text-[#079938]">
              {bulkFileName}
            </div>
          ) : null}

          <DialogFooter className="grid grid-cols-2 gap-3 sm:grid-cols-2">
            <Button
              variant="secondary"
              onClick={() => {
                setBulkCreateOpen(false);
                setBulkText("");
                setBulkFileName("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkCreateSchools}
              disabled={bulkCreateMutation.isPending}
            >
              {bulkCreateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DeleteConfirmationDialog
        open={deleteTargetId !== null}
        entity="school"
        isPending={deleteMutation.isPending}
        onCancel={() => setDeleteTargetId(null)}
        onConfirm={() => {
          if (deleteTargetId && !deleteMutation.isPending) deleteMutation.mutate(deleteTargetId);
        }}
      />
    </div>
  );
}
