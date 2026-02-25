import { addDateValue, addSearchValue, tokensToSearchString } from "./search-utils";

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return dateTimeFormatter.format(date);
}

function safeString(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function pickEntity(record, audience) {
  if (!record) {
    return null;
  }

  if (audience === "partner") {
    return record.partner || record.partners || record.entity || null;
  }

  return record.customer || record.user || record.users || record.entity || null;
}

function normalizeSupportRequest(record, audience) {
  if (!record || typeof record !== "object") {
    return {
      id: "",
      type: audience,
      typeLabel: audience === "partner" ? "Partner" : "Customer",
      entityId: "",
      entityPublicId: "",
      entityName: "Unknown",
      entityEmail: "",
      entityPhone: "",
      request: "",
      description: "",
      screenshot: "",
      solution: "",
      resolved: false,
      createdAt: null,
      createdAtLabel: "-",
      updatedAt: null,
      updatedAtLabel: "-"
    };
  }

  const isPartner = audience === "partner";
  const entity = pickEntity(record, audience);
  const fallbackName = safeString(
    (isPartner ? record.partner_name : record.customer_name) ||
      record.entity_name ||
      record.name ||
      (isPartner ? "Unknown partner" : "Unknown customer")
  );
  const fallbackEmail = safeString(record.entity_email || record.email || "");
  const fallbackPhone = safeString(record.entity_phone || record.phone || "");
  const screenshot = safeString(record.screenshot || record.screenshot_url || record.screenshotLink);
  const request = safeString(record.request || record.subject || record.title);
  const description = safeString(record.description || record.details || record.message);
  const solution = safeString(record.solution || record.resolution);
  const createdAt = record.created_at ?? record.createdAt ?? null;
  const updatedAt = record.updated_at ?? record.updatedAt ?? null;

  const normalized = {
    id: record.id ?? "",
    type: audience,
    typeLabel: isPartner ? "Partner" : "Customer",
    entityId: entity?.id ?? record.partner_id ?? record.customer_id ?? record.user_id ?? "",
    entityPublicId: entity?.public_id ?? entity?.publicId ?? "",
    entityName: entity?.name ?? fallbackName,
    entityEmail: entity?.email ?? fallbackEmail,
    entityPhone: entity?.phone ?? fallbackPhone,
    request,
    description,
    screenshot,
    solution,
    resolved: Boolean(record.resolved),
    createdAt,
    createdAtLabel: formatDateTime(createdAt),
    updatedAt,
    updatedAtLabel: updatedAt ? formatDateTime(updatedAt) : "-"
  };

  return {
    ...normalized,
    __searchIndex: buildSupportSearchIndex(normalized)
  };
}

export function buildSupportSearchIndex(record) {
  if (!record) {
    return "";
  }

  const tokens = new Set();
  addSearchValue(tokens, [
    record.id,
    record.type,
    record.typeLabel,
    record.request,
    record.description,
    record.solution,
    record.screenshot,
    record.entityName,
    record.entityEmail,
    record.entityPhone,
    record.entityPublicId,
    record.resolved ? "resolved" : "open",
  ]);
  addDateValue(tokens, record.createdAt);
  addDateValue(tokens, record.updatedAt);
  return tokensToSearchString(tokens);
}

export async function fetchSupportQueues() {
  const { getPartnerSupportRequests, getUserSupportRequests } = await import("./supabase");

  const [partnerRequestsRaw, customerRequestsRaw] = await Promise.all([
    getPartnerSupportRequests().catch((error) => {
      console.error("Failed to fetch partner support requests", error);
      return [];
    }),
    getUserSupportRequests().catch((error) => {
      console.error("Failed to fetch user support requests", error);
      return [];
    })
  ]);

  return {
    partnerRequests: Array.isArray(partnerRequestsRaw)
      ? partnerRequestsRaw.map((record) => normalizeSupportRequest(record, "partner"))
      : [],
    customerRequests: Array.isArray(customerRequestsRaw)
      ? customerRequestsRaw.map((record) => normalizeSupportRequest(record, "customer"))
      : []
  };
}

export { formatDateTime };
