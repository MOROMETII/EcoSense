import type { SocketPrediction } from "../models/types";

// Configure this based on your server URL
const SERVER_URL = "https://botryose-unshadily-wynell.ngrok-free.dev";

/**
 * Fetch real-time socket predictions from the server.
 * The server loops through test_data.csv and returns predictions.
 */
export const fetchSocketPrediction = async (
  socketId: string,
  roomId?: string,
  loop: boolean = true,
): Promise<SocketPrediction> => {
  const params = new URLSearchParams();
  params.append("socket_id", socketId);
  if (roomId) params.append("room_id", roomId);
  if (loop) params.append("loop", "true");

  try {
    const res = await fetch(`${SERVER_URL}/predict/realtime?${params}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      throw new Error(`Server error: ${res.status}`);
    }

    const data = await res.json();
    if (data.records && data.records.length > 0) {
      const latest = data.records[data.records.length - 1];
      return {
        socket_id: socketId,
        room_id: roomId || latest.room_id || "unknown",
        current_kwh: latest.kwh || 0,
        predicted_label: latest.predicted_label_name || "Unknown",
        confidence: latest.confidence || 0,
        insight: latest.insight || "",
        history_count: data.count || 0,
        history: data.records || [],
      };
    }

    throw new Error("No data returned from server");
  } catch (error) {
    console.error("Failed to fetch socket prediction:", error);
    throw error;
  }
};

/**
 * Fetch complete history for a socket over 24 hours (or custom range).
 * Returns the last 12 records and full stats.
 */
export const fetchSocketHistory = async (
  socketId: string,
  roomId?: string,
  hours: number = 24,
): Promise<SocketPrediction> => {
  const params = new URLSearchParams();
  params.append("hours", hours.toString());
  if (roomId) params.append("room_id", roomId);

  try {
    const res = await fetch(
      `${SERVER_URL}/socket-history/${socketId}?${params}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      },
    );

    if (!res.ok) {
      throw new Error(`Server error: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error("Failed to fetch socket history:", error);
    throw error;
  }
};
