"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  addDateValue,
  addSearchValue,
  tokensToSearchString,
} from "@/lib/search-utils";
import { DualBadge } from "../ui/dual-badge";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const numberFormatter = new Intl.NumberFormat("en-IN");

const COURSE_STATUS_FILTERS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return dateFormatter.format(date);
}

function formatNumber(value) {
  if (value === null || value === undefined) {
    return "0";
  }

  const numeric = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numeric)) {
    return String(value);
  }

  return numberFormatter.format(numeric);
}

function formatCurrency(value, currency) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const resolvedCurrency = currency || "INR";
  const numeric = typeof value === "number" ? value : Number(value);

  if (Number.isNaN(numeric)) {
    return String(value);
  }

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: resolvedCurrency,
      maximumFractionDigits: 0,
    }).format(numeric);
  } catch (error) {
    return numberFormatter.format(numeric);
  }
}

function hasPositiveCount(value) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) && numeric > 0;
}

function buildOrdersHref({
  partnerId,
  courseId,
  batchId,
  planId,
  tab = "course",
}) {
  const params = new URLSearchParams();
  params.set("order_tab", tab);

  if (partnerId) {
    params.set("partner_id", partnerId);
  }

  if (courseId) {
    params.set("course_id", courseId);
  }

  if (batchId) {
    params.set("batch_id", batchId);
  }

  if (planId) {
    params.set("plan_id", planId);
  }

  return `/orders?${params.toString()}`;
}

function formatLabel(key) {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function hasValue(value) {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return true;
}

function toNumber(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  return fallback;
}

function Detail({ label, value, formatter }) {
  if (!hasValue(value)) {
    return null;
  }

  return (
    <div className="space-y-0">
      <span className="text-xs uppercase text-muted-foreground">{label}</span>
      <p className="text-sm font-medium text-foreground">
        {formatter ? formatter(value) : value}
      </p>
    </div>
  );
}

function MetadataList({ metadata }) {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const entries = Object.entries(metadata).filter(([, value]) =>
    hasValue(value)
  );
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key} className="space-y-0">
          <span className="text-xs uppercase text-muted-foreground">
            {formatLabel(key)}
          </span>
          <p className="text-sm font-medium text-foreground">{String(value)}</p>
        </div>
      ))}
    </div>
  );
}

function normalizeFilterValue(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function addMetadataTokens(target, metadata) {
  if (!metadata || typeof metadata !== "object") {
    return;
  }

  Object.entries(metadata).forEach(([key, value]) => {
    addSearchValue(target, key);
    addSearchValue(target, value);
  });
}

function buildPlanTokens(target, plan, fallbackCurrency) {
  if (!plan) {
    return;
  }

  const currency = plan.currency ?? fallbackCurrency;
  const amount = plan.price;

  addSearchValue(target, [
    plan.id,
    plan.name,
    plan.duration,
    plan.description,
    plan.note,
    plan.price,
    plan.bookingCount,
    plan.active ? "active" : "inactive",
  ]);
  addSearchValue(target, formatCurrency(amount, currency));
  addDateValue(target, plan.startDate);
  addDateValue(target, plan.endDate);
  addDateValue(target, plan.createdAt);
  addDateValue(target, plan.updatedAt);
  addMetadataTokens(target, plan.metadata);
}

function buildBatchTokens(target, batch, fallbackCurrency) {
  if (!batch) {
    return;
  }

  addSearchValue(target, [
    batch.id,
    batch.name,
    batch.days,
    batch.description,
    batch.note,
    batch.bookingCount,
    batch.planCount,
    batch.active ? "active" : "inactive",
  ]);
  addDateValue(target, batch.startsAt);
  addDateValue(target, batch.endsAt);
  addDateValue(target, batch.createdAt);
  addDateValue(target, batch.updatedAt);
  addMetadataTokens(target, batch.metadata);

  const plans = Array.isArray(batch.plans) ? batch.plans : [];
  plans.forEach((plan) => buildPlanTokens(target, plan, fallbackCurrency));
}

function buildCourseSearchIndex(course) {
  if (!course) {
    return "";
  }

  const tokens = new Set();
  addSearchValue(tokens, [
    course.id,
    course.name,
    course.sport,
    course.description,
    course.price,
    course.currency,
    course.bookingCount,
    course.batchCount,
    course.planCount,
    course.active ? "active" : "inactive",
  ]);
  addDateValue(tokens, course.startDate);
  addDateValue(tokens, course.endDate);
  addDateValue(tokens, course.createdAt);
  addDateValue(tokens, course.updatedAt);
  addMetadataTokens(tokens, course.metadata);

  const coursePlans = Array.isArray(course.plans) ? course.plans : [];
  coursePlans.forEach((plan) => buildPlanTokens(tokens, plan, course.currency));

  const batches = Array.isArray(course.batches) ? course.batches : [];
  batches.forEach((batch) => buildBatchTokens(tokens, batch, course.currency));

  return tokensToSearchString(tokens);
}

export function PartnerCoursesSection({ courses, terminology, partnerId, batches = [], batch_plans = [], enrollments = [] }) {
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sportFilter, setSportFilter] = useState("all");

  // Calculate counts from actual data
  const coursesWithCounts = useMemo(() => {
    return (courses ?? []).map((course) => {
      const courseBatches = batches.filter((batch) => batch.course_id === course.id).map((batch) => {
        const batchPlans = batch_plans.filter((plan) => plan.batch_id === batch.id);
        const batchEnrollments = enrollments.filter((enrollment) =>
          batchPlans.some((plan) => plan.id === enrollment.plan_id)
        );
        return {
          ...batch,
          planCount: batchPlans.length,
          bookingCount: batchEnrollments.length,
          plans: batchPlans,
          enrollments: batchEnrollments,
        };
      });
      const courseBatchPlans = batch_plans.filter((plan) =>
        courseBatches.some((batch) => batch.id === plan.batch_id)
      );
      const courseEnrollments = enrollments.filter((enrollment) =>
        courseBatchPlans.some((plan) => plan.id === enrollment.plan_id)
      );

      return {
        ...course,
        batchCount: courseBatches.length,
        planCount: courseBatchPlans.length,
        bookingCount: courseEnrollments.length,
        batches: courseBatches,
        batch_plans: courseBatchPlans,
        enrollments: courseEnrollments,
      };
    });
  }, [courses, batches, batch_plans, enrollments]);

  const selectedCourse = useMemo(() => {
    return (
      (coursesWithCounts ?? []).find((course) => course.id === selectedCourseId) ?? null
    );
  }, [coursesWithCounts, selectedCourseId]);

  const totals = useMemo(() => {
    return coursesWithCounts.reduce(
      (accumulator, course) => {
        const batchCount = toNumber(course?.batchCount, 0);
        const planCount = toNumber(course?.planCount, 0);
        const bookingCount = toNumber(course?.bookingCount, 0);

        return {
          courses: accumulator.courses + 1,
          batches: accumulator.batches + batchCount,
          plans: accumulator.plans + planCount,
          bookings: accumulator.bookings + bookingCount,
        };
      },
      { courses: 0, batches: 0, plans: 0, bookings: 0 }
    );
  }, [coursesWithCounts]);

  const courseSportOptions = useMemo(() => {
    const entries = new Map();
    (coursesWithCounts ?? []).forEach((course) => {
      const normalized = normalizeFilterValue(course?.sport);
      if (!normalized || normalized === "all" || entries.has(normalized)) {
        return;
      }
      entries.set(normalized, course.sport);
    });

    return Array.from(entries.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [coursesWithCounts]);

  const searchableCourses = useMemo(() => {
    return (coursesWithCounts ?? []).map((course) => ({
      ...course,
      __searchIndex: buildCourseSearchIndex(course),
    }));
  }, [coursesWithCounts]);

  const filteredCourses = useMemo(() => {
    return searchableCourses.filter((course) => {
      if (statusFilter !== "all") {
        const status = course.active ? "active" : "inactive";
        if (status !== statusFilter) {
          return false;
        }
      }

      if (sportFilter !== "all") {
        const normalizedSport = normalizeFilterValue(course.sport);
        if (normalizedSport !== sportFilter) {
          return false;
        }
      }

      return true;
    });
  }, [searchableCourses, sportFilter, statusFilter]);

  const filtersActive = statusFilter !== "all" || sportFilter !== "all";

  const handleFiltersClear = () => {
    setStatusFilter("all");
    setSportFilter("all");
  };

  const handleOpen = (courseId) => {
    setSelectedCourseId(courseId);
  };

  const handleSheetChange = (open) => {
    if (!open) {
      setSelectedCourseId(null);
    }
  };

  if (!coursesWithCounts || coursesWithCounts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        No {terminology?.plural?.toLowerCase() ?? "courses"} available for this
        partner.
      </div>
    );
  }

  const sheetSubtitle = selectedCourse
    ? [selectedCourse.sport, selectedCourse.level].filter(Boolean).join(" • ")
    : `Detailed view for ${terminology?.singular?.toLowerCase() ?? "course"}.`;

  const selectedCourseOrdersHref =
    selectedCourse &&
    hasPositiveCount(selectedCourse.bookingCount) &&
    selectedCourse.id
      ? buildOrdersHref({ partnerId, courseId: selectedCourse.id })
      : null;

  const partnerCourseOrdersHref =
    partnerId && hasPositiveCount(totals.bookings)
      ? buildOrdersHref({ partnerId })
      : null;

  const selectedCourseBatches = Array.isArray(selectedCourse?.batches)
    ? selectedCourse.batches
    : [];

  const courseFilters = (
    <>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          {COURSE_STATUS_FILTERS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={sportFilter} onValueChange={setSportFilter}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder="All Sports" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sports</SelectItem>
          {courseSportOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );

  const columns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={terminology?.singular ?? "Course"} />
        ),
        cell: ({ row }) => {
          const course = row.original;
          return (
            <button
              type="button"
              onClick={() => handleOpen(course.id)}
              className="flex flex-col gap-1 text-left"
              data-anchor-id={course.id ? String(course.id) : undefined}
            >
              <span className="font-semibold text-blue-500 hover:underline underline-offset-4">
                {course.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {course.sport || "—"}
              </span>
            </button>
          );
        },
        filterFn: (row, value) => {
          const course = row.original;
          const haystack = [course.name, course.sport, course.level]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(value.toLowerCase());
        },
        enableHiding: false,
      },
      {
        accessorKey: "batchCount",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Batches" />
        ),
        cell: ({ row }) => {
          const batchCount = row.getValue("batchCount");
          return (
            <span className="font-medium text-foreground">
              {formatNumber(batchCount)}
            </span>
          );
        },
        enableHiding: false,
      },
      {
        accessorKey: "planCount",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Plans" />
        ),
        cell: ({ row }) => {
          const planCount = row.getValue("planCount");
          return (
            <span className="font-medium text-foreground">
              {formatNumber(planCount)}
            </span>
          );
        },
        enableHiding: false,
      },
      {
        accessorKey: "bookingCount",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Bookings" />
        ),
        cell: ({ row }) => {
          const bookingCount = row.getValue("bookingCount");
          const course = row.original;
          const courseOrdersHref =
            hasPositiveCount(course.bookingCount) && course.id
              ? buildOrdersHref({ partnerId, courseId: course.id })
              : null;

          return courseOrdersHref ? (
            <Link
              href={courseOrdersHref}
              className="font-medium text-blue-500 hover:underline underline-offset-4"
            >
              {formatNumber(bookingCount)}
            </Link>
          ) : (
            <span className="font-medium text-foreground">
              {formatNumber(bookingCount)}
            </span>
          );
        },
        enableHiding: false,
      },
      {
        accessorKey: "active",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => {
          const active = row.getValue("active");
          return (
            <Badge variant={active ? "success" : "destructive"}>
              {active ? "Active" : "Inactive"}
            </Badge>
          );
        },
        enableHiding: false,
      },
      {
        accessorKey: "updatedAt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Updated" />
        ),
        cell: ({ row }) => {
          const updatedAt = row.getValue("updatedAt");
          return (
            <div className="text-sm text-muted-foreground">
              {formatDate(updatedAt)}
            </div>
          );
        },
        enableHiding: false,
      },
    ],
    [handleOpen, partnerId]
  );

  return (
    <Sheet open={Boolean(selectedCourseId)} onOpenChange={handleSheetChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-4xl">
        <SheetHeader>
          <SheetTitle>
            {selectedCourse?.name ??
              `${terminology?.singular ?? "Course"} details`}
          </SheetTitle>
          <SheetDescription>
            <Badge>{sheetSubtitle}</Badge>
          </SheetDescription>
        </SheetHeader>

        {selectedCourse ? (
          <div className="space-y-6 px-6 pb-6">
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Batches", value: selectedCourse.batchCount },
                { label: "Plans", value: selectedCourse.planCount },
                {
                  label: "Bookings",
                  value: selectedCourse.bookingCount,
                  href: partnerCourseOrdersHref,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col items-start gap-1 rounded-xl bg-secondary px-4 py-3"
                >
                  <p className="text-xs uppercase text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="text-lg font-semibold text-foreground">
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="text-blue-500 hover:underline underline-offset-4"
                      >
                        {formatNumber(item.value)}
                      </Link>
                    ) : (
                      <span className="text-foreground">
                        {formatNumber(item.value)}
                      </span>
                    )}
                  </p>
                </div>
              ))}
              <div className="flex flex-col items-start gap-1 rounded-xl bg-secondary px-4 py-3">
                <p className="text-xs uppercase text-muted-foreground">
                  Status
                </p>
                <p className="mt-1 inline-flex">
                  <Badge
                    variant={selectedCourse.active ? "success" : "destructive"}
                  >
                    {selectedCourse.active ? "Active" : "Inactive"}
                  </Badge>
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Detail label="Sport" value={selectedCourse.sport} />

              <Detail
                label="Updated"
                value={selectedCourse.updatedAt}
                formatter={formatDate}
              />

              {hasValue(selectedCourse.description) && (
                <Detail
                  label="Description"
                  value={selectedCourse.description}
                />
              )}

              <MetadataList metadata={selectedCourse.metadata} />
            </div>

            <div className="space-y-4">
              <p className="flex items-center gap-2 text-base font-semibold text-foreground">
                Batches{" "}
                <Badge variant="secondary">
                  {formatNumber(selectedCourse.batchCount)}
                </Badge>
              </p>

              {selectedCourseBatches.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No batches configured yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {selectedCourseBatches.map((batch) => {
                    const batchOrdersHref =
                      hasPositiveCount(batch.bookingCount) &&
                      batch.id &&
                      selectedCourse.id
                        ? buildOrdersHref({
                            partnerId,
                            courseId: selectedCourse.id,
                            batchId: batch.id,
                          })
                        : null;

                    const batchPlans = Array.isArray(batch.plans)
                      ? batch.plans
                      : [];

                    return (
                      <div
                        key={batch.id || batch.name}
                        className="flex flex-col items-start gap-3 rounded-xl bg-secondary px-4 pt-3 pb-4"
                      >
                        <div className="w-full flex flex-col gap-2 md:flex-row md:items-center">
                          <p className="text-base font-semibold text-foreground">
                            {batch.name}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant={batch.active ? "success" : "destructive"}
                            >
                              {batch.active ? "Active" : "Inactive"}
                            </Badge>
                            <DualBadge
                              variant="outline"
                              x="Plans"
                              y={formatNumber(batch.planCount)}
                            />
                            {batchOrdersHref ? (
                              <Link
                                href={batchOrdersHref}
                                className="inline-flex"
                              >
                                <DualBadge
                                  variant="outline"
                                  x="Bookings"
                                  y={formatNumber(batch.bookingCount)}
                                  className="cursor-pointer hover:text-blue-500!"
                                />
                              </Link>
                            ) : (
                              <Badge variant="outline">No Bookings</Badge>
                            )}
                          </div>
                        </div>

                        <div className="w-full grid gap-3 sm:grid-cols-2">
                          <Detail
                            label="Created"
                            value={batch.createdAt}
                            formatter={formatDate}
                          />
                          <Detail
                            label="Updated"
                            value={batch.updatedAt}
                            formatter={formatDate}
                          />

                          {hasValue(batch.description) && (
                            <Detail
                              label="Description"
                              value={batch.description}
                            />
                          )}

                          {hasValue(batch.note) && (
                            <Detail label="Note" value={batch.note} />
                          )}
                        </div>

                        <div className="w-full space-y-3">
                          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                            Plans [{formatNumber(batch.planCount)}]
                          </p>

                          {batchPlans.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              No plans configured for this batch.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {batchPlans.map((plan) => {
                                const planOrdersHref =
                                  hasPositiveCount(plan.bookingCount) &&
                                  plan.id &&
                                  selectedCourse.id
                                    ? buildOrdersHref({
                                        partnerId,
                                        courseId: selectedCourse.id,
                                        batchId: batch.id,
                                        planId: plan.id,
                                      })
                                    : null;

                                return (
                                  <div
                                    key={plan.id || plan.name}
                                    className="flex flex-col gap-3 rounded-lg border bg-background p-4"
                                  >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                      <p className="text-base font-semibold text-foreground">
                                        {plan.name || plan.duration || "Plan"}
                                      </p>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Badge
                                          variant={
                                            plan.active
                                              ? "success"
                                              : "destructive"
                                          }
                                        >
                                          {plan.active ? "Active" : "Inactive"}
                                        </Badge>
                                        {planOrdersHref ? (
                                          <Link
                                            href={planOrdersHref}
                                            className="inline-flex"
                                          >
                                            <DualBadge
                                              x="Bookings"
                                              y={formatNumber(
                                                plan.bookingCount
                                              )}
                                              variant="outline"
                                              className="cursor-pointer hover:text-blue-500!"
                                            />
                                          </Link>
                                        ) : (
                                          <Badge variant="outline">
                                            No Bookings
                                          </Badge>
                                        )}
                                      </div>
                                    </div>

                                    <div className="grid gap-3 grid-cols-2">
                                      <Detail
                                        label="Fees"
                                        value={plan.fees}
                                        formatter={(value) =>
                                          formatCurrency(
                                            value,
                                            plan.currency ??
                                              selectedCourse.currency
                                          )
                                        }
                                      />
                                      <Detail
                                        label="Created"
                                        value={plan.createdAt}
                                        formatter={formatDate}
                                      />
                                      <Detail
                                        label="Updated"
                                        value={plan.updatedAt}
                                        formatter={formatDate}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="px-6 py-10 text-sm text-muted-foreground">
            Select a {terminology?.singular?.toLowerCase() ?? "course"} to view
            full details.
          </div>
        )}
      </SheetContent>

      <div className="space-y-4">
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {
            [
              { label: `Total ${terminology?.plural ?? "Courses"}`, value: totals.courses },
              { label: "Total batches", value: totals.batches },
              { label: "Total plans", value: totals.plans },
              {
                label: "Total bookings",
                value: totals.bookings,
                href: partnerCourseOrdersHref,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center gap-1 rounded-xl bg-secondary px-4 py-3"
              >
                <p className="text-xs uppercase text-muted-foreground">
                  {item.label}
                </p>
                <p className="text-lg font-semibold text-foreground">
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="text-primary hover:underline focus-visible:underline"
                    >
                      {formatNumber(item.value)}
                    </Link>
                  ) : (
                    <span className="text-foreground">
                      {formatNumber(item.value)}
                    </span>
                  )}
                </p>
              </div>
            ))
          }
        </div>

        <DataTable
          columns={columns}
          data={filteredCourses}
          getSearchValue={(course) => course.__searchIndex}
          toolbarContent={courseFilters}
          showSearchClear
          filtersActive={filtersActive}
          onClearFilters={handleFiltersClear}
        />
      </div>
    </Sheet>
  );
}
