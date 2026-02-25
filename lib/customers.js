const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric"
});

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return dateFormatter.format(date);
}

function extractAggregateCount(source) {
  if (!Array.isArray(source) || source.length === 0) {
    return 0;
  }

  return source.reduce((total, entry) => {
    const count = typeof entry?.count === "number" ? entry.count : Number(entry?.count) || 0;
    return total + count;
  }, 0);
}

function parseLikedSports(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((sport) => String(sport).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return [];
    }

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((sport) => String(sport).trim()).filter(Boolean);
        }
      } catch (error) {
        // fall through to delimiter handling
      }
    }

    return trimmed
      .replace(/^[\[\{]|[\]\}]$/g, "")
      .split(/[,|]/)
      .map((sport) => sport.replace(/^"|"$/g, "").replace(/^'|'$/g, "").trim())
      .filter(Boolean);
  }

  return [];
}

function resolveInitials(name) {
  if (!name || typeof name !== "string") {
    return "";
  }

  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) {
    return "";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function normalizeCustomerRecord(customer) {
  if (!customer || typeof customer !== "object") {
    return {
      id: "",
      name: "Unknown customer",
      email: "",
      phone: "",
      gender: "",
      profileImage: "",
      initials: "",
      likedSports: [],
      likedSportsRaw: "",
      pincode: "",
      enrollments: 0,
      turfBookings: 0,
      joinedAt: "-",
      updatedAt: "-",
      createdAt: null,
      lastUpdatedAt: null
    };
  }

  const likedSports = parseLikedSports(customer.liked_sports);
  const enrollments = extractAggregateCount(customer.enrollments);
  const turfBookings = extractAggregateCount(customer.turf_bookings);
  const createdAt = customer.created_at ?? null;
  const updatedAt = customer.updated_at ?? createdAt;

  return {
    id: customer.id ?? "",
    name: customer.name ?? "Unnamed customer",
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    gender: customer.gender ?? "",
    profileImage: customer.profile_image ?? "",
    initials: resolveInitials(customer.name ?? ""),
    likedSports,
    likedSportsRaw: customer.liked_sports ?? "",
    pincode: customer.pincode !== undefined && customer.pincode !== null ? String(customer.pincode) : "",
    enrollments,
    turfBookings,
    joinedAt: formatDate(createdAt),
    updatedAt: formatDate(updatedAt),
    createdAt,
    lastUpdatedAt: updatedAt,
    deletedAt: customer.deleted_at ?? null
  };
}

export async function fetchCustomers(options = {}) {
  const { getCustomers } = await import('./supabase');
  const result = await getCustomers(options);
  
  // Handle both array and object return formats
  const dataArray = Array.isArray(result) ? result : (result.customers || []);
  return dataArray.map(normalizeCustomerRecord);
}
