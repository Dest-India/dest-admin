import { createClient } from "@supabase/supabase-js";

let supabaseAdmin;

export function getSupabaseAdmin() {
  if (supabaseAdmin) {
    return supabaseAdmin;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase admin environment variables");
  }

  supabaseAdmin = createClient(url, serviceRoleKey);
  return supabaseAdmin;
}

const client = getSupabaseAdmin();

export async function getPartners(options = {}) {
  const { limit = 20, offset = 0 } = options; // Default to 20 for better performance
  
  let query = client
    .from('partners')
    .select('id, name, role, email, whatsapp, logo_image, address, sports, created_at, verified, disabled, public_id', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Failed to fetch partners from Supabase", error);
    // Don't throw - return empty data for graceful degradation
    return {
      partners: [],
      total: 0
    };
  }

  return {
    partners: Array.isArray(data) ? data : [],
    total: count || 0
  };
}

// Helper function to normalize sports field
function normalizeSports(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  
  // If it's a string that looks like JSON array
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // Fall through to split on comma
      }
    }
    // Split on comma if not JSON
    return trimmed.split(",").map(s => s.trim()).filter(Boolean);
  }
  
  return [];
}

// PERFORMANCE: Paginated version for handling large datasets
export async function getPartnersPaginated({ page = 0, limit = 50, search = "" }) {
  let query = client
    .from("partners")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  // Search filter across name, email, and city
  if (search && search.trim()) {
    const searchTerm = search.trim();
    query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`);
  }

  // Pagination range
  const from = page * limit;
  const to = from + limit - 1;
  
  const { data, error, count } = await query.range(from, to);

  // PGRST103 means "Requested range not satisfiable" - this happens when we request
  // data beyond what exists (e.g., requesting rows 50-99 when only 5 rows exist)
  // This is normal for pagination and should return empty results, not throw an error
  if (error) {
    if (error.code === 'PGRST103') {
      // Range not satisfiable - no more data available
      return {
        partners: [],
        totalCount: count || 0,
        hasMore: false,
        currentPage: page,
      };
    }
    
    // For other errors, throw
    console.error("Failed to fetch paginated partners", error);
    throw new Error("Unable to fetch partners");
  }

  // Normalize sports field to always be an array
  const normalizedPartners = (Array.isArray(data) ? data : []).map(partner => ({
    ...partner,
    sports: normalizeSports(partner.sports)
  }));

  return {
    partners: normalizedPartners,
    totalCount: count || 0,
    hasMore: count ? (from + limit) < count : false,
    currentPage: page,
  };
}

export async function approvePartner(partnerId) {
  if (!partnerId) {
    throw new Error("Partner id is required");
  }


  const { data, error } = await client
    .from("partners")
    .update({ verified: true, updated_at: new Date().toISOString() })
    .eq("id", partnerId)
    .select()
    .maybeSingle();

  if (error) {
    console.error("Failed to approve partner", error);
    throw new Error("Unable to approve partner");
  }

  if (!data) {
    throw new Error("Partner not found");
  }

  return data;
}

export async function toggleDisabledPartner(partnerId) {
  if (!partnerId) {
    throw new Error("Partner id is required");
  }

  // First, get the current disabled status
  const { data: current, error: fetchError } = await client
    .from("partners")
    .select("disabled")
    .eq("id", partnerId)
    .maybeSingle();

  if (fetchError) {
    console.error("Failed to fetch partner disabled status", fetchError);
    throw new Error("Unable to fetch partner status");
  }

  if (!current) {
    throw new Error("Partner not found");
  }

  const newDisabled = !current.disabled;

  const { data, error } = await client
    .from("partners")
    .update({ disabled: newDisabled, updated_at: new Date().toISOString() })
    .eq("id", partnerId)
    .select()
    .maybeSingle();

  if (error) {
    console.error("Failed to toggle partner disabled status", error);
    throw new Error("Unable to update partner status");
  }

  if (!data) {
    throw new Error("Partner not found");
  }

  return data;
}

export async function getPartnerDetail(partnerIdentifier) {
  if (!partnerIdentifier) {
    throw new Error("Partner identifier is required");
  }

  // Ensure client is initialized
  const dbClient = getSupabaseAdmin();
  if (!dbClient) {
    throw new Error("Supabase client not initialized");
  }

  const columns = `
      *,
      tutors:tutors(*),
      courses:courses(*),
      turfs:turfs(*)
    `;

  async function queryBy(column, value) {
    return dbClient
      .from("partners")
      .select(columns)
      .eq(column, value)
      .maybeSingle();
  }

  const attempts = [
    ["id", partnerIdentifier],
    ["public_id", partnerIdentifier],
    ["slug", partnerIdentifier]
  ];

  for (const [column, value] of attempts) {
    if (!value) {
      continue;
    }

    const { data, error } = await queryBy(column, value);

    if (error) {
      if (error.code && error.code === "PGRST116") {
        continue;
      }
      console.error("Failed to fetch partner detail", error);
      throw new Error(`Unable to fetch partner detail: ${error?.message || "Unknown error"}`);
    }

    if (data) {
      // Get IDs from courses and turfs to fetch related data
      const courseIds = (data.courses || []).map(c => c.id).filter(Boolean);
      const turfIds = (data.turfs || []).map(t => t.id).filter(Boolean);

      let batches = [];
      let batch_plans = [];
      let enrollments = [];
      let turf_courts = [];
      let turf_bookings = [];

      // Fetch batches for courses
      if (courseIds.length > 0) {
        const batchesResult = await dbClient.from("batches").select("*").in("course_id", courseIds);
        batches = batchesResult.data || [];
      }

      // Fetch batch_plans for batches
      if (batches.length > 0) {
        const batchIds = batches.map(b => b.id);
        const batchPlansResult = await dbClient.from("batch_plans").select("*").in("batch_id", batchIds);
        batch_plans = batchPlansResult.data || [];
      }

      // Fetch enrollments for batch_plans
      if (batch_plans.length > 0) {
        const planIds = batch_plans.map(p => p.id);
        const enrollmentsResult = await dbClient.from("enrollments").select("*").in("plan_id", planIds);
        enrollments = enrollmentsResult.data || [];
      }

      // Fetch turf_courts for turfs
      if (turfIds.length > 0) {
        const turfCourtsResult = await dbClient.from("turf_courts").select("*").in("turf_id", turfIds);
        turf_courts = turfCourtsResult.data || [];
      }

      // Fetch turf_bookings for turf_courts
      if (turf_courts.length > 0) {
        const courtIds = turf_courts.map(c => c.id);
        const turfBookingsResult = await dbClient.from("turf_bookings").select("*").in("court_id", courtIds);
        turf_bookings = turfBookingsResult.data || [];
      }

      const result = {
        ...data,
        batches,
        batch_plans,
        enrollments,
        turf_courts,
        turf_bookings
      };

      return result;
    }
  }

  return null;
}

export async function getCustomers(options = {}) {
  const { limit, offset = 0 } = options;

  const columns = `*,
    enrollments:enrollments(count),
    turf_bookings:turf_bookings(count)
  `;

  // Get total count
  const { count, error: countError } = await client
    .from("users")
    .select("*", { count: "exact", head: true })
    .is("deleted_at", null);

  if (countError) {
    console.error("Failed to count customers", countError);
  }

  // Get paginated data
  let query = client
    .from("users")
    .select(columns)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (limit) {
    query = query.range(offset, offset + limit - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch customers", error);
    throw new Error("Unable to fetch customers");
  }

  return {
    customers: Array.isArray(data) ? data : [],
    total: count || 0
  };
}

export async function getCourseOrders() {

  try {

  const { data: enrollments, error } = await client
    .from("enrollments")
    .select(`*,
      partner:partners(id, name),
      user:users(*)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch course orders", error);
    throw new Error("Unable to fetch course orders");
  }

  if (enrollments.length === 0) {
    return [];
  }

  const planIds = Array.from(
    new Set(
      enrollments
        .map((enrollment) => enrollment.plan_id)
        .filter((planId) => Boolean(planId))
    )
  );

  if (planIds.length === 0) {
    return enrollments;
  }

  const plansMap = new Map();
  const batchesMap = new Map();
  const coursesMap = new Map();

  try {
    const { data: plansData, error: plansError } = await client
      .from("batch_plans")
      .select("*")
      .in("id", planIds);

    if (plansError) {
      console.error("Failed to fetch batch plans for orders", plansError);
    } else if (Array.isArray(plansData) && plansData.length > 0) {
      for (const plan of plansData) {
        if (plan && plan.id) {
          plansMap.set(plan.id, plan);
        }
      }

      const batchIds = Array.from(
        new Set(
          plansData
            .map((plan) => plan?.batch_id)
            .filter((batchId) => Boolean(batchId))
        )
      );

      if (batchIds.length > 0) {
        const { data: batchesData, error: batchesError } = await client
          .from("batches")
          .select("*")
          .in("id", batchIds);

        if (batchesError) {
          console.error("Failed to fetch batches for orders", batchesError);
        } else if (Array.isArray(batchesData) && batchesData.length > 0) {
          for (const batch of batchesData) {
            if (batch && batch.id) {
              batchesMap.set(batch.id, batch);
            }
          }

          const courseIds = new Set();

          for (const plan of plansData) {
            if (plan?.course_id) {
              courseIds.add(plan.course_id);
            }
          }

          for (const batch of batchesData) {
            if (batch?.course_id) {
              courseIds.add(batch.course_id);
            }
          }

          if (courseIds.size > 0) {
            const { data: coursesData, error: coursesError } = await client
              .from("courses")
              .select("*")
              .in("id", Array.from(courseIds));

            if (coursesError) {
              console.error("Failed to fetch courses for orders", coursesError);
            } else if (Array.isArray(coursesData) && coursesData.length > 0) {
              for (const course of coursesData) {
                if (course && course.id) {
                  coursesMap.set(course.id, course);
                }
              }
            }
          }
        }
      }
    }
  } catch (fetchError) {
    console.error("Unexpected error while hydrating course orders", fetchError);
  }

  return enrollments.map((enrollment) => {
    const planId = enrollment.plan_id;
    if (!planId) {
      return enrollment;
    }

    const plan = plansMap.get(planId);
    if (!plan) {
      return { ...enrollment, plan: null };
    }

    const batch = plan.batch_id ? batchesMap.get(plan.batch_id) : null;
    const courseFromPlan = plan.course_id ? coursesMap.get(plan.course_id) : null;
    const courseFromBatch = batch?.course_id ? coursesMap.get(batch.course_id) : null;
    const resolvedCourse = courseFromPlan || courseFromBatch || null;

    const batchWithCourse = batch
      ? {
          ...batch,
          course: batch.course ?? resolvedCourse
        }
      : null;

    return {
      ...enrollment,
      plan: {
        ...plan,
        batch: batchWithCourse,
        course: resolvedCourse
      }
    };
  });
  } catch (err) {
    console.error("getCourseOrders encountered an error:", err && err.stack ? err.stack : err);
    throw err;
  }
}

/**
 * Get user history including enrollments and bookings
 */
export async function getUserHistory(userId) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  try {
    // Fetch enrollments with partner and plan details
    const { data: enrollments, error: enrollmentsError } = await client
      .from("enrollments")
      .select(`
        *,
        partner:partners(id, name, role, city),
        plan:batch_plans(id, duration, fees)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (enrollmentsError) {
      console.error("Failed to fetch enrollments", enrollmentsError);
    }

    // Fetch turf bookings with court and partner details
    const { data: bookings, error: bookingsError } = await client
      .from("turf_bookings")
      .select(`
        *,
        court:turf_courts(id, name, sport, rate_per_hour),
        partner:partners(id, name, city)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (bookingsError) {
      console.error("Failed to fetch bookings", bookingsError);
    }

    return {
      enrollments: enrollments || [],
      bookings: bookings || [],
      totalEnrollments: enrollments?.length || 0,
      totalBookings: bookings?.length || 0
    };
  } catch (error) {
    console.error("Failed to fetch user history", error);
    throw new Error("Unable to fetch user history");
  }
}

export async function getPaymentsByIds(ids) {
  const uniqueIds = Array.from(
    new Set(
      (Array.isArray(ids) ? ids : []).filter((id) => typeof id === "string" && id.trim() !== "")
    )
  );

  if (uniqueIds.length === 0) {
    return [];
  }


  const { data, error } = await client
    .from("payments")
    .select("*")
    .in("id", uniqueIds);

  if (error) {
    console.error("Failed to fetch payments for orders", error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

export async function getTurfOrders() {
  const columns = `*,
    partner:partners(id, name),
    user:users(id, name, email, phone),
    court:turf_courts(id, name, turf_id, turf:turfs(*))
  `;

  const { data, error } = await client
    .from("turf_bookings")
    .select(columns)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch turf bookings", error);
    throw new Error("Unable to fetch turf bookings");
  }

  return Array.isArray(data) ? data : [];
}

export async function getPartnerSupportRequests() {
  const { data, error } = await client
    .from("support_requests")
    .select(`*, partner:partners(*)`)
    .order("created_at", { ascending: false })
    .limit(100); // Limit to 100 most recent support requests

  if (error) {
    console.error("Failed to fetch partner support requests", error);
    throw new Error("Unable to fetch partner support requests");
  }

  return Array.isArray(data) ? data : [];
}

export async function getUserSupportRequests() {
  const { data, error } = await client
    .from("users_support_requests")
    .select(`*, customer:users(*)`)
    .order("created_at", { ascending: false })
    .limit(100); // Limit to 100 most recent support requests

  if (error) {
    console.error("Failed to fetch user support requests", error);
    throw new Error("Unable to fetch user support requests");
  }

  return Array.isArray(data) ? data : [];
}

async function updateSupportRequestRow(table, id, payload, errorMessage) {
  if (!id) {
    throw new Error("Support request id is required");
  }

  const { data, error } = await client
    .from(table)
    .update({
      ...payload,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    console.error(errorMessage, error);
    throw new Error("Unable to update support request");
  }

  return data;
}

export async function resolvePartnerSupportRequest(id) {
  return updateSupportRequestRow(
    "support_requests",
    id,
    { resolved: true },
    "Failed to resolve partner support request"
  );
}

export async function resolveUserSupportRequest(id) {
  return updateSupportRequestRow(
    "users_support_requests",
    id,
    { resolved: true },
    "Failed to resolve user support request"
  );
}

export async function savePartnerSupportSolution(id, solution) {
  return updateSupportRequestRow(
    "support_requests",
    id,
    { solution: solution?.trim() || null },
    "Failed to update partner support solution"
  );
}

export async function saveUserSupportSolution(id, solution) {
  return updateSupportRequestRow(
    "users_support_requests",
    id,
    { solution: solution?.trim() || null },
    "Failed to update user support solution"
  );
}
