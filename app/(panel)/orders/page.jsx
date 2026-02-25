import { OrdersTabs } from "@/components/orders/orders-tabs";
import { fetchOrders } from "@/lib/orders";

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const ordersPayload = await fetchOrders().catch(() => ({
    combinedOrders: [],
    courseOrders: [],
    turfOrders: [],
    totals: {
      combined: { count: 0, amount: 0 },
      course: { count: 0, amount: 0 },
      turf: { count: 0, amount: 0 },
    },
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl">Orders</h1>

      <OrdersTabs
        courseOrders={ordersPayload.courseOrders}
        turfOrders={ordersPayload.turfOrders}
        totals={ordersPayload.totals}
      />
    </div>
  );
}
