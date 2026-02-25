import { SupportTabs } from "@/components/support/support-tabs";
import { fetchSupportQueues } from "@/lib/support";

export const dynamic = 'force-dynamic';

export default async function SupportPage() {
  const queueData = await fetchSupportQueues().catch(() => ({
    partnerRequests: [],
    customerRequests: [],
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl">Support Requests</h1>

      <SupportTabs
        partnerRequests={queueData.partnerRequests}
        customerRequests={queueData.customerRequests}
      />
    </div>
  );
}
