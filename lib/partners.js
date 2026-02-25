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

function formatAddressText(address) {
  if (!address || typeof address !== "object") {
    return "";
  }

  const parts = [address.street, address.city, address.state, address.pin].filter(Boolean);
  return parts.join(", ");
}

function parseSports(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((sport) => String(sport).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((sport) => String(sport).trim()).filter(Boolean);
        }
      } catch (error) {
        // fall through
      }
    }

    return trimmed
      .replace(/^\[|\]$/g, "")
      .split(",")
      .map((sport) => sport.replace(/^"|"$/g, "").replace(/^'|'$/g, "").trim())
      .filter(Boolean);
  }

  return [];
}

function parseGallery(value) {
  if (!value) {
    return [];
  }

  let source = value;
  if (typeof value === "string") {
    try {
      source = JSON.parse(value);
    } catch (error) {
      console.error("Failed to parse partner gallery", error);
      return [];
    }
  }

  if (!Array.isArray(source)) {
    return [];
  }

  return source
    .map((item, index) => {
      if (!item) {
        return null;
      }

      if (item.type === "video" && item.data) {
        const match = item.data.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/);
        const videoId = match ? match[1] : null;
        return {
          id: `${index}`,
          type: "video",
          title: item.name || "Gallery video",
          src: videoId ? `https://www.youtube.com/embed/${videoId}` : item.data
        };
      }

      if (item.type === "image" && item.data) {
        return {
          id: `${index}`,
          type: "image",
          title: item.name || "Gallery image",
          src: item.data
        };
      }

      if (typeof item === "string") {
        return {
          id: `${index}`,
          type: "image",
          title: "Gallery image",
          src: item
        };
      }

      return null;
    })
    .filter(Boolean);
}

export function normalizePartnerRecord(partner) {
  if (!partner || typeof partner !== "object") {
    return {
      id: "",
      slug: "",
      name: "Unnamed partner",
      publicId: "",
      email: "",
      whatsapp: "",
      role: "",
      status: "pending",
      type: "academy",
      city: "",
      verified: false,
      whatsappVerified: false,
      address: null,
      addressText: "",
      about: "",
      sportsRaw: "",
      logo: "",
      sports: [],
      gallery: [],
      joinedAt: "-",
      lastActive: "-",
      createdAt: null,
      updatedAt: null
    };
  }

  const address = partner.address && typeof partner.address === "object" ? partner.address : null;
  const statusSource = partner.status ?? (partner.verified ? "active" : "pending");
  const status = typeof statusSource === "string" ? statusSource.toLowerCase() : partner.verified ? "active" : "pending";
  const typeSource = partner.type ?? partner.partner_type ?? partner.category;
  const type = typeof typeSource === "string" ? typeSource.toLowerCase() : "academy";
  const contactName =
    partner.contact_name ??
    partner.primary_contact_name ??
    partner.owner_name ??
    partner.applicant_name ??
    "";

  const joinedAtRaw = partner.created_at ?? null;
  const updatedAtRaw = partner.updated_at ?? null;

  return {
    id: partner.id ?? "",
    slug: partner.slug ?? partner.id ?? "",
    name: partner.name ?? "Unnamed partner",
    publicId: partner.public_id ?? "",
    email: partner.email ?? "",
    whatsapp: partner.whatsapp ?? "",
    role: partner.role ?? "",
    status,
    type,
    city: partner.city ?? (address ? address.city ?? address.town ?? "" : ""),
    state: partner.state ?? (address ? address.state ?? "" : ""),
    pin: partner.pin ?? (address ? address.pin ?? "" : ""),
    street: partner.street ?? (address ? address.street ?? "" : ""),
    verified: Boolean(partner.verified),
    whatsappVerified: Boolean(partner.whatsapp_verified),
    address,
    addressText: formatAddressText(address),
    about: partner.about ?? "",
    sportsRaw: partner.sports ?? "",
    logo: partner.logo_image ?? "",
    sports: parseSports(partner.sports),
    gallery: parseGallery(partner.gallery),
    joinedAt: formatDate(joinedAtRaw),
    lastActive: formatDate(partner.last_active_at ?? updatedAtRaw ?? joinedAtRaw),
    createdAt: joinedAtRaw,
    updatedAt: updatedAtRaw
  };
}

export async function fetchPartners(options = {}) {
  const { getPartners } = await import("./supabase");
  const result = await getPartners(options);
  
  // Handle both array and object return formats
  const dataArray = Array.isArray(result) ? result : (result.partners || []);
  return dataArray.map(normalizePartnerRecord);
}

function normalizeCoach(coach) {
  if (!coach || typeof coach !== "object") {
    return null;
  }

  return {
    id: coach.id ?? coach.uuid ?? "",
    name: coach.name ?? coach.full_name ?? coach.display_name ?? "Unknown coach",
    sport: coach.sport ?? coach.specialization ?? coach.expertise ?? "",
    bio: coach.bio ?? coach.about ?? "",
    avatar: coach.profile_image ?? coach.avatar ?? coach.image ?? "",
    updatedAt: coach.updated_at ?? null
  };
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

function deriveMetadata(source, excludeKeys) {
  if (!source || typeof source !== "object") {
    return {};
  }

  const metadata = {};

  for (const [key, value] of Object.entries(source)) {
    if (excludeKeys.has(key)) {
      continue;
    }

    if (value === null || value === undefined) {
      continue;
    }

    if (typeof value === "object") {
      continue;
    }

    metadata[key] = value;
  }

  return metadata;
}

function normalizePlan(plan) {
  if (!plan || typeof plan !== "object") {
    return null;
  }

  const bookingCount = extractAggregateCount(plan.students);
  const price = plan.fees ?? plan.price ?? plan.amount ?? null;
  const excludeKeys = new Set([
    "students",
    "id",
    "plan_id",
    "batch_id",
    "course_id",
    "partner_id",
    "name",
    "title",
    "duration",
    "fees",
    "price",
    "amount",
    "sessions",
    "session_count",
    "frequency",
    "billing_cycle",
    "cycle",
    "description",
    "active",
    "currency",
    "start_date",
    "end_date",
    "valid_from",
    "valid_to",
    "created_at",
    "updated_at"
  ]);

  const metadata = deriveMetadata(plan, excludeKeys);

  return {
    id: plan.id ?? "",
    name: plan.name ?? plan.title ?? plan.duration ?? "Unnamed plan",
    duration: plan.duration ?? "",
    fees: plan.fees ?? price ?? null,
    price,
    currency: plan.currency ?? null,
    sessions: plan.sessions ?? plan.session_count ?? null,
    frequency: plan.frequency ?? plan.billing_cycle ?? plan.cycle ?? "",
    description: plan.description ?? "",
    startDate: plan.start_date ?? plan.valid_from ?? null,
    endDate: plan.end_date ?? plan.valid_to ?? null,
    active: plan.active !== undefined ? Boolean(plan.active) : true,
    bookingCount,
    createdAt: plan.created_at ?? null,
    updatedAt: plan.updated_at ?? null,
    metadata: Object.keys(metadata).length ? metadata : null
  };
}

function normalizeBatch(batch) {
  if (!batch || typeof batch !== "object") {
    return null;
  }

  const plans = Array.isArray(batch.batch_plans) ? batch.batch_plans.map(normalizePlan).filter(Boolean) : [];
  const planCount = plans.length;
  const bookingCount = plans.reduce((total, plan) => total + (plan.bookingCount ?? 0), 0);
  const excludeKeys = new Set([
    "batch_plans",
    "plans",
    "id",
    "name",
    "title",
    "schedule",
    "timing",
    "capacity",
    "description",
    "note",
    "days",
    "days_of_week",
    "active",
    "start_date",
    "end_date",
    "starts_at",
    "ends_at",
    "created_at",
    "updated_at",
    "course_id",
    "partner_id"
  ]);

  const metadata = deriveMetadata(batch, excludeKeys);

  return {
    id: batch.id ?? "",
    name: batch.name ?? batch.title ?? "Unnamed batch",
    schedule: batch.schedule ?? batch.timing ?? "",
    capacity: batch.capacity ?? null,
    description: batch.description ?? "",
    note: batch.note ?? "",
    days: batch.days ?? batch.days_of_week ?? "",
    active: batch.active !== undefined ? Boolean(batch.active) : true,
    startsAt: batch.start_date ?? batch.starts_at ?? null,
    endsAt: batch.end_date ?? batch.ends_at ?? null,
    createdAt: batch.created_at ?? null,
    updatedAt: batch.updated_at ?? null,
    planCount,
    bookingCount,
    plans,
    metadata: Object.keys(metadata).length ? metadata : null
  };
}

function normalizeCourse(course) {
  if (!course || typeof course !== "object") {
    return null;
  }

  const batches = Array.isArray(course.batches) ? course.batches.map(normalizeBatch).filter(Boolean) : [];
  const batchCount = batches.length;
  const planCount = batches.reduce((total, batch) => total + (batch.planCount ?? 0), 0);
  const bookingCount = batches.reduce((total, batch) => total + (batch.bookingCount ?? 0), 0);
  const excludeKeys = new Set([
    "batches",
    "id",
    "name",
    "title",
    "slug",
    "sport",
    "category",
    "level",
    "difficulty",
    "price",
    "fee",
    "fees",
    "currency",
    "description",
    "duration",
    "sessions",
    "active",
    "start_date",
    "end_date",
    "starts_at",
    "ends_at",
    "created_at",
    "updated_at"
  ]);

  const metadata = deriveMetadata(course, excludeKeys);

  return {
    id: course.id ?? "",
    name: course.name ?? course.title ?? "Untitled",
    slug: course.slug ?? "",
    sport: course.sport ?? course.category ?? "",
    level: course.level ?? course.difficulty ?? "",
    description: course.description ?? "",
    price: course.price ?? course.fee ?? null,
    fees: course.fees ?? null,
    currency: course.currency ?? null,
    duration: course.duration ?? "",
    sessions: course.sessions ?? null,
    active: course.active !== undefined ? Boolean(course.active) : true,
    startDate: course.start_date ?? course.starts_at ?? null,
    endDate: course.end_date ?? course.ends_at ?? null,
    createdAt: course.created_at ?? null,
    updatedAt: course.updated_at ?? null,
    batchCount,
    planCount,
    bookingCount,
    batches,
    metadata: Object.keys(metadata).length ? metadata : null
  };
}

function normalizeCourt(court, bookingCountsByCourt) {
  if (!court || typeof court !== "object") {
    return null;
  }

  const resolvedId = court.id ?? court.court_id ?? court.uuid ?? "";
  const bookingCount = bookingCountsByCourt?.get(String(resolvedId)) ?? 0;
  const excludeKeys = new Set([
    "id",
    "court_id",
    "uuid",
    "name",
    "sport",
    "surface",
    "type",
    "indoor",
    "is_indoor",
    "pricing",
    "rate",
    "active",
    "turf_id",
    "partner_id",
    "created_at",
    "updated_at",
    "metadata"
  ]);

  const metadata = deriveMetadata(court, excludeKeys);

  return {
    id: resolvedId,
    name: court.name ?? "Unnamed court",
    sport: court.sport ?? "",
    surface: court.surface ?? court.type ?? "",
    indoor: court.indoor ?? court.is_indoor ?? null,
    pricing: court.pricing ?? court.rate ?? null,
    active: court.active !== undefined ? Boolean(court.active) : true,
    bookingCount,
    createdAt: court.created_at ?? null,
    updatedAt: court.updated_at ?? null,
    metadata: Object.keys(metadata).length ? metadata : null
  };
}

function normalizeTurf(turf, bookingCountsByCourt) {
  if (!turf || typeof turf !== "object") {
    return null;
  }

  const address = turf.address && typeof turf.address === "object" ? turf.address : {};
  const courts = Array.isArray(turf.courts)
    ? turf.courts.map((court) => normalizeCourt(court, bookingCountsByCourt)).filter(Boolean)
    : [];
  const bookingCount = courts.reduce((total, court) => total + (court.bookingCount ?? 0), 0);
  const excludeKeys = new Set([
    "courts",
    "address",
    "id",
    "name",
    "sport",
    "category",
    "city",
    "state",
    "addressText",
    "active",
    "created_at",
    "updated_at",
    "partner_id",
    "metadata"
  ]);

  const metadata = deriveMetadata(turf, excludeKeys);

  return {
    id: turf.id ?? "",
    name: turf.name ?? "Unnamed turf",
    sport: turf.sport ?? turf.category ?? "",
    city: turf.city ?? address.city ?? "",
    state: turf.state ?? address.state ?? "",
    addressText: formatAddressText(address),
    courts,
    courtCount: courts.length,
    bookingCount,
    active: turf.active !== undefined ? Boolean(turf.active) : true,
    createdAt: turf.created_at ?? null,
    updatedAt: turf.updated_at ?? null,
    metadata: Object.keys(metadata).length ? metadata : null
  };
}

export function normalizePartnerDetail(partner) {
  if (!partner) {
    return null;
  }

  const base = normalizePartnerRecord(partner);
  const isAcademy = String(base.role || "").toLowerCase() === "academy";
  const turfBookings = Array.isArray(partner.turfBookings) ? partner.turfBookings : [];
  const bookingCountsByCourt = turfBookings.reduce((accumulator, booking) => {
    if (!booking || booking.declined) {
      return accumulator;
    }

    const courtId = booking.court_id ?? booking.courtId ?? booking.court?.id ?? null;

    if (!courtId) {
      return accumulator;
    }

    const key = String(courtId);
    accumulator.set(key, (accumulator.get(key) ?? 0) + 1);
    return accumulator;
  }, new Map());

  const coaches = Array.isArray(partner.tutors)
    ? partner.tutors.map(normalizeCoach).filter(Boolean)
    : [];
  const courses = Array.isArray(partner.courses)
    ? partner.courses.map(normalizeCourse).filter(Boolean)
    : [];
  const turfs = isAcademy
    ? []
    : Array.isArray(partner.turfs)
    ? partner.turfs.map((turf) => normalizeTurf(turf, bookingCountsByCourt)).filter(Boolean)
    : [];
  const totalCourseBatches = courses.reduce((total, course) => total + (course.batchCount ?? 0), 0);
  const totalCoursePlans = courses.reduce((total, course) => total + (course.planCount ?? 0), 0);
  const totalCourseBookings = courses.reduce((total, course) => total + (course.bookingCount ?? 0), 0);
  const totalTurfCourts = turfs.reduce((total, turf) => total + (turf.courtCount ?? 0), 0);
  const totalTurfBookings = turfs.reduce((total, turf) => total + (turf.bookingCount ?? 0), 0);

  return {
    ...base,
    coaches,
    courses,
    turfs,
    batches: partner.batches,
    batch_plans: partner.batch_plans,
    enrollments: partner.enrollments,
    turf_courts: isAcademy ? [] : partner.turf_courts,
    turf_bookings: isAcademy ? [] : partner.turf_bookings,
    metrics: {
      coaches: coaches.length,
      courses: courses.length,
      turfs: turfs.length,
      gallery: base.gallery.length,
      sports: base.sports.length,
      courseBatches: totalCourseBatches,
      coursePlans: totalCoursePlans,
      courseBookings: totalCourseBookings,
      turfCourts: totalTurfCourts,
      turfBookings: totalTurfBookings
    }
  };
}

export async function fetchPartnerDetail(partnerId) {
  const normalizedId = typeof partnerId === "string" ? partnerId.trim() : partnerId;

  if (!normalizedId || normalizedId === "undefined" || normalizedId === "null") {
    return null;
  }

  const { getPartnerDetail } = await import("./supabase");
  const partner = await getPartnerDetail(normalizedId);

  if (!partner) {
    return null;
  }

  return normalizePartnerDetail(partner);
}
