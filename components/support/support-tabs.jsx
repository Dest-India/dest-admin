"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableRow, TableCell } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { buildSupportSearchIndex, formatDateTime } from "@/lib/support";
import { resolvePartnerSupportRequest, resolveUserSupportRequest, savePartnerSupportSolution, saveUserSupportSolution } from "@/lib/supabase";
import { DualBadge } from "../ui/dual-badge";
import CopyToClipboard from "../ui/copy-to-clipboard";
import { size } from "zod";
import {
  Image,
  ChevronDownIcon,
  ChevronUpIcon,
  InfoIcon,
  CheckCheck,
} from "lucide-react";
import { Tooltip, TooltipContent } from "../ui/tooltip";
import { TooltipTrigger } from "@radix-ui/react-tooltip";
import { Loader } from "../ui/loader";
import { PreviewDialog } from "./preview-dialog";
import { toast } from "sonner";

const STATUS_FILTERS = [
  { value: "all", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
];

function withSearchIndex(record) {
  if (!record) {
    return record;
  }

  const next = { ...record };
  next.__searchIndex = buildSupportSearchIndex(next);
  return next;
}

function initializeRows(records) {
  return Array.isArray(records)
    ? records.map((record) => withSearchIndex(record))
    : [];
}

function filterRowsByStatus(rows, value) {
  if (!Array.isArray(rows) || value === "all") {
    return Array.isArray(rows) ? rows : [];
  }

  const showResolved = value === "resolved";
  return rows.filter((row) => Boolean(row?.resolved) === showResolved);
}

function createColumns({
  audience,
  onResolve,
  onSolution,
  onScreenshot,
  resolvingId,
}) {
  return [
    {
      cell: ({ row }) => {
        return row.getCanExpand() ? (
          <Button
            {...{
              "aria-expanded": row.getIsExpanded(),
              "aria-label": row.getIsExpanded()
                ? `Collapse details for ${row.original.entityName}`
                : `Expand details for ${row.original.entityName}`,
              className:
                "size-6 text-muted-foreground -mr-3 [&>svg]:opacity-60",
              onClick: row.getToggleExpandedHandler(),
              size: "icon",
              variant: "ghost",
            }}
          >
            {row.getIsExpanded() ? (
              <ChevronUpIcon aria-hidden="true" />
            ) : (
              <ChevronDownIcon aria-hidden="true" />
            )}
          </Button>
        ) : undefined;
      },
      header: () => null,
      id: "expander",
      enableHiding: false,
      size: 48,
    },
    {
      accessorKey: "resolved",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <Badge variant={row.original.resolved ? "success" : "destructive"}>
          {row.original.resolved ? "Resolved" : "Open"}
        </Badge>
      ),
      enableHiding: false,
      size: 128,
    },
    {
      accessorKey: "entityName",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={audience === "partner" ? "Partner" : "Customer"}
        />
      ),
      cell: ({ row }) => {
        const record = row.original;
        const href =
          audience === "partner"
            ? record.entityId
              ? `/partners/${encodeURIComponent(record.entityId)}`
              : undefined
            : record.entityId
            ? `/customers?user_id=${encodeURIComponent(record.entityId)}`
            : undefined;

        return (
          <div className="flex flex-col gap-0.5">
            {href ? (
              <Link
                href={href}
                className="font-semibold text-blue-500 hover:underline underline-offset-4"
              >
                {record.entityName}
              </Link>
            ) : (
              <p className="font-semibold text-foreground">
                {record.entityName}
              </p>
            )}
            <CopyToClipboard
              className="text-xs"
              text={record?.entityEmail || "-"}
            />
          </div>
        );
      },
      enableHiding: false,
      size: 256,
    },
    {
      accessorKey: "request",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Request" />
      ),
      enableSorting: false,
      cell: ({ row }) => {
        const record = row.original;
        return (
          <p className="font-medium text-foreground">
            {record.request || "No request provided"}
          </p>
        );
      },
      enableHiding: false,
      size: 256,
    },
    {
      accessorKey: "screenshot",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Screenshot" />
      ),
      enableSorting: false,
      cell: ({ row }) => {
        const hasScreenshot = Boolean(row.original.screenshot);
        if (!hasScreenshot) {
          return (
            <span className="text-sm text-muted-foreground">Not provided</span>
          );
        }

        return (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onScreenshot(row.original)}
          >
            <Image /> View
          </Button>
        );
      },
      size: 150,
    },
    {
      accessorKey: "Created at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.createdAtLabel}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const record = row.original;
        const resolving = resolvingId === record.id;

        return (
          !record.resolved && (
            <div className="flex justify-end gap-2">
              {!row.original.solution && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onSolution(record)}
                >
                  Add Solution
                </Button>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon-sm"
                    variant={record.resolved ? "secondary" : "default"}
                    disabled={record.resolved || resolving}
                    onClick={() => onResolve(record)}
                  >
                    {resolving ? <Loader /> : <CheckCheck />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {resolving ? "Updating..." : "Mark Resolved"}
                </TooltipContent>
              </Tooltip>
            </div>
          )
        );
      },
    },
  ];
}

function buildStats(requests) {
  const list = Array.isArray(requests) ? requests : [];
  return {
    total: list.length,
    open: list.filter((request) => !request.resolved).length,
    resolved: list.filter((request) => request.resolved).length,
  };
}

export function SupportTabs({ partnerRequests, customerRequests }) {
  const [partnerRows, setPartnerRows] = useState(() =>
    initializeRows(partnerRequests)
  );
  const [customerRows, setCustomerRows] = useState(() =>
    initializeRows(customerRequests)
  );
  const [resolvingId, setResolvingId] = useState(null);
  const [dialogState, setDialogState] = useState({
    open: false,
    audience: null,
    request: null,
  });
  const [solutionValue, setSolutionValue] = useState("");
  const [savingSolution, setSavingSolution] = useState(false);
  const [screenshotDialog, setScreenshotDialog] = useState({
    open: false,
    url: "",
    title: "",
  });
  const [partnerStatusFilter, setPartnerStatusFilter] = useState("all");
  const [customerStatusFilter, setCustomerStatusFilter] = useState("all");

  useEffect(() => {
    setPartnerRows(initializeRows(partnerRequests));
  }, [partnerRequests]);

  useEffect(() => {
    setCustomerRows(initializeRows(customerRequests));
  }, [customerRequests]);

  const partnerStats = useMemo(() => buildStats(partnerRows), [partnerRows]);
  const customerStats = useMemo(() => buildStats(customerRows), [customerRows]);

  const openSolutionDialog = useCallback((record, audience) => {
    setDialogState({ open: true, audience, request: record });
    setSolutionValue(record.solution || "");
  }, []);

  const closeSolutionDialog = useCallback((open) => {
    if (!open) {
      setDialogState({ open: false, audience: null, request: null });
      setSolutionValue("");
      setSavingSolution(false);
    }
  }, []);

  const openScreenshotDialog = useCallback((record) => {
    if (!record?.screenshot) {
      return;
    }

    setScreenshotDialog({
      open: true,
      url: record.screenshot,
      title: record.entityName || "Screenshot",
    });
  }, []);

  const closeScreenshotDialog = useCallback((open) => {
    if (!open) {
      setScreenshotDialog({ open: false, url: "", title: "" });
    }
  }, []);

  const handleResolve = useCallback(async (record, audience) => {
    if (!record?.id) {
      return;
    }

    try {
      setResolvingId(record.id);
      const updatedAtValue = new Date().toISOString();
      const updatedAtLabel = formatDateTime(updatedAtValue);

      if (audience === "partner") {
        await resolvePartnerSupportRequest(record.id);
        setPartnerRows((rows) =>
          rows.map((entry) =>
            entry.id === record.id
              ? withSearchIndex({
                  ...entry,
                  resolved: true,
                  updatedAt: updatedAtValue,
                  updatedAtLabel,
                })
              : entry
          )
        );
      } else {
        await resolveUserSupportRequest(record.id);
        setCustomerRows((rows) =>
          rows.map((entry) =>
            entry.id === record.id
              ? withSearchIndex({
                  ...entry,
                  resolved: true,
                  updatedAt: updatedAtValue,
                  updatedAtLabel,
                })
              : entry
          )
        );
      }
      toast.success("Support request resolved successfully.");
    } catch (error) {
      console.error("Failed to resolve support request", error);
      toast.error("Unable to update the request. Please try again.");
    } finally {
      setResolvingId(null);
    }
  }, []);

  const handleSaveSolution = useCallback(
    async (event) => {
      event.preventDefault();

      if (!dialogState.request?.id) {
        return;
      }

      try {
        setSavingSolution(true);

        const updatedAtValue = new Date().toISOString();
        const updatedAtLabel = formatDateTime(updatedAtValue);

        if (dialogState.audience === "partner") {
          await savePartnerSupportSolution(
            dialogState.request.id,
            solutionValue
          );
          setPartnerRows((rows) =>
            rows.map((entry) =>
              entry.id === dialogState.request.id
                ? withSearchIndex({
                    ...entry,
                    solution: solutionValue.trim(),
                    updatedAt: updatedAtValue,
                    updatedAtLabel,
                  })
                : entry
            )
          );
        } else {
          await saveUserSupportSolution(dialogState.request.id, solutionValue);
          setCustomerRows((rows) =>
            rows.map((entry) =>
              entry.id === dialogState.request.id
                ? withSearchIndex({
                    ...entry,
                    solution: solutionValue.trim(),
                    updatedAt: updatedAtValue,
                    updatedAtLabel,
                  })
                : entry
            )
          );
        }

        closeSolutionDialog(false);
        toast.success("Solution saved successfully.");
      } catch (error) {
        console.error("Failed to save support solution", error);
        toast.error("Unable to save the solution. Please retry.");
        setSavingSolution(false);
      }
    },
    [
      closeSolutionDialog,
      dialogState.request,
      dialogState.audience,
      solutionValue,
    ]
  );

  const partnerColumns = useMemo(
    () =>
      createColumns({
        audience: "partner",
        onResolve: (record) => handleResolve(record, "partner"),
        onSolution: (record) => openSolutionDialog(record, "partner"),
        onScreenshot: openScreenshotDialog,
        resolvingId,
      }),
    [handleResolve, openScreenshotDialog, openSolutionDialog, resolvingId]
  );

  const customerColumns = useMemo(
    () =>
      createColumns({
        audience: "customer",
        onResolve: (record) => handleResolve(record, "customer"),
        onSolution: (record) => openSolutionDialog(record, "customer"),
        onScreenshot: openScreenshotDialog,
        resolvingId,
      }),
    [handleResolve, openScreenshotDialog, openSolutionDialog, resolvingId]
  );

  const partnerFilteredRows = useMemo(
    () => filterRowsByStatus(partnerRows, partnerStatusFilter),
    [partnerRows, partnerStatusFilter]
  );

  const customerFilteredRows = useMemo(
    () => filterRowsByStatus(customerRows, customerStatusFilter),
    [customerRows, customerStatusFilter]
  );

  const renderStatusFilter = (value, onChange) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9">
        <SelectValue placeholder="All Statuses" />
      </SelectTrigger>
      <SelectContent>
        {STATUS_FILTERS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            title: "Queue health",
            stats:
              partnerStats.open + customerStats.open === 0
                ? "Clear"
                : "Attention",
            details: () => (
              <span>
                {partnerStats.open + customerStats.open} tickets awaiting
                response
              </span>
            ),
          },
          {
            title: "Partner tickets",
            stats: partnerStats.total,
            details: () => {
              return (
                <div className="flex items-center gap-2">
                  {partnerStats.resolved > 0 && (
                    <DualBadge
                      variant="success"
                      x="Resolved"
                      y={partnerStats.resolved}
                    />
                  )}
                  {partnerStats.open > 0 && (
                    <DualBadge
                      variant="destructive"
                      x="Open"
                      y={partnerStats.open}
                    />
                  )}
                </div>
              );
            },
          },
          {
            title: "Customer tickets",
            stats: customerStats.total,
            details: () => {
              return (
                <div className="flex items-center gap-2">
                  {customerStats.resolved > 0 && (
                    <DualBadge
                      variant="success"
                      x="Resolved"
                      y={customerStats.resolved}
                    />
                  )}
                  {customerStats.open > 0 && (
                    <DualBadge
                      variant="destructive"
                      x="Open"
                      y={customerStats.open}
                    />
                  )}
                </div>
              );
            },
          },
        ].map(({ title, stats, details }) => (
          <div
            key={title}
            className="flex flex-col gap-1 rounded-xl bg-secondary px-5 py-3"
          >
            <p className="text-xs uppercase text-muted-foreground">{title}</p>
            <p
              className={`text-2xl font-semibold ${
                stats == "Attention"
                  ? "text-destructive"
                  : stats == "Clear"
                  ? "text-green-600"
                  : "text-foreground"
              }`}
            >
              {stats}
            </p>
            <div className="text-xs text-muted-foreground mt-2">
              {details()}
            </div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="partners" className="space-y-4">
        <TabsList>
          <TabsTrigger value="partners">Partners</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="partners">
          <DataTable
            columns={partnerColumns}
            data={partnerFilteredRows}
            getSearchValue={(row) =>
              row.__searchIndex || buildSupportSearchIndex(row)
            }
            toolbarContent={renderStatusFilter(
              partnerStatusFilter,
              setPartnerStatusFilter
            )}
            enableColumnVisibility
            showSearchClear
            filtersActive={partnerStatusFilter !== "all"}
            onClearFilters={() => setPartnerStatusFilter("all")}
            enableExpanding
            getRowCanExpand={(row) =>
              Boolean(row.original.description || row.original.solution)
            }
            renderSubRow={(row) => (
              <TableRow>
                <TableCell colSpan={row.getVisibleCells().length}>
                  <div className="grid grid-cols-6 gap-4 p-2 text-primary">
                    {row.original.description && (
                      <div className="col-span-3 flex flex-col gap-1 text-sm">
                        <span className="text-xs uppercase text-muted-foreground">
                          Description
                        </span>
                        <div
                          dangerouslySetInnerHTML={{
                            __html: row.original.description,
                          }}
                        />
                      </div>
                    )}
                    <div className="col-span-3 flex flex-col gap-1 text-sm">
                      {row.original.solution && (
                        <>
                          <span className="text-xs uppercase text-muted-foreground">
                            Solution
                          </span>
                          {row.original.solution}
                        </>
                      )}
                      {row.original.updatedAtLabel != "-" && (
                        <>
                          <span className="text-xs uppercase text-muted-foreground mt-3">
                            Last updated
                          </span>
                          {row.original.updatedAtLabel}
                        </>
                      )}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          />
        </TabsContent>

        <TabsContent value="customers">
          <DataTable
            columns={customerColumns}
            data={customerFilteredRows}
            getSearchValue={(row) =>
              row.__searchIndex || buildSupportSearchIndex(row)
            }
            toolbarContent={renderStatusFilter(
              customerStatusFilter,
              setCustomerStatusFilter
            )}
            enableColumnVisibility
            showSearchClear
            filtersActive={customerStatusFilter !== "all"}
            onClearFilters={() => setCustomerStatusFilter("all")}
            enableExpanding
            getRowCanExpand={(row) =>
              Boolean(row.original.description || row.original.solution)
            }
            renderSubRow={(row) => (
              <TableRow>
                <TableCell colSpan={row.getVisibleCells().length}>
                  <div className="grid grid-cols-6 gap-4 p-2 text-primary">
                    {row.original.description && (
                      <div className="col-span-3 flex flex-col gap-1 text-sm">
                        <span className="text-xs uppercase text-muted-foreground">
                          Description
                        </span>
                        {row.original.description}
                      </div>
                    )}
                    <div className="col-span-3 flex flex-col gap-1 text-sm">
                      {row.original.solution && (
                        <>
                          <span className="text-xs uppercase text-muted-foreground">
                            Solution
                          </span>
                          {row.original.solution}
                        </>
                      )}
                      {row.original.updatedAtLabel != "-" && (
                        <>
                          <span className="text-xs uppercase text-muted-foreground mt-3">
                            Last updated
                          </span>
                          {row.original.updatedAtLabel}
                        </>
                      )}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={dialogState.open} onOpenChange={closeSolutionDialog}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Add Final Solution</DialogTitle>
            <DialogDescription>
              Share the resolution summary that was communicated to the{" "}
              {dialogState.audience ?? ""}.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSaveSolution}>
            <Textarea
              value={solutionValue}
              onChange={(event) => setSolutionValue(event.target.value)}
              placeholder="Write here the solution provided..."
              className="max-h-32"
              rows={5}
              required
            />

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => closeSolutionDialog(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingSolution || solutionValue.trim().length === 0}
              >
                {savingSolution && <Loader />}
                {savingSolution ? "Saving..." : "Save Solution"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <PreviewDialog isOpen={screenshotDialog.open} onOpenChange={closeScreenshotDialog} url={screenshotDialog.url} desc={screenshotDialog.title} />
    </div>
  );
}
