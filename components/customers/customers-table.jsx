"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import {
  addDateValue,
  addSearchValue,
  addTimeVariants,
  tokensToSearchString,
} from "@/lib/search-utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import CopyToClipboard from "../ui/copy-to-clipboard";
import { DualBadge } from "../ui/dual-badge";
import { ManualEnrollmentDialog } from "../enrollment/manual-enrollment-dialog";
import { UserHistoryTimeline } from "../users/user-history-timeline";
import { TablePagination } from "../ui/table-pagination";
import { TableRowSkeleton } from "../ui/skeleton-loader";

function LikedSports({ sports }) {
  if (!Array.isArray(sports) || sports.length === 0) {
    return <p className="text-sm text-muted-foreground">No sports added</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {sports.map((sport, index) => (
        <Badge key={`${sport}-${index}`} variant="outline">
          {sport}
        </Badge>
      ))}
    </div>
  );
}

function buildCustomerSearchIndex(customer) {
  if (!customer) {
    return "";
  }

  const tokens = new Set();
  addSearchValue(tokens, [
    customer.id,
    customer.publicId,
    customer.name,
    customer.email,
    customer.phone,
    customer.gender,
    customer.pincode,
    customer.city,
    customer.state,
    customer.country,
    customer.address,
    customer.addressText,
    customer.addressLine1,
    customer.addressLine2,
    customer.initials,
    customer.profileImage,
    customer.notes,
    customer.tags,
    customer.customerDetails,
    customer.emergencyContact,
    customer.lastCourse,
    customer.lastBooking,
  ]);
  addSearchValue(tokens, customer.likedSports);
  addSearchValue(tokens, [customer.enrollments, customer.turfBookings]);
  addDateValue(tokens, customer.joinedAt);
  addDateValue(tokens, customer.updatedAt);
  addDateValue(tokens, customer.lastActiveAt);
  addDateValue(tokens, customer.lastLoginAt);
  addTimeVariants(tokens, customer.joinedAt);
  addTimeVariants(tokens, customer.updatedAt);
  addTimeVariants(tokens, customer.lastActiveAt);

  return tokensToSearchString(tokens);
}

export function CustomersTable({ initialCustomers = [], initialTotal = 0, initialPage = 1, initialPageSize = 10, error }) {
  const router = useRouter();
  const [customers, setCustomers] = useState(initialCustomers);
  const [total, setTotal] = useState(initialTotal);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [isLoading, setIsLoading] = useState(false); // Start as false
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [userHistory, setUserHistory] = useState({ enrollments: [], bookings: [] });
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [genderFilter, setGenderFilter] = useState("all");
  const [sportFilter, setSportFilter] = useState("all");
  const searchParams = useSearchParams();
  const userIdParam = searchParams.get("user_id");
  const lastHandledUserIdRef = useRef(null);

  const totals = useMemo(() => {
    return (customers ?? []).reduce(
      (accumulator, customer) => {
        // Handle enrollments - it comes as array of objects with count property
        const enrollmentCount = Array.isArray(customer.enrollments) && customer.enrollments.length > 0
          ? (customer.enrollments[0]?.count ?? 0)
          : 0;
        
        // Handle turf_bookings - same structure
        const bookingCount = Array.isArray(customer.turf_bookings) && customer.turf_bookings.length > 0
          ? (customer.turf_bookings[0]?.count ?? 0)
          : 0;

        return {
          total: accumulator.total + 1,
          enrollment: accumulator.enrollment + enrollmentCount,
          turfBookings: accumulator.turfBookings + bookingCount,
        };
      },
      { total: 0, enrollment: 0, turfBookings: 0 }
    );
  }, [customers]);

  const genderOptions = useMemo(() => {
    const unique = new Map();
    (customers ?? []).forEach((customer) => {
      const value = customer?.gender;
      if (value === null || value === undefined) {
        return;
      }

      const trimmed = String(value).trim();
      if (!trimmed) {
        return;
      }

      const key = trimmed.toLowerCase();
      if (!unique.has(key)) {
        unique.set(key, trimmed);
      }
    });

    return ["all", ...Array.from(unique.values())];
  }, [customers]);

  const sportOptions = useMemo(() => {
    const unique = new Map();
    (customers ?? []).forEach((customer) => {
      (customer?.likedSports ?? []).forEach((sport) => {
        if (!sport) {
          return;
        }

        const trimmed = String(sport).trim();
        if (!trimmed) {
          return;
        }

        const key = trimmed.toLowerCase();
        if (!unique.has(key)) {
          unique.set(key, trimmed);
        }
      });
    });

    return ["all", ...Array.from(unique.values())];
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const normalizedGender = genderFilter.toLowerCase();
    const normalizedSport = sportFilter.toLowerCase();

    return (customers ?? []).filter((customer) => {
      const genderValue = String(customer?.gender ?? "").toLowerCase();
      const matchesGender =
        genderFilter === "all" ? true : genderValue === normalizedGender;

      const likedSports = (customer?.likedSports ?? []).map((sport) =>
        String(sport).toLowerCase()
      );
      const matchesSport =
        sportFilter === "all" ? true : likedSports.includes(normalizedSport);

      return matchesGender && matchesSport;
    });
  }, [customers, genderFilter, sportFilter]);

  // Reset loading state when new data arrives
  useEffect(() => {
    setCustomers(initialCustomers ?? []);
    setTotal(initialTotal ?? 0);
    setIsLoading(false);
  }, [initialCustomers, initialTotal]);

  const searchableCustomers = useMemo(() => {
    return (filteredCustomers ?? []).map((customer) => ({
      ...customer,
      __searchIndex: buildCustomerSearchIndex(customer),
    }));
  }, [filteredCustomers]);

  const filtersActive = genderFilter !== "all" || sportFilter !== "all";

  const toolbarContent = (
    <>
      <Select value={genderFilter} onValueChange={setGenderFilter}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder="All Genders" />
        </SelectTrigger>
        <SelectContent>
          {genderOptions.map((value) => (
            <SelectItem key={value} value={value} className="capitalize">
              {value === "all" ? "All Genders" : value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={sportFilter} onValueChange={setSportFilter}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder="All Sports" />
        </SelectTrigger>
        <SelectContent>
          {sportOptions.map((value) => (
            <SelectItem key={value} value={value} className="capitalize">
              {value === "all" ? "All Sports" : value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );

  const handleOpen = async (customer) => {
    setSelectedCustomer(customer);
    setSheetOpen(true);
    
    // Fetch user history
    if (customer?.id) {
      setLoadingHistory(true);
      try {
        const response = await fetch(`/api/users/${customer.id}/history`);
        if (response.ok) {
          const data = await response.json();
          setUserHistory({
            enrollments: data.enrollments || [],
            bookings: data.bookings || []
          });
        }
      } catch (error) {
        console.error("Failed to fetch user history", error);
      } finally {
        setLoadingHistory(false);
      }
    }
  };

  const handleSheetChange = (open) => {
    if (!open) {
      setSheetOpen(false);
      setSelectedCustomer(null);
      setUserHistory({ enrollments: [], bookings: [] });
    }
  };

  useEffect(() => {
    if (!customers?.length || !userIdParam) {
      if (!userIdParam) {
        lastHandledUserIdRef.current = null;
      }
      return;
    }

    if (lastHandledUserIdRef.current === userIdParam) {
      return;
    }

    const target = customers.find(
      (customer) => String(customer.id) === userIdParam
    );
    if (!target) {
      return;
    }

    lastHandledUserIdRef.current = userIdParam;
    setSelectedCustomer(target);
    setSheetOpen(true);
  }, [customers, userIdParam]);

  const columns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Customer" />
        ),
        enableHiding: false,
        cell: ({ row }) => {
          const customer = row.original;
          return (
            <button
              type="button"
              onClick={() => handleOpen(customer)}
              className="group flex items-center gap-3 text-left"
            >
              <Avatar>
                <AvatarImage src={customer.profileImage} alt={customer.name} />
                <AvatarFallback>{customer.initials}</AvatarFallback>
              </Avatar>
              <p className="font-semibold text-foreground group-hover:text-blue-500 transition-colors">
                {customer.name}
              </p>
            </button>
          );
        },
        filterFn: (row, value) => {
          const customer = row.original;
          const haystack = [
            customer.id,
            customer.name,
            customer.email,
            customer.phone,
            customer.pincode,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(value.toLowerCase());
        },
        size: 250,
      },
      {
        accessorKey: "email",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Email" />
        ),
        enableSorting: false,
        cell: ({ row }) => {
          const email = row.getValue("email");
          return <CopyToClipboard text={email || "—"} />;
        },
        size: 128,
      },
      {
        accessorKey: "phone",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Phone" />
        ),
        enableSorting: false,
        cell: ({ row }) => {
          const phone = row.getValue("phone");
          return <CopyToClipboard text={phone || "—"} />;
        },
        size: 128,
      },
      {
        accessorKey: "gender",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Gender" />
        ),
        cell: ({ row }) => {
          const gender = row.getValue("gender");
          return (
            <div className="text-sm text-muted-foreground capitalize">
              {gender || "—"}
            </div>
          );
        },
        size: 96,
      },
      {
        accessorKey: "likedSports",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Liked sports" />
        ),
        enableSorting: false,
        cell: ({ row }) => {
          const sports = row.original.likedSports ?? [];
          if (!Array.isArray(sports) || sports.length === 0) {
            return <span className="text-sm text-muted-foreground">—</span>;
          }

          return (
            <div className="min-w-60 flex flex-wrap gap-1">
              {sports.slice(0, 3).map((sport) => (
                <Badge
                  key={sport}
                  variant="outline"
                  className="text-xs capitalize"
                >
                  {sport}
                </Badge>
              ))}
              {sports.length > 3 ? (
                <span className="text-xs text-muted-foreground">
                  +{sports.length - 3}
                </span>
              ) : null}
            </div>
          );
        },
        size: 240,
      },
      {
        accessorKey: "enrollments",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Enrollments" />
        ),
        cell: ({ row }) => {
          const enrollments = row.getValue("enrollments");
          return <Badge variant="secondary">{enrollments}</Badge>;
        },
        size: 128,
      },
      {
        accessorKey: "turfBookings",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Turf bookings" />
        ),
        cell: ({ row }) => {
          const turfBookings = row.getValue("turfBookings");
          return <Badge variant="secondary">{turfBookings}</Badge>;
        },
        size: 128,
      },
      {
        accessorKey: "joinedAt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Joined" />
        ),
        cell: ({ row }) => {
          const joinedAt = row.getValue("joinedAt");
          return (
            <div className="text-sm text-muted-foreground">{joinedAt}</div>
          );
        },
        size: 180,
      },
    ],
    [handleOpen]
  );

  if (!customers || customers.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
        No customers found. Once users sign up they will appear here.
      </div>
    );
  }

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    setIsLoading(true);
    router.push(`/customers?page=${newPage}&pageSize=${pageSize}`);
    router.refresh();
  };

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    setIsLoading(true);
    router.push(`/customers?page=1&pageSize=${newPageSize}`);
    router.refresh();
  };

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <DualBadge x="Total" y={totals.total} />
          <DualBadge x="Enrollment" y={totals.enrollment} variant="success" />
          <DualBadge x="Turf bookings" y={totals.turfBookings} variant="warning" />
        </div>

        {isLoading ? (
          <TableRowSkeleton rows={pageSize} />
        ) : (
          <>
            <DataTable
              data={searchableCustomers}
              columns={columns}
              searchPlaceholder="Search by name, email or phone..."
              pageSize={pageSize}
            />
            <TablePagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={total}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              isLoading={isLoading}
            />
          </>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={handleSheetChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
          {selectedCustomer ? (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3 capitalize">
                  {selectedCustomer.name}
                  <Badge variant="outline">{selectedCustomer.gender}</Badge>
                </SheetTitle>
                <SheetDescription>
                  Member since {selectedCustomer.joinedAt}
                  <br />
                  Last updated on {selectedCustomer.updatedAt}
                </SheetDescription>
              </SheetHeader>

              <div className="flex flex-1 flex-col gap-4 px-6">
                <div className="flex flex-col items-start gap-6 sm:flex-row">
                  <Avatar className="size-20">
                    <AvatarImage
                      src={selectedCustomer.profileImage}
                      alt={selectedCustomer.name}
                    />
                    <AvatarFallback>{selectedCustomer.initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 grid gap-3 text-sm sm:grid-cols-2">
                    {[
                      {
                        label: "Email",
                        value: selectedCustomer.email,
                      },
                      {
                        label: "Phone",
                        value: selectedCustomer.phone,
                      },
                      {
                        label: "Pincode",
                        value: selectedCustomer.pincode,
                      },
                    ].map(({ label, value }) => (
                      <div className="space-y-0" key={label}>
                        <p className="text-xs uppercase text-muted-foreground">
                          {label}
                        </p>
                        <CopyToClipboard
                          text={value || "—"}
                          className="max-w-full font-medium text-foreground"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                  {[
                    {
                      label: "Enrollements",
                      value: selectedCustomer.enrollments,
                    },
                    {
                      label: "Turf bookings",
                      value: selectedCustomer.turfBookings,
                    },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-lg border bg-muted/30 px-4 py-2">
                      <p className="text-xs uppercase text-muted-foreground">
                        {label}
                      </p>
                      <p className="text-lg font-semibold text-foreground">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-1">
                  <p className="text-xs uppercase text-muted-foreground">
                    Liked sports
                  </p>
                  <LikedSports sports={selectedCustomer.likedSports} />
                </div>
                
                {/* User History Timeline */}
                <div className="mt-4">
                  {loadingHistory ? (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      Loading history...
                    </div>
                  ) : (
                    <UserHistoryTimeline 
                      userId={selectedCustomer.id}
                      enrollments={userHistory.enrollments}
                      bookings={userHistory.bookings}
                    />
                  )}
                </div>
              </div>
            </>
          ) : null}
          <SheetFooter className="flex-col gap-3 sm:flex-col">
            <div className="flex justify-start">
              <ManualEnrollmentDialog 
                userId={selectedCustomer?.id}
                userName={selectedCustomer?.name}
                onEnrolled={() => {
                  // Could refresh the customer data here
                  console.log("User enrolled successfully");
                }}
              />
            </div>
            <p className="text-xs leading-normal text-muted-foreground [&>code]:text-foreground">
              Customer ID <br/>
              <code>{selectedCustomer?.id || "—"}</code>
            </p>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
