import type { SocketPrediction } from "../models/types";

const BASE_URL = "https://voluntary-distributor-meaningful-api.trycloudflare.com";

export async function fetchSocketHistory(socketId: string, roomId: string) {
  const url = `${BASE_URL}/socket-history/${encodeURIComponent(socketId)}?room_id=${encodeURIComponent(roomId)}&hours=24`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchRoomBulkData(roomId: string) {
  const url = `${BASE_URL}/room-data/${encodeURIComponent(roomId)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}
export async function fetchRoomRealtime(roomId: string) {
  const url = `${BASE_URL}/room-realtime/${encodeURIComponent(roomId)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}
export interface RealtimeTick {
  socket_id: string;
  timestamp: string;
  current_kwh: number;
  predicted_label_id: number;
  predicted_label_name: string;
  confidence: number;
  insight: string;
  cursor: number;
  total_rows: number;
}

export async function fetchSocketRealtime(
  socketId: string,
  roomId: string,
): Promise<RealtimeTick | null> {
  const params = new URLSearchParams({
    socket_id: socketId,
    room_id: roomId,
    loop: "true",
    batch: "1",
  });
  const url = `${BASE_URL}/predict/realtime?${params}`;
  const res = await fetch(url);

  if (res.status === 202) return null;

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<RealtimeTick>;
}
