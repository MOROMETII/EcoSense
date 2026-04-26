import { BASE_URL } from './aiService';
import type { Room, Device, BlueprintFeature } from '../models/types';

const GRID_SIZE = 12;

function authHeaders(token: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'ngrok-skip-browser-warning': 'true',
  };
}

/** Headers for GET/DELETE requests that carry no body. */
function getHeaders(token: string): HeadersInit {
  return {
    'Authorization': `Bearer ${token}`,
    'ngrok-skip-browser-warning': 'true',
  };
}

// ── Server shapes ─────────────────────────────────────────────────────────────

interface ServerFloor {
  id: number;
  level: number;
  label: string;
}

interface ServerRoom {
  id: number;
  name: string;
}

interface ServerSocket {
  id: number;
  name: string;
  x_norm: number;
  y_norm: number;
  ip_address?: string;
  is_online?: boolean;
}

interface ServerThermostat {
  id: number;
  name: string;
  x_norm: number;
  y_norm: number;
  ip_address?: string;
  is_online?: boolean;
}

interface ServerObject {
  id: number;
  type: string;       // "DOOR" | "WINDOW"
  wall_side: string;  // "top" | "bottom" | "left" | "right"
  wall_offset: number;
  is_open?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normToGrid(norm: number): number {
  return Math.round(norm * (GRID_SIZE - 1));
}

function gridToNorm(grid: number): number {
  return grid / (GRID_SIZE - 1);
}

// ── Floors ────────────────────────────────────────────────────────────────────

export async function getFloors(token: string): Promise<ServerFloor[]> {
  const res = await fetch(`${BASE_URL}/floors`, {
    headers: getHeaders(token),
  });
  if (!res.ok) throw new Error(`GET /floors → ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : (data.floors ?? []);
}

export async function createFloor(label: string, level: number, token: string): Promise<ServerFloor> {
  const res = await fetch(`${BASE_URL}/floors`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ level, label }),
  });
  if (!res.ok) throw new Error(`POST /floors → ${res.status}`);
  return res.json();
}

/** Returns the first floor's id, creating a default one if none exist. */
export async function getOrCreateDefaultFloor(token: string): Promise<number> {
  const floors = await getFloors(token);
  if (floors.length > 0) return floors[0].id;
  const floor = await createFloor('Main Floor', 0, token);
  return floor.id;
}

// ── Rooms ─────────────────────────────────────────────────────────────────────

export async function getRoomsForFloor(floorId: number, token: string): Promise<ServerRoom[]> {
  const res = await fetch(`${BASE_URL}/floors/${floorId}/rooms`, {
    headers: getHeaders(token),
  });
  if (!res.ok) throw new Error(`GET /floors/${floorId}/rooms → ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : (data.rooms ?? []);
}

export async function createServerRoom(floorId: number, name: string, token: string): Promise<ServerRoom> {
  const res = await fetch(`${BASE_URL}/floors/${floorId}/rooms`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`POST /floors/${floorId}/rooms → ${res.status}`);
  return res.json();
}

// ── Sockets ───────────────────────────────────────────────────────────────────

export async function getSocketsForRoom(roomId: number, token: string): Promise<ServerSocket[]> {
  const res = await fetch(`${BASE_URL}/rooms/${roomId}/sockets`, {
    headers: getHeaders(token),
  });
  if (!res.ok) throw new Error(`GET /rooms/${roomId}/sockets → ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : (data.sockets ?? []);
}

export async function createSocket(
  roomId: number,
  name: string,
  x_norm: number,
  y_norm: number,
  token: string,
): Promise<ServerSocket> {
  const res = await fetch(`${BASE_URL}/rooms/${roomId}/sockets`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ name, x_norm, y_norm }),
  });
  if (!res.ok) throw new Error(`POST /rooms/${roomId}/sockets → ${res.status}`);
  return res.json();
}

export async function deleteSocket(socketId: number, token: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/sockets/${socketId}`, {
    method: 'DELETE',
    headers: getHeaders(token),
  });
  if (!res.ok) throw new Error(`DELETE /sockets/${socketId} → ${res.status}`);
}

// ── Thermostats ───────────────────────────────────────────────────────────────

export async function getThermostatsForRoom(roomId: number, token: string): Promise<ServerThermostat[]> {
  const res = await fetch(`${BASE_URL}/rooms/${roomId}/thermostats`, {
    headers: getHeaders(token),
  });
  if (!res.ok) throw new Error(`GET /rooms/${roomId}/thermostats → ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : (data.thermostats ?? []);
}

export async function createThermostat(
  roomId: number,
  name: string,
  x_norm: number,
  y_norm: number,
  token: string,
): Promise<ServerThermostat> {
  const res = await fetch(`${BASE_URL}/rooms/${roomId}/thermostats`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ name, x_norm, y_norm }),
  });
  if (!res.ok) throw new Error(`POST /rooms/${roomId}/thermostats → ${res.status}`);
  return res.json();
}

export async function deleteThermostat(thermostatId: number, token: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/thermostats/${thermostatId}`, {
    method: 'DELETE',
    headers: getHeaders(token),
  });
  if (!res.ok) throw new Error(`DELETE /thermostats/${thermostatId} → ${res.status}`);
}

export async function patchThermostat(thermostatId: number, isOnline: boolean, token: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/thermostats/${thermostatId}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ is_online: isOnline }),
  });
  if (!res.ok) throw new Error(`PATCH /thermostats/${thermostatId} → ${res.status}`);
}

// ── Objects (doors / windows) ─────────────────────────────────────────────────

export async function getObjectsForRoom(roomId: number, token: string): Promise<ServerObject[]> {
  const res = await fetch(`${BASE_URL}/rooms/${roomId}/objects`, {
    headers: getHeaders(token),
  });
  if (!res.ok) throw new Error(`GET /rooms/${roomId}/objects → ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : (data.objects ?? []);
}

export async function createObject(
  roomId: number,
  type: 'DOOR' | 'WINDOW',
  wall_side: string,
  wall_offset: number,
  token: string,
): Promise<ServerObject> {
  const res = await fetch(`${BASE_URL}/rooms/${roomId}/objects`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ type, wall_side, wall_offset }),
  });
  if (!res.ok) throw new Error(`POST /rooms/${roomId}/objects → ${res.status}`);
  return res.json();
}

// ── High-level helpers ────────────────────────────────────────────────────────

/**
 * Fetches all floors → rooms → devices + objects and returns a fully-mapped
 * Room array for the local store.
 */
export async function fetchAllRooms(token: string): Promise<Room[]> {
  const floors = await getFloors(token);
  const allRooms: Room[] = [];

  await Promise.all(
    floors.map(async (floor) => {
      if (floor.id == null) return; // guard against malformed server response
      const serverRooms = await getRoomsForFloor(floor.id, token);
      await Promise.all(
        serverRooms.map(async (sr) => {
          const [sockets, thermostats, objects] = await Promise.all([
            getSocketsForRoom(sr.id, token),
            getThermostatsForRoom(sr.id, token),
            getObjectsForRoom(sr.id, token),
          ]);

          // Deduplicate by name in case the server returns duplicate rows
          const seenDeviceIds = new Set<string>();
          const uniqueSockets = sockets.filter((s) => {
            if (seenDeviceIds.has(s.name)) return false;
            seenDeviceIds.add(s.name);
            return true;
          });
          const uniqueThermostats = thermostats.filter((t) => {
            if (seenDeviceIds.has(t.name)) return false;
            seenDeviceIds.add(t.name);
            return true;
          });

          const devices: Device[] = [
            ...uniqueSockets.map((s) => ({
              id: s.name,
              serverId: s.id,
              type: 'smart_socket' as const,
              position: { x: normToGrid(s.x_norm), y: normToGrid(s.y_norm) },
              energyUsage: 0,
            })),
            ...uniqueThermostats.map((t) => ({
              id: t.name,
              serverId: t.id,
              type: 'temperature_sensor' as const,
              position: { x: normToGrid(t.x_norm), y: normToGrid(t.y_norm) },
              temperature: 0,
              deactivated: t.is_online === false,
            })),
          ];

          const features: BlueprintFeature[] = objects.map((o) => ({
            type: o.type.toLowerCase() as 'door' | 'window',
            wall: o.wall_side as 'top' | 'bottom' | 'left' | 'right',
            offset: o.wall_offset,
          }));

          allRooms.push({
            id: String(sr.id),
            name: sr.name,
            devices,
            blueprint: features.length > 0 ? { features } : undefined,
            analytics: { temperature: [], energyUsage: [], aiSuggestions: [], anomalies: [] },
          });
        }),
      );
    }),
  );

  return allRooms;
}

/**
 * Creates a room on the server with all its devices and blueprint objects,
 * then returns the fully-mapped Room ready to insert into the local store.
 */
export async function pushNewRoom(
  floorId: number,
  name: string,
  devices: Device[],
  features: BlueprintFeature[],
  token: string,
): Promise<Room> {
  const serverRoom = await createServerRoom(floorId, name, token);

  await Promise.all([
    ...devices.map((d) => {
      const x_norm = gridToNorm(d.position.x);
      const y_norm = gridToNorm(d.position.y);
      if (d.type === 'smart_socket') {
        return createSocket(serverRoom.id, d.id, x_norm, y_norm, token);
      } else {
        return createThermostat(serverRoom.id, d.id, x_norm, y_norm, token);
      }
    }),
    ...features.map((f) =>
      createObject(
        serverRoom.id,
        f.type.toUpperCase() as 'DOOR' | 'WINDOW',
        f.wall,
        f.offset,
        token,
      ),
    ),
  ]);

  return {
    id: String(serverRoom.id),
    name,
    devices,
    blueprint: features.length > 0 ? { features } : undefined,
    analytics: { temperature: [], energyUsage: [], aiSuggestions: [], anomalies: [] },
  };
}
