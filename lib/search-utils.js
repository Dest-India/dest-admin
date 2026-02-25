export function addSearchValue(target, value, visited = new WeakSet()) {
  if (!value && value !== 0) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => addSearchValue(target, entry, visited));
    return;
  }

  if (value instanceof Date) {
    addDateValue(target, value);
    return;
  }

  if (typeof value === "object") {
    // Prevent infinite recursion on circular references
    if (visited.has(value)) {
      return;
    }
    visited.add(value);
    Object.values(value).forEach((entry) => addSearchValue(target, entry, visited));
    return;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return;
    }

    const raw = value.toString();
    const normalized = raw.toLowerCase();
    target.add(normalized);
    target.add(value.toFixed(2).toLowerCase());
    const digitsOnly = raw.replace(/[^0-9]/g, "");
    if (digitsOnly) {
      target.add(digitsOnly);
    }
    return;
  }

  const normalizedValue = String(value).trim();
  if (!normalizedValue || normalizedValue === "—") {
    return;
  }

  const lower = normalizedValue.toLowerCase();
  target.add(lower);
  const compact = lower.replace(/[^a-z0-9]/g, "");
  if (compact && compact !== lower) {
    target.add(compact);
  }
}

export function addTimeVariants(target, value) {
  if (!value) {
    return;
  }

  const normalized = String(value).trim();
  if (!normalized || normalized === "—") {
    return;
  }

  addSearchValue(target, normalized);
  const compact = normalized.replace(/\s+/g, "");
  if (compact && compact !== normalized) {
    addSearchValue(target, compact);
  }

  const match = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    const hour = Number(match[1]);
    const minutes = match[2];
    if (!Number.isNaN(hour)) {
      const hour12 = ((hour + 11) % 12) + 1;
      const suffix = hour >= 12 ? "pm" : "am";
      addSearchValue(target, `${hour12}:${minutes} ${suffix}`);
      addSearchValue(target, `${hour12}:${minutes}${suffix}`);
    }
  }
}

export function addDateValue(target, value) {
  if (!value) {
    return;
  }

  const parsed =
    value instanceof Date
      ? value
      : typeof value === "number"
        ? new Date(value)
        : new Date(value);

  if (!Number.isNaN(parsed.getTime())) {
    const day = parsed.getDate();
    const month = parsed.getMonth() + 1;
    const year = parsed.getFullYear();
    const dayPadded = String(day).padStart(2, "0");
    const monthPadded = String(month).padStart(2, "0");
    const monthShort = parsed.toLocaleString("en-US", { month: "short" });
    const monthLong = parsed.toLocaleString("en-US", { month: "long" });
    const hours = parsed.getHours();
    const minutes = String(parsed.getMinutes()).padStart(2, "0");
    const time24 = `${String(hours).padStart(2, "0")}:${minutes}`;
    const hour12 = ((hours + 11) % 12) + 1;
    const time12 = `${hour12}:${minutes} ${hours >= 12 ? "pm" : "am"}`;

    const variants = [
      `${dayPadded} ${monthShort} ${year}`,
      `${dayPadded} ${monthLong} ${year}`,
      `${day}-${month}-${year}`,
      `${dayPadded}-${month}-${year}`,
      `${dayPadded}-${monthPadded}-${year}`,
      `${dayPadded}-${monthPadded}--${year}`,
      `${dayPadded}/${monthPadded}/${year}`,
      `${day}/${month}/${year}`,
      `${month}/${day}/${year}`,
      `${monthPadded}/${dayPadded}/${year}`,
      `${year}-${monthPadded}-${dayPadded}`,
      `${dayPadded} ${monthShort} ${year} ${time24}`,
      `${dayPadded}-${monthPadded}-${year} ${time24}`,
      `${dayPadded}/${monthPadded}/${year} ${time24}`,
      `${dayPadded} ${monthShort} ${year}, ${time24}`,
      `${dayPadded} ${monthShort} ${year} ${time12}`,
    ];

    variants.forEach((variant) => addSearchValue(target, variant));
    addSearchValue(target, parsed.toISOString());
    addTimeVariants(target, time24);
    addTimeVariants(target, time12);
  } else if (typeof value === "string") {
    addSearchValue(target, value);
  }
}

export function tokensToSearchString(tokens) {
  return Array.from(tokens).join(" | ");
}
