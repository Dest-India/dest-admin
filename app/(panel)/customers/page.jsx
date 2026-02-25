import { getCustomers } from "@/lib/supabase";
import { CustomersTable } from "@/components/customers/customers-table";

export const dynamic = 'force-dynamic';

export default async function CustomersPage(props) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams?.page) || 1;
  const pageSize = Number(searchParams?.pageSize) || 10;
  const offset = (page - 1) * pageSize;

  let customersData = null;
  let error = null;

  try {
    customersData = await getCustomers({ limit: pageSize, offset });
  } catch (err) {
    console.error("Failed to load customers", err);
    error = "Unable to load customers";
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Customers</h1>
      <CustomersTable
        initialCustomers={customersData?.customers || []}
        initialTotal={customersData?.total || 0}
        initialPage={page}
        initialPageSize={pageSize}
        error={error}
      />
    </div>
  );
}
