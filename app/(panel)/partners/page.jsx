import { getPartners } from "@/lib/supabase";
import { PartnersPageClient } from "@/components/partners/partners-page-client";

export const dynamic = 'force-dynamic';

export default async function PartnersPage(props) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams?.page) || 1;
  const pageSize = Number(searchParams?.pageSize) || 10;
  const offset = (page - 1) * pageSize;

  let partnersData = null;
  let error = null;

  try {
    partnersData = await getPartners({ limit: pageSize, offset });
  } catch (err) {
    console.error("Failed to load partners", err);
    error = "Unable to load partners";
  }

  return (
    <PartnersPageClient
      initialPartners={partnersData?.partners || []}
      initialTotal={partnersData?.total || 0}
      initialPage={page}
      initialPageSize={pageSize}
      initialError={error}
    />
  );
}
