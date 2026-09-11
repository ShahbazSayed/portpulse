import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shipmentNumber = searchParams.get("shipment");

    if (!shipmentNumber) {
      return NextResponse.json(
        { error: "Shipment number is required" },
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

    const { data: shipment, error: shipmentError } =
      await supabase
        .from("shipments")
        .select("*")
        .eq("shipment_number", shipmentNumber)
        .single();

    if (shipmentError || !shipment) {
      return NextResponse.json(
        { error: "Shipment not found" },
        { status: 404 }
      );
    }

    if (!shipment.vessel_mmsi) {
      return NextResponse.json({
        shipment,
        vessel: null,
      });
    }

    const { data: vessel, error: vesselError } =
      await supabase
        .from("vessel_positions")
        .select("*")
        .eq("mmsi", shipment.vessel_mmsi)
        .single();

    if (vesselError) {
      return NextResponse.json({
        shipment,
        vessel: null,
      });
    }

    return NextResponse.json({
      shipment,
      vessel,
    });
  } catch (error) {
    console.error("Shipment vessel API error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}