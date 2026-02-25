import { NextResponse } from "next/server";
import { getPartnersPaginated } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "0", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const search = searchParams.get("search") || "";

    // Validate pagination parameters
    if (page < 0) {
      return NextResponse.json(
        { error: "Page number must be non-negative" },
        { status: 400 }
      );
    }

    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "Limit must be between 1 and 100" },
        { status: 400 }
      );
    }

    const result = await getPartnersPaginated({ page, limit, search });

    return NextResponse.json(result);
  } catch (error) {
    console.error("API error fetching paginated partners", error);
    return NextResponse.json(
      { error: "Failed to fetch partners. Please try again." },
      { status: 500 }
    );
  }
}
