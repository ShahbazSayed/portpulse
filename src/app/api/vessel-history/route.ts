import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mmsi = searchParams.get("mmsi");

    if (!mmsi) {
      return NextResponse.json(
        { error: "MMSI is required" },
        { status: 400 }
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

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

    const { data, error } = await supabase
      .from("vessel_position_history")
      .select(
        "latitude, longitude, recorded_at"
      )
      .eq("mmsi", Number(mmsi))
      .order("recorded_at", {
        ascending: true,
      })
      .limit(500);

    if (error) {
      console.error(
        "Vessel history error:",
        error.message
      );

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      history: data ?? [],
    });
  } catch (error) {
    console.error(
      "Vessel history API error:",
      error
    );

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}