import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      userId, 
      partnerId, 
      paymentStatus, 
      paymentMethod, 
      amountPaid, 
      notes,
      enrolledBy 
    } = body;

    if (!userId || !partnerId) {
      return NextResponse.json(
        { error: "User ID and Partner ID are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Create enrollment record
    const enrollmentData = {
      user_id: userId,
      partner_id: partnerId,
      payment_status: paymentStatus || "unpaid",
      payment_method: paymentMethod,
      amount_paid: amountPaid,
      admin_notes: notes,
      enrolled_by: enrolledBy || "admin",
      enrolled_at: new Date().toISOString(),
      status: "active"
    };

    const { data: enrollment, error: enrollmentError } = await supabase
      .from("enrollments")
      .insert([enrollmentData])
      .select(`
        *,
        user:users(id, name, email),
        partner:partners(id, name, role, city)
      `)
      .single();

    if (enrollmentError) {
      console.error("Failed to create enrollment", enrollmentError);
      return NextResponse.json(
        { error: "Failed to create enrollment", details: enrollmentError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      enrollment,
      message: "User enrolled successfully"
    });
  } catch (error) {
    console.error("API error creating enrollment", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
