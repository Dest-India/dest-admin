import { fetchCustomers } from "@/lib/customers";
import { fetchOrders } from "@/lib/orders";
import { fetchPartners } from "@/lib/partners";
import { fetchSupportQueues } from "@/lib/support";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Building2,
  Receipt,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import DashboardCharts from "./dashboard-charts";

export const dynamic = 'force-dynamic';

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
}

function formatCurrency(value) {
  if (value === null || value === undefined) return "₹0";
  return currencyFormatter.format(value);
}

function formatNumber(value) {
  if (value === null || value === undefined) return "0";
  return new Intl.NumberFormat("en-IN").format(value);
}

// Helper function to aggregate data by day
function aggregateByDay(data, dateField = "createdAt", valueField = "count") {
  const aggregated = {};

  data.forEach((item) => {
    if (!item[dateField]) return;

    const date = new Date(item[dateField]);
    if (isNaN(date.getTime())) return;

    const dayKey = date.toISOString().split("T")[0]; // YYYY-MM-DD format

    if (!aggregated[dayKey]) {
      aggregated[dayKey] = 0;
    }
    const value = item[valueField];
    aggregated[dayKey] += valueField === "count" ? (value || 1) : (value || 0);
  });

  // Convert to array and sort by date
  return Object.entries(aggregated)
    .map(([date, value]) => ({ date, [valueField]: value }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  // Removed the .slice(-30) to provide full historical data for filtering
}

export default async function DashboardPage() {
  // Fetch data in parallel with limits to prevent timeouts
  const [partners, customers, ordersPayload, supportQueues] = await Promise.all([
    fetchPartners({ limit: 20 }).catch((err) => {
      console.error('Dashboard: Failed to fetch partners', err);
      return [];
    }),
    fetchCustomers({ limit: 50 }).catch((err) => {
      console.error('Dashboard: Failed to fetch customers', err);
      return [];
    }),
    fetchOrders().catch(() => ({
      combinedOrders: [],
      totals: { combined: { count: 0, amount: 0 } },
    })),
    fetchSupportQueues().catch(() => ({
      partnerRequests: [],
      customerRequests: [],
    })),
  ]);

  // Calculate metrics
  const activePartners = partners.filter((p) => p.status === "active").length;
  const verifiedCustomers = customers.filter((c) => c.email).length; // Simple verification check
  const totalOrders = ordersPayload.totals?.combined?.count || 0;
  const totalRevenue = ordersPayload.totals?.combined?.amount || 0;

  // Monthly growth (simplified - comparing with last month)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentOrdersCount =
    ordersPayload.combinedOrders?.filter(
      (order) => new Date(order.createdAt) > thirtyDaysAgo
    )?.length || 0;

  const orderGrowth =
    totalOrders > 0 ? (recentOrdersCount / totalOrders) * 100 : 0;

  // Chart data
  const ordersChartData = aggregateByDay(ordersPayload.combinedOrders || []);
  const partnersChartData = aggregateByDay(partners);
  const customersChartData = aggregateByDay(customers);
  const earningsChartData = aggregateByDay(ordersPayload.combinedOrders || [], "createdAt", "amount");
  const partnerSupportChartData = aggregateByDay(supportQueues.partnerRequests || []);
  const customerSupportChartData = aggregateByDay(supportQueues.customerRequests || []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back ! Here's what's happening with your platform.
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "Active Partners",
            icon: Building2,
            value: activePartners,
            delta: partners.filter((p) => new Date(p.createdAt) > thirtyDaysAgo)
              .length,
          },
          {
            title: "Verified Customers",
            icon: Users,
            value: verifiedCustomers,
            delta: customers.filter(
              (c) => new Date(c.createdAt) > thirtyDaysAgo
            ).length,
          },
          {
            title: "Total Orders",
            icon: Receipt,
            value: totalOrders,
            delta: orderGrowth,
            isPercentage: true,
          },
          {
            title: "Total Revenue",
            icon: TrendingUp,
            value: totalRevenue,
            delta:
              ordersPayload.combinedOrders
                ?.filter((order) => new Date(order.createdAt) > thirtyDaysAgo)
                ?.reduce((sum, order) => sum + (order.amount || 0), 0) || 0,
          },
        ].map((item, index) => (
          <Card key={index} className="gap-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>{item.title}</CardTitle>
              <item.icon className="size-6 stroke-1 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {item.isPercentage
                  ? `${item.value.toFixed(1)}%`
                  : formatNumber(item.value)}
              </div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                {item.isPercentage ? (
                  item.delta >= 0 ? (
                    <ArrowUpRight className="size-4 mr-1 text-green-500" />
                  ) : (
                    <ArrowDownRight className="size-4 mr-1 text-red-500" />
                  )
                ) : null}
                {item.isPercentage
                  ? `${Math.abs(item.delta).toFixed(1)}% from last month`
                  : `+${formatNumber(item.delta)} from last month`}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <DashboardCharts
        ordersData={ordersChartData}
        partnersData={partnersChartData}
        customersData={customersChartData}
        earningsData={earningsChartData}
        partnerSupportData={partnerSupportChartData}
        customerSupportData={customerSupportChartData}
      />
    </div>
  );
}
