"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
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
import {
  addDateValue,
  addSearchValue,
  addTimeVariants,
  tokensToSearchString,
} from "@/lib/search-utils";
import CopyToClipboard from "../ui/copy-to-clipboard";
import { Form, ReceiptIndianRupee } from "lucide-react";
import { TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Tooltip } from "@radix-ui/react-tooltip";
import { getRoleTerminology } from "@/lib/utils";

const currencyFormatters = new Map();

function getCurrencyFormatter(currency) {
  if (!currency) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    });
  }

  if (!currencyFormatters.has(currency)) {
    currencyFormatters.set(
      currency,
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      })
    );
  }

  return currencyFormatters.get(currency);
}

function formatCurrency(amount, currency = "INR") {
  if (amount === null || amount === undefined) {
    return "—";
  }

  const numericAmount = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(numericAmount)) {
    return "—";
  }

  try {
    return getCurrencyFormatter(currency).format(numericAmount);
  } catch (error) {
    return `${currency} ${numericAmount.toFixed(0)}`;
  }
}

function cleanParam(value) {
  return typeof value === "string" ? value.trim() : "";
}

function matchesOrderFilters(order, filters) {
  if (!filters) {
    return true;
  }

  const partnerId = filters.partnerId;
  if (partnerId && partnerId !== (order.partner?.id ?? "")) {
    return false;
  }

  const plan = order.plan ?? {};
  const booking = order.booking ?? {};

  if (filters.courseId && filters.courseId !== (plan.courseId ?? "")) {
    return false;
  }

  if (filters.batchId && filters.batchId !== (plan.batchId ?? "")) {
    return false;
  }

  if (filters.planId && filters.planId !== (plan.id ?? "")) {
    return false;
  }

  if (filters.turfId) {
    const planTurfId = plan.turfId ?? "";
    const bookingTurfId = booking.turfId ?? "";
    if (filters.turfId !== planTurfId && filters.turfId !== bookingTurfId) {
      return false;
    }
  }

  if (filters.courtId && filters.courtId !== (booking.courtId ?? "")) {
    return false;
  }

  return true;
}

function filterOrders(orders, filters) {
  return (orders ?? []).filter((order) => matchesOrderFilters(order, filters));
}

function toTitleCase(label) {
  if (!label) {
    return "";
  }

  return label
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildCustomerRows(order) {
  if (!order) {
    return [];
  }

  console.log("Building customer rows for order:", order);

  const details = order.customerDetails || {};
  const customer = order.customer || {};

  const fields = [
    { label: "Age", value: details.age || "—" },
    { label: "Name", value: details.name || customer.name || "—" },
    { label: "Email", value: details.email || customer.email || "—" },
    { label: "Phone", value: details.phone || customer.phone || "—" },
    { 
      label: "Gender", 
      value: details.gender 
        ? details.gender.charAt(0).toUpperCase() + details.gender.slice(1)
        : customer.gender
        ? customer.gender.charAt(0).toUpperCase() + customer.gender.slice(1)
        : "—"
    },
  ];

  return fields;
}

function buildPaymentRows(order) {
  if (!order) {
    return [];
  }

  const payment = order.payment ?? null;
  if (!payment && !order.paymentId) {
    return [];
  }

  const rows = [];
  rows.push({
    label: "Payment Id",
    value: payment?.id ?? order.paymentId ?? "—",
  });
  rows.push({ label: "Status", value: payment?.status || "—" });
  rows.push({ label: "Type", value: payment?.type || "—" });

  const amountLabel = payment
    ? formatCurrency(payment.amount, payment.currency)
    : formatCurrency(order.amount, order.currency);
  rows.push({ label: "Amount", value: amountLabel });
  rows.push({
    label: "Currency",
    value: payment?.currency || order.currency || "INR",
  });
  rows.push({
    label: "Razorpay Order Id",
    value: payment?.razorpayOrderId || "—",
  });
  rows.push({
    label: "Razorpay Payment Id",
    value: payment?.razorpayPaymentId || "—",
  });
  rows.push({ label: "Created At", value: payment?.createdAtLabel || "—" });
  rows.push({
    label: "User Id",
    value: payment?.userId || order.customer?.id || "—",
  });

  return rows;
}
function addCurrencyVariants(target, amount, currency = "INR") {
  if (amount === null || amount === undefined) {
    return;
  }

  const numeric = Number(amount);
  if (Number.isFinite(numeric)) {
    addSearchValue(target, numeric);
    addSearchValue(target, numeric.toFixed(2));
    addSearchValue(target, Math.round(numeric));
    if (currency) {
      addSearchValue(target, `${currency} ${numeric}`);
      addSearchValue(target, `${numeric} ${currency}`);
    }
  }

  const formatted = formatCurrency(amount, currency);
  if (formatted && formatted !== "—") {
    addSearchValue(target, formatted);
  }
}

function buildCourseSearchIndex(order) {
  if (!order) {
    return "";
  }

  const chunks = new Set();
  addSearchValue(chunks, [
    order.id,
    order.type,
    order.typeLabel,
    order.status,
    order.statusRaw,
    order.plan,
    order.partner,
    order.customer,
    order.customerDetails,
    order.paymentId,
  ]);
  addCurrencyVariants(chunks, order.amount, order.currency);
  addDateValue(chunks, order.createdAt);
  addDateValue(chunks, order.createdAtLabel);

  const customerRows = buildCustomerRows(order);
  customerRows.forEach((row) => addSearchValue(chunks, [row.label, row.value]));

  const paymentRows = buildPaymentRows(order);
  paymentRows.forEach((row) => addSearchValue(chunks, [row.label, row.value]));

  if (order.payment) {
    addSearchValue(chunks, [
      order.payment.id,
      order.payment.status,
      order.payment.type,
      order.payment.razorpayOrderId,
      order.payment.razorpayPaymentId,
      order.payment.userId,
    ]);
    addCurrencyVariants(chunks, order.payment.amount, order.payment.currency);
    addDateValue(chunks, order.payment.createdAt);
    addDateValue(chunks, order.payment.createdAtLabel);
  }

  return tokensToSearchString(chunks);
}

function buildTurfSearchIndex(order) {
  if (!order) {
    return "";
  }

  const chunks = new Set();
  addSearchValue(chunks, [
    order.id,
    order.type,
    order.typeLabel,
    order.status,
    order.statusRaw,
    order.partner,
    order.customer,
    order.customerDetails,
    order.paymentId,
  ]);
  addCurrencyVariants(chunks, order.amount, order.currency);
  addDateValue(chunks, order.createdAt);
  addDateValue(chunks, order.createdAtLabel);

  const booking = order.booking ?? {};
  addSearchValue(chunks, [
    booking.turfName,
    booking.turfSport,
    booking.courtName,
    booking.declineReason,
    booking.paymentId,
    booking.turfId,
    booking.courtId,
  ]);
  addDateValue(chunks, booking.date);
  addTimeVariants(chunks, booking.startTime);
  addTimeVariants(chunks, booking.endTime);
  if (booking.date && booking.startTime) {
    addSearchValue(chunks, `${booking.date} ${booking.startTime}`);
  }
  if (booking.date && booking.endTime) {
    addSearchValue(chunks, `${booking.date} ${booking.endTime}`);
  }

  const customerRows = buildCustomerRows(order);
  customerRows.forEach((row) => addSearchValue(chunks, [row.label, row.value]));

  const paymentRows = buildPaymentRows(order);
  paymentRows.forEach((row) => addSearchValue(chunks, [row.label, row.value]));

  if (order.payment) {
    addSearchValue(chunks, [
      order.payment.id,
      order.payment.status,
      order.payment.type,
      order.payment.razorpayOrderId,
      order.payment.razorpayPaymentId,
      order.payment.userId,
    ]);
    addCurrencyVariants(chunks, order.payment.amount, order.payment.currency);
    addDateValue(chunks, order.payment.createdAt);
    addDateValue(chunks, order.payment.createdAtLabel);
  }

  return tokensToSearchString(chunks);
}

function DetailsTable({ rows, emptyMessage }) {
  if (!rows || rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full border-collapse text-sm">
        <tbody>
          {rows.map((row) => {
            const value =
              row.value === null || row.value === undefined || row.value === ""
                ? "—"
                : typeof row.value === "string"
                ? row.value
                : String(row.value);

            return (
              <tr key={row.label} className="border-b last:border-b-0">
                <th className="w-1/3 bg-muted/40 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {row.label}
                </th>
                <td className="px-3 py-2 text-sm text-foreground">{value}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function getStatusVariant(status) {
  if (!status) {
    return "default";
  }

  const normalized = status.toLowerCase();
  if (
    ["completed", "confirmed", "success", "active", "accepted"].includes(
      normalized
    )
  ) {
    return "success";
  }
  if (["pending", "processing", "in-progress"].includes(normalized)) {
    return "warning";
  }
  if (
    ["cancelled", "canceled", "failed", "declined", "error"].includes(
      normalized
    )
  ) {
    return "destructive";
  }

  return "default";
}

function StatusBadge({ status }) {
  return (
    <Badge variant={getStatusVariant(status)}>{status || "Unknown"}</Badge>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="rounded-xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
      <p className="font-medium text-foreground">{title}</p>
      {description ? (
        <p className="mt-1 text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

function CourseOrdersTable({
  orders,
  onShowCustomerDetails,
  onShowPaymentDetails,
  filtersActive,
  onClearFilters,
  hasAnyOrders = true,
}) {
  const columnTitle = useMemo(() => {
    if (!Array.isArray(orders) || orders.length === 0) {
      return getRoleTerminology().singular ?? "Course";
    }

    const roles = orders
      .map((o) => o?.partner?.role)
      .filter(Boolean)
      .map((r) => String(r).toLowerCase());

    if (roles.length === 0) return getRoleTerminology().singular ?? "Course";
    const uniq = Array.from(new Set(roles));
    const role = uniq.length === 1 ? uniq[0] : roles[0];
    return getRoleTerminology(role).singular ?? "Course";
  }, [orders]);
  const columns = useMemo(
    () => [
      {
        accessorKey: "id",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Order" />
        ),
        meta: { title: "Order" },
        enableHiding: false,
        enableSorting: false,
        cell: ({ row }) => {
          const id = row.getValue("id");
          return (
            <div className="font-mono text-xs text-muted-foreground">
              {id || "—"}
            </div>
          );
        },
        size: 200,
      },
      {
        accessorKey: "customer",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Customer" />
        ),
        cell: ({ row }) => {
          const customer = row.getValue("customer");
          return (
            <div className="flex flex-col gap-0.5">
              {customer?.id ? (
                <Link
                  href={`/customers?user_id=${encodeURIComponent(customer.id)}`}
                  className="font-semibold text-blue-500 hover:underline underline-offset-4"
                >
                  {customer?.name || "Unknown"}
                </Link>
              ) : (
                <span className="font-semibold">
                  {customer?.name || "Unknown"}
                </span>
              )}
              <CopyToClipboard
                text={customer?.email || "-"}
                className="text-xs"
              />
            </div>
          );
        },
        filterFn: (row, id, value) => {
          const customer = row.getValue("customer");
          const haystack = [customer?.name, customer?.email, customer?.phone]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(value.toLowerCase());
        },
        size: 256,
      },
      {
        accessorKey: "partner",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Partner" />
        ),
        cell: ({ row }) => {
          const partner = row.getValue("partner");
          return partner?.id ? (
            <Link
              href={`/partners/${encodeURIComponent(partner.id)}`}
              className="font-medium text-blue-500 hover:underline underline-offset-4"
            >
              {partner?.name || "Unassigned"}
            </Link>
          ) : (
            <span>{partner?.name || "Unassigned"}</span>
          );
        },
      },
      {
        accessorKey: "plan",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={columnTitle} />
        ),
        cell: ({ row }) => {
          const plan = row.getValue("plan");
          const partner = row.getValue("partner");
          return (
            <div className="flex flex-col gap-0.5">
              {partner?.id && plan?.courseId ? (
                <Link
                  href={`/partners/${encodeURIComponent(
                    partner.id
                  )}#${encodeURIComponent(plan.courseId)}`}
                  className="font-semibold text-blue-500 hover:underline underline-offset-4"
                >
                  {plan?.courseName || "—"}
                </Link>
              ) : (
                <span className="font-medium text-foreground">
                  {plan?.courseName || "—"}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {plan?.batchName ? `${plan.batchName}` : "—"}
              </span>
            </div>
          );
        },
        size: 200,
      },
      {
        accessorKey: "amount",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Amount" />
        ),
        cell: ({ row }) => {
          const amount = row.getValue("amount");
          const currency = row.original.currency;
          return <div>{formatCurrency(amount, currency)}</div>;
        },
        size: 150,
      },
      {
        accessorKey: "createdAtLabel",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Created" />
        ),
        cell: ({ row }) => {
          const createdAtLabel = row.getValue("createdAtLabel");
          return (
            <div className="text-sm text-muted-foreground">
              {createdAtLabel || "—"}
            </div>
          );
        },
        size: 180,
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const order = row.original;
          return (
            <div className="flex justify-end gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon-sm"
                    onClick={() => onShowCustomerDetails(order)}
                  >
                    <Form />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Ordered for</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon-sm"
                    onClick={() => onShowPaymentDetails(order)}
                    disabled={!order.payment && !order.paymentId}
                  >
                    <ReceiptIndianRupee />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Payment details</TooltipContent>
              </Tooltip>
            </div>
          );
        },
        meta: { title: "Actions" },
        enableHiding: false,
        enableSorting: false,
      },
    ],
    [onShowCustomerDetails, onShowPaymentDetails]
  );

  const searchableOrders = useMemo(
    () =>
      (orders ?? []).map((order) => {
        try {
          return {
            ...order,
            __searchIndex: buildCourseSearchIndex(order),
          };
        } catch (err) {
          console.error("Failed to build course search index for order", order?.id, err);
          return { ...order, __searchIndex: "" };
        }
      }),
    [orders]
  );

  if (!hasAnyOrders) {
    return (
      <EmptyState
        title="No course enrollments"
        description="Course or program purchases will display once customers enroll."
      />
    );
  }

  return (
    <DataTable
      columns={columns}
      data={searchableOrders}
      getSearchValue={(order) => order.__searchIndex}
      enableColumnVisibility
      showSearchClear
      filtersActive={filtersActive}
      onClearFilters={onClearFilters}
      emptyMessage="No course orders match the current filters."
    />
  );
}

function TurfOrdersTable({
  orders,
  onShowPaymentDetails,
  onShowDeclineReason,
  statusValue,
  onStatusChange,
  statusOptions,
  filtersActive,
  onClearFilters,
}) {
  const columns = useMemo(
    () => [
      {
        accessorKey: "id",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Order" />
        ),
        cell: ({ row }) => {
          const id = row.getValue("id");
          return (
            <div className="font-mono text-xs text-muted-foreground">
              {id || "—"}
            </div>
          );
        },
        size: 200,
      },
      {
        accessorKey: "customer",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Customer" />
        ),
        cell: ({ row }) => {
          const customer = row.getValue("customer");
          return (
            <div className="flex flex-col gap-0.5">
              {customer?.id ? (
                <Link
                  href={`/customers?user_id=${encodeURIComponent(customer.id)}`}
                  className="font-semibold text-blue-500 hover:underline underline-offset-4"
                >
                  {customer?.name || "Unknown"}
                </Link>
              ) : (
                <span className="font-semibold">
                  {customer?.name || "Unknown"}
                </span>
              )}
              <CopyToClipboard
                text={customer?.email || "-"}
                className="text-xs"
              />
            </div>
          );
        },
        filterFn: (row, id, value) => {
          const customer = row.getValue("customer");
          const haystack = [customer?.name, customer?.email, customer?.phone]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(value.toLowerCase());
        },
        size: 256,
      },
      {
        accessorKey: "partner",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Partner" />
        ),
        cell: ({ row }) => {
          const partner = row.getValue("partner");
          return partner?.id ? (
            <Link
              href={`/partners/${encodeURIComponent(partner.id)}`}
              className="font-medium text-blue-500 hover:underline underline-offset-4"
            >
              {partner?.name || "Unassigned"}
            </Link>
          ) : (
            <span>{partner?.name || "Unassigned"}</span>
          );
        },
      },
      {
        accessorKey: "booking",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Turf" />
        ),
        cell: ({ row }) => {
          const booking = row.getValue("booking");
          const partner = row.getValue("partner");
          console.log("Rendering turf cell for booking:", booking, "and partner:", partner);
          return (
            <div className="flex flex-col gap-0.5">
              {partner?.id && booking?.turfId ? (
                <Link
                  href={`/partners/${encodeURIComponent(
                    partner.id
                  )}#${encodeURIComponent(booking.turfId)}`}
                  className="font-semibold text-blue-500 hover:underline underline-offset-4"
                >
                  {booking?.turfName || "—"}
                </Link>
              ) : (
                <span className="font-medium text-foreground">
                  {booking?.turfName || "—"}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {booking?.courtName || booking?.turfSport || "—"}
              </span>
            </div>
          );
        },
        size: 200,
      },
      {
        id: "slot",
        accessorFn: (row) => row.booking,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Slot" />
        ),
        cell: ({ row }) => {
          const booking = row.original.booking;
          return (
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-foreground">
                {booking?.date || "—"}
              </span>
              <span className="text-xs text-muted-foreground">
                {booking?.startTime && booking?.endTime
                  ? `${booking.startTime} to ${booking.endTime}`
                  : booking?.startTime || booking?.endTime || "—"}
              </span>
            </div>
          );
        },
        size: 150,
      },
      {
        accessorKey: "amount",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Amount" />
        ),
        cell: ({ row }) => {
          const amount = row.getValue("amount");
          const currency = row.original.currency;
          return <div>{formatCurrency(amount, currency)}</div>;
        },
        size: 150,
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const order = row.original;
          return (
            <div className="flex justify-end">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => onShowPaymentDetails(order)}
                    disabled={!order.payment && !order.paymentId}
                  >
                    <ReceiptIndianRupee />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Payment details</TooltipContent>
              </Tooltip>
            </div>
          );
        },
      },
    ],
    [onShowPaymentDetails, onShowDeclineReason]
  );

  const searchableOrders = useMemo(
    () =>
      (orders ?? []).map((order) => {
        try {
          return {
            ...order,
            __searchIndex: buildTurfSearchIndex(order),
          };
        } catch (err) {
          console.error("Failed to build turf search index for order", order?.id, err);
          return { ...order, __searchIndex: "" };
        }
      }),
    [orders]
  );

  const statusFilter =
    statusOptions?.length > 1 ? (
      <Select value={statusValue} onValueChange={onStatusChange}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((value) => (
            <SelectItem key={value} value={value}>
              {value === "all" ? "All Statuses" : toTitleCase(value)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : null;

  const emptyMessage =
    statusValue === "all" && !filtersActive
      ? "Turf reservations will show up once customers book a time slot."
      : "No bookings match the current filters.";

  return (
    <DataTable
      columns={columns}
      data={searchableOrders}
      getSearchValue={(order) => order.__searchIndex}
      enableColumnVisibility
      // toolbarContent={statusFilter}
      showSearchClear
      filtersActive={filtersActive}
      onClearFilters={onClearFilters}
      emptyMessage={emptyMessage}
    />
  );
}

const tabDefinitions = [
  { value: "course", label: "Course / Program" },
  { value: "turf", label: "Turf bookings" },
];

const TURF_STATUS_FILTERS = ["all", "accepted", "declined"];

export function OrdersTabs({ courseOrders, turfOrders, totals }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const orderTabParam = cleanParam(searchParams.get("order_tab")).toLowerCase();
  const partnerIdFilter = cleanParam(searchParams.get("partner_id"));
  const courseIdFilter = cleanParam(searchParams.get("course_id"));
  const batchIdFilter = cleanParam(searchParams.get("batch_id"));
  const planIdFilter = cleanParam(searchParams.get("plan_id"));
  const turfIdFilter = cleanParam(searchParams.get("turf_id"));
  const courtIdFilter = cleanParam(searchParams.get("court_id"));
  const initialTab =
    orderTabParam === "turf" ||
    (!orderTabParam && (turfIdFilter || courtIdFilter))
      ? "turf"
      : "course";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [customerDialogOrder, setCustomerDialogOrder] = useState(null);
  const [paymentDialogOrder, setPaymentDialogOrder] = useState(null);
  const [turfStatus, setTurfStatus] = useState("all");
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [declineDialogOrder, setDeclineDialogOrder] = useState(null);

  const hasQueryFilters = Boolean(
    partnerIdFilter ||
      courseIdFilter ||
      batchIdFilter ||
      planIdFilter ||
      turfIdFilter ||
      courtIdFilter
  );

  const filters = useMemo(
    () => ({
      partnerId: partnerIdFilter,
      courseId: courseIdFilter,
      batchId: batchIdFilter,
      planId: planIdFilter,
      turfId: turfIdFilter,
      courtId: courtIdFilter,
    }),
    [
      partnerIdFilter,
      courseIdFilter,
      batchIdFilter,
      planIdFilter,
      turfIdFilter,
      courtIdFilter,
    ]
  );

  useEffect(() => {
    const nextTab =
      orderTabParam === "turf"
        ? "turf"
        : orderTabParam === "course"
        ? "course"
        : turfIdFilter || courtIdFilter
        ? "turf"
        : "course";

    setActiveTab((previous) => (previous === nextTab ? previous : nextTab));
  }, [orderTabParam, turfIdFilter, courtIdFilter]);

  const courseFiltered = useMemo(
    () => filterOrders(courseOrders, filters),
    [courseOrders, filters]
  );
  const turfFiltered = useMemo(
    () => filterOrders(turfOrders, filters),
    [turfOrders, filters]
  );
  const turfStatusOptions = TURF_STATUS_FILTERS;

  useEffect(() => {
    if (turfStatus !== "all" && !turfStatusOptions.includes(turfStatus)) {
      setTurfStatus("all");
    }
  }, [turfStatusOptions, turfStatus]);

  const turfStatusFiltered = useMemo(() => {
    if (turfStatus === "all") {
      return turfFiltered;
    }
    const normalized = turfStatus.toLowerCase();
    return turfFiltered.filter(
      (order) => (order.status ?? "").toLowerCase() === normalized
    );
  }, [turfFiltered, turfStatus]);

  const resetQueryFilters = useCallback(
    (targetTab = null) => {
      const params = new URLSearchParams(searchParams.toString());
      [
        "partner_id",
        "course_id",
        "batch_id",
        "plan_id",
        "turf_id",
        "court_id",
        "order_query",
      ].forEach((key) => {
        params.delete(key);
      });

      if (targetTab) {
        params.set("order_tab", targetTab);
      } else {
        params.delete("order_tab");
      }

      const queryString = params.toString();
      const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(nextUrl, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const handleCourseClear = useCallback(() => {
    resetQueryFilters("course");
  }, [resetQueryFilters]);

  const handleTurfClear = useCallback(() => {
    setTurfStatus("all");
    resetQueryFilters("turf");
  }, [resetQueryFilters]);

  const handleShowCustomerDetails = useCallback((order) => {
    setCustomerDialogOrder(order);
    setCustomerDialogOpen(true);
  }, []);

  const handleShowPaymentDetails = useCallback((order) => {
    setPaymentDialogOrder(order);
    setPaymentDialogOpen(true);
  }, []);

  const handleShowDeclineReason = useCallback((order) => {
    setDeclineDialogOrder(order ?? null);
    setDeclineDialogOpen(true);
  }, []);

  const totalsSafe = totals ?? {
    combined: { count: 0, amount: 0 },
    course: { count: 0, amount: 0 },
    turf: { count: 0, amount: 0 },
  };
  const hasAnyCourseOrders = (courseOrders?.length ?? 0) > 0;
  const courseCount = courseFiltered.length;
  const turfCount = turfStatusFiltered.length;

  return (
    <>
      <div className="space-y-6">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            {
              label: "Course / program",
              count: totalsSafe.course?.count ?? 0,
              amount: totalsSafe.course?.amount ?? 0,
              amountLabel: "billed",
            },
            {
              label: "Turf bookings",
              count: totalsSafe.turf?.count ?? 0,
              amount: totalsSafe.turf?.amount ?? 0,
              amountLabel: "collected",
            },
            {
              label: "Total orders",
              count: totalsSafe.combined?.count ?? 0,
              amount: totalsSafe.combined?.amount ?? 0,
              amountLabel: "processed",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col gap-1 rounded-xl bg-secondary px-5 py-3"
            >
              <p className="text-xs uppercase text-muted-foreground">
                {stat.label}
              </p>
              <p className="text-2xl font-semibold text-foreground">
                {stat.count}
              </p>
              <p className="text-green-500">
                {formatCurrency(stat.amount, "INR")} {stat.amountLabel}
              </p>
            </div>
          ))}
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {tabDefinitions.map((tab) => {
              const totalCount =
                tab.value === "course"
                  ? totalsSafe.course?.count ?? 0
                  : totalsSafe.turf?.count ?? 0;

              return (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="course" className="focus-visible:outline-none">
            <CourseOrdersTable
              orders={courseFiltered}
              onShowCustomerDetails={handleShowCustomerDetails}
              onShowPaymentDetails={handleShowPaymentDetails}
              filtersActive={hasQueryFilters}
              onClearFilters={handleCourseClear}
              hasAnyOrders={hasAnyCourseOrders}
            />
          </TabsContent>

          <TabsContent value="turf" className="focus-visible:outline-none">
            <TurfOrdersTable
              orders={turfStatusFiltered}
              onShowPaymentDetails={handleShowPaymentDetails}
              onShowDeclineReason={handleShowDeclineReason}
              statusValue={turfStatus}
              onStatusChange={setTurfStatus}
              statusOptions={turfStatusOptions}
              filtersActive={hasQueryFilters || turfStatus !== "all"}
              onClearFilters={handleTurfClear}
            />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog
        open={declineDialogOpen}
        onOpenChange={(open) => {
          setDeclineDialogOpen(open);
          if (!open) {
            setDeclineDialogOrder(null);
          }
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Decline reason</DialogTitle>
            <DialogDescription>
              Order {declineDialogOrder?.id ? `#${declineDialogOrder.id}` : ""}
            </DialogDescription>
          </DialogHeader>
          <p className="rounded-sm bg-secondary px-3 py-2 text-sm leading-normal text-muted-foreground">
            {declineDialogOrder?.booking?.declineReason?.trim() ||
              "No decline reason was provided for this booking."}
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button size="sm" variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={customerDialogOpen}
        onOpenChange={(open) => {
          setCustomerDialogOpen(open);
          if (!open) {
            setCustomerDialogOrder(null);
          }
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Ordered for</DialogTitle>
            <DialogDescription>
              Order{" "}
              {customerDialogOrder?.id ? `#${customerDialogOrder.id}` : ""}
            </DialogDescription>
          </DialogHeader>
          <DetailsTable
            rows={buildCustomerRows(customerDialogOrder)}
            emptyMessage="No customer details were provided for this order."
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button size="sm" variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={paymentDialogOpen}
        onOpenChange={(open) => {
          setPaymentDialogOpen(open);
          if (!open) {
            setPaymentDialogOrder(null);
          }
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Payment details</DialogTitle>
            <DialogDescription>
              Order {paymentDialogOrder?.id ? `#${paymentDialogOrder.id}` : ""}
            </DialogDescription>
          </DialogHeader>
          <DetailsTable
            rows={buildPaymentRows(paymentDialogOrder)}
            emptyMessage="No payment record was linked to this order."
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button size="sm" variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
