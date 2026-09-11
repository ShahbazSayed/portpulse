const WebSocket = require("ws");
const { createClient } = require("@supabase/supabase-js");

require("dotenv").config({ path: ".env.local" });

const apiKey = process.env.AISSTREAM_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!apiKey) {
  console.error("❌ AISSTREAM_API_KEY is missing");
  process.exit(1);
}

if (!supabaseUrl || !supabaseSecretKey) {
  console.error("❌ Supabase server credentials are missing");
  process.exit(1);
}

const supabase = createClient(
  supabaseUrl,
  supabaseSecretKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const AIS_URL = "wss://stream.aisstream.io/v0/stream";

let socket = null;
let reconnectTimer = null;
let heartbeatTimer = null;
let messageCount = 0;

function connect() {
  console.log("");
  console.log("🔄 Connecting to AISStream...");

  socket = new WebSocket(AIS_URL);

  socket.on("open", () => {
    console.log("✅ Connected to AISStream");

    const subscription = {
      APIKey: apiKey,

      BoundingBoxes: [
        [
          [8, 68],
          [25, 90],
        ],
      ],

      FilterMessageTypes: [
        "PositionReport",
        "ShipStaticData",
      ],
    };

    socket.send(JSON.stringify(subscription));

    console.log("📡 AIS subscription sent");
    console.log("🚢 Waiting for live vessel data...");

    startHeartbeat();
  });

  socket.on("message", async (data) => {
    try {
      const message = JSON.parse(data.toString());

      if (
        message.MessageType ===
        "SubscriptionConfirmation"
      ) {
        console.log("✅ AIS subscription confirmed");
        return;
      }

      if (
        message.MessageType !==
        "PositionReport"
      ) {
        return;
      }

      const metadata = message.MetaData;
      const position =
        message.Message?.PositionReport;

      if (!metadata || !position) {
        return;
      }

      const mmsi = Number(metadata.MMSI);
      const latitude = Number(position.Latitude);
      const longitude = Number(position.Longitude);
      const speed = Number(position.Sog);
      const course = Number(position.Cog);
      const navigationalStatus = Number(
        position.NavigationalStatus
      );

      if (
        !Number.isFinite(mmsi) ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        return;
      }

      const vessel = {
        mmsi,
        ship_name:
          metadata.ShipName?.trim() || null,
        latitude,
        longitude,
        speed: Number.isFinite(speed)
          ? speed
          : 0,
        course: Number.isFinite(course)
          ? course
          : 0,
        navigational_status:
          Number.isFinite(navigationalStatus)
            ? navigationalStatus
            : null,
        last_seen:
          new Date().toISOString(),
      };

      // 1. Update latest vessel position
      const { error: latestError } =
        await supabase
          .from("vessel_positions")
          .upsert(vessel, {
            onConflict: "mmsi",
          });

      if (latestError) {
        console.error(
          "❌ Latest position error:",
          latestError.message
        );
        return;
      }

      // 2. Save movement history
      const { error: historyError } =
        await supabase
          .from("vessel_position_history")
          .insert({
            mmsi: vessel.mmsi,
            ship_name: vessel.ship_name,
            latitude: vessel.latitude,
            longitude: vessel.longitude,
            speed: vessel.speed,
            course: vessel.course,
            recorded_at: vessel.last_seen,
          });

      if (historyError) {
        console.error(
          "❌ History error:",
          historyError.message
        );
        return;
      }

      messageCount++;

      console.log(
        `📍 ${vessel.ship_name || "Unknown Vessel"} | ` +
          `${vessel.latitude.toFixed(5)}, ` +
          `${vessel.longitude.toFixed(5)} | ` +
          `${vessel.speed} kn | ` +
          `🧭 ${vessel.course}° | ` +
          `📜 History saved | ` +
          `#${messageCount}`
      );
    } catch (error) {
      console.error(
        "❌ Message processing error:",
        error.message
      );
    }
  });

  socket.on("error", (error) => {
    console.error(
      "❌ WebSocket error:",
      error.message
    );
  });

  socket.on("close", () => {
    console.log(
      "🔌 AISStream connection closed"
    );

    stopHeartbeat();

    scheduleReconnect();
  });
}

function scheduleReconnect() {
  if (reconnectTimer) {
    return;
  }

  console.log(
    "⏳ Reconnecting to AISStream in 5 seconds..."
  );

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, 5000);
}

function startHeartbeat() {
  stopHeartbeat();

  heartbeatTimer = setInterval(() => {
    if (
      socket &&
      socket.readyState === WebSocket.OPEN
    ) {
      console.log(
        `💓 AIS connection alive | Messages received: ${messageCount}`
      );
    }
  }, 30000);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

process.on("SIGINT", () => {
  console.log("");
  console.log("🛑 Stopping AIS listener...");

  stopHeartbeat();

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }

  if (socket) {
    socket.close();
  }

  process.exit(0);
});

console.log("========================================");
console.log("🚢 PortPulse AIS Listener");
console.log("========================================");

connect();