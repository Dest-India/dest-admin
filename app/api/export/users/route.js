import { NextResponse } from "next/server";
import { getCustomers } from "@/lib/supabase";

function convertToCSV(data, columns) {
  if (!data || data.length === 0) {
    return "";
  }

  // Create header row
  const headers = columns.map(col => col.label).join(",");
  
  // Create data rows
  const rows = data.map(item => {
    return columns.map(col => {
      let value = col.getValue ? col.getValue(item) : item[col.key];
      
      // Handle null/undefined
      if (value === null || value === undefined) {
        value = "";
      }
      
      // Convert to string and escape
      value = String(value);
      
      // Escape quotes and wrap in quotes if contains comma, newline, or quote
      if (value.includes(",") || value.includes("\n") || value.includes('"')) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      
      return value;
    }).join(",");
  });
  
  return [headers, ...rows].join("\n");
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";

    // Fetch all customers/users
    const customers = await getCustomers();

    if (format === "csv") {
      const columns = [
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "gender", label: "Gender" },
        { 
          key: "liked_sports", 
          label: "Liked Sports",
          getValue: (u) => Array.isArray(u.liked_sports) ? u.liked_sports.join("; ") : u.liked_sports || ""
        },
        { key: "city", label: "City" },
        { key: "state", label: "State" },
        { 
          key: "enrollments", 
          label: "Enrollments",
          getValue: (u) => Array.isArray(u.enrollments) ? u.enrollments.length : u.enrollments || 0
        },
        { 
          key: "turf_bookings", 
          label: "Turf Bookings",
          getValue: (u) => Array.isArray(u.turf_bookings) ? u.turf_bookings.length : u.turf_bookings || 0
        },
        { 
          key: "created_at", 
          label: "Joined Date",
          getValue: (u) => u.created_at ? new Date(u.created_at).toISOString().split('T')[0] : ""
        }
      ];

      const csv = convertToCSV(customers, columns);
      
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="users_export_${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    // For future Excel/PDF support
    return NextResponse.json(
      { error: "Format not supported yet" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Export error", error);
    return NextResponse.json(
      { error: "Export failed", details: error.message },
      { status: 500 }
    );
  }
}
