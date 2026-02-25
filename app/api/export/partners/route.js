import { NextResponse } from "next/server";
import { getPartners } from "@/lib/supabase";

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

    // Fetch all partners
    const partners = await getPartners();

    if (format === "csv") {
      const columns = [
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "whatsapp", label: "WhatsApp" },
        { key: "role", label: "Type" },
        { 
          key: "sports", 
          label: "Sports",
          getValue: (p) => Array.isArray(p.sports) ? p.sports.join("; ") : p.sports || ""
        },
        { 
          key: "address", 
          label: "City",
          getValue: (p) => p.address?.city || p.city || ""
        },
        { 
          key: "verified", 
          label: "Verified",
          getValue: (p) => p.verified ? "Yes" : "No"
        },
        { 
          key: "disabled", 
          label: "Status",
          getValue: (p) => p.disabled ? "Disabled" : "Active"
        },
        { 
          key: "created_at", 
          label: "Created Date",
          getValue: (p) => p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : ""
        }
      ];

      const csv = convertToCSV(partners, columns);
      
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="partners_export_${new Date().toISOString().split('T')[0]}.csv"`
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
