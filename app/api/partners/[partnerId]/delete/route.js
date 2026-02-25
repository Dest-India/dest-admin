import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request, { params }) {
  try {
    const { partnerId } = params;
    
    if (!partnerId) {
      return NextResponse.json(
        { error: "Partner ID is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Soft delete: Update status to 'deleted' instead of removing record
    const { data, error } = await supabase
      .from("partners")
      .update({ 
        status: "deleted",
        deleted_at: new Date().toISOString()
      })
      .eq("id", partnerId)
      .select()
      .single();

    if (error) {
      console.error("Failed to delete partner", error);
      return NextResponse.json(
        { error: "Failed to delete partner account" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      partner: data,
      message: "Partner account deleted successfully. Can be recovered within 30 days."
    });
  } catch (error) {
    console.error("API error deleting partner", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
