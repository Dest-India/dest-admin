import { NextResponse } from "next/server";
import { getUserHistory } from "@/lib/supabase";

export async function GET(request, { params }) {
  try {
    const { userId } = params;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const history = await getUserHistory(userId);

    return NextResponse.json({
      success: true,
      ...history
    });
  } catch (error) {
    console.error("API error fetching user history", error);
    return NextResponse.json(
      { error: "Failed to fetch user history", details: error.message },
      { status: 500 }
    );
  }
}
