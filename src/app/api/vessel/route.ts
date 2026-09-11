import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shipmentParam = searchParams.get("shipment");

    if (!shipmentParam) {
      return NextResponse.json(
        { error: "Shipment ID or shipment number is required" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Supabase configuration missing" },
        { status: 500 }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseKey
    );

    let shipment = null;
    let shipmentError = null;

    // First search by shipment number
    const byNumber = await supabase
      .from("shipments")
      .select("*")
      .eq("shipment_number", shipmentParam)
      .maybeSingle();

    if (byNumber.data) {
      shipment = byNumber.data;
    } else {
      // If not found, search by UUID
      const byId = await supabase
        .from("shipments")
        .select("*")
        .eq("id", shipmentParam)
        .maybeSingle();

      shipment = byId.data;
      shipmentError = byId.error;
    }

    if (shipmentError) {
      console.error(
        "Shipment lookup error:",
        shipmentError.message
      );

      return NextResponse.json(
        { error: shipmentError.message },
        { status: 500 }
      );
    }

    if (!shipment) {
      return NextResponse.json(
        { error: "Shipment not found" },
        { status: 404 }
      );
    }

    // No live vessel linked
    if (!shipment.vessel_mmsi) {
      return NextResponse.json({
        shipment,
        vessel: null,
      });
    }

    // Find latest live AIS position
    const { data: vessel, error: vesselError } =
      await supabase
        .from("vessel_positions")
        .select("*")
        .eq("mmsi", shipment.vessel_mmsi)
        .maybeSingle();

    if (vesselError) {
      console.error(
        "Vessel lookup error:",
        vesselError.message
      );
    }

    return NextResponse.json({
      shipment,
      vessel: vessel ?? null,
    });
  } catch (error) {
    console.error(
      "Shipment vessel API error:",
      error
    );

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}