import { NextResponse } from "next/server";

import { normalizePartnerRecord } from "@/lib/partners";
import { getPartners } from "@/lib/supabase";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit");
    
    const partners = await getPartners();
    const normalized = partners.map(normalizePartnerRecord);
    
    // Filter active partners only and apply limit if specified
    const activePartners = normalized.filter(p => p.status === "active");
    const result = limit ? activePartners.slice(0, parseInt(limit)) : activePartners;

    return NextResponse.json({ 
      data: normalized, // Keep for backward compatibility
      partners: result  // For enrollment dialog
    });
  } catch (error) {
    console.error("Error loading partners", error);
    return NextResponse.json({ error: "Failed to load partners" }, { status: 500 });
  }
}
