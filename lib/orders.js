const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

const dateOnlyFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric"
});

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return dateFormatter.format(date);
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return dateOnlyFormatter.format(date);
}

function formatTime(value) {
  if (!value) {
    return "-";
  }

  if (typeof value === "string") {
    return value.slice(0, 5);
  }

  if (value instanceof Date) {
    return value.toISOString().slice(11, 16);
  }

  return String(value);
}

function toAmount(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function safeString(value) {
  return value === null || value === undefined ? "" : String(value);
}

function deriveCourseStatus(status) {
  if (!status) {
    return "Pending";
  }

  const normalized = status.toLowerCase();
  switch (normalized) {
    case "completed":
    case "active":
    case "success":
      return "Completed";
    case "cancelled":
    case "canceled":
      return "Cancelled";
    case "failed":
      return "Failed";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

function deriveTurfStatus(order) {
  if (order?.declined) {
    return "Declined";
  }
  return "Accepted";
}

function normalizePayment(payment) {
  if (!payment || typeof payment !== "object") {
    return null;
  }

  return {
    id: payment.id ?? "",
    type: safeString(payment.type),
    status: safeString(payment.status) || "Unknown",
    amount: toAmount(payment.amount),
    currency: payment.currency ?? "INR",
    razorpayOrderId: safeString(payment.razorpay_order_id),
    razorpayPaymentId: safeString(payment.razorpay_payment_id),
    userId: payment.user_id ?? "",
    createdAt: payment.created_at ?? null,
    createdAtLabel: formatDateTime(payment.created_at)
  };
}

function normalizeCourseOrder(order) {
  if (!order || typeof order !== "object") {
    return null;
  }

  const user = order.user ?? {};
  const plan = order.plan ?? {};
  const batch = plan.batch ?? {};
  const course = (batch.course ?? plan.course) ?? {};
  const partner = order.partner ?? {};
  const amount = toAmount(plan.fees ?? plan.price ?? 0);

  return {
    id: order.id ?? "",
    type: "course",
    typeLabel: "Course / Program",
    status: deriveCourseStatus(order.status),
    statusRaw: safeString(order.status).toLowerCase(),
    createdAt: order.created_at ?? null,
    createdAtLabel: formatDateTime(order.created_at),
    amount,
    currency: plan.currency ?? "INR",
    customerDetails: order.customer_details ?? null,
    paymentId: order.payment_id ?? null,
    payment: normalizePayment(order.payment),
    customer: {
      id: user.id ?? "",
      name: safeString(user.name) || "Unknown customer",
      email: safeString(user.email),
      phone: safeString(user.phone),
      gender: safeString(user.gender)
    },
    partner: {
      id: partner.id ?? "",
      name: partner.name ?? "Unassigned partner"
    },
    plan: {
      id: plan.id ?? "",
      courseId: course.id ?? "",
      batchId: batch.id ?? "",
      duration: plan.duration ?? "",
      fees: amount,
      batchName: batch.name ?? "",
      courseName: course.name ?? course.title ?? "",
      sport: course.sport ?? course.category ?? "",
      schedule: batch.schedule ?? batch.timing ?? ""
    }
  };
}

function normalizeTurfOrder(order) {
  if (!order || typeof order !== "object") {
    return null;
  }

  const user = order.user ?? {};
  const partner = order.partner ?? {};
  const court = order.court ?? {};
  const turf = court.turf ?? {};
  const amount = toAmount(order.total_amount);

  return {
    id: order.id ?? "",
    type: "turf",
    typeLabel: "Turf Booking",
    status: deriveTurfStatus(order),
    statusRaw: order.declined ? "declined" : "accepted",
    createdAt: order.created_at ?? null,
    createdAtLabel: formatDateTime(order.created_at),
    amount,
    currency: "INR",
      customerDetails: order.customer_details ?? null,
      paymentId: order.payment_id ?? null,
      payment: normalizePayment(order.payment),
    customer: {
      id: user.id ?? "",
      name: safeString(user.name) || "Unknown customer",
      email: safeString(user.email),
      phone: safeString(user.phone),
      gender: safeString(user.gender)
    },
    partner: {
      id: partner.id ?? "",
      name: partner.name ?? "Unassigned partner"
    },
    booking: {
      paymentId: safeString(order.payment_id),
      declined: Boolean(order.declined),
      declineReason: safeString(order.decline_reason),
      date: formatDate(order.date),
      startTime: formatTime(order.start_time),
      endTime: formatTime(order.end_time),
      courtId: court.id ?? "",
      courtName: court.name ?? court.title ?? "",
      turfId: turf.id ?? "",
      turfName: turf.name ?? turf.title ?? "",
      turfSport: turf.sport ?? turf.category ?? ""
    }
  };
}

function buildCombinedOrders(courseOrders, turfOrders) {
  const combined = [];

  for (const order of courseOrders) {
    combined.push({
      ...order,
      displayAmount: order.amount,
      displayCurrency: order.currency,
      detailType: "course"
    });
  }

  for (const order of turfOrders) {
    combined.push({
      ...order,
      displayAmount: order.amount,
      displayCurrency: order.currency,
      detailType: "turf"
    });
  }

  return combined.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });
}

function computeTotals(orders) {
  return orders.reduce(
    (accumulator, order) => {
      return {
        count: accumulator.count + 1,
        amount: accumulator.amount + (order.amount ?? 0)
      };
    },
    { count: 0, amount: 0 }
  );
}

export async function fetchOrders() {
  const { getCourseOrders, getTurfOrders, getPaymentsByIds } = await import("./supabase");

  const [courseRaw, turfRaw] = await Promise.all([
    getCourseOrders(),
    getTurfOrders()
  ]);

  const paymentIds = new Set();

  for (const order of courseRaw ?? []) {
    if (order?.payment_id) {
      paymentIds.add(order.payment_id);
    }
  }

  for (const order of turfRaw ?? []) {
    if (order?.payment_id) {
      paymentIds.add(order.payment_id);
    }
  }

  let paymentsMap = new Map();
  if (paymentIds.size > 0) {
    try {
      const payments = await getPaymentsByIds(Array.from(paymentIds));
      paymentsMap = new Map((payments ?? []).map((payment) => [payment.id, payment]));
    } catch (error) {
      console.error("Failed to hydrate payments for orders", error);
    }
  }

  const courseWithPayments = (courseRaw ?? []).map((order) => {
    const payment = order?.payment_id ? paymentsMap.get(order.payment_id) : null;
    return payment ? { ...order, payment } : order;
  });

  const turfWithPayments = (turfRaw ?? []).map((order) => {
    const payment = order?.payment_id ? paymentsMap.get(order.payment_id) : null;
    return payment ? { ...order, payment } : order;
  });

  const courseOrders = courseWithPayments
    .map(normalizeCourseOrder)
    .filter(Boolean);
  const turfOrders = turfWithPayments
    .map(normalizeTurfOrder)
    .filter(Boolean);
  const combinedOrders = buildCombinedOrders(courseOrders, turfOrders);

  const result = {
    courseOrders,
    turfOrders,
    combinedOrders,
    totals: {
      course: computeTotals(courseOrders),
      turf: computeTotals(turfOrders),
      combined: computeTotals(combinedOrders)
    }
  };

  // Deep clone to remove any potential circular references
  return JSON.parse(JSON.stringify(result));
}

export {
  normalizeCourseOrder,
  normalizeTurfOrder
};
