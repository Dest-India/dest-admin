"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  addDateValue,
  addSearchValue,
  addTimeVariants,
  tokensToSearchString,
} from "@/lib/search-utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Handshake } from "lucide-react";
import { Loader } from "../ui/loader";

const statusStyles = {
  pending: {
    label: "Pending",
    variant: "warning",
  },
  active: {
    label: "Active",
    variant: "success",
  },
  suspended: {
    label: "Suspended",
    variant: "destructive",
  },
};

const typeStyles = {
  academy: "color1",
  gym: "color2",
  turf: "color3",
};

const statusFilterOptions = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

function resolveStatus(status) {
  if (!status) {
    return statusStyles.pending;
  }

  const key = status.toLowerCase();
  return statusStyles[key] ?? statusStyles.pending;
}

export function resolveType(type) {
  if (!type) {
    return typeStyles.academy;
  }

  const key = type.toLowerCase();
  return typeStyles[key] ?? typeStyles.academy;
}

export function buildAddressLine(partner) {
  if (!partner) return "";
  
  // Handle address - it might be a JSON string or object
  let addressObj = partner.address;
  
  if (typeof addressObj === 'string' && addressObj.trim()) {
    try {
      addressObj = JSON.parse(addressObj);
    } catch (e) {
      // If not JSON, treat as plain string
      return addressObj.trim();
    }
  }
  
  if (!addressObj || typeof addressObj !== 'object') {
    return "";
  }

  const parts = [];
  if (addressObj.street) parts.push(addressObj.street);
  if (addressObj.area) parts.push(addressObj.area);
  if (addressObj.city) parts.push(addressObj.city);
  if (addressObj.state) parts.push(addressObj.state);
  if (addressObj.pincode) parts.push(addressObj.pincode);
  
  return parts.join(", ");
}

function extractMapLink(address) {
  if (!address) return null;
  
  // Handle address if it's a JSON string
  let addressObj = address;
  if (typeof addressObj === 'string' && addressObj.trim()) {
    try {
      addressObj = JSON.parse(addressObj);
    } catch (e) {
      return null;
    }
  }
  
  if (!addressObj || typeof addressObj !== 'object') {
    return null;
  }

  return addressObj.mapLink || addressObj.map_link || null;
}

export function buildPartnerSearchIndex(partner, addressLine) {
  if (!partner) {
    return "";
  }

  const tokens = new Set();
  addSearchValue(tokens, [
    partner.id,
    partner.public_id,
    partner.name,
    partner.email,
    partner.phone,
    partner.status,
    partner.role,
    partner.type,
    partner.verified,
    partner.description,
    partner.notes,
    partner.documents,
    partner.contactPerson,
    partner.categories,
    partner.sports,
    partner.addressText,
    partner.city,
    partner.state,
    partner.pin,
    partner.country,
    partner.pincode,
    addressLine,
  ]);
  addDateValue(tokens, partner.joinedAt);
  addDateValue(tokens, partner.updatedAt);
  addDateValue(tokens, partner.createdAt);
  addTimeVariants(tokens, partner.joinedAt);
  addTimeVariants(tokens, partner.updatedAt);

  return tokensToSearchString(tokens);
}

export function PartnersTable({ partners, onApprove, onToggleDisabled, approvingId, togglingId }) {
  const searchablePartners = useMemo(() => {
    return (partners ?? []).map((partner) => {
      const addressLine = buildAddressLine(partner);
      const mapLink = extractMapLink(partner.address);
      const derivedStatus = partner.disabled ? "suspended" : partner.verified ? "active" : "pending";
      
      // Normalize sports field
      let sportsArray = [];
      if (Array.isArray(partner.sports)) {
        sportsArray = partner.sports;
      } else if (typeof partner.sports === 'string' && partner.sports.trim()) {
        const trimmed = partner.sports.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          try {
            sportsArray = JSON.parse(trimmed);
          } catch (e) {
            sportsArray = trimmed.slice(1, -1).split(',').map(s => s.trim().replace(/"/g, '').replace(/'/g, ''));
          }
        } else {
          sportsArray = [trimmed];
        }
      }
      
      return {
        ...partner,
        sports: sportsArray, // Normalized array
        status: derivedStatus,
        __addressLine: addressLine,
        __mapLink: mapLink,
        __searchIndex: buildPartnerSearchIndex(partner, addressLine),
      };
    });
  }, [partners]);

  const addressById = useMemo(() => {
    return new Map(
      searchablePartners.map((partner) => [partner.id, partner.__addressLine])
    );
  }, [searchablePartners]);

  const typeOptions = useMemo(() => {
    const unique = new Set();
    searchablePartners.forEach((partner) => {
      const role = partner?.role ?? partner?.type;
      if (!role) {
        return;
      }
      const normalized = String(role).trim();
      if (normalized) {
        unique.add(normalized);
      }
    });
    return ["all", ...Array.from(unique)];
  }, [searchablePartners]);

  const sportOptions = useMemo(() => {
    const entries = new Map();
    (searchablePartners || []).forEach((partner) => {
      // Normalize sports field - it might be a string or array
      let sportsArray = [];
      if (Array.isArray(partner.sports)) {
        sportsArray = partner.sports;
      } else if (typeof partner.sports === 'string') {
        // Try to parse as JSON array first
        const trimmed = partner.sports.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          try {
            sportsArray = JSON.parse(trimmed);
          } catch (e) {
            // If JSON parse fails, treat as comma-separated
            sportsArray = trimmed.slice(1, -1).split(',').map(s => s.trim().replace(/"/g, ''));
          }
        } else {
          // Single sport string
          sportsArray = [trimmed];
        }
      }
      
      sportsArray.forEach((sport) => {
        if (typeof sport !== "string") {
          return;
        }
        const normalized = sport.trim().toLowerCase();
        if (!normalized) {
          return;
        }
        if (!entries.has(normalized)) {
          entries.set(normalized, sport);
        }
      });
    });
    const options = [
      { value: "all", label: "All Sports" },
      ...Array.from(entries.entries())
        .map(([normalizedValue, originalLabel]) => ({
          value: normalizedValue,
          label: originalLabel,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    ];
    return options;
  }, [searchablePartners]);

  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sportFilter, setSportFilter] = useState("all");

  const filteredPartners = useMemo(() => {
    return searchablePartners.filter((partner) => {
      if (statusFilter !== "all") {
        const normalizedStatus = (partner.status ?? "").toLowerCase();
        if (normalizedStatus !== statusFilter) {
          return false;
        }
      }

      if (typeFilter !== "all") {
        const role = partner.role ?? partner.type ?? "";
        if (String(role).trim() !== typeFilter) {
          return false;
        }
      }

      if (sportFilter !== "all") {
        const matchesSport = (partner.sports ?? []).some((entry) => {
          if (typeof entry !== "string") {
            return false;
          }
          return entry.trim().toLowerCase() === sportFilter;
        });

        if (!matchesSport) {
          return false;
        }
      }

      return true;
    });
  }, [searchablePartners, sportFilter, statusFilter, typeFilter]);

  const filtersActive =
    statusFilter !== "all" || typeFilter !== "all" || sportFilter !== "all";

  const handleClearFilters = () => {
    setStatusFilter("all");
    setTypeFilter("all");
    setSportFilter("all");
  };

  const toolbarContent = (
    <>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          {statusFilterOptions.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="capitalize"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={typeFilter} onValueChange={setTypeFilter}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {typeOptions
            .filter((option) => option !== "all")
            .map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>

      <Select value={sportFilter} onValueChange={setSportFilter}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder="All Sports" />
        </SelectTrigger>
        <SelectContent>
          {sportOptions.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="capitalize"
            >
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
          <DataTableColumnHeader column={column} title="Partner" />
        ),
        meta: { title: "Partner" },
        enableHiding: false,
        cell: ({ row }) => {
          const partner = row.original;
          return (
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={partner.logo_image} alt={partner.name} />
                <AvatarFallback>
                  <Handshake className="size-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5">
                <Link
                  href={`/partners/${partner.id}`}
                  className="font-semibold text-blue-500 hover:underline underline-offset-4"
                >
                  {partner.name}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {partner.public_id || "—"}
                </span>
              </div>
            </div>
          );
        },
        size: 320,
      },
      {
        id: "type",
        accessorFn: (row) => row.role ?? row.type ?? "",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Type" />
        ),
        meta: { title: "Type" },
        cell: ({ row }) => {
          const type = row.original.role ?? row.original.type;
          return <Badge variant={resolveType(type)}>{type || "—"}</Badge>;
        },
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        },
        size: 128,
      },
      {
        id: "address",
        accessorFn: (row) => addressById.get(row.id),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Address" />
        ),
        meta: { title: "Address" },
        enableSorting: false,
        cell: ({ row }) => {
          const address = row.getValue("address");
          const mapLink = row.original.__mapLink;
          return (
            <div className="text-sm text-muted-foreground">
              <div>{address || "—"}</div>
              {mapLink ? (
                <a
                  href={mapLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-blue-500 hover:underline underline-offset-4"
                >
                  Open map
                </a>
              ) : null}
            </div>
          );
        },
        size: 200,
      },
      {
        accessorKey: "sports",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Sports" />
        ),
        meta: { title: "Sports" },
        enableSorting: false,
        cell: ({ row }) => {
          const sports = row.getValue("sports");
          if (!Array.isArray(sports) || sports.length === 0) {
            return <span className="text-sm text-muted-foreground">—</span>;
          }

          return (
            <div className="min-w-60 flex flex-wrap gap-1">
              {sports.slice(0, 3).map((sport) => (
                <Badge
                  key={sport}
                  variant="secondary"
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
        filterFn: (row, id, value) => {
          if (value === "all") return true;
          const sports = row.getValue(id);
          if (!Array.isArray(sports)) return false;
          return sports.some(s => s && s.toLowerCase() === value.toLowerCase());
        },
        size: 180,
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        meta: { title: "Status" },
        cell: ({ row }) => {
          const status = row.getValue("status");
          const statusConfig = resolveStatus(status);
          return (
            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          );
        },
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        },
        size: 120,
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Joined" />
        ),
        cell: ({ row }) => {
          const createdAt = row.getValue("created_at");
          if (!createdAt) return <span className="text-muted-foreground">—</span>;
          
          const date = new Date(createdAt);
          const formatted = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
          
          return (
            <div className="text-sm text-muted-foreground">{formatted}</div>
          );
        },
        size: 140,
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const partner = row.original;
          const isToggling = togglingId === partner.id;
          return (
            <div className="flex items-center justify-end gap-2">
              {partner.verified ? (
                <Badge variant="success">Approved</Badge>
              ) : (
                <Button
                  size="sm"
                  onClick={() => onApprove?.(partner.id)}
                  disabled={!onApprove || approvingId === partner.id}
                >
                  {approvingId === partner.id ? "Approving..." : "Approve"}
                </Button>
              )}
              <Button
                size="sm"
                variant={partner.disabled ? "default" : "destructive"}
                onClick={() => onToggleDisabled?.(partner.id)}
                disabled={!onToggleDisabled || isToggling}
              >
                {isToggling ? <Loader /> : partner.disabled ? "Enable" : "Disable"}
              </Button>
            </div>
          );
        },
        meta: { title: "Actions" },
        enableHiding: false,
        enableSorting: false,
        size: 150,
      },
    ],
    [addressById, approvingId, onApprove, onToggleDisabled, togglingId]
  );

  return (
    <DataTable
      columns={columns}
      data={filteredPartners}
      getSearchValue={(partner) => partner.__searchIndex}
      toolbarContent={toolbarContent}
      showSearchClear
      filtersActive={filtersActive}
      onClearFilters={handleClearFilters}
      enableColumnVisibility
      emptyMessage="No partner records match the current filters."
    />
  );
}
