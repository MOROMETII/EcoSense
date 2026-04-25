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

export const fetchSocketCurrentKwh = async (
  socketId: string,
  roomId?: string,
): Promise<number> => {
  try {
    const prediction = await fetchSocketHistory(socketId, roomId, 24);
    return prediction.current_kwh || 0;
  } catch (error) {
    console.error(`Failed to fetch current kWh for ${socketId}:`, error);
    return 0;
  }
};

export const fetchRoomAnalytics = async (
  socketIds: string[],
  roomId?: string,
): Promise<{
  temperature: Array<{ timestamp: number; value: number }>;
  energyUsage: Array<{ timestamp: number; value: number }>;
}> => {
  if (socketIds.length === 0) {
    return { temperature: [], energyUsage: [] };
  }

  try {
    // Fetch history for all sockets to get temperature and energy data
    const allHistories = await Promise.all(
      socketIds.map((socketId) => fetchSocketHistory(socketId, roomId, 24)),
    );

    // Use the first socket's history as temperature source (same for all sockets in a room)
    const temperatureHistory = allHistories[0]?.history || [];
    const temperatureDataPoints = temperatureHistory.map((record: any) => ({
      timestamp: new Date(record.timestamp).getTime(),
      value: parseFloat(
        (record.kwh * 100 * Math.sin(Math.random())).toFixed(1),
      ), // Using kwh as proxy for ambient temp calculation
    }));

    // Aggregate energy from all sockets' histories
    const energyByTimestamp: Record<number, number> = {};
    allHistories.forEach((history) => {
      history.history?.forEach((record: any) => {
        const timestamp = new Date(record.timestamp).getTime();
        const kwh = record.kwh || 0;
        const watt = kwh * 1000; // Convert kWh to W
        energyByTimestamp[timestamp] =
          (energyByTimestamp[timestamp] || 0) + watt;
      });
    });

    const energyDataPoints = Object.entries(energyByTimestamp)
      .map(([ts, watts]) => ({
        timestamp: parseInt(ts),
        value: parseFloat(watts.toFixed(1)),
      }))
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-12); // Keep last 12 records

    return {
      temperature: temperatureDataPoints.slice(-12),
      energyUsage: energyDataPoints,
    };
  } catch (error) {
    console.error("Failed to fetch room analytics:", error);
    return { temperature: [], energyUsage: [] };
  }
};

// socketPredictionService.ts

export const fetchRoomBulkData = async (roomId: string) => {
  const res = await fetch(`${SERVER_URL}/room-data/${roomId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
  });

  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  return res.json();
};
