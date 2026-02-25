"use client";

import * as React from "react";
import { Bar, BarChart, Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const chartConfig = {
  partners: {
    label: "Partners",
    color: "var(--chart-1)", // Blue color
  },
  customers: {
    label: "Customers",
    color: "var(--chart-2)", // Green color
  },
  orders: {
    label: "Orders",
    color: "var(--chart-3)", // Yellow/Orange color
  },
  earnings: {
    label: "Earnings",
    color: "var(--chart-4)", // Purple or another color
  },
  support: {
    label: "Support Requests",
    color: "var(--chart-5)", // Red or another color
  },
  partnerSupport: {
    label: "Partner Support",
    color: "var(--chart-1)", // Same as partners
  },
  customerSupport: {
    label: "Customer Support",
    color: "var(--chart-2)", // Same as customers
  },
};

const timeRangeOptions = [
  { value: "365d", label: "Last 1 Year" },
  { value: "180d", label: "Last 6 Months" },
  { value: "90d", label: "Last 3 Months" },
  { value: "60d", label: "Last 2 Months" },
  { value: "30d", label: "Last Month" },
  { value: "7d", label: "Last 7 Days" },
];

export default function DashboardCharts({
  ordersData,
  partnersData,
  customersData,
  earningsData,
  partnerSupportData,
  customerSupportData,
}) {
  const [partnersCustomersTimeRange, setPartnersCustomersTimeRange] =
    React.useState("90d");
  const [ordersTimeRange, setOrdersTimeRange] = React.useState("90d");
  const [earningsTimeRange, setEarningsTimeRange] = React.useState("90d");
  const [supportTimeRange, setSupportTimeRange] = React.useState("90d");
  const [activeChart, setActiveChart] = React.useState("partners");
  const [activeOrdersChart, setActiveOrdersChart] = React.useState("orders");
  const [activeEarningsChart, setActiveEarningsChart] = React.useState("earnings");
  const [activeSupportChart, setActiveSupportChart] = React.useState("partners");

  // Helper functions for data aggregation
  const aggregateByMonths = (data, months) => {
    const aggregated = {};
    const now = new Date();
    const startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - months);

    data.forEach((item) => {
      const date = new Date(item.date);
      if (date >= startDate) {
        const monthKey = date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
        });
        if (!aggregated[monthKey]) {
          aggregated[monthKey] = {
            date: monthKey,
            partners: 0,
            customers: 0,
            count: 0,
          };
        }
        if (item.partners !== undefined)
          aggregated[monthKey].partners += item.partners;
        if (item.customers !== undefined)
          aggregated[monthKey].customers += item.customers;
        if (item.count !== undefined) aggregated[monthKey].count += item.count;
      }
    });

    return Object.values(aggregated).sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA - dateB;
    });
  };

  const aggregateByWeeks = (data, months) => {
    const aggregated = {};
    const now = new Date();
    const startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - months);

    data.forEach((item) => {
      const date = new Date(item.date);
      if (date >= startDate) {
        const weekOfMonth = Math.ceil(date.getDate() / 7);
        const monthName = date.toLocaleDateString("en-US", { month: "short" });
        const weekKey = `${weekOfMonth}${getOrdinalSuffix(weekOfMonth)} week`;
        const fullKey = `${weekKey}|${monthName}`;

        if (!aggregated[fullKey]) {
          aggregated[fullKey] = {
            date: fullKey,
            week: weekKey,
            month: monthName,
            partners: 0,
            customers: 0,
            count: 0,
          };
        }
        if (item.partners !== undefined)
          aggregated[fullKey].partners += item.partners;
        if (item.customers !== undefined)
          aggregated[fullKey].customers += item.customers;
        if (item.count !== undefined) aggregated[fullKey].count += item.count;
      }
    });

    return Object.values(aggregated).sort((a, b) => {
      const [aWeek, aMonth] = a.date.split("|");
      const [bWeek, bMonth] = b.date.split("|");
      const monthOrder = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const aMonthIndex = monthOrder.indexOf(aMonth);
      const bMonthIndex = monthOrder.indexOf(bMonth);
      if (aMonthIndex !== bMonthIndex) return aMonthIndex - bMonthIndex;
      return parseInt(aWeek) - parseInt(bWeek);
    });
  };

  const aggregateByDays = (data, days) => {
    const aggregated = {};
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);

    data.forEach((item) => {
      const date = new Date(item.date);
      if (date >= startDate) {
        const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
        const monthName = date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        const dayKey = `${monthName}, ${dayName}`;

        if (!aggregated[dayKey]) {
          aggregated[dayKey] = {
            date: dayKey,
            partners: 0,
            customers: 0,
            count: 0,
          };
        }
        if (item.partners !== undefined)
          aggregated[dayKey].partners += item.partners;
        if (item.customers !== undefined)
          aggregated[dayKey].customers += item.customers;
        if (item.count !== undefined) aggregated[dayKey].count += item.count;
      }
    });

    return Object.values(aggregated).sort((a, b) => {
      const dateA = new Date(a.date.split(", ")[0]).getTime();
      const dateB = new Date(b.date.split(", ")[0]).getTime();
      return dateA - dateB;
    });
  };

  const getOrdinalSuffix = (num) => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return "st";
    if (j === 2 && k !== 12) return "nd";
    if (j === 3 && k !== 13) return "rd";
    return "th";
  };

  // Combine partners and customers data
  const combinedData = React.useMemo(() => {
    const dateMap = new Map();

    // Add partners data
    partnersData.forEach((item) => {
      const date = item.date;
      if (!dateMap.has(date)) {
        dateMap.set(date, { date, partners: 0, customers: 0 });
      }
      dateMap.get(date).partners = item.count;
    });

    // Add customers data
    customersData.forEach((item) => {
      const date = item.date;
      if (!dateMap.has(date)) {
        dateMap.set(date, { date, partners: 0, customers: 0 });
      }
      dateMap.get(date).customers = item.count;
    });

    return Array.from(dateMap.values()).sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA - dateB;
    });
  }, [partnersData, customersData]);

  // Process data based on time range
  const getProcessedData = (data, timeRange, isCombined = false, valueField = "count") => {
    switch (timeRange) {
      case "365d":
        return isCombined
          ? aggregateByMonths(data, 12)
          : aggregateByMonths(
              data.map((item) => ({ ...item, count: item[valueField] })),
              12
            );
      case "180d":
        return isCombined
          ? aggregateByMonths(data, 6)
          : aggregateByMonths(
              data.map((item) => ({ ...item, count: item[valueField] })),
              6
            );
      case "90d":
        return isCombined
          ? aggregateByWeeks(data, 3)
          : aggregateByWeeks(
              data.map((item) => ({ ...item, count: item[valueField] })),
              3
            );
      case "60d":
        return isCombined
          ? aggregateByWeeks(data, 2)
          : aggregateByWeeks(
              data.map((item) => ({ ...item, count: item[valueField] })),
              2
            );
      case "30d":
        return isCombined
          ? aggregateByDays(data, 30)
          : aggregateByDays(
              data.map((item) => ({ ...item, count: item[valueField] })),
              30
            );
      case "7d":
        return isCombined
          ? aggregateByDays(data, 7)
          : aggregateByDays(
              data.map((item) => ({ ...item, count: item[valueField] })),
              7
            );
      default:
        return isCombined
          ? aggregateByWeeks(data, 3)
          : aggregateByWeeks(
              data.map((item) => ({ ...item, count: item[valueField] })),
              3
            );
    }
  };

  const filteredPartnersCustomersData = getProcessedData(
    combinedData,
    partnersCustomersTimeRange,
    true
  );
  const filteredOrdersData = getProcessedData(
    ordersData,
    ordersTimeRange,
    false,
    "count"
  );
  const filteredEarningsData = getProcessedData(
    earningsData,
    earningsTimeRange,
    false,
    "amount"
  );
  const filteredSupportData = getProcessedData(
    activeSupportChart === "partners" ? partnerSupportData : customerSupportData,
    supportTimeRange,
    false,
    "count"
  );

  // Calculate totals for the active chart
  const total = React.useMemo(
    () => ({
      partners: filteredPartnersCustomersData.reduce(
        (acc, curr) => acc + (curr.partners || 0),
        0
      ),
      customers: filteredPartnersCustomersData.reduce(
        (acc, curr) => acc + (curr.customers || 0),
        0
      ),
      orders: filteredOrdersData.reduce(
        (acc, curr) => acc + (curr.count || 0),
        0
      ),
      earnings: filteredEarningsData.reduce(
        (acc, curr) => acc + (curr.count || 0),
        0
      ),
      partnerSupport: partnerSupportData.reduce(
        (acc, curr) => acc + (curr.count || 0),
        0
      ),
      customerSupport: customerSupportData.reduce(
        (acc, curr) => acc + (curr.count || 0),
        0
      ),
    }),
    [filteredPartnersCustomersData, filteredOrdersData, filteredEarningsData, filteredSupportData]
  );

  const getTimeRangeLabel = (timeRange) => {
    switch (timeRange) {
      case "365d":
        return "Last 1 Year";
      case "180d":
        return "Last 6 Months";
      case "90d":
        return "Last 3 Months";
      case "60d":
        return "Last 2 Months";
      case "30d":
        return "Last Month";
      case "7d":
        return "Last 7 Days";
      default:
        return "Last 3 Months";
    }
  };

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
      {/* Partners & Customers Chart */}
      <Card>
        <CardHeader className="flex flex-col gap-1 border-b">
          <CardTitle className="text-lg font-semibold">
            Partners & Customers Trend
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Showing Partners And Customers Growth Over Time
          </CardDescription>
          {/* Mobile: Stack vertically, Desktop: Horizontal layout */}
          <div className="w-full flex flex-col md:flex-row gap-3 mt-2 [&>button,div]:w-full md:[&>button,div]:w-fit">
            {/* Time Range Filter */}
            <Select
              value={partnersCustomersTimeRange}
              onValueChange={setPartnersCustomersTimeRange}
            >
              <SelectTrigger aria-label="Select time range">
                <SelectValue
                  placeholder={getTimeRangeLabel(partnersCustomersTimeRange)}
                />
              </SelectTrigger>
              <SelectContent>
                {timeRangeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Data Type Tabs */}
            <Tabs value={activeChart} onValueChange={setActiveChart}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger
                  value="partners"
                  className="flex items-center justify-center gap-2"
                >
                  <span className="text-xs font-medium uppercase tracking-wide">
                    Partners
                  </span>
                  <span className="text-sm font-bold leading-none">
                    {total.partners.toLocaleString()}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="customers"
                  className="flex items-center justify-center gap-2"
                >
                  <span className="text-xs font-medium uppercase tracking-wide">
                    Customers
                  </span>
                  <span className="text-sm font-bold leading-none">
                    {total.customers.toLocaleString()}
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <ChartContainer
            id="partners-customers-chart"
            config={chartConfig}
            className="aspect-auto h-64 w-full"
          >
            <BarChart
              accessibilityLayer
              data={filteredPartnersCustomersData}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                minTickGap={32}
                angle={0}
                textAnchor="middle"
                height={60}
                tick={(props) => {
                  const { x, y, payload } = props;
                  const [week, month] = payload.value.split("|");
                  return (
                    <g transform={`translate(${x},${y+12})`}>
                      <text
                        x={0}
                        y={0}
                        dy={-5}
                        textAnchor="middle"
                        className="text-xs fill-muted-foreground"
                      >
                        {week}
                      </text>
                      <text
                        x={0}
                        y={0}
                        dy={10}
                        textAnchor="middle"
                        className="text-xs fill-muted-foreground font-medium"
                      >
                        {month}
                      </text>
                    </g>
                  );
                }}
              />
              <ChartTooltip
                content={<ChartTooltipContent labelFormatter={(value) => {
                  if (value.includes('|')) {
                    const [week, month] = value.split('|');
                    return `${week.replace('w', 'W')} of ${month}`;
                  }
                  return value;
                }} />}
                cursor={false}
                defaultIndex={1}
              />
              <Bar dataKey={activeChart} radius={8} fill={`var(--color-${activeChart})`} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Orders Chart */}
      <Card>
        <CardHeader className="flex flex-col gap-1 border-b">
          <CardTitle className="text-lg font-semibold">Orders Trend</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Showing Orders Growth Over Time
          </CardDescription>
          {/* Mobile: Stack vertically, Desktop: Horizontal layout */}
          <div className="w-full flex flex-col md:flex-row gap-3 mt-2 [&>button,div]:w-full md:[&>button,div]:w-fit">
            {/* Time Range Filter */}
            <Select value={ordersTimeRange} onValueChange={setOrdersTimeRange}>
              <SelectTrigger aria-label="Select time range">
                <SelectValue placeholder={getTimeRangeLabel(ordersTimeRange)} />
              </SelectTrigger>
              <SelectContent>
                {timeRangeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Data Type Tabs */}
            <Tabs
              value={activeOrdersChart}
              onValueChange={setActiveOrdersChart}
            >
              <TabsList className="grid w-full grid-cols-1">
                <TabsTrigger
                  value="orders"
                  className="flex items-center justify-center gap-2"
                >
                  <span className="text-xs font-medium uppercase tracking-wide">
                    Orders
                  </span>
                  <span className="text-sm font-bold leading-none">
                    {total.orders.toLocaleString()}
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <ChartContainer
            id="orders-chart"
            config={chartConfig}
            className="aspect-auto h-64 w-full"
          >
            <BarChart
              accessibilityLayer
              data={filteredOrdersData}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                angle={0}
                textAnchor="middle"
                height={60}
                tick={(props) => {
                  const { x, y, payload } = props;
                  const [week, month] = payload.value.split("|");
                  return (
                    <g transform={`translate(${x},${y+12})`}>
                      <text
                        x={0}
                        y={0}
                        dy={-5}
                        textAnchor="middle"
                        className="text-xs fill-muted-foreground mt-3"
                      >
                        {week}
                      </text>
                      <text
                        x={0}
                        y={0}
                        dy={10}
                        textAnchor="middle"
                        className="text-xs fill-muted-foreground font-medium mt-3"
                      >
                        {month}
                      </text>
                    </g>
                  );
                }}
              />
              <ChartTooltip
                content={<ChartTooltipContent labelFormatter={(value) => {
                  if (value.includes('|')) {
                    const [week, month] = value.split('|');
                    return `${week.replace('w', 'W')} of ${month}`;
                  }
                  return value;
                }} />}
                cursor={false}
                defaultIndex={1}
              />
              <Bar dataKey="count" radius={8} fill={`var(--color-${activeOrdersChart})`} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Earnings Chart */}
      <Card>
        <CardHeader className="flex flex-col gap-1 border-b">
          <CardTitle className="text-lg font-semibold">Earnings Trend</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Showing Earnings Growth Over Time
          </CardDescription>
          {/* Mobile: Stack vertically, Desktop: Horizontal layout */}
          <div className="w-full flex flex-col md:flex-row gap-3 mt-2 [&>button,div]:w-full md:[&>button,div]:w-fit">
            {/* Time Range Filter */}
            <Select value={earningsTimeRange} onValueChange={setEarningsTimeRange}>
              <SelectTrigger aria-label="Select time range">
                <SelectValue placeholder={getTimeRangeLabel(earningsTimeRange)} />
              </SelectTrigger>
              <SelectContent>
                {timeRangeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Data Type Tabs */}
            <Tabs
              value={activeEarningsChart}
              onValueChange={setActiveEarningsChart}
            >
              <TabsList className="grid w-full grid-cols-1">
                <TabsTrigger
                  value="earnings"
                  className="flex items-center justify-center gap-2"
                >
                  <span className="text-xs font-medium uppercase tracking-wide">
                    Earnings
                  </span>
                  <span className="text-sm font-bold leading-none">
                    ₹{total.earnings.toLocaleString()}
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <ChartContainer
            id="earnings-chart"
            config={chartConfig}
            className="aspect-auto h-64 w-full"
          >
            <LineChart
              accessibilityLayer
              data={filteredEarningsData}
              margin={{
                left: 12,
                right: 12,
                top: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                angle={0}
                textAnchor="middle"
                height={60}
                tick={(props) => {
                  const { x, y, payload } = props;
                  const [week, month] = payload.value.split("|");
                  return (
                    <g transform={`translate(${x},${y+12})`}>
                      <text
                        x={0}
                        y={0}
                        dy={-5}
                        textAnchor="middle"
                        className="text-xs fill-muted-foreground mt-3"
                      >
                        {week}
                      </text>
                      <text
                        x={0}
                        y={0}
                        dy={10}
                        textAnchor="middle"
                        className="text-xs fill-muted-foreground font-medium mt-3"
                      >
                        {month}
                      </text>
                    </g>
                  );
                }}
              />
              <YAxis hide />
              <ChartTooltip
                content={<ChartTooltipContent labelFormatter={(value) => {
                  if (value.includes('|')) {
                    const [week, month] = value.split('|');
                    return `${week.replace('w', 'W')} of ${month}`;
                  }
                  return value;
                }} />}
                cursor={false}
                defaultIndex={1}
              />
              <Line dataKey="count" type="natural" stroke={`var(--color-${activeEarningsChart})`} strokeWidth={2} dot={{fill : `var(--color-${activeEarningsChart})`, r: 3}} activeDot={{ r: 5}} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Support Requests Chart */}
      <Card>
        <CardHeader className="flex flex-col gap-1 border-b">
          <CardTitle className="text-lg font-semibold">Support Requests Trend</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Showing Support Requests Over Time
          </CardDescription>
          {/* Mobile: Stack vertically, Desktop: Horizontal layout */}
          <div className="w-full flex flex-col md:flex-row gap-3 mt-2 [&>button,div]:w-full md:[&>button,div]:w-fit">
            {/* Time Range Filter */}
            <Select value={supportTimeRange} onValueChange={setSupportTimeRange}>
              <SelectTrigger aria-label="Select time range">
                <SelectValue placeholder={getTimeRangeLabel(supportTimeRange)} />
              </SelectTrigger>
              <SelectContent>
                {timeRangeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Data Type Tabs */}
            <Tabs
              value={activeSupportChart}
              onValueChange={setActiveSupportChart}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger
                  value="partners"
                  className="flex items-center justify-center gap-2"
                >
                  <span className="text-xs font-medium uppercase tracking-wide">
                    Partners
                  </span>
                  <span className="text-sm font-bold leading-none">
                    {total.partnerSupport.toLocaleString()}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="customers"
                  className="flex items-center justify-center gap-2"
                >
                  <span className="text-xs font-medium uppercase tracking-wide">
                    Customers
                  </span>
                  <span className="text-sm font-bold leading-none">
                    {total.customerSupport.toLocaleString()}
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <ChartContainer
            id="support-chart"
            config={chartConfig}
            className="aspect-auto h-64 w-full"
          >
            <BarChart
              accessibilityLayer
              data={filteredSupportData}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                angle={0}
                textAnchor="middle"
                height={60}
                tick={(props) => {
                  const { x, y, payload } = props;
                  const [week, month] = payload.value.split("|");
                  return (
                    <g transform={`translate(${x},${y+12})`}>
                      <text
                        x={0}
                        y={0}
                        dy={-5}
                        textAnchor="middle"
                        className="text-xs fill-muted-foreground mt-3"
                      >
                        {week}
                      </text>
                      <text
                        x={0}
                        y={0}
                        dy={10}
                        textAnchor="middle"
                        className="text-xs fill-muted-foreground font-medium mt-3"
                      >
                        {month}
                      </text>
                    </g>
                  );
                }}
              />
              <ChartTooltip
                content={<ChartTooltipContent labelFormatter={(value) => {
                  if (value.includes('|')) {
                    const [week, month] = value.split('|');
                    return `${week.replace('w', 'W')} of ${month}`;
                  }
                  return value;
                }} />}
                cursor={false}
                defaultIndex={1}
              />
              <Bar dataKey="count" radius={8} fill={`var(--color-${activeSupportChart === "partners" ? "partner" : "customer"}Support)`} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
