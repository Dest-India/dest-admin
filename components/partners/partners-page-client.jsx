"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { PartnersTable } from "@/components/partners/partners-table";
import { approvePartner, toggleDisabledPartner } from "@/lib/supabase";
import { DualBadge } from "../ui/dual-badge";
import { TableRowSkeleton } from "../ui/skeleton-loader";
import { TablePagination } from "../ui/table-pagination";
import { toast } from "sonner";

export function PartnersPageClient({ 
  initialPartners, 
  initialTotal,
  initialPage,
  initialPageSize,
  initialError 
}) {
  const router = useRouter();
  const [partners, setPartners] = useState(initialPartners ?? []);
  const [total, setTotal] = useState(initialTotal ?? 0);
  const [currentPage, setCurrentPage] = useState(initialPage ?? 1);
  const [pageSize, setPageSize] = useState(initialPageSize ?? 10);
  const [isLoading, setIsLoading] = useState(false); // Start as false, only true during navigation
  const [approvingId, setApprovingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const getPartnerStatus = (partner) => {
    if (partner.disabled) return "suspended";
    if (partner.verified) return "active";
    return "pending";
  };

  const summary = partners.reduce(
    (accumulator, partner) => {
      const statusKey = getPartnerStatus(partner).toLowerCase();
      accumulator.total += 1;
      accumulator.byStatus[statusKey] = (accumulator.byStatus[statusKey] ?? 0) + 1;
      return accumulator;
    },
    { total: 0, byStatus: {} }
  );

  // Reset loading state when new data arrives
  useEffect(() => {
    setPartners(initialPartners ?? []);
    setTotal(initialTotal ?? 0);
    setIsLoading(false);
  }, [initialPartners, initialTotal]);

  const handlePageChange = (newPage) => {
    setIsLoading(true);
    setCurrentPage(newPage);
    router.push(`/partners?page=${newPage}&pageSize=${pageSize}`);
    router.refresh(); // Refresh the page to re-fetch data with new URL params
  };

  const handlePageSizeChange = (newPageSize) => {
    setIsLoading(true);
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page
    router.push(`/partners?page=1&pageSize=${newPageSize}`);
    router.refresh(); // Refresh the page to re-fetch data with new URL params
  };

  const handleApprove = async (partnerId) => {
    setApprovingId(partnerId);
    try {
      await approvePartner(partnerId);
      toast.success("Partner verified successfully!");
      // Update local state
      setPartners(partners.map(p => 
        p.id === partnerId ? { ...p, verified: true } : p
      ));
    } catch (error) {
      toast.error("Failed to verify partner");
      console.error(error);
    } finally {
      setApprovingId(null);
    }
  };

  const handleToggleDisabled = async (partnerId) => {
    setTogglingId(partnerId);
    const partner = partners.find(p => p.id === partnerId);
    try {
      await toggleDisabledPartner(partnerId);
      toast.success(partner?.disabled ? "Partner enabled!" : "Partner disabled!");
      // Update local state
      setPartners(partners.map(p => 
        p.id === partnerId ? { ...p, disabled: !p.disabled } : p
      ));
    } catch (error) {
      toast.error("Failed to update partner status");
      console.error(error);
    } finally {
      setTogglingId(null);
    }
  };

  if (initialError) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Partners</h1>
        <div className="text-red-600">{initialError}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Partners</h1>

      <div className="flex flex-wrap gap-2">
        {[
          { label: "Total", value: summary.total, variant: undefined },
          { label: "Pending", value: summary.byStatus.pending || 0, variant: "warning" },
          { label: "Active", value: summary.byStatus.active || 0, variant: "success" },
          { label: "Suspended", value: summary.byStatus.suspended || 0, variant: "destructive" },
        ].map((item, index) => (
          <DualBadge key={index} x={item.label} y={item.value} variant={item.variant} />
        ))}
      </div>

      {isLoading ? (
        <TableRowSkeleton rows={pageSize} />
      ) : (
        <>
          <PartnersTable
            partners={partners}
            onApprove={handleApprove}
            onToggleDisabled={handleToggleDisabled}
            approvingId={approvingId}
            togglingId={togglingId}
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
  );
}
