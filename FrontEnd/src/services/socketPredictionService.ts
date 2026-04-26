import api from './api';

export async function fetchSocketHistory(socketId: string, roomId: string) {
  const res = await api.get(`/socket-history/${encodeURIComponent(socketId)}`, {
    params: { room_id: roomId, hours: 24 },
  });
  return res.data;
}

export async function fetchRoomBulkData(roomId: string) {
  // 1. Get thermostats for this room, then fetch history for the first one.
  const thermRes = await api.get(`/rooms/${roomId}/thermostats`);
  const thermostats: Array<{ id: number }> = thermRes.data.thermostats ?? [];

  let temp_history: Array<{ timestamp: string; temp_ambient: number }> = [];
  if (thermostats.length > 0) {
    const histRes = await api.get(`/data/thermostat/${thermostats[0].id}`, {
      params: { hours: 24 },
    });
    temp_history = (histRes.data.history ?? []).map((h: any) => ({
      timestamp: h.ts,
      temp_ambient: h.temp_ambient,
    }));
  }

  // 2. Get sockets — no historical KWH from server, realtime polling fills these in.
  const sockRes = await api.get(`/rooms/${roomId}/sockets`);
  const sockets = (sockRes.data.sockets ?? []).map((s: any) => ({
    socket_id: String(s.id),
    kwh: 0,
  }));

  return { sockets, temp_history, energy_history: [] as any[] };
}

export async function fetchRoomRealtime(roomId: string) {
  // Get current sockets + fetch per-socket realtime predictions in parallel.
  const sockRes = await api.get(`/rooms/${roomId}/sockets`);
  const sockets: Array<{ id: number }> = sockRes.data.sockets ?? [];

  const results = await Promise.allSettled(
    sockets.map((s) => fetchSocketRealtime(String(s.id), roomId))
  );

  const socketKwh = results.map((r, i) => ({
    socket_id: String(sockets[i].id),
    kwh:
      r.status === 'fulfilled' && r.value != null ? r.value.current_kwh : 0,
  }));

  const validTicks = results
    .filter((r): r is PromiseFulfilledResult<RealtimeTick> => r.status === 'fulfilled' && r.value != null)
    .map((r) => r.value);

  const total_kwh = socketKwh.reduce((sum, s) => sum + s.kwh, 0);
  const timestamp = validTicks[0]?.timestamp ?? new Date().toISOString();

  return { sockets: socketKwh, timestamp, avg_temp: 0, total_kwh };
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
  try {
    const res = await api.get<RealtimeTick>('/predict/realtime', {
      params: { socket_id: socketId, room_id: roomId, loop: 'true', batch: '1' },
      validateStatus: (s) => s === 200 || s === 202,
    });
    if (res.status === 202) return null;
    return res.data;
  } catch {
    return null;
  }
}
