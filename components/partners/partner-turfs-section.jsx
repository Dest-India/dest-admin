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
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

const TURF_STATUS_FILTERS = [
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

function buildOrdersHref({ partnerId, turfId, courtId, tab = "turf" }) {
  const params = new URLSearchParams();
  params.set("order_tab", tab);

  if (partnerId) {
    params.set("partner_id", partnerId);
  }

  if (turfId) {
    params.set("turf_id", turfId);
  }

  if (courtId) {
    params.set("court_id", courtId);
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
  if (
    !metadata ||
    typeof metadata !== "object" ||
    !Object.keys(metadata).length
  ) {
    return null;
  }

  return (
    <>
      {Object.entries(metadata).map(([key, value]) =>
        hasValue(value) ? (
          <div key={key} className="space-y-0">
            <span className="text-xs uppercase text-muted-foreground">
              {formatLabel(key)}
            </span>
            <p className="text-sm font-medium text-foreground">
              {String(value)}
            </p>
          </div>
        ) : null
      )}
    </>
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

function buildCourtTokens(target, court, turfCurrency) {
  if (!court) {
    return;
  }

  addSearchValue(target, [
    court.id,
    court.name,
    court.sport,
    court.surface,
    court.description,
    court.metadata,
    court.pricing,
    court.bookingCount,
    court.active ? "active" : "inactive",
    formatIndoor(court.indoor),
  ]);
  addSearchValue(target, formatCurrency(court.pricing, turfCurrency));
  addDateValue(target, court.updatedAt);
  addMetadataTokens(target, court.metadata);
}

function buildTurfSearchIndex(turf) {
  if (!turf) {
    return "";
  }

  const tokens = new Set();
  addSearchValue(tokens, [
    turf.id,
    turf.name,
    turf.sport,
    turf.description,
    turf.addressText,
    turf.city,
    turf.state,
    turf.pin,
    turf.metadata,
    turf.bookingCount,
    turf.courtCount,
    turf.active ? "active" : "inactive",
  ]);
  addDateValue(tokens, turf.createdAt);
  addDateValue(tokens, turf.updatedAt);
  addMetadataTokens(tokens, turf.metadata);

  const courts = Array.isArray(turf.courts) ? turf.courts : [];
  courts.forEach((court) => buildCourtTokens(tokens, court, turf.currency));

  return tokensToSearchString(tokens);
}

function formatIndoor(indoor) {
  if (indoor === null || indoor === undefined) {
    return null;
  }

  return indoor ? "Indoor" : "Outdoor";
}

function formatLocation(turf) {
  return [turf.city, turf.state].filter(Boolean).join(", ") || "—";
}

export function PartnerTurfsSection({
  turfs,
  partnerId,
  turf_courts = [],
  turf_bookings = [],
}) {
  const [selectedTurfId, setSelectedTurfId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sportFilter, setSportFilter] = useState("all");

  // Calculate counts from actual data
  const turfsWithCounts = useMemo(() => {
    return (turfs ?? []).map((turf) => {
      const turfCourts = turf_courts
        .filter((court) => court.turf_id === turf.id)
        .map((court) => {
          const courtBookings = turf_bookings.filter(
            (booking) => booking.court_id === court.id
          );
          return {
            ...court,
            bookingCount: courtBookings.length,
          };
        });
      const turfBookings = turf_bookings.filter((booking) =>
        turfCourts.some((court) => court.id === booking.court_id)
      );

      return {
        ...turf,
        courtCount: turfCourts.length,
        bookingCount: turfBookings.length,
        courts: turfCourts,
        bookings: turfBookings,
      };
    });
  }, [turfs, turf_courts, turf_bookings]);

  const selectedTurf = useMemo(() => {
    return turfsWithCounts?.find((turf) => turf.id === selectedTurfId) ?? null;
  }, [turfsWithCounts, selectedTurfId]);

  const totals = useMemo(() => {
    return turfsWithCounts.reduce(
      (accumulator, turf) => ({
        turfs: accumulator.turfs + 1,
        courts: accumulator.courts + turf.courtCount,
        bookings: accumulator.bookings + turf.bookingCount,
      }),
      { turfs: 0, courts: 0, bookings: 0 }
    );
  }, [turfsWithCounts]);

  const courtSportOptions = useMemo(() => {
    const entries = new Map();
    (turfsWithCounts ?? []).forEach((turf) => {
      const turfSport = normalizeFilterValue(turf?.sport);
      if (turfSport && turfSport !== "all" && !entries.has(turfSport)) {
        entries.set(turfSport, turf.sport);
      }

      const courts = Array.isArray(turf?.courts) ? turf.courts : [];
      courts.forEach((court) => {
        const courtSport = normalizeFilterValue(court?.sport);
        if (!courtSport || courtSport === "all" || entries.has(courtSport)) {
          return;
        }
        entries.set(courtSport, court.sport);
      });
    });

    return Array.from(entries.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [turfsWithCounts]);

  const searchableTurfs = useMemo(() => {
    return (turfsWithCounts ?? []).map((turf) => ({
      ...turf,
      __searchIndex: buildTurfSearchIndex(turf),
    }));
  }, [turfsWithCounts]);

  const filteredTurfs = useMemo(() => {
    return searchableTurfs.filter((turf) => {
      if (statusFilter !== "all") {
        const status = turf.active ? "active" : "inactive";
        if (status !== statusFilter) {
          return false;
        }
      }

      if (sportFilter !== "all") {
        const turfSport = normalizeFilterValue(turf.sport);
        const courts = Array.isArray(turf.courts) ? turf.courts : [];
        const matchesCourt = courts.some(
          (court) => normalizeFilterValue(court?.sport) === sportFilter
        );
        if (turfSport !== sportFilter && !matchesCourt) {
          return false;
        }
      }

      return true;
    });
  }, [searchableTurfs, sportFilter, statusFilter]);

  const filtersActive = statusFilter !== "all" || sportFilter !== "all";

  const handleFiltersClear = () => {
    setStatusFilter("all");
    setSportFilter("all");
  };

  const handleOpen = (turfId) => {
    setSelectedTurfId(turfId);
  };

  const handleSheetChange = (open) => {
    if (!open) {
      setSelectedTurfId(null);
    }
  };

  if (!turfsWithCounts || turfsWithCounts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        No turfs available for this partner.
      </div>
    );
  }

  const sheetSubtitle = selectedTurf
    ? formatLocation(selectedTurf)
    : "Detailed view for turf facilities.";
  const selectedTurfCourts =
    selectedTurf && Array.isArray(selectedTurf.courts)
      ? selectedTurf.courts
      : [];

  const selectedTurfOrdersHref =
    selectedTurf &&
    hasPositiveCount(selectedTurf.bookingCount) &&
    selectedTurf.id
      ? buildOrdersHref({ partnerId, turfId: selectedTurf.id })
      : null;

  const partnerTurfOrdersHref =
    partnerId && hasPositiveCount(totals.bookings)
      ? buildOrdersHref({ partnerId })
      : null;

  const turfFilters = (
    <>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          {TURF_STATUS_FILTERS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={sportFilter} onValueChange={setSportFilter}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder="All Court Sports" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Court Sports</SelectItem>
          {courtSportOptions.map((option) => (
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
          <DataTableColumnHeader column={column} title="Turf" />
        ),
        cell: ({ row }) => {
          const turf = row.original;
          return (
            <button
              type="button"
              onClick={() => handleOpen(turf.id)}
              className="flex flex-col gap-1 text-left"
              data-anchor-id={turf.id ? String(turf.id) : undefined}
            >
              <span className="font-semibold text-blue-500 hover:underline underline-offset-4">
                {turf.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatLocation(turf)}
              </span>
            </button>
          );
        },
        filterFn: (row, id, value) => {
          const turf = row.original;
          const haystack = [turf.name, turf.city, turf.state]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(value.toLowerCase());
        },
        enableHiding: false,
      },
      {
        accessorKey: "courtCount",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Courts" />
        ),
        cell: ({ row }) => {
          const courtCount = row.getValue("courtCount");
          return (
            <span className="font-medium text-foreground">
              {formatNumber(courtCount)}
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
          const turf = row.original;
          const turfOrdersHref =
            hasPositiveCount(turf.bookingCount) && turf.id
              ? buildOrdersHref({ partnerId, turfId: turf.id })
              : null;

          return turfOrdersHref ? (
            <Link
              href={turfOrdersHref}
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
    <Sheet open={Boolean(selectedTurfId)} onOpenChange={handleSheetChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-4xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            {selectedTurf?.name ?? "Turf details"}{" "}
            {selectedTurf?.active && (
              <Badge variant={selectedTurf.active ? "success" : "destructive"}>
                {selectedTurf.active ? "Active" : "Inactive"}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription />
        </SheetHeader>

        {selectedTurf ? (
          <div className="space-y-4 px-6 pb-6">
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
              {[
                { label: "Courts", value: selectedTurf.courtCount },
                {
                  label: "Bookings",
                  value: selectedTurf.bookingCount,
                  href: selectedTurfOrdersHref,
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
                    {item.label === "Bookings" && selectedTurfOrdersHref ? (
                      <Link
                        href={selectedTurfOrdersHref}
                        className="text-primary hover:underline focus-visible:underline"
                      >
                        {formatNumber(item.value)}
                      </Link>
                    ) : (
                      <span>{formatNumber(item.value)}</span>
                    )}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <MetadataList metadata={selectedTurf.metadata} />
              <Detail label="Address" value={selectedTurf.addressText} />
              <Detail
                label="Created"
                value={selectedTurf.createdAt}
                formatter={formatDate}
              />
              <Detail
                label="Updated"
                value={selectedTurf.updatedAt}
                formatter={formatDate}
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">
                Courts [{formatNumber(selectedTurf.courtCount)}]
              </p>

              {selectedTurfCourts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No courts configured for this turf.
                </p>
              ) : (
                <div className="space-y-4">
                  {selectedTurfCourts.map((court) => {
                    const courtOrdersHref =
                      hasPositiveCount(court.bookingCount) &&
                      court.id &&
                      selectedTurf.id
                        ? buildOrdersHref({
                            partnerId,
                            turfId: selectedTurf.id,
                            courtId: court.id,
                          })
                        : null;

                    return (
                      <div
                        key={court.id || court.name}
                        className="flex flex-col items-start gap-3 rounded-xl bg-secondary px-4 py-3"
                      >
                        <div className="w-full flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="space-y-1">
                            <p className="text-base font-semibold text-foreground">
                              {court.name}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {hasValue(court.sport) ? (
                              <Badge>{court.sport}</Badge>
                            ) : null}
                            <Badge
                              variant={court.active ? "success" : "destructive"}
                            >
                              {court.active ? "Active" : "Inactive"}
                            </Badge>
                            {courtOrdersHref ? (
                              <Link
                                href={courtOrdersHref}
                                className="inline-flex"
                              >
                                <DualBadge
                                  variant="outline"
                                  x="Bookings"
                                  y={formatNumber(court.bookingCount)}
                                />
                              </Link>
                            ) : (
                              <Badge variant="outline">No Bookings</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs uppercase text-muted-foreground">
                            Rate/Hour
                          </span>{" "}
                          <p className="text-sm font-medium text-foreground">
                            {formatCurrency(court.rate_per_hour)}
                          </p>
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
            Select a turf to view full details.
          </div>
        )}
      </SheetContent>

      <div className="space-y-4">
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
          {[
            {
              label: "Total turfs",
              value: totals.turfs,
            },
            {
              label: "Total courts",
              value: totals.courts,
            },
            {
              label: "Total bookings",
              value: totals.bookings,
              href: partnerTurfOrdersHref,
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
                {item.label === "Total bookings" && item.href ? (
                  <Link
                    href={item.href}
                    className="text-blue-500 hover:underline underline-offset-4"
                  >
                    {formatNumber(item.value)}
                  </Link>
                ) : (
                  <span>{formatNumber(item.value)}</span>
                )}
              </p>
            </div>
          ))}
        </div>

        <DataTable
          columns={columns}
          data={filteredTurfs}
          getSearchValue={(turf) => turf.__searchIndex}
          toolbarContent={turfFilters}
          showSearchClear
          filtersActive={filtersActive}
          onClearFilters={handleFiltersClear}
        />
      </div>
    </Sheet>
  );
}
